import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { pool } from "./db";
import { storage } from "./storage";
import { signupSchema, signinSchema, type PublicUser } from "@shared/schema";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = await scrypt(password, salt, 64);
  return `${salt}:${buf.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const got = await scrypt(password, salt, expected.length);
  if (got.length !== expected.length) return false;
  return timingSafeEqual(got, expected);
}

function toPublic(u: {
  id: string;
  email: string;
  name: string;
  tier: string;
  createdAt: Date;
  proSince: Date | null;
}): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    tier: (u.tier === "pro" ? "pro" : "free") as "free" | "pro",
    createdAt: u.createdAt.toISOString(),
    proSince: u.proSince ? u.proSince.toISOString() : null,
  };
}

export function setupSession(app: Express) {
  const PgStore = connectPg(session);
  const store = new PgStore({
    pool,
    createTableIfMissing: false,
    tableName: "user_sessions",
  });

  store.on("error", (err: Error) => {
    console.error("[auth] Session store error:", err);
  });

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable is required in production");
    }
    console.warn("[auth] SESSION_SECRET not set — using insecure dev fallback");
  }

  app.set("trust proxy", 1);
  app.use(
    session({
      store,
      secret: sessionSecret || "dev-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      },
    }),
  );
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.format() });
      }
      const email = parsed.data.email.toLowerCase().trim();
      console.log(`[auth] signup attempt: ${email}`);
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with that email already exists." });
      }
      const passwordHash = await hashPassword(parsed.data.password);
      const user = await storage.createUserFull({ email, passwordHash, name: parsed.data.name.trim() });
      console.log(`[auth] user created: ${user.id} — saving session`);
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error(`[auth] session.save failed on signup — message: ${err?.message} — stack: ${err?.stack} — full: ${JSON.stringify(err)}`);
          return res.status(500).json({ message: `Session error: ${err?.message ?? "unknown"}` });
        }
        console.log(`[auth] signup complete, session saved for ${user.id}`);
        res.json(toPublic(user));
      });
    } catch (err: any) {
      console.error(`[auth] signup threw — message: ${err?.message} — stack: ${err?.stack}`);
      res.status(500).json({ message: `Signup error: ${err?.message ?? "unknown"}` });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const parsed = signinSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input" });
      }
      const email = parsed.data.email.toLowerCase().trim();
      console.log(`[auth] signin attempt: ${email}`);
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log(`[auth] signin failed — no user found for ${email}`);
        return res.status(401).json({ message: "Invalid email or password." });
      }
      console.log(`[auth] user found: ${user.id} — verifying password (hash format: ${user.passwordHash?.includes(":") ? "scrypt salt:hash" : "UNKNOWN"})`);
      const ok = await verifyPassword(parsed.data.password, user.passwordHash);
      if (!ok) {
        console.log(`[auth] signin failed — wrong password for ${email}`);
        return res.status(401).json({ message: "Invalid email or password." });
      }
      console.log(`[auth] password ok — saving session for ${user.id}`);
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error(`[auth] session.save failed on signin — message: ${err?.message} — stack: ${err?.stack} — full: ${JSON.stringify(err)}`);
          return res.status(500).json({ message: `Session error: ${err?.message ?? "unknown"}` });
        }
        console.log(`[auth] signin complete, session saved for ${user.id}`);
        res.json(toPublic(user));
      });
    } catch (err: any) {
      console.error(`[auth] signin threw — message: ${err?.message} — stack: ${err?.stack}`);
      res.status(500).json({ message: `Signin error: ${err?.message ?? "unknown"}` });
    }
  });

  app.post("/api/auth/signout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.json(null);
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.json(null);
    }
    res.json(toPublic(user));
  });

  // Mock upgrade — in production this would be a Stripe webhook
  app.post("/api/auth/upgrade", requireAuth, async (req, res) => {
    const user = await storage.setUserTier(req.session.userId!, "pro");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(toPublic(user));
  });

  app.post("/api/auth/downgrade", requireAuth, async (req, res) => {
    const user = await storage.setUserTier(req.session.userId!, "free");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(toPublic(user));
  });
}

export { toPublic };
