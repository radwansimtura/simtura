import { execSync } from "child_process";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("[db-push] ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const masked = dbUrl.replace(/:([^:@]+)@/, ":****@");
console.log(`[db-push] Using database: ${masked}`);
console.log("[db-push] Running drizzle-kit push --force...");

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
