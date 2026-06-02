import { Elysia } from "elysia";
import { html } from "@elysiajs/html";
import { cookie } from "@elysiajs/cookie";
import { getDb } from "./db";
import { connectRedis, getRedis } from "./redis";
import { registerRoutes, loginRoutes, logoutRoutes, auth } from "./auth";
import { destinationsRoutes } from "./destinations";
import { seatsRoutes } from "./seats";
import { paymentRoutes } from "./payment";
import { bookingsRoutes } from "./bookings";

async function main() {
  console.log("Starting seat reservation server...");

  try {
    await connectRedis();
    console.log("Connected to Redis.");
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
    process.exit(1);
  }

  const app = new Elysia()
    .use(html())
    .use(cookie())
    .use(registerRoutes)
    .use(loginRoutes)
    .use(logoutRoutes)
    .use(destinationsRoutes)
    .use(seatsRoutes)
    .use(paymentRoutes)
    .use(bookingsRoutes)
    .use(auth)
    .get("/", async ({ user, set }) => {
      if (user) {
        set.status = 302;
        set.headers = { Location: "/destinations" };
      } else {
        set.status = 302;
        set.headers = { Location: "/login" };
      }
    })
    .listen(3000);

  console.log(`\uD83D\uDC33 Server running at ${app.server?.hostname}:${app.server?.port}`);
}

main();
