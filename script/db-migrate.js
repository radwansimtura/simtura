import { execSync } from "child_process";
import pg from "pg";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("[db-push] ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const masked = dbUrl.replace(/:([^:@]+)@/, ":****@");
console.log(`[db-push] Connecting to: ${masked}`);

const client = new pg.Client({ connectionString: dbUrl });
try {
  await client.connect();
  console.log("[db-push] Database connection established.");
} catch (err) {
  console.error("[db-push] ERROR: Failed to connect to database:", err.message);
  process.exit(1);
}

// ── STEP 0: Log search_path so schema mismatches are visible ────────────────
try {
  const sp = await client.query(`SELECT current_schema(), current_schemas(true)`);
  console.log("[db-push] STEP 0: current_schema =", sp.rows[0].current_schema);
  console.log("[db-push] STEP 0: current_schemas =", JSON.stringify(sp.rows[0].current_schemas));
} catch (err) {
  console.warn("[db-push] STEP 0 WARNING: Could not read search_path:", err.message);
}

// ── STEP 1: Create user_sessions table in public schema ──────────────────────
console.log("[db-push] STEP 1: Creating public.user_sessions table...");
try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public."user_sessions" (
      "sid"    varchar      NOT NULL,
      "sess"   json         NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid")
    );
    CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire"
      ON public."user_sessions" ("expire");
  `);
  console.log("[db-push] STEP 1 SUCCESS: public.user_sessions table created (or already existed).");
} catch (err) {
  console.error("[db-push] STEP 1 FAILURE: Could not create user_sessions table:", err.message);
  await client.end();
  process.exit(1);
}

// ── STEP 2: Verify user_sessions table exists ────────────────────────────────
console.log("[db-push] STEP 2: Verifying user_sessions table exists...");
try {
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_sessions';
  `);
  if (result.rowCount === 0) {
    console.error("[db-push] STEP 2 FAILURE: user_sessions table not found after creation attempt.");
    await client.end();
    process.exit(1);
  }
  console.log("[db-push] STEP 2 SUCCESS: user_sessions table confirmed present in database.");
} catch (err) {
  console.error("[db-push] STEP 2 FAILURE: Verification query failed:", err.message);
  await client.end();
  process.exit(1);
}

// ── STEP 3: Resolve users table schema differences before drizzle-kit runs ───
console.log("[db-push] STEP 3: Running users table schema migration...");
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
  console.log("[db-push] STEP 3 SUCCESS: Users table migration complete.");
} catch (err) {
  console.log("[db-push] STEP 3 NOTE (non-fatal): Users migration encountered an issue:", err.message);
}

await client.end();
console.log("[db-push] Database connection closed.");

// ── STEP 4: Run drizzle-kit push ─────────────────────────────────────────────
console.log("[db-push] STEP 4: Running drizzle-kit push...");
try {
  execSync("npx drizzle-kit push --force", {
    stdio: "inherit",
    env: { ...process.env },
  });
  console.log("[db-push] STEP 4 SUCCESS: drizzle-kit schema push completed.");
} catch {
  console.error("[db-push] STEP 4 FAILURE: drizzle-kit push failed — see output above for details.");
  process.exit(1);
}
