import { Elysia } from "elysia";
import { getDb } from "./db";
import { auth } from "./auth";
import { html, Html } from "@elysiajs/html";
import { BookingsPage } from "./views/bookings";

export const bookingsRoutes = new Elysia()
  .use(html())
  .use(auth)
  .get("/bookings", async ({ user, set }) => {
    if (!user) {
      set.status = 302;
      set.headers = { Location: "/login" };
      return;
    }

    const db = getDb();
    const reservations = await db`
      SELECT r.booking_reference, r.created_at, d.name as destination_name, s.label as seat_label
      FROM reservations r
      JOIN destinations d ON d.id = r.destination_id
      JOIN seats s ON s.id = r.seat_id
      WHERE r.user_id = ${user.id}
      ORDER BY r.created_at DESC
    `;

    const mapped = reservations.map((r: any) => ({
      bookingReference: r.booking_reference,
      destinationName: r.destination_name,
      seatLabel: r.seat_label,
      createdAt: r.created_at,
    }));

    return <BookingsPage reservations={mapped} user={user} />;
  });
