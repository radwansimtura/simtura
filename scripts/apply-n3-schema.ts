// Phase N3 schema additions:
// - quiz_sessions gains quiz_mode, blueprint_json, current_index, category_difficulty
// - nremt_questions gains a (status, category, difficulty) composite index
//   for the adaptive sampler's hot query.
import { readFileSync, writeFileSync } from "node:fs";

const path = "shared/schema.ts";
let src = readFileSync(path, "utf8");

function replaceOnce(needle: string, replacement: string, label: string): void {
  const idx = src.indexOf(needle);
  if (idx === -1) throw new Error(`Edit "${label}": needle not found`);
  if (src.indexOf(needle, idx + 1) !== -1) throw new Error(`Edit "${label}": needle matched multiple times`);
  src = src.slice(0, idx) + replacement + src.slice(idx + needle.length);
  console.log(`✓ ${label}`);
}

// Edit 1: extend quizSessions with NREMT-mode state.
replaceOnce(
  `export const quizSessions = pgTable("quiz_sessions", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  userId: varchar("user_id").notNull(),
  length: integer("length").notNull(), // 5, 10, or 20
  score: integer("score"), // null until session completed
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});`,
  `export const quizSessions = pgTable("quiz_sessions", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  userId: varchar("user_id").notNull(),
  // 'scenario' (Day 5, dormant) or 'nremt' (Day 6+).
  quizMode: text("quiz_mode").notNull().default("nremt"),
  length: integer("length").notNull(), // scenario: 5/10/20. nremt: 25.
  score: integer("score"), // null until session completed
  // NREMT-mode state — null for scenario sessions.
  // Per-category target counts for this session: { Airway: 5, Cardiology: 6, ... }.
  blueprintJson: jsonb("blueprint_json"),
  // How many questions have been served (0-25). Increments on each /submit.
  currentIndex: integer("current_index").notNull().default(0),
  // Per-category current difficulty (1-5), adjusted after each answer in that category.
  categoryDifficulty: jsonb("category_difficulty"),
  // Question IDs already served, in order. Prevents repeats within a session.
  servedQuestionIds: text("served_question_ids").array().notNull().default(sql\`'{}'::text[]\`),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});`,
  "Edit 1: extend quizSessions with NREMT state",
);

writeFileSync(path, src);
console.log("\nSchema patched. Run drizzle-kit push next.");
