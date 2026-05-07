import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { pool } from "./db";
import { storage } from "./storage";
import {
  signupSchema,
  signinSchema,
  setSecurityQuestionSchema,
  forgotPasswordLookupSchema,
  resetPasswordSchema,
  type PublicUser,
} from "@shared/schema";

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
  organizationId: string | null;
  premiumSource: string | null;
  securityQuestion?: string | null;
  securityAnswerHash?: string | null;
}): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    tier: (u.tier === "pro" ? "pro" : "free") as "free" | "pro",
    createdAt: u.createdAt.toISOString(),
    proSince: u.proSince ? u.proSince.toISOString() : null,
    organizationId: u.organizationId ?? null,
    premiumSource: u.premiumSource ?? null,
    hasSecurityQuestion: !!(u.securityQuestion && u.securityAnswerHash),
  };
}

function normalizeAnswer(a: string): string {
  return a.trim().toLowerCase().replace(/\s+/g, " ");
}

// Per-IP rate limiter for forgot-password endpoints. In-memory only — fine for
// a single-instance deployment; if we ever scale horizontally this should move
// to Redis or a DB table.
const resetAttempts = new Map<string, { count: number; resetAt: number }>();
function rateLimitReset(req: Request, res: Response): boolean {
  const key = `${req.ip}`;
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX = 10;
  const entry = resetAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    resetAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  if (entry.count > MAX) {
    res.status(429).json({ message: "Too many attempts. Try again in a few minutes." });
    return false;
  }
  return true;
}

export function setupSession(app: Express) {
  const PgStore = connectPg(session);
  const store = new PgStore({
    pool,
    createTableIfMissing: false,
    schemaName: "public",
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
      const securityAnswerHash = parsed.data.securityAnswer
        ? await hashPassword(normalizeAnswer(parsed.data.securityAnswer))
        : null;
      const user = await storage.createUserFull({
        email,
        passwordHash,
        name: parsed.data.name.trim(),
        securityQuestion: parsed.data.securityQuestion ?? null,
        securityAnswerHash,
      });
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

  // Start a Stripe Checkout session for a personal Pro subscription ($19/mo).
  // Returns { checkoutUrl } — the client redirects the browser to it. The user
  // is only flipped to tier=pro when checkout.session.completed fires on our
  // webhook (see server/webhookHandlers.ts).
  app.post("/api/auth/upgrade", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.tier === "pro") {
      return res.status(400).json({ message: "You're already on Pro." });
    }
    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const origin = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: user.stripeCustomerId ?? undefined,
        customer_email: user.stripeCustomerId ? undefined : user.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: 1900,
              recurring: { interval: "month" },
              product_data: {
                name: "Simtura Pro",
                description: "Unlimited scenarios, full EMS + Nursing libraries, priority access.",
              },
            },
          },
        ],
        metadata: { userId: user.id },
        subscription_data: { metadata: { userId: user.id } },
        success_url: `${origin}/profile?upgraded=1`,
        cancel_url: `${origin}/profile?canceled=1`,
        allow_promotion_codes: true,
      });

      res.json({ checkoutUrl: session.url });
    } catch (err) {
      console.error("[stripe] failed to create subscription checkout:", err);
      res.status(502).json({ message: "Could not start checkout. Please try again." });
    }
  });

  // Set or change the current user's security question + answer.
  app.post("/api/auth/security-question", requireAuth, async (req, res) => {
    const parsed = setSecurityQuestionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.format() });
    }
    const answerHash = await hashPassword(normalizeAnswer(parsed.data.securityAnswer));
    const user = await storage.setUserSecurityQuestion(
      req.session.userId!,
      parsed.data.securityQuestion,
      answerHash,
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(toPublic(user));
  });

  // Public: look up a user's security question by email so they can answer it.
  // To avoid leaking which emails are registered, we always return 200 — when
  // there's no user (or the user hasn't set a question), return question:null.
  app.post("/api/auth/forgot-password/lookup", async (req, res) => {
    if (!rateLimitReset(req, res)) return;
    const parsed = forgotPasswordLookupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid email" });
    }
    const email = parsed.data.email.toLowerCase().trim();
    const user = await storage.getUserByEmail(email);
    if (!user || !user.securityQuestion || !user.securityAnswerHash) {
      return res.json({ question: null });
    }
    res.json({ question: user.securityQuestion });
  });

  // Public: verify the answer and reset the password in one shot. Always
  // returns the same generic error message on any failure path so we don't
  // leak whether the email exists, whether the question is set, or whether
  // only the answer was wrong.
  app.post("/api/auth/forgot-password/reset", async (req, res) => {
    if (!rateLimitReset(req, res)) return;
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.format() });
    }
    const email = parsed.data.email.toLowerCase().trim();
    const generic = { message: "We couldn't reset your password with that answer. Double-check and try again." };

    const user = await storage.getUserByEmail(email);
    if (!user || !user.securityAnswerHash) {
      return res.status(400).json(generic);
    }
    const ok = await verifyPassword(normalizeAnswer(parsed.data.securityAnswer), user.securityAnswerHash);
    if (!ok) {
      return res.status(400).json(generic);
    }
    const newHash = await hashPassword(parsed.data.newPassword);
    await storage.setUserPasswordHash(user.id, newHash);
    // Invalidate every existing session for this user so any stolen / stale
    // sessions can't be used after a recovery flow. connect-pg-simple stores
    // the session blob with the column name "sess".
    try {
      const result = await pool.query(
        `DELETE FROM user_sessions WHERE sess->>'userId' = $1`,
        [user.id],
      );
      console.log(`[auth] password reset for ${user.id} — invalidated ${result.rowCount ?? 0} session(s)`);
    } catch (err: any) {
      console.error(`[auth] failed to invalidate sessions after reset for ${user.id}: ${err?.message}`);
    }
    res.json({ ok: true });
  });

  // Open a Stripe Customer Portal session so the user can manage / cancel
  // their subscription. Stripe will fire customer.subscription.updated /
  // .deleted webhooks back to us when they make changes.
  app.post("/api/auth/billing-portal", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.stripeCustomerId) {
      return res.status(400).json({ message: "No active subscription to manage." });
    }
    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const origin = `${req.protocol}://${req.get("host")}`;
      const portal = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${origin}/profile`,
      });
      res.json({ portalUrl: portal.url });
    } catch (err) {
      console.error("[stripe] failed to create portal session:", err);
      res.status(502).json({ message: "Could not open billing portal. Please try again." });
    }
  });
}

export { toPublic };
