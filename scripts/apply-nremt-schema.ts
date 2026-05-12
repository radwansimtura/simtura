// One-shot schema edit for Phase N1 (Day 6).
// Modifies quizSessionResponses (nullable stepId/questionIndex + new nremtQuestionId)
// and adds the nremtQuestions table plus its insert schema and types.
import { readFileSync, writeFileSync } from "node:fs";

const path = "shared/schema.ts";
let src = readFileSync(path, "utf8");

function replaceOnce(needle: string, replacement: string, label: string) {
  const idx = src.indexOf(needle);
  if (idx === -1) throw new Error(`Edit "${label}": needle not found`);
  if (src.indexOf(needle, idx + 1) !== -1) throw new Error(`Edit "${label}": needle matched multiple times`);
  src = src.slice(0, idx) + replacement + src.slice(idx + needle.length);
  console.log(`✓ ${label}`);
}

// Edit 1: quizSessionResponses — relax NOT NULL on stepId, questionIndex; add nremtQuestionId.
replaceOnce(
  `  sessionId: varchar("session_id").notNull(),
  // Question identity: stepId + questionIndex (0 for legacy single-question steps).
  stepId: varchar("step_id").notNull(),
  questionIndex: integer("question_index").notNull().default(0),`,
  `  sessionId: varchar("session_id").notNull(),
  // Scenario-quiz path (Day 5, dormant): stepId + questionIndex identify the question.
  // Nullable because NREMT-quiz responses use nremtQuestionId instead.
  stepId: varchar("step_id"),
  questionIndex: integer("question_index"),
  // NREMT-quiz path (Day 6+): references nremt_questions.id.
  // Nullable because scenario-quiz responses use stepId instead.
  nremtQuestionId: varchar("nremt_question_id"),`,
  "Edit 1: relax NOT NULL on scenario-quiz columns, add nremtQuestionId",
);

// Edit 2: insert nremtQuestions table before insertScenarioSchema.
replaceOnce(
  `export const insertScenarioSchema = createInsertSchema(scenarios).omit({ id: true });`,
  `// NREMT mini-test mode: standalone question bank decoupled from scenarios.
// Mirrors the NREMT EMT examination blueprint (5 categories). AI-authored,
// grounded in standard EMS references (AAOS, Limmer, Brady, AHA).
// Questions filtered by status='approved' before serving to users.
export const nremtQuestions = pgTable("nremt_questions", {
  id: varchar("id").primaryKey().default(sql\`gen_random_uuid()\`),
  // One of: Airway, Cardiology, Trauma, Medical, Operations
  category: text("category").notNull(),
  // Free-form sub-area for finer-grained tagging (e.g. "ACS", "Pediatric Airway"). Optional.
  subCategory: text("sub_category"),
  // 1 (entry) through 5 (advanced). Used for difficulty-adaptive sampling.
  difficulty: integer("difficulty").notNull(),
  questionText: text("question_text").notNull(),
  // JSONB array of exactly 4 strings.
  options: jsonb("options").notNull(),
  // 0..3 — index into options[] of the correct choice.
  correctIndex: integer("correct_index").notNull(),
  // Shown to the user after they answer.
  explanation: text("explanation").notNull(),
  // E.g. "AAOS 12e Ch.14" or "AHA 2020 ACLS". Free-form.
  sourceReference: text("source_reference"),
  // draft | approved | retired. Only 'approved' is served to live sessions.
  status: text("status").notNull().default("draft"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertScenarioSchema = createInsertSchema(scenarios).omit({ id: true });`,
  "Edit 2: add nremtQuestions table",
);

// Edit 3: add insertNremtQuestionSchema to the cluster.
replaceOnce(
  `export const insertQuizSessionResponseSchema = createInsertSchema(quizSessionResponses).omit({ id: true });`,
  `export const insertQuizSessionResponseSchema = createInsertSchema(quizSessionResponses).omit({ id: true });
export const insertNremtQuestionSchema = createInsertSchema(nremtQuestions).omit({ id: true, createdAt: true, updatedAt: true });`,
  "Edit 3: add insertNremtQuestionSchema",
);

// Edit 4: add NremtQuestion + InsertNremtQuestion type exports.
replaceOnce(
  `export type InsertQuizSessionResponse = z.infer<typeof insertQuizSessionResponseSchema>;`,
  `export type InsertQuizSessionResponse = z.infer<typeof insertQuizSessionResponseSchema>;
export type NremtQuestion = typeof nremtQuestions.$inferSelect;
export type InsertNremtQuestion = z.infer<typeof insertNremtQuestionSchema>;`,
  "Edit 4: add NremtQuestion type exports",
);

writeFileSync(path, src);
console.log("\nAll edits applied to shared/schema.ts");
