import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":****@");
console.log(`[db] Pool connecting to: ${maskedUrl}`);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err.message);
});

export async function probeDatabase(): Promise<void> {
  const parsed = new URL(process.env.DATABASE_URL!);
  console.log(`[db-probe] DATABASE_URL hostname: ${parsed.hostname}  database: ${parsed.pathname.slice(1)}`);

  const client = await pool.connect();
  try {
    const countResult = await client.query(`SELECT COUNT(*) FROM user_sessions`);
    console.log(`[db-probe] SUCCESS: user_sessions exists, row count = ${countResult.rows[0].count}`);
  } catch (err: any) {
    console.error(`[db-probe] FAILURE: user_sessions query failed — ${err.message}`);
  } finally {
    client.release();
  }
}

export const db = drizzle(pool, { schema });
