import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/generate-nremt-questions.ts";
let src = readFileSync(path, "utf8");

function replaceOnce(needle: string, replacement: string, label: string): void {
  const idx = src.indexOf(needle);
  if (idx === -1) throw new Error(`Edit "${label}": needle not found`);
  if (src.indexOf(needle, idx + 1) !== -1) throw new Error(`Edit "${label}": needle matched multiple times`);
  src = src.slice(0, idx) + replacement + src.slice(idx + needle.length);
  console.log(`✓ ${label}`);
}

replaceOnce(
  `  let generated = 0;
  let failed = 0;
  const startedAt = Date.now();

  for (const category of Object.keys(TARGET) as NremtCategory[]) {
    for (const difficulty of [1, 2, 3, 4, 5]) {
      const count = TARGET[category][difficulty];
      for (let i = 0; i < count; i++) {
        const idx = generated + failed + 1;
        try {
          const q = await generateNremtQuestion({ category, difficulty });
          await db.insert(nremtQuestions).values(q);
          generated++;
          console.log(
            \`[\${idx}/100] ✓ \${category} d\${difficulty} — \${q.subCategory}\`,
          );
        } catch (err) {
          failed++;
          console.error(
            \`[\${idx}/100] ✗ \${category} d\${difficulty} — \${String(err)}\`,
          );
        }
      }
    }
  }`,
  `  let generated = 0;
  let failed = 0;
  const startedAt = Date.now();

  // Tracks sub-areas already used per (category, difficulty) bucket, so each
  // generation call sees the prior picks and is nudged toward variety.
  const seenSubAreas = new Map<string, string[]>();
  const bucketKey = (cat: NremtCategory, d: number): string => \`\${cat}/d\${d}\`;

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
            \`[\${idx}/100] ✓ \${category} d\${difficulty} — \${q.subCategory}\`,
          );
        } catch (err) {
          failed++;
          console.error(
            \`[\${idx}/100] ✗ \${category} d\${difficulty} — \${String(err)}\`,
          );
        }
      }
    }
  }`,
  "Edit: track and pass previousSubAreas per bucket",
);

writeFileSync(path, src);
console.log("\nOrchestrator patched.");
