import { Elysia, t } from "elysia";
import { getDb } from "./db";
import { getRedis } from "./redis";
import { auth } from "./auth";
import { config } from "./config";
import { html, Html } from "@elysiajs/html";
import { SeatMapPage, SeatMapPartial } from "./views/seat-map";

const HOLD_PREFIX = "hold:";
const USERHOLD_PREFIX = "userhold:";

// Lua script for atomic seat hold using SETNX (no slot pool counter to avoid TTL drift)
const HOLD_LUA = `
  local seatId = KEYS[1]
  local userId = KEYS[2]
  local ttl = tonumber(ARGV[1])

  local userHold = redis.call('get', 'userhold:' .. userId)
  if userHold then
    return {err='You already hold seat ' .. userHold .. '. Release it before holding another seat.'}
  end

  local seatHold = redis.call('get', 'hold:' .. seatId)
  if seatHold then
    return {err='Sorry, seat is no longer available.'}
  end

  redis.call('setex', 'hold:' .. seatId, ttl, userId)
  redis.call('setex', 'userhold:' .. userId, ttl, seatId)

  return {ok='success'}
`;

// Lua script for atomic seat release
const RELEASE_LUA = `
  local seatId = KEYS[1]
  local userId = KEYS[2]

  local currentHold = redis.call('get', 'hold:' .. seatId)
  if currentHold ~= userId then
    return {err='not_your_hold'}
  end

  redis.call('del', 'hold:' .. seatId)
  redis.call('del', 'userhold:' .. userId)

  return {ok='released'}
`;

// Get user's active hold with seat info, destination info, and remaining TTL
export async function getUserHold(userId: number): Promise<{
  id: number;
  label: string;
  destinationId: number;
  destinationName: string;
  remaining: number;
} | null> {
  const redis = getRedis();
  const db = getDb();

  const userHoldSeatId = await redis.get(USERHOLD_PREFIX + userId);
  if (!userHoldSeatId) return null;

  // Verify the hold is still active
  const holdData = await redis.get(HOLD_PREFIX + userHoldSeatId);
  if (!holdData || holdData !== String(userId)) return null;

  const [seat] = await db`
    SELECT s.id, s.label, s.destination_id, d.name as destination_name
    FROM seats s
    JOIN destinations d ON d.id = s.destination_id
    WHERE s.id = ${parseInt(userHoldSeatId)}
  `;
  if (!seat) return null;

  const remaining = await redis.ttl(HOLD_PREFIX + userHoldSeatId);

  return {
    id: seat.id,
    label: seat.label,
    destinationId: seat.destination_id,
    destinationName: seat.destination_name,
    remaining: Math.max(0, remaining),
  };
}

async function getSeatStates(destinationId: number, userId: number): Promise<{
  seats: Array<{ id: number; label: string; state: "available" | "held" | "held_by_me" | "reserved" }>;
  userHold: { id: number; label: string; destinationName: string } | null;
  slotCount: number;
  holdRemaining: number;
}> {
  const db = getDb();
  const redis = getRedis();

  // Get all seats for destination
  const seats = await db`
    SELECT id, label FROM seats WHERE destination_id = ${destinationId} ORDER BY label
  `;

  // Get confirmed reservations for this destination
  const reservations = await db`
    SELECT seat_id FROM reservations WHERE destination_id = ${destinationId}
  `;
  const reservedSeatIds = new Set(reservations.map((r: any) => r.seat_id));

  // Get all holds from Redis
  const holdKeys = seats.map((s: any) => HOLD_PREFIX + s.id);
  const holdResults = await redis.mget(...holdKeys);

  // Check if user has an active hold
  const userHoldInfo = await getUserHold(userId);

  // Calculate available slots from actual state
  let availableCount = 0;
  const seatStates = seats.map((s: any, i: number) => {
    const seatId = s.id;
    const holdUserId = holdResults[i];

    if (reservedSeatIds.has(seatId)) {
      return { id: seatId, label: s.label, state: "reserved" as const };
    }
    if (holdUserId) {
      if (holdUserId === String(userId)) {
        return { id: seatId, label: s.label, state: "held_by_me" as const };
      }
      return { id: seatId, label: s.label, state: "held" as const };
    }
    availableCount++;
    return { id: seatId, label: s.label, state: "available" as const };
  });

  return {
    seats: seatStates,
    userHold: userHoldInfo ? { id: userHoldInfo.id, label: userHoldInfo.label, destinationName: userHoldInfo.destinationName } : null,
    slotCount: availableCount,
    holdRemaining: userHoldInfo ? userHoldInfo.remaining : 0,
  };
}

export const seatsRoutes = new Elysia()
  .use(html())
  .use(auth)
  .get("/destinations/:id/seats", async ({ params: { id }, user, set }) => {
    if (!user) {
      set.status = 302;
      set.headers = { Location: "/login" };
      return;
    }

    const db = getDb();
    const [destination] = await db`SELECT id, name FROM destinations WHERE id = ${parseInt(id)}`;
    if (!destination) {
      set.status = 404;
      return <div class="error">Destination not found.</div>;
    }

    const { seats, userHold, slotCount, holdRemaining } = await getSeatStates(parseInt(id), user.id);
    return <SeatMapPage destination={destination} seats={seats} user={user} userHold={userHold} slotCount={slotCount} holdRemaining={holdRemaining} />;
  })
  .get("/destinations/:id/seats/partial", async ({ params: { id }, user, set, request }) => {
    if (!user) {
      // HTMX request: use HX-Redirect to force a full page navigation instead of
      // swapping the login page into the seat-grid div
      if (request.headers.get("HX-Request") === "true") {
        set.headers = { "HX-Redirect": "/login" };
        return "";
      }
      set.status = 302;
      set.headers = { Location: "/login" };
      return;
    }

    const { seats, userHold } = await getSeatStates(parseInt(id), user.id);
    return <SeatMapPartial seats={seats} userHold={userHold} />;
  })
  .post("/seats/:id/hold", async ({ params: { id }, user, set, request }) => {
    if (!user) {
      set.status = 302;
      set.headers = { Location: "/login" };
      return;
    }

    const db = getDb();
    const redis = getRedis();

    // Get seat info
    const [seat] = await db`
      SELECT s.id, s.label, s.destination_id, d.name as destination_name
      FROM seats s
      JOIN destinations d ON d.id = s.destination_id
      WHERE s.id = ${parseInt(id)}
    `;
    if (!seat) {
      set.status = 404;
      return <div class="error">Seat not found.</div>;
    }

    // Check if seat is already reserved in PostgreSQL
    const existingReservation = await db`
      SELECT id FROM reservations WHERE seat_id = ${seat.id}
    `;
    if (existingReservation.length > 0) {
      // Re-render the seat map with error
      const { seats, userHold, slotCount, holdRemaining } = await getSeatStates(seat.destination_id, user.id);
      return <SeatMapPage
        destination={{ id: seat.destination_id, name: seat.destination_name }}
        seats={seats.map(s => s.id === seat.id ? { ...s, state: "reserved" } : s)}
        user={user}
        userHold={userHold}
        slotCount={slotCount} holdRemaining={holdRemaining}
      />;
    }

    // Execute atomic hold via Lua script
    const result = await redis.eval(
      HOLD_LUA,
      2,
      String(seat.id),
      String(user.id),
      String(config.hold.ttl)
    );

    // Parse Lua result
    const resultStr = String(result);
    if (resultStr.includes("err")) {
      // Handle error - check if it's the user-already-holding error
      if (resultStr.includes("You already hold seat")) {
        set.status = 409;
        const { seats, userHold, slotCount, holdRemaining } = await getSeatStates(seat.destination_id, user.id);
        return <SeatMapPage
          destination={{ id: seat.destination_id, name: seat.destination_name }}
          seats={seats}
          user={user}
          userHold={userHold}
          slotCount={slotCount} holdRemaining={holdRemaining}
        />;
      }
      // General error
      set.status = 409;
      const { seats, userHold, slotCount, holdRemaining } = await getSeatStates(seat.destination_id, user.id);
      return <SeatMapPage
        destination={{ id: seat.destination_id, name: seat.destination_name }}
        seats={seats}
        user={user}
        userHold={userHold}
        slotCount={slotCount} holdRemaining={holdRemaining}
      />;
    }

    // Success - redirect to refreshed seat map
    set.status = 302;
    set.headers = { Location: `/destinations/${seat.destination_id}/seats` };
  })
  .post("/seats/:id/release", async ({ params: { id }, user, set }) => {
    if (!user) {
      set.status = 302;
      set.headers = { Location: "/login" };
      return;
    }

    const db = getDb();
    const redis = getRedis();

    const [seat] = await db`SELECT id, destination_id FROM seats WHERE id = ${parseInt(id)}`;
    if (!seat) {
      set.status = 404;
      return <div class="error">Seat not found.</div>;
    }

    await redis.eval(
      RELEASE_LUA,
      2,
      String(seat.id),
      String(user.id)
    );

    set.status = 302;
    set.headers = { Location: `/destinations/${seat.destination_id}/seats` };
  });
