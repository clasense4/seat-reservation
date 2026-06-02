import { Elysia } from "elysia";
import { getDb } from "./db";
import { auth, requireAuth } from "./auth";
import { DestinationsPage } from "./views/destinations";
import { getUserHold } from "./seats";
import { html, Html } from "@elysiajs/html";

export const destinationsRoutes = new Elysia()
  .use(html())
  .use(auth)
  .get("/destinations", async ({ user, set }) => {
    if (!user) {
      set.status = 302;
      set.headers = { Location: "/login" };
      return;
    }

    const db = getDb();
    const destinations = await db`SELECT id, name FROM destinations ORDER BY id`;
    const userHold = await getUserHold(user.id);
    return <DestinationsPage destinations={destinations} user={user} userHold={userHold} />;
  });
