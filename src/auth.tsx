import { Elysia, t } from "elysia";
import { getDb } from "./db";
import { getRedis } from "./redis";
import { config } from "./config";
import { LoginPage } from "./views/login";
import { RegisterPage } from "./views/register";
import { html, Html } from "@elysiajs/html";
import { cookie } from "@elysiajs/cookie";

interface SessionUser {
  id: number;
  email: string;
}

// Extend Elysia store type
declare module "elysia" {
  interface ElysiaApp {
    user: SessionUser | null;
  }
}

async function createSession(user: SessionUser, persistent: boolean): Promise<string> {
  const sid = crypto.randomUUID();
  const ttl = persistent ? config.session.persistentTtl : config.session.defaultTtl;
  const redis = getRedis();
  await redis.set(`session:${sid}`, JSON.stringify(user), "EX", ttl);
  return sid;
}

async function getSession(sid: string): Promise<SessionUser | null> {
  const redis = getRedis();
  const data = await redis.get(`session:${sid}`);
  if (!data) return null;
  return JSON.parse(data) as SessionUser;
}

async function destroySession(sid: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`session:${sid}`);
}

export const auth = new Elysia()
  .use(html())
  .use(cookie())
  .derive({ as: "scoped" }, async ({ cookie: { sid }, request }) => {
    const sidValue = sid?.value;
    if (!sidValue) {
      return { user: null };
    }
    const user = await getSession(sidValue);
    return { user };
  });

// Register page
export const registerRoutes = new Elysia()
  .use(auth)
  .get("/register", ({ user }) => {
    if (user) return new Response(null, { status: 302, headers: { Location: "/destinations" } });
    return <RegisterPage />;
  })
  .post(
    "/register",
    async ({ body, set, cookie: { sid } }) => {
      // Redirect if already logged in
      const sidValue = sid?.value;
      if (sidValue) {
        const existing = await getSession(sidValue);
        if (existing) {
          set.status = 302;
          set.headers = { Location: "/destinations" };
          return;
        }
      }

      const { email, password } = body;
      const db = getDb();

      // Check for duplicate email
      const existingUser = await db`SELECT id FROM users WHERE email = ${email}`;
      if (existingUser.length > 0) {
        set.status = 409;
        return <RegisterPage error="Email already registered." />;
      }

      // Hash password
      const passwordHash = await Bun.password.hash(password);

      // Create user
      await db`
        INSERT INTO users (email, password_hash)
        VALUES (${email}, ${passwordHash})
      `;

      set.status = 302;
      set.headers = { Location: "/login" };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
      }),
    }
  );

// Login page + login action
export const loginRoutes = new Elysia()
  .use(auth)
  .get("/login", ({ user }) => {
    if (user) return new Response(null, { status: 302, headers: { Location: "/destinations" } });
    return <LoginPage />;
  })
  .post(
    "/login",
    async ({ body, set, cookie: { sid } }) => {
      const { email, password, persistent } = body;
      const db = getDb();

      const rows = await db`SELECT id, email, password_hash FROM users WHERE email = ${email}`;
      if (rows.length === 0) {
        set.status = 401;
        return <LoginPage error="Invalid email or password." />;
      }

      const user = rows[0] as { id: number; email: string; password_hash: string };
      const valid = await Bun.password.verify(password, user.password_hash);
      if (!valid) {
        set.status = 401;
        return <LoginPage error="Invalid email or password." />;
      }

      const sessionId = await createSession(
        { id: user.id, email: user.email },
        persistent === "1"
      );

      // Set session cookie
      const maxAge = persistent === "1" ? config.session.persistentTtl : config.session.defaultTtl;
      sid?.set({
        value: sessionId,
        path: "/",
        maxAge,
        httpOnly: true,
        sameSite: "lax",
      });

      set.status = 302;
      set.headers = { Location: "/destinations" };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
        persistent: t.Optional(t.String()),
      }),
    }
  );

// Logout
export const logoutRoutes = new Elysia()
  .use(auth)
  .post("/logout", async ({ cookie: { sid }, set }) => {
    const sidValue = sid?.value;
    if (sidValue) {
      await destroySession(sidValue);
    }
    sid?.remove();
    set.status = 302;
    set.headers = { Location: "/login" };
    return;
  });

// Middleware to require authentication
export function requireAuth(app: Elysia) {
  return app.derive({ as: "scoped" }, async ({ user, set, request }) => {
    if (!user) {
      set.status = 302;
      set.headers = { Location: "/login" };
      return new Response(null, { status: 302, headers: { Location: "/login" } });
    }
    return { user };
  });
}
