// Phase N3 routes patch:
// 1. Rename Day 5 quiz routes to /api/quiz/scenario/* (dormant, not deleted).
// 2. Inject new NREMT routes (read from scripts/n3-routes-block.txt) above the scenario boost-fsrs route.
// 3. Add nremtQuiz module imports.
import { readFileSync, writeFileSync } from "node:fs";

const routesPath = "server/routes.ts";
const blockPath = "scripts/n3-routes-block.txt";

let src = readFileSync(routesPath, "utf8");
const newRoutesBlock = readFileSync(blockPath, "utf8");

function replaceOnce(needle: string, replacement: string, label: string): void {
  const idx = src.indexOf(needle);
  if (idx === -1) throw new Error(`Edit "${label}": needle not found`);
  if (src.indexOf(needle, idx + 1) !== -1) throw new Error(`Edit "${label}": needle matched multiple times`);
  src = src.slice(0, idx) + replacement + src.slice(idx + needle.length);
  console.log(`✓ ${label}`);
}

// Edit 1: Rename Day 5 /api/quiz/start to scenario path.
replaceOnce(
  '  app.post("/api/quiz/start", requireAuth, async (req, res) => {',
  '  app.post("/api/quiz/scenario/start", requireAuth, async (req, res) => {',
  "Edit 1: rename /api/quiz/start to /api/quiz/scenario/start",
);

// Edit 2: Rename Day 5 /api/quiz/submit to scenario path.
replaceOnce(
  '  app.post("/api/quiz/submit", requireAuth, async (req, res) => {',
  '  app.post("/api/quiz/scenario/submit", requireAuth, async (req, res) => {',
  "Edit 2: rename /api/quiz/submit to /api/quiz/scenario/submit",
);

// Edit 3: Rename Day 5 boost-fsrs route to scenario path.
replaceOnce(
  '  app.post("/api/quiz/:sessionId/boost-fsrs", requireAuth, async (req, res) => {',
  '  app.post("/api/quiz/scenario/:sessionId/boost-fsrs", requireAuth, async (req, res) => {',
  "Edit 3: rename boost-fsrs to /api/quiz/scenario/:sessionId/boost-fsrs",
);

// Edit 4: Add nremtQuiz imports right after the db import.
replaceOnce(
  'import { db } from "./db";',
  `import { db } from "./db";
import {
  SESSION_LENGTH,
  buildCategorySequence,
  computeStartingDifficulties,
  adaptDifficulty,
  pickNextQuestion,
  shuffleOptions,
  questionForClient,
} from "./nremtQuiz";`,
  "Edit 4: add nremtQuiz imports",
);

// Edit 5: Inject the new NREMT routes immediately BEFORE the scenario boost-fsrs route.
replaceOnce(
  '  app.post("/api/quiz/scenario/:sessionId/boost-fsrs", requireAuth, async (req, res) => {',
  newRoutesBlock + '  app.post("/api/quiz/scenario/:sessionId/boost-fsrs", requireAuth, async (req, res) => {',
  "Edit 5: inject new NREMT routes",
);

writeFileSync(routesPath, src);
console.log("\nRoutes patched.");
