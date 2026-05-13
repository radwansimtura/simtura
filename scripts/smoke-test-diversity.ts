// Verifies the diversity rule: same category/difficulty bucket, three calls,
// each one passing the previous picks. Expect three different sub-areas.
import { generateNremtQuestion } from "../server/nremtQuestionGenerator";

async function main(): Promise<void> {
  const seen: string[] = [];
  console.log("Diversity smoke test: 3 calls to Cardiology / d3 with accumulating exclusions.\n");

  for (let i = 1; i <= 3; i++) {
    console.log(`Call ${i} — excluding: ${seen.length === 0 ? "(none)" : seen.join(", ")}`);
    const q = await generateNremtQuestion({
      category: "Cardiology",
      difficulty: 3,
      previousSubAreas: seen,
    });
    console.log(`  → ${q.subCategory}`);
    seen.push(q.subCategory ?? "(missing)");
    console.log();
  }

  const unique = new Set(seen).size;
  console.log(`Unique sub-areas: ${unique} of 3`);
  if (unique === 3) {
    console.log("PASS — diversity rule biting.");
  } else {
    console.log("FAIL — Claude is repeating sub-areas despite the diversity instruction.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Diversity smoke test failed:", err);
  process.exit(1);
});
