import { spawn } from "child_process";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("[db-push] ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const masked = dbUrl.replace(/:([^:@]+)@/, ":****@");
console.log(`[db-push] Using database: ${masked}`);
console.log("[db-push] Running drizzle-kit push (non-interactive)...");

const child = spawn("npx", ["drizzle-kit", "push", "--force"], {
  env: { ...process.env },
  stdio: ["pipe", "inherit", "inherit"],
});

// Auto-answer all interactive prompts by sending Enter repeatedly.
// --force skips confirmations but not rename-detection prompts (e.g.
// "is email renamed from username?"). Piping newlines selects the
// first/default option ("create new column") for every such prompt.
child.stdin.write("\n".repeat(20));
child.stdin.end();

child.on("close", (code) => {
  if (code === 0) {
    console.log("[db-push] Schema push completed successfully.");
  } else {
    console.error(`[db-push] Schema push failed with exit code ${code}.`);
    process.exit(1);
  }
});
