import { readFileSync, writeFileSync } from "node:fs";

const path = "server/nremtQuestionGenerator.ts";
let src = readFileSync(path, "utf8");

function replaceOnce(needle: string, replacement: string, label: string): void {
  const idx = src.indexOf(needle);
  if (idx === -1) throw new Error(`Edit "${label}": needle not found`);
  if (src.indexOf(needle, idx + 1) !== -1) throw new Error(`Edit "${label}": needle matched multiple times`);
  src = src.slice(0, idx) + replacement + src.slice(idx + needle.length);
  console.log(`✓ ${label}`);
}

replaceOnce(
  `function buildPrompt(category: NremtCategory, difficulty: number): string {
  const subAreas = NREMT_CATEGORIES[category].map((s) => \`  - \${s}\`).join("\\n");
  const difficultyDesc = DIFFICULTY_DESCRIPTOR[difficulty];

  return \`You are writing a single multiple-choice question for an EMT exam practice bank that mirrors the NREMT EMT cognitive examination. Output strictly valid JSON matching the schema below — no preamble, no markdown fences, no trailing commentary.

CATEGORY: \${category}
SUB-AREAS (pick exactly one and place it in subCategory):
\${subAreas}

DIFFICULTY: \${difficulty} of 5
\${difficultyDesc}`,
  `function buildPrompt(category: NremtCategory, difficulty: number, previousSubAreas: string[] = []): string {
  const subAreas = NREMT_CATEGORIES[category].map((s) => \`  - \${s}\`).join("\\n");
  const difficultyDesc = DIFFICULTY_DESCRIPTOR[difficulty];

  const diversityBlock = previousSubAreas.length === 0
    ? ""
    : \`

DIVERSITY REQUIREMENT:
You have already written questions in this category at this difficulty covering these sub-areas:
\${previousSubAreas.map((s) => \`  - \${s}\`).join("\\n")}
Pick a DIFFERENT sub-area from the list above unless the difficulty level genuinely demands one of these. The goal across the whole bank is broad coverage of EMT scope, not depth on one topic. Even if a covered sub-area feels like the most canonical choice for this difficulty, prefer an uncovered sub-area so the bank reflects the full breadth of NREMT testing.\`;

  return \`You are writing a single multiple-choice question for an EMT exam practice bank that mirrors the NREMT EMT cognitive examination. Output strictly valid JSON matching the schema below — no preamble, no markdown fences, no trailing commentary.

CATEGORY: \${category}
SUB-AREAS (pick exactly one and place it in subCategory):
\${subAreas}\${diversityBlock}

DIFFICULTY: \${difficulty} of 5
\${difficultyDesc}`,
  "Edit 1: add diversity block to prompt builder",
);

replaceOnce(
  `export interface GenerateOptions {
  category: NremtCategory;
  difficulty: number;
  maxRetries?: number;
}`,
  `export interface GenerateOptions {
  category: NremtCategory;
  difficulty: number;
  maxRetries?: number;
  /** Sub-areas already used for this (category, difficulty) bucket. Used to push the AI toward diverse coverage. */
  previousSubAreas?: string[];
}`,
  "Edit 2: extend GenerateOptions",
);

replaceOnce(
  `  const { category, difficulty, maxRetries = 2 } = opts;
  if (difficulty < 1 || difficulty > 5) {
    throw new Error(\`difficulty must be 1-5, got \${difficulty}\`);
  }
  const prompt = buildPrompt(category, difficulty);`,
  `  const { category, difficulty, maxRetries = 2, previousSubAreas = [] } = opts;
  if (difficulty < 1 || difficulty > 5) {
    throw new Error(\`difficulty must be 1-5, got \${difficulty}\`);
  }
  const prompt = buildPrompt(category, difficulty, previousSubAreas);`,
  "Edit 3: thread previousSubAreas through to buildPrompt",
);

writeFileSync(path, src);
console.log("\nGenerator patched.");
