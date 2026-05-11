/**
 * One-time seed script: walks every scenario step and generates distractors
 * for all questions that don't have them yet. Persists distractors to DB.
 *
 * Run with: tsx scripts/generate-distractors.ts
 *
 * Idempotent: safe to re-run. Skips questions that already have distractors.
 * Cost estimate: ~$0.005 per question (Sonnet 4.5). Full library ~$0.75.
 */

import { db } from "../server/db";
import { scenarioSteps, scenarios } from "../shared/schema";
import { eq } from "drizzle-orm";
import { generateDistractors } from "../server/distractors";

interface QuestionRecord {
  prompt: string;
  correctActions: string[];
  whyItMatters?: string;
  scenarioTitle?: string;
  stepId: string;
  questionIndex: number | null;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Distractor generation seed script");
  console.log("=".repeat(60));

  const allScenarios = await db.select().from(scenarios);
  const scenarioById = new Map(allScenarios.map((s) => [s.id, s]));

  const allSteps = await db.select().from(scenarioSteps);
  console.log(`Found ${allSteps.length} scenario steps across ${allScenarios.length} scenarios.\n`);

  const todo: QuestionRecord[] = [];
  for (const step of allSteps) {
    const scenarioTitle = scenarioById.get(step.scenarioId)?.title;
    const questions = Array.isArray(step.questions) ? step.questions as any[] : [];

    if (questions.length > 0) {
      questions.forEach((q, idx) => {
        const qPrompt = typeof q.prompt === "string" ? q.prompt.trim() : "";
        const qActions = Array.isArray(q.correctActions) ? q.correctActions.map(String) : [];
        const existing = Array.isArray(q.distractors) ? q.distractors : null;
        if (!qPrompt || qActions.length === 0) return;
        if (existing && existing.length === 3) return;
        todo.push({
          prompt: qPrompt,
          correctActions: qActions,
          whyItMatters: typeof step.whyItMatters === "string" ? step.whyItMatters : undefined,
          scenarioTitle,
          stepId: step.id,
          questionIndex: idx,
        });
      });
    } else {
      const sPrompt = typeof step.prompt === "string" ? step.prompt.trim() : "";
      const sActions = step.correctActions ?? [];
      const existing = Array.isArray(step.distractors) ? step.distractors : null;
      if (!sPrompt || sActions.length === 0) continue;
      if (existing && existing.length === 3) continue;
      todo.push({
        prompt: sPrompt,
        correctActions: sActions,
        whyItMatters: typeof step.whyItMatters === "string" ? step.whyItMatters : undefined,
        scenarioTitle,
        stepId: step.id,
        questionIndex: null,
      });
    }
  }

  console.log(`${todo.length} questions need distractors.\n`);
  if (todo.length === 0) {
    console.log("Nothing to do. All questions already have distractors.");
    process.exit(0);
  }

  const estimatedCost = (todo.length * 0.005).toFixed(2);
  console.log(`Estimated cost: ~$${estimatedCost} (at $0.005/question, Sonnet 4.5)\n`);
  console.log("Starting generation. Press Ctrl+C to abort.\n");

  let succeeded = 0;
  let failed = 0;
  for (let i = 0; i < todo.length; i++) {
    const q = todo[i];
    const label = `[${i + 1}/${todo.length}]`;
    try {
      process.stdout.write(`${label} ${q.prompt.slice(0, 60)}... `);
      const distractors = await generateDistractors({
        prompt: q.prompt,
        correctAnswers: q.correctActions,
        whyItMatters: q.whyItMatters,
        scenarioContext: q.scenarioTitle,
      });

      if (q.questionIndex === null) {
        await db
          .update(scenarioSteps)
          .set({ distractors })
          .where(eq(scenarioSteps.id, q.stepId));
      } else {
        const [step] = await db
          .select()
          .from(scenarioSteps)
          .where(eq(scenarioSteps.id, q.stepId));
        if (!step) throw new Error("step disappeared");
        const updated = Array.isArray(step.questions) ? [...(step.questions as any[])] : [];
        updated[q.questionIndex] = { ...updated[q.questionIndex], distractors };
        await db
          .update(scenarioSteps)
          .set({ questions: updated })
          .where(eq(scenarioSteps.id, q.stepId));
      }

      succeeded++;
      console.log("✓");
    } catch (err: any) {
      failed++;
      console.log(`✗  (${err?.message || "unknown error"})`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Done. Succeeded: ${succeeded}. Failed: ${failed}.`);
  if (failed > 0) {
    console.log("Re-run the script to retry failed questions.");
  }
  console.log("=".repeat(60));
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
