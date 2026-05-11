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
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  proSince: timestamp("pro_since"),
  organizationId: varchar("organization_id"),
  premiumSource: text("premium_source"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  securityQuestion: text("security_question"),
  securityAnswerHash: text("security_answer_hash"),
});

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  billingEmail: text("billing_email").notNull(),
  orgType: text("org_type").notNull().default("Other"),
  seats: integer("seats").notNull(),
  pricePerSeatCents: integer("price_per_seat_cents").notNull(),
  courseMonths: integer("course_months").notNull().default(1),
  totalCents: integer("total_cents").notNull(),
  status: text("status").notNull().default("pending"),
  ownerUserId: varchar("owner_user_id"),
  notes: text("notes"),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
});

export const organizationCodes = pgTable("organization_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  code: text("code").notNull().unique(),
  redeemedByUserId: varchar("redeemed_by_user_id"),
  redeemedByEmail: text("redeemed_by_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  redeemedAt: timestamp("redeemed_at"),
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
  // Distractors for quiz/drill mode (3 plausible wrong answers, AI-generated, cached)
  // For multi-question steps, distractors live inside each question object in questions[] JSONB instead.
  distractors: text("distractors").array(),
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
  // FSRS state fields
  difficulty: real("difficulty").notNull().default(0),
  stability: real("stability").notNull().default(0),
  state: text("state").notNull().default("new"), // new | learning | review | relearning
  lapses: integer("lapses").notNull().default(0),
  reps: integer("reps").notNull().default(0),
  priorityBoost: boolean("priority_boost").notNull().default(false),
  dueDate: timestamp("due_date").notNull().defaultNow(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const flashcardReviews = pgTable("flashcard_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cardId: varchar("card_id").notNull(),
  userId: varchar("user_id").notNull(),
  // FSRS rating: 1=Again, 2=Hard, 3=Good, 4=Easy
  rating: integer("rating").notNull(),
  // State before this review
  previousDifficulty: real("previous_difficulty").notNull(),
  previousStability: real("previous_stability").notNull(),
  previousState: text("previous_state").notNull(),
  // State after this review
  newDifficulty: real("new_difficulty").notNull(),
  newStability: real("new_stability").notNull(),
  newState: text("new_state").notNull(),
  // FSRS scheduling
  scheduledFor: timestamp("scheduled_for").notNull(),
  reviewedAt: timestamp("reviewed_at").notNull().defaultNow(),
});

export const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was the make of your first car?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What street did you grow up on?",
] as const;
export type SecurityQuestion = (typeof SECURITY_QUESTIONS)[number];

export const signupSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120),
  securityQuestion: z.enum(SECURITY_QUESTIONS).optional(),
  securityAnswer: z.string().min(2).max(200).optional(),
}).refine(
  (d) => (d.securityQuestion && d.securityAnswer) || (!d.securityQuestion && !d.securityAnswer),
  { message: "Provide both a security question and an answer, or neither.", path: ["securityAnswer"] },
);
export const signinSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});
export const setSecurityQuestionSchema = z.object({
  securityQuestion: z.enum(SECURITY_QUESTIONS),
  securityAnswer: z.string().min(2).max(200),
});
export const forgotPasswordLookupSchema = z.object({
  email: z.string().email().max(200),
});
export const resetPasswordSchema = z.object({
  email: z.string().email().max(200),
  securityAnswer: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});
export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  tier: "free" | "pro";
  isAdmin: boolean;
  createdAt: string;
  proSince: string | null;
  organizationId: string | null;
  premiumSource: string | null;
  hasSecurityQuestion: boolean;
}

export const ORG_TYPES = [
  "EMS Agency",
  "Fire Department",
  "Hospital / Health System",
  "Nursing School",
  "EMS / Paramedic Program",
  "University",
  "Community College",
  "Other",
] as const;

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(160),
  contactName: z.string().min(2).max(160),
  contactEmail: z.string().email().max(200),
  billingEmail: z.string().email().max(200),
  orgType: z.enum(ORG_TYPES).default("Other"),
  seats: z.number().int().min(5).max(10000),
  courseMonths: z.number().int().min(1).max(24).default(4),
  notes: z.string().max(2000).optional(),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const redeemCodeSchema = z.object({
  code: z.string().min(4).max(64),
});
export type RedeemCodeInput = z.infer<typeof redeemCodeSchema>;

export interface PricingTier {
  minSeats: number;
  maxSeats: number | null;
  pricePerSeatCents: number;
  label: string;
  name: string;
  seatRange: string;
  description: string;
  bestFor: string;
  features: string[];
  popular?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    minSeats: 100,
    maxSeats: null,
    pricePerSeatCents: 1600,
    label: "Institution (100+)",
    name: "Institution",
    seatRange: "100+ seats",
    description: "Multiple programs running simultaneously across an organization.",
    bestFor: "Full paramedic academies, large nursing schools, hospital systems training across departments.",
    features: [
      "Unlimited scenarios",
      "Individual student codes",
      "Redemption dashboard",
      "Access ends with course",
      "Priority support",
      "Cohort comparison analytics",
      "Dedicated account manager",
      "Custom onboarding",
      "API access",
    ],
  },
  {
    minSeats: 25,
    maxSeats: 99,
    pricePerSeatCents: 1700,
    label: "Department (25–99)",
    name: "Department",
    seatRange: "25–99 seats",
    description: "Multiple cohorts throughout the year within one department or agency.",
    bestFor: "Nursing departments running multiple cohorts, EMS agencies training multiple shift crews.",
    features: [
      "Unlimited scenarios",
      "Individual student codes",
      "Redemption dashboard",
      "Access ends with course",
      "Priority support",
      "Cohort comparison analytics",
    ],
    popular: true,
  },
  {
    minSeats: 5,
    maxSeats: 24,
    pricePerSeatCents: 1800,
    label: "Single Cohort (5–24)",
    name: "Single Cohort",
    seatRange: "5–24 seats",
    description: "One instructor, one class, one course cycle.",
    bestFor: "Community college EMT courses, hospital onboarding single nurse cohorts, single certification prep classes.",
    features: [
      "Unlimited scenarios",
      "Individual student codes",
      "Redemption dashboard",
      "Access ends with course",
    ],
  },
];

export function pricePerSeatCents(seats: number): number {
  for (const t of PRICING_TIERS) {
    if (seats >= t.minSeats) return t.pricePerSeatCents;
  }
  return PRICING_TIERS[PRICING_TIERS.length - 1].pricePerSeatCents;
}

export const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  message: z.string().min(5).max(4000),
});
export type ContactInput = z.infer<typeof contactSchema>;

export type Organization = typeof organizations.$inferSelect;
export type OrganizationCode = typeof organizationCodes.$inferSelect;

export interface PublicOrganization {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  billingEmail: string;
  orgType: string;
  seats: number;
  pricePerSeatCents: number;
  courseMonths: number;
  totalCents: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  redeemedCount: number;
}

export interface PublicOrganizationCode {
  id: string;
  code: string;
  redeemedByEmail: string | null;
  createdAt: string;
  redeemedAt: string | null;
}

// Quiz / Drill mode: timed practice testing sessions outside of scenario simulation.
// Each session has a fixed length (5/10/20), pulls questions adaptively from the user's
// missed-steps pool first then broadens. No mid-session feedback; all results shown at end.
export const quizSessions = pgTable("quiz_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  length: integer("length").notNull(), // 5, 10, or 20
  score: integer("score"), // null until session completed
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const quizSessionResponses = pgTable("quiz_session_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  // Question identity: stepId + questionIndex (0 for legacy single-question steps).
  stepId: varchar("step_id").notNull(),
  questionIndex: integer("question_index").notNull().default(0),
  // The 4 choices shown to the user, in the order they were shown (one is correct).
  choices: text("choices").array().notNull(),
  // The user's chosen answer text (matches one of choices).
  chosenAnswer: text("chosen_answer"),
  // The correct answer text (matches one of choices).
  correctAnswer: text("correct_answer").notNull(),
  // Did the user get it right?
  isCorrect: boolean("is_correct"),
  // Position in the session (0-indexed).
  displayOrder: integer("display_order").notNull(),
});

export const insertScenarioSchema = createInsertSchema(scenarios).omit({ id: true });
export const insertScenarioStepSchema = createInsertSchema(scenarioSteps).omit({ id: true });
export const insertAttemptSchema = createInsertSchema(attempts).omit({ id: true });
export const insertFlashcardDeckSchema = createInsertSchema(flashcardDecks).omit({ id: true });
export const insertFlashcardSchema = createInsertSchema(flashcards).omit({ id: true });
export const insertFlashcardReviewSchema = createInsertSchema(flashcardReviews).omit({ id: true });
export const insertQuizSessionSchema = createInsertSchema(quizSessions).omit({ id: true });
export const insertQuizSessionResponseSchema = createInsertSchema(quizSessionResponses).omit({ id: true });

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
export type QuizSession = typeof quizSessions.$inferSelect;
export type InsertQuizSession = z.infer<typeof insertQuizSessionSchema>;
export type QuizSessionResponse = typeof quizSessionResponses.$inferSelect;
export type InsertQuizSessionResponse = z.infer<typeof insertQuizSessionResponseSchema>;

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
  elaborationText?: string;
  elaborationFeedback?: string;
  elaborationCaptured?: string[];
  elaborationDidNotMention?: string[];
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

export interface GradeElaborationRequest {
  stepId: string;
  traineeExplanation?: string;
  dontKnow?: boolean;
}

export interface GradeElaborationResponse {
  feedback: string;
  captured: string[];
  didNotMention: string[];
  isReasonable: boolean;
}
