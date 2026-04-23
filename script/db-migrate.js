import { execSync } from "child_process";
import pg from "pg";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("[db-push] ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const masked = dbUrl.replace(/:([^:@]+)@/, ":****@");
console.log(`[db-push] Using database: ${masked}`);

// Resolve the username → email rename before drizzle-kit runs so it
// never sees an ambiguous column difference and never prompts.
const client = new pg.Client({ connectionString: dbUrl });
try {
  await client.connect();
  await client.query(`
    DO $$ BEGIN
      -- username exists, email doesn't → rename
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

      -- both exist (shouldn't happen, but be safe) → drop username
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'username'
      ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email'
      ) THEN
        ALTER TABLE users DROP COLUMN username;
        RAISE NOTICE 'Dropped redundant users.username column';
      END IF;
    END $$;
  `);
  console.log("[db-push] Pre-migration check complete.");
} catch (err) {
  // Table may not exist yet on a fresh database — that's fine, drizzle will create it.
  console.log("[db-push] Pre-migration skipped (table likely doesn't exist yet):", err.message);
} finally {
  await client.end();
}

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
