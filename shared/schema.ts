import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default(""),
  tier: text("tier").notNull().default("free"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  proSince: timestamp("pro_since"),
});

export const scenarios = pgTable("scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  patientSummary: text("patient_summary").notNull(),
  difficulty: text("difficulty").notNull(),
  category: text("category").notNull(),
  certLevel: text("cert_level").notNull(),
  discipline: text("discipline").notNull().default("EMS"),
  imageUrl: text("image_url"),
  estimatedMinutes: integer("estimated_minutes").notNull().default(10),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  departureVideoUrl: text("departure_video_url"),
  gradingMode: text("grading_mode").notNull().default("flexible"),
});

export const scenarioSteps = pgTable("scenario_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scenarioId: varchar("scenario_id").notNull(),
  stepOrder: integer("step_order").notNull(),
  phase: text("phase").notNull(),
  prompt: text("prompt").notNull(),
  patientState: text("patient_state"),
  vitalSigns: jsonb("vital_signs"),
  correctActions: text("correct_actions").array().notNull().default(sql`'{}'::text[]`),
  incorrectActions: text("incorrect_actions").array().notNull().default(sql`'{}'::text[]`),
  feedbackCorrect: text("feedback_correct").notNull(),
  feedbackIncorrect: text("feedback_incorrect").notNull(),
  hint: text("hint"),
  isCritical: boolean("is_critical").notNull().default(false),
  videoUrl: text("video_url"),
  questions: jsonb("questions"),
  criticalCriterion: text("critical_criterion"),
  whyItMatters: text("why_it_matters"),
  nremtSkillSheetItem: text("nremt_skill_sheet_item"),
});

export const attempts = pgTable("attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  scenarioId: varchar("scenario_id").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  totalSteps: integer("total_steps").notNull(),
  correctSteps: integer("correct_steps").notNull().default(0),
  responses: jsonb("responses").notNull().default(sql`'[]'::jsonb`),
  criticalFailure: boolean("critical_failure").notNull().default(false),
  criticalCriterionViolated: text("critical_criterion_violated"),
  endedEarly: boolean("ended_early").notNull().default(false),
});

export const flashcardDecks = pgTable("flashcard_decks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  attemptId: varchar("attempt_id"),
  scenarioId: varchar("scenario_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const flashcards = pgTable("flashcards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deckId: varchar("deck_id").notNull(),
  userId: varchar("user_id").notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  sourceStepId: varchar("source_step_id"),
  easeFactor: real("ease_factor").notNull().default(2.5),
  interval: integer("interval").notNull().default(0),
  repetitions: integer("repetitions").notNull().default(0),
  dueDate: timestamp("due_date").notNull().defaultNow(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const flashcardReviews = pgTable("flashcard_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cardId: varchar("card_id").notNull(),
  userId: varchar("user_id").notNull(),
  quality: integer("quality").notNull(),
  previousInterval: integer("previous_interval").notNull(),
  newInterval: integer("new_interval").notNull(),
  previousEaseFactor: real("previous_ease_factor").notNull(),
  newEaseFactor: real("new_ease_factor").notNull(),
  reviewedAt: timestamp("reviewed_at").notNull().defaultNow(),
});

export const signupSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120),
});
export const signinSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});
export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  tier: "free" | "pro";
  createdAt: string;
  proSince: string | null;
}

export const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  message: z.string().min(5).max(4000),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const insertScenarioSchema = createInsertSchema(scenarios).omit({ id: true });
export const insertScenarioStepSchema = createInsertSchema(scenarioSteps).omit({ id: true });
export const insertAttemptSchema = createInsertSchema(attempts).omit({ id: true });
export const insertFlashcardDeckSchema = createInsertSchema(flashcardDecks).omit({ id: true });
export const insertFlashcardSchema = createInsertSchema(flashcards).omit({ id: true });
export const insertFlashcardReviewSchema = createInsertSchema(flashcardReviews).omit({ id: true });

export type User = typeof users.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type ScenarioStep = typeof scenarioSteps.$inferSelect;
export type InsertScenarioStep = z.infer<typeof insertScenarioStepSchema>;
export type Attempt = typeof attempts.$inferSelect;
export type InsertAttempt = z.infer<typeof insertAttemptSchema>;
export type FlashcardDeck = typeof flashcardDecks.$inferSelect;
export type InsertFlashcardDeck = z.infer<typeof insertFlashcardDeckSchema>;
export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type FlashcardReview = typeof flashcardReviews.$inferSelect;
export type InsertFlashcardReview = z.infer<typeof insertFlashcardReviewSchema>;

export interface VitalSigns {
  hr?: number;
  rr?: number;
  bp?: string;
  spo2?: number;
  etco2?: number;
  skinColor?: string;
  skinTemp?: string;
  skinMoisture?: string;
  pupils?: string;
  gcs?: number;
}

export interface StepQuestion {
  prompt: string;
  patientState?: string;
  vitalSigns?: VitalSigns | null;
  correctActions: string[];
  incorrectActions: string[];
  feedbackCorrect: string;
  feedbackIncorrect: string;
  hint?: string;
  isCritical?: boolean;
}

export interface StepResponse {
  stepId: string;
  questionIndex?: number;
  selectedAction: string;
  isCorrect: boolean;
  timeSpent: number;
  mode?: "multiple-choice" | "open-response";
  aiScore?: number;
  aiIncluded?: string[];
  aiMissed?: string[];
  aiSummary?: string;
}

export interface GradeAnswerRequest {
  prompt: string;
  correctAnswer: string;
  traineeAnswer: string;
}

export interface GradeAnswerResponse {
  score: number;
  included: string[];
  missed: string[];
  summary: string;
}
