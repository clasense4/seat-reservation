import { Elysia, t } from "elysia";
import { getDb } from "./db";
import { getRedis } from "./redis";
import { auth } from "./auth";
import { config } from "./config";
import { html, Html } from "@elysiajs/html";
import { PaymentPage } from "./views/payment";
import { ConfirmationPage } from "./views/confirmation";

export const paymentRoutes = new Elysia()
  .use(html())
  .use(auth)
  .get("/payment", async ({ user, set }) => {
    if (!user) {
      set.status = 302;
      set.headers = { Location: "/login" };
      return;
    }

    const redis = getRedis();
    const db = getDb();

    // Get user's current hold
    const userHoldSeatId = await redis.get(`userhold:${user.id}`);
    if (!userHoldSeatId) {
      set.status = 302;
      set.headers = { Location: "/destinations" };
      return;
    }

    const [seat] = await db`
      SELECT s.id, s.label, s.destination_id, d.name as destination_name
      FROM seats s
      JOIN destinations d ON d.id = s.destination_id
      WHERE s.id = ${parseInt(userHoldSeatId)}
    `;
    if (!seat) {
      set.status = 302;
      set.headers = { Location: "/destinations" };
      return;
    }

    // Check hold still exists
    const holdData = await redis.get(`hold:${seat.id}`);
    if (!holdData || holdData !== String(user.id)) {
      set.status = 302;
      set.headers = { Location: `/destinations/${seat.destination_id}/seats` };
      return;
    }

    // Calculate remaining hold time
    const ttl = await redis.ttl(`hold:${seat.id}`);

    return (
      <PaymentPage
        destination={{ id: seat.destination_id, name: seat.destination_name }}
        seat={{ id: seat.id, label: seat.label }}
        user={user}
        holdRemaining={Math.max(0, ttl)}
      />
    );
  })
  .post(
    "/payment",
    async ({ body, user, set }) => {
      if (!user) {
        set.status = 302;
        set.headers = { Location: "/login" };
        return;
      }

      const { cardNumber } = body;
      const redis = getRedis();
      const db = getDb();

      // Get user's current hold
      const userHoldSeatId = await redis.get(`userhold:${user.id}`);
      if (!userHoldSeatId) {
        set.status = 302;
        set.headers = { Location: "/destinations" };
        return;
      }

      // Check hold still exists
      const holdData = await redis.get(`hold:${userHoldSeatId}`);
      if (!holdData || holdData !== String(user.id)) {
        // Hold expired
        await redis.del(`userhold:${user.id}`);
        set.status = 302;
        set.headers = { Location: "/destinations" };
        return;
      }

      const [seat] = await db`
        SELECT s.id, s.label, s.destination_id, d.name as destination_name
        FROM seats s
        JOIN destinations d ON d.id = s.destination_id
        WHERE s.id = ${parseInt(userHoldSeatId)}
      `;

      if (!seat) {
        set.status = 302;
        set.headers = { Location: "/destinations" };
        return;
      }

      // Check if seat is already reserved (race condition guard)
      const existingReservation = await db`
        SELECT id FROM reservations WHERE seat_id = ${seat.id}
      `;
      if (existingReservation.length > 0) {
        // Reservation already exists - release hold, redirect to seat map
        await redis.del(`hold:${seat.id}`);
        await redis.del(`userhold:${user.id}`);

        set.status = 302;
        set.headers = { Location: `/destinations/${seat.destination_id}/seats` };
        return;
      }

      // Demo card validation
      const normalizedCard = cardNumber.replace(/\s/g, "");
      if (normalizedCard !== "4242424242424242") {
        // Payment failed - release hold
        await redis.del(`hold:${seat.id}`);
        await redis.del(`userhold:${user.id}`);

        const ttl = 0;
        return (
          <PaymentPage
            destination={{ id: seat.destination_id, name: seat.destination_name }}
            seat={{ id: seat.id, label: seat.label }}
            user={user}
            holdRemaining={ttl}
            error="Payment failed. Please try again."
          />
        );
      }

      // Payment successful - persist reservation
      const [reservation] = await db`
        INSERT INTO reservations (user_id, seat_id, destination_id)
        VALUES (${user.id}, ${seat.id}, ${seat.destination_id})
        RETURNING booking_reference, created_at
      `;

      // Clean up Redis holds
      await redis.del(`hold:${seat.id}`);
      await redis.del(`userhold:${user.id}`);

      // Note: slot pool counter will be decremented on next startup sync
      // But it's already been decremented during the hold, so we're good

      return (
        <ConfirmationPage
          bookingReference={reservation.booking_reference}
          destination={seat.destination_name}
          seat={seat.label}
          user={user}
        />
      );
    },
    {
      body: t.Object({
        cardNumber: t.String(),
        expiry: t.String(),
        cvv: t.String(),
      }),
    }
  );
