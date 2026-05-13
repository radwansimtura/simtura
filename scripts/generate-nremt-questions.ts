// Generates the soft-beta NREMT question bank (100 questions) and inserts
// each as status='draft' into the DB. Run once. Idempotency is via inspection:
// re-running adds another 100, so check the table before re-running.
//
// Usage: npx tsx scripts/generate-nremt-questions.ts
import { db } from "../server/db";
import { nremtQuestions } from "../shared/schema";
import {
  generateNremtQuestion,
  NREMT_CATEGORIES,
  type NremtCategory,
} from "../server/nremtQuestionGenerator";

// Target counts per (category, difficulty). Sums to 100 exactly.
// Distribution: NREMT blueprint weights x within-category difficulty spread 15/25/30/20/10.
const TARGET: Record<NremtCategory, Record<number, number>> = {
  Airway:     { 1: 3, 2: 5, 3: 6, 4: 4, 5: 2 }, // 20
  Cardiology: { 1: 3, 2: 6, 3: 7, 4: 4, 5: 2 }, // 22
  Trauma:     { 1: 2, 2: 4, 3: 5, 4: 3, 5: 2 }, // 16
  Medical:    { 1: 4, 2: 7, 3: 9, 4: 5, 5: 3 }, // 28
  Operations: { 1: 2, 2: 4, 3: 4, 4: 3, 5: 1 }, // 14
};

function totalsCheck(): void {
  let total = 0;
  for (const cat of Object.keys(TARGET) as NremtCategory[]) {
    let catTotal = 0;
    for (const d of [1, 2, 3, 4, 5]) catTotal += TARGET[cat][d];
    console.log(`  ${cat}: ${catTotal}`);
    total += catTotal;
  }
  console.log(`  TOTAL: ${total}`);
}

async function main(): Promise<void> {
  console.log("NREMT question generation — soft beta (100 questions)");
  console.log("Target distribution:");
  totalsCheck();
  console.log();

  // Pre-flight: confirm category sub-areas are present (sanity check).
  for (const cat of Object.keys(TARGET) as NremtCategory[]) {
    if (!NREMT_CATEGORIES[cat] || NREMT_CATEGORIES[cat].length === 0) {
      throw new Error(`No sub-areas defined for ${cat}`);
    }
  }

  let generated = 0;
  let failed = 0;
  const startedAt = Date.now();

  // Tracks sub-areas already used per (category, difficulty) bucket, so each
  // generation call sees the prior picks and is nudged toward variety.
  const seenSubAreas = new Map<string, string[]>();
  const bucketKey = (cat: NremtCategory, d: number): string => `${cat}/d${d}`;

  for (const category of Object.keys(TARGET) as NremtCategory[]) {
    for (const difficulty of [1, 2, 3, 4, 5]) {
      const count = TARGET[category][difficulty];
      const key = bucketKey(category, difficulty);
      seenSubAreas.set(key, []);

      for (let i = 0; i < count; i++) {
        const idx = generated + failed + 1;
        const previousSubAreas = seenSubAreas.get(key) ?? [];
        try {
          const q = await generateNremtQuestion({
            category,
            difficulty,
            previousSubAreas,
          });
          await db.insert(nremtQuestions).values(q);
          generated++;
          // Track this sub-area so the next call in this bucket avoids it.
          if (q.subCategory) {
            seenSubAreas.set(key, [...previousSubAreas, q.subCategory]);
          }
          console.log(
            `[${idx}/100] ✓ ${category} d${difficulty} — ${q.subCategory}`,
          );
        } catch (err) {
          failed++;
          console.error(
            `[${idx}/100] ✗ ${category} d${difficulty} — ${String(err)}`,
          );
        }
      }
    }
  }

  const elapsedMin = ((Date.now() - startedAt) / 60000).toFixed(1);
  console.log();
  console.log(`Done in ${elapsedMin} min`);
  console.log(`Generated: ${generated}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
