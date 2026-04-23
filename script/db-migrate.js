import { execSync } from "child_process";
import pg from "pg";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("[db-push] ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const masked = dbUrl.replace(/:([^:@]+)@/, ":****@");
console.log(`[db-push] Using database: ${masked}`);

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

// ── 1. Create session store table (independent — must always run) ──────────
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "user_sessions" (
      "sid"    varchar      NOT NULL,
      "sess"   json         NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid")
    );
    CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire"
      ON "user_sessions" ("expire");
  `);
  console.log("[db-push] user_sessions table ready.");
} catch (err) {
  console.error("[db-push] ERROR creating user_sessions table:", err.message);
  process.exit(1);
}

// ── 2. Resolve users table schema differences before drizzle-kit runs ──────
try {
  await client.query(`
    DO $$ BEGIN
      -- Skip everything if the users table doesn't exist yet.
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'users'
      ) THEN
        RAISE NOTICE 'users table not found — drizzle will create it';
        RETURN;
      END IF;

      -- ── Renames ────────────────────────────────────────────────────────
      -- username → email
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'username'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email'
      ) THEN
        ALTER TABLE users RENAME COLUMN username TO email;
        RAISE NOTICE 'Renamed users.username → users.email';
      END IF;

      -- password → password_hash
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password_hash'
      ) THEN
        ALTER TABLE users RENAME COLUMN password TO password_hash;
        RAISE NOTICE 'Renamed users.password → users.password_hash';
      END IF;

      -- pwd → password_hash
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'pwd'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password_hash'
      ) THEN
        ALTER TABLE users RENAME COLUMN pwd TO password_hash;
        RAISE NOTICE 'Renamed users.pwd → users.password_hash';
      END IF;

      -- ── Add missing columns ────────────────────────────────────────────
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email'
      ) THEN
        ALTER TABLE users ADD COLUMN email text NOT NULL DEFAULT '';
        RAISE NOTICE 'Added users.email';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password_hash'
      ) THEN
        ALTER TABLE users ADD COLUMN password_hash text NOT NULL DEFAULT '';
        RAISE NOTICE 'Added users.password_hash';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'name'
      ) THEN
        ALTER TABLE users ADD COLUMN name text NOT NULL DEFAULT '';
        RAISE NOTICE 'Added users.name';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'tier'
      ) THEN
        ALTER TABLE users ADD COLUMN tier text NOT NULL DEFAULT 'free';
        RAISE NOTICE 'Added users.tier';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'created_at'
      ) THEN
        ALTER TABLE users ADD COLUMN created_at timestamp NOT NULL DEFAULT NOW();
        RAISE NOTICE 'Added users.created_at';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'pro_since'
      ) THEN
        ALTER TABLE users ADD COLUMN pro_since timestamp;
        RAISE NOTICE 'Added users.pro_since';
      END IF;

      -- ── Drop legacy columns no longer in the schema ───────────────────
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'username'
      ) THEN
        ALTER TABLE users DROP COLUMN username;
        RAISE NOTICE 'Dropped legacy users.username';
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
      ) THEN
        ALTER TABLE users DROP COLUMN role;
        RAISE NOTICE 'Dropped legacy users.role';
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'password'
      ) THEN
        ALTER TABLE users DROP COLUMN password;
        RAISE NOTICE 'Dropped legacy users.password';
      END IF;

      -- ── Ensure unique constraint on email ─────────────────────────────
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'users'::regclass
          AND contype = 'u'
          AND conname = 'users_email_unique'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
        RAISE NOTICE 'Added unique constraint on users.email';
      END IF;

    END $$;
  `);
  console.log("[db-push] Users table migration complete.");
} catch (err) {
  console.log("[db-push] Users migration note (non-fatal):", err.message);
}

await client.end();

console.log("[db-push] Running drizzle-kit push...");
try {
  execSync("npx drizzle-kit push --force", {
    stdio: "inherit",
    env: { ...process.env },
  });
  console.log("[db-push] Schema push completed successfully.");
} catch {
  console.error("[db-push] Schema push failed — see output above for details.");
  process.exit(1);
}
