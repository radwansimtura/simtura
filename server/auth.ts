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
    createTableIfMissing: true,
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
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.format() });
    }
    const email = parsed.data.email.toLowerCase().trim();
    const existing = await storage.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "An account with that email already exists." });
    }
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await storage.createUserFull({
      email,
      passwordHash,
      name: parsed.data.name.trim(),
    });
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        console.error("[auth] Session save error on signup:", err);
        return res.status(500).json({ message: "Session error, please try again." });
      }
      res.json(toPublic(user));
    });
  });

  app.post("/api/auth/signin", async (req, res) => {
    const parsed = signinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }
    const email = parsed.data.email.toLowerCase().trim();
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        console.error("[auth] Session save error on signin:", err);
        return res.status(500).json({ message: "Session error, please try again." });
      }
      res.json(toPublic(user));
    });
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
