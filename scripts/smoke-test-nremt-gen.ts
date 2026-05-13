// Throwaway: generate one NREMT question and print it. Verifies the generator
// works end-to-end (API call, JSON parse, zod validate, sub-area check)
// before committing to the full 100-question run.
import { generateNremtQuestion } from "../server/nremtQuestionGenerator";

async function main(): Promise<void> {
  console.log("Smoke test: generating one Cardiology / difficulty 3 question...\n");
  const q = await generateNremtQuestion({ category: "Cardiology", difficulty: 3 });
  console.log("CATEGORY:    ", q.category);
  console.log("SUB-CATEGORY:", q.subCategory);
  console.log("DIFFICULTY:  ", q.difficulty);
  console.log("SOURCE:      ", q.sourceReference);
  console.log();
  console.log("Q:", q.questionText);
  console.log();
  const opts = q.options as string[];
  opts.forEach((opt, i) => {
    const marker = i === q.correctIndex ? "✓" : " ";
    console.log(`  ${marker} ${String.fromCharCode(65 + i)}. ${opt}`);
  });
  console.log();
  console.log("EXPLANATION:", q.explanation);
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
