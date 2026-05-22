/**
 * One-shot script: writes pre-seeded scope questions into the questions JSONB
 * column for all steps of the 5 scope-adaptive scenarios already in the DB.
 *
 * Run with:
 *   DATABASE_URL="..." npx tsx server/update-scope-questions.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq } from "drizzle-orm";
import { scenarios, scenarioSteps } from "../shared/schema";
import {
  DROWNING_QUESTIONS,
  DKA_QUESTIONS,
  SEIZURE_QUESTIONS,
  GSW_QUESTIONS,
  STEMI_QUESTIONS,
  StepQuestions,
} from "./scope-questions";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL env var is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const SCENARIO_QUESTION_MAP: Array<{
  title: string;
  questions: Record<number, StepQuestions>;
}> = [
  { title: "Drowning / Near-Drowning", questions: DROWNING_QUESTIONS },
  { title: "Diabetic Ketoacidosis (DKA)", questions: DKA_QUESTIONS },
  { title: "Active Seizure — Status Epilepticus", questions: SEIZURE_QUESTIONS },
  { title: "Penetrating Trauma — GSW Chest", questions: GSW_QUESTIONS },
  { title: "Acute STEMI — Inferior MI", questions: STEMI_QUESTIONS },
];

async function run() {
  let totalUpdated = 0;

  for (const { title, questions } of SCENARIO_QUESTION_MAP) {
    const [scenario] = await db
      .select()
      .from(scenarios)
      .where(eq(scenarios.title, title))
      .limit(1);

    if (!scenario) {
      console.log(`SKIP (not found): ${title}`);
      continue;
    }

    const steps = await db
      .select()
      .from(scenarioSteps)
      .where(eq(scenarioSteps.scenarioId, scenario.id))
      .orderBy(scenarioSteps.stepOrder);

    for (const step of steps) {
      const bank = questions[step.stepOrder];
      if (!bank) {
        console.log(`  SKIP step ${step.stepOrder} of "${title}" — no bank entry`);
        continue;
      }

      await db
        .update(scenarioSteps)
        .set({ questions: bank as any })
        .where(eq(scenarioSteps.id, step.id));

      console.log(`  Updated "${title}" step ${step.stepOrder}`);
      totalUpdated++;
    }
  }

  console.log(`\nDone. ${totalUpdated} steps updated.`);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
