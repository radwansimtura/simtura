import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { gradeCard, newCardState } from "./flashcards";
import { seedDatabase } from "./seed";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import rateLimit from "express-rate-limit";
import { requireAuth } from "./auth";
import { sendUpgradeNudgeEmail, sendContactEmail, sendNotifyInterestEmail } from "./email";
import {
  contactSchema,
  createOrganizationSchema,
  redeemCodeSchema,
  pricePerSeatCents,
  type PublicOrganization,
  type PublicOrganizationCode,
  type ScenarioStep,
  quizSessions,
  quizSessionResponses,
  nremtQuestions,
  flashcards,
} from "@shared/schema";
import { db } from "./db";
import {
  SESSION_LENGTH,
  buildCategorySequence,
  computeStartingDifficulties,
  adaptDifficulty,
  pickNextQuestion,
  shuffleOptions,
  questionForClient,
} from "./nremtQuiz";
import { eq, and, asc, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { getUncachableStripeClient } from "./stripeClient";

function generateCode(): string {
  // 12-character base32-style alphanumeric, easy to read (no 0/O/1/I)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

function toPublicOrg(org: any, redeemedCount: number): PublicOrganization {
  return {
    id: org.id,
    name: org.name,
    contactName: org.contactName,
    contactEmail: org.contactEmail,
    billingEmail: org.billingEmail,
    orgType: org.orgType,
    seats: org.seats,
    pricePerSeatCents: org.pricePerSeatCents,
    courseMonths: org.courseMonths ?? 1,
    totalCents: org.totalCents,
    status: org.status,
    createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : org.createdAt,
    paidAt: org.paidAt ? (org.paidAt instanceof Date ? org.paidAt.toISOString() : org.paidAt) : null,
    redeemedCount,
  };
}

function toPublicCode(c: any): PublicOrganizationCode {
  return {
    id: c.id,
    code: c.code,
    redeemedByEmail: c.redeemedByEmail ?? null,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    redeemedAt: c.redeemedAt ? (c.redeemedAt instanceof Date ? c.redeemedAt.toISOString() : c.redeemedAt) : null,
  };
}

const FREE_DAILY_LIMIT = 1;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 15000 });

const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});

function getNremtMedicalPrompt(): string {
  return `You are a strict but supportive EMS training evaluator grading a trainee against the NREMT E202 Patient Assessment/Management — Medical skill sheet.

You will be given:
- The step's prompt (what was asked)
- The correct actions array (what they need to verbalize/do)
- The incorrect actions array (common wrong answers)
- The critical criterion this step can violate (if any)
- The trainee's response

Evaluate the response. The trainee passes if their response covers the clinically required elements in the correctActions array — phrasing variations are acceptable, but the substance must be present.

CRITICAL CRITERIA HANDLING:
If this step has a criticalCriterion AND the trainee's response would trigger that critical failure on the actual NREMT exam, set "criticalFailure": true and identify which criterion was violated. Examples:
- Skipping PPE entirely → "Failure to take or verbalize appropriate PPE precautions"
- Entering scene without scene safety → "Failure to determine scene safety before approaching patient"
- Skipping oxygen when indicated → "Failure to voice and ultimately provide appropriate oxygen therapy"
- Giving a medication the patient is allergic to → "Orders a dangerous or inappropriate intervention"
- Performing secondary assessment before completing primary → "Performs secondary examination before assessing and treating threats to airway, breathing and circulation"

Only flag criticalFailure if the response GENUINELY violates the criterion, not if it's just incomplete or imperfect.

Respond ONLY with a JSON object in this exact format (no markdown, no preamble):
{
  "pass": true or false,
  "score": 0-100,
  "summary": "One sentence verdict",
  "correct": ["thing they got right"],
  "missed": ["thing they missed"],
  "tip": "One actionable coaching tip",
  "whyItMatters": "One sentence explaining why the clinically correct action matters — only populate if they missed something",
  "criticalFailure": true or false,
  "criticalCriterionViolated": "exact text of the criterion violated, or null"
}`;
}

function getFlexiblePrompt(): string {
  return `You are a supportive clinical training evaluator grading an EMS or healthcare trainee on their response to a scenario step.

You will be given:
- The step's prompt (what was asked)
- The correct actions array (clinically appropriate things to say or do)
- The incorrect actions array (common wrong answers)
- The trainee's response

Evaluate based on whether the trainee's response covers the clinically required elements in the correctActions array. Phrasing variations are acceptable — focus on clinical substance, not wording. Partial credit is fine.

Be supportive in tone. The goal is helping the trainee learn, not catching them out.

Respond ONLY with a JSON object in this exact format (no markdown, no preamble):
{
  "pass": true or false,
  "score": 0-100,
  "summary": "One sentence verdict",
  "correct": ["thing they got right"],
  "missed": ["thing they missed"],
  "tip": "One actionable coaching tip",
  "whyItMatters": null,
  "criticalFailure": false,
  "criticalCriterionViolated": null
}

Note: criticalFailure is always false in flexible mode. whyItMatters should be null in flexible mode unless naturally relevant (you may populate it with a brief clinical rationale, but it is not required).`;
}

function getElaborationPrompt(hasPreviousStep: boolean): string {
  const sequenceFraming = hasPreviousStep
    ? `The trainee was asked WHY the correct action is the right step IMMEDIATELY AFTER the previous action they completed. Their explanation should articulate the procedural transition logic — why one step necessitates or enables the next. Look for reasoning about clinical sequencing, dependencies between assessment phases, and why this ordering is required (not arbitrary).`
    : `The trainee was asked WHY the correct action is the right FIRST step in this scenario. Their explanation should articulate why this action takes priority before any other action — typically related to scene safety, BSI/PPE, or establishing a foundation for the rest of the call.`;

  return `You are an EMS educator providing encouraging feedback on a trainee's clinical reasoning. They have just gotten a question wrong and are trying to articulate WHY the correct answer is the correct next step in the procedural sequence.

${sequenceFraming}

You will receive:
- The scenario question
- The correct action(s) they should have taken
- The previous step's correct action (if applicable)
- The canonical clinical rationale (whyItMatters)
- The trainee's attempted explanation

Your job: ENCOURAGE cognitive engagement. ANY reasonable attempt at reasoning about the sequence deserves positive feedback. Highlight what they captured. Gently note things they didn't mention. Do NOT be strict, punitive, or critical. The trainee already got the question wrong — your role here is to reward the act of trying to reason about WHY the procedural order matters.

Tone: warm, supportive, like a senior medic saying "Yeah, you've got the right idea."

If the trainee's explanation is brief, off-topic, or shows confusion: still find something to validate, then provide the rationale gently.

Output ONLY valid JSON in this exact shape:
{
  "feedback": "2-3 warm encouraging sentences acknowledging their reasoning",
  "captured": ["concept they got right", "another concept they got right"],
  "didNotMention": ["aspect they didn't address — phrase neutrally, not as failure"],
  "isReasonable": true or false
}`;
}

function getDidNotKnowPrompt(hasPreviousStep: boolean): string {
  const sequenceFraming = hasPreviousStep
    ? `The trainee did NOT know why the correct action is the right step immediately after the previous one. They need a teaching-focused explanation of the procedural sequence, not just a restatement of the canonical rationale.`
    : `The trainee did NOT know why the correct action is the right first step in this scenario. They need a teaching-focused explanation that connects this action to the broader patient-care logic, not just a restatement of the canonical rationale.`;

  return `You are an EMS educator working with a trainee who has admitted they don't understand WHY the correct action is right. Your role is to teach them — warmly, clearly, and concretely — the reasoning behind it.

${sequenceFraming}

You will receive:
- The scenario question
- The correct action(s) they should have taken
- The previous step's correct action (if applicable)
- The canonical clinical rationale (whyItMatters)

Your job: Generate a richer, more pedagogical explanation than the canonical rationale alone. Help the trainee build a mental model. Specifically:

1. State the core reason clearly in plain language (1 sentence)
2. Connect it to clinical reasoning they likely already know (1-2 sentences) — e.g., reference anatomy, physiology, the "why" behind ABCs, or the logic of patient assessment progression
3. Give a concrete example or scenario that makes the abstract idea click (1-2 sentences) — e.g., "Imagine if you skipped this step and the patient turned out to have..."
4. End with a brief "remember this" anchor that connects to the procedural sequence

Tone: warm, patient, like a senior medic explaining something for the third time without making the trainee feel stupid. Encouraging but substantive — actually teach, don't just sympathize.

Output ONLY valid JSON in this exact shape:
{
  "feedback": "3-5 sentences of teaching-focused explanation following the structure above",
  "captured": [],
  "didNotMention": ["concept they should now understand", "another key concept"],
  "isReasonable": false
}`;
}

const gradeAnswerSchema = z.object({
  stepId: z.string().min(1),
  questionIndex: z.number().int().min(0).optional(),
  traineeAnswer: z.string().min(1).max(2000),
});

const gradeElaborationSchema = z.object({
  stepId: z.string().min(1),
  traineeExplanation: z.string().max(2000).optional(),
  dontKnow: z.boolean().optional(),
});

const evaluateSchema = z.object({
  stepId: z.string().min(1),
  traineeResponse: z.string().min(1).max(2000),
  questionIndex: z.number().int().min(0).optional(),
});

const createAttemptSchema = z.object({
  scenarioId: z.string().min(1),
  totalSteps: z.number().int().min(0),
});

const updateAttemptSchema = z.object({
  completedAt: z.string().optional(),
  score: z.number().int().min(0).max(100).optional(),
  correctSteps: z.number().int().min(0).optional(),
  responses: z.array(z.object({
    stepId: z.string(),
    questionIndex: z.number().int().min(0).optional(),
    selectedAction: z.string(),
    isCorrect: z.boolean(),
    timeSpent: z.number(),
  })).optional(),
  criticalFailure: z.boolean().optional(),
  criticalCriterionViolated: z.string().nullable().optional(),
  endedEarly: z.boolean().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDatabase();


  app.post("/api/grade-answer", aiRateLimit, async (req, res) => {
    const parsed = gradeAnswerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.format() });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ message: "Grading service not configured" });
    }

    const { stepId, questionIndex, traineeAnswer } = parsed.data;

    const step = await storage.getScenarioStep(stepId);
    if (!step) {
      return res.status(404).json({ message: "Step not found" });
    }

    let prompt: string;
    let correctActions: string[];
    const questionsArr = (step.questions as any[]) || null;
    if (questionsArr && Array.isArray(questionsArr) && questionsArr.length > 0) {
      const qIdx = typeof questionIndex === "number" ? questionIndex : 0;
      const q = questionsArr[qIdx];
      if (!q) return res.status(400).json({ message: "Invalid questionIndex" });
      prompt = String(q.prompt || "");
      correctActions = Array.isArray(q.correctActions) ? q.correctActions.map(String) : [];
    } else {
      prompt = step.prompt || "";
      correctActions = step.correctActions || [];
    }

    if (!prompt || correctActions.length === 0) {
      return res.status(400).json({ message: "Step has no gradable content" });
    }

    const correctAnswer = correctActions.join(" AND also: ");

    const systemPrompt = `You are a supportive but accurate clinical-training grader. You DO NOT provide medical advice or invent new clinical guidance. Your ONLY job is to compare a trainee's free-text answer against a single pre-validated, licensed-professional-approved correct answer and return a congruency score from 0 to 100.

You are grading STUDENTS who are LEARNING. Be generous when the trainee demonstrates correct clinical reasoning, even if their wording is informal, incomplete, or uses layperson terms for the right concepts. Focus on whether they would DO the right thing, not whether they cited every detail.

Scoring guide:
- 90-100 = Trainee identifies the core clinical action(s) and most key elements. Wording can differ, order can differ, minor details can be missing.
- 75-89 = Trainee gets the right general approach and identifies the most important element(s), but misses some secondary specifics or rationale.
- 60-74 = Trainee is on the right track — correct general direction — but missed one important specific or was vague on key details.
- 40-59 = Partial match; trainee identified the right category of action but missed critical specifics that would change patient outcome.
- 20-39 = Trainee shows some relevant knowledge but the answer is substantively incomplete or contains a significant error mixed with some correct elements.
- 1-19 = Largely incorrect or missed the core action entirely.
- 0 = Completely wrong, dangerous, or irrelevant.

IMPORTANT: If the trainee's answer captures the MAIN clinical action (e.g., "give high-flow oxygen" or "apply NRB at 15L") award at least 75 even if they omit secondary rationale. Do NOT penalize heavily for missing supplementary details that do not change the core intervention.

Return ONLY a JSON object (no markdown fences, no commentary) with this exact shape:
{
  "score": <integer 0-100>,
  "correct": [<short bullet strings of correct elements the trainee covered>],
  "missed": [<short bullet strings of key elements from the correct answer the trainee did NOT cover>],
  "summary": "<one sentence, max 25 words, encouraging but factual — do NOT add medical advice>"
}`;

    const userPrompt = `QUESTION:
${prompt}

CORRECT ANSWER (validated by licensed clinician — this is the source of truth):
${correctAnswer}

TRAINEE'S ANSWER:
${traineeAnswer}

Grade the trainee's answer against the correct answer. Be generous with scoring when the core clinical action is correct. Return JSON only.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return res.status(502).json({ message: "Grader returned no text" });
      }

      let raw = textBlock.text.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      }

      const parsedResp = JSON.parse(raw);
      const score = Math.max(0, Math.min(100, Math.round(Number(parsedResp.score) || 0)));
      const correct = Array.isArray(parsedResp.correct) ? parsedResp.correct.map(String).slice(0, 8) : [];
      const missed = Array.isArray(parsedResp.missed) ? parsedResp.missed.map(String).slice(0, 8) : [];
      const summary = typeof parsedResp.summary === "string" ? parsedResp.summary.slice(0, 300) : "";

      res.json({ score, correct, missed, summary });
    } catch (err: any) {
      console.error("Grading error:", err);
      res.status(500).json({ message: "Grading failed", error: err?.message ?? "unknown" });
    }
  });

  app.post("/api/evaluate", aiRateLimit, async (req, res) => {
    const parsed = evaluateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.format() });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ message: "Evaluation service not configured" });
    }

    const { stepId, traineeResponse, questionIndex } = parsed.data;

    const step = await storage.getScenarioStep(stepId);
    if (!step) {
      return res.status(404).json({ message: "Step not found" });
    }

    let prompt: string;
    let correctActions: string[];
    const questionsArr = (step.questions as any[]) || null;
    if (questionsArr && Array.isArray(questionsArr) && questionsArr.length > 0) {
      const qIdx = typeof questionIndex === "number" ? questionIndex : 0;
      const q = questionsArr[qIdx];
      if (!q) return res.status(400).json({ message: "Invalid questionIndex" });
      prompt = String(q.prompt || "");
      correctActions = Array.isArray(q.correctActions) ? q.correctActions.map(String) : [];
    } else {
      prompt = step.prompt || "";
      correctActions = step.correctActions || [];
    }

    if (!prompt || correctActions.length === 0) {
      return res.status(400).json({ message: "Step has no gradable content" });
    }

    const scenario = await storage.getScenario(step.scenarioId);
    const gradingMode = scenario?.gradingMode ?? "flexible";
    const systemPrompt = gradingMode === "nremt_medical" ? getNremtMedicalPrompt() : getFlexiblePrompt();

    const userMessage = `Step Prompt: ${prompt}
Correct Actions Required: ${JSON.stringify(correctActions)}
Common Incorrect Actions: ${JSON.stringify(step.incorrectActions)}
Critical Criterion This Step Can Violate: ${step.criticalCriterion || "None"}
Why It Matters Clinically: ${step.whyItMatters || "Not specified"}
NREMT Skill Sheet Item: ${step.nremtSkillSheetItem || "Not specified"}
Trainee's Response: "${traineeResponse}"

Evaluate the trainee's response.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return res.status(502).json({ message: "Evaluator returned no text" });
      }

      let raw = textBlock.text.trim();
      if (raw.startsWith("\`\`\`")) {
        raw = raw.replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\`\`\`\s*$/, "").trim();
      }

      const parsedResp = JSON.parse(raw);
      res.json({
        pass: Boolean(parsedResp.pass),
        score: Math.max(0, Math.min(100, Math.round(Number(parsedResp.score) || 0))),
        summary: typeof parsedResp.summary === "string" ? parsedResp.summary.slice(0, 300) : "",
        correct: Array.isArray(parsedResp.correct) ? parsedResp.correct.map(String).slice(0, 8) : [],
        missed: Array.isArray(parsedResp.missed) ? parsedResp.missed.map(String).slice(0, 8) : [],
        tip: typeof parsedResp.tip === "string" ? parsedResp.tip.slice(0, 300) : "",
        whyItMatters: typeof parsedResp.whyItMatters === "string" ? parsedResp.whyItMatters.slice(0, 500) : null,
        criticalFailure: Boolean(parsedResp.criticalFailure),
        criticalCriterionViolated: typeof parsedResp.criticalCriterionViolated === "string" ? parsedResp.criticalCriterionViolated : null,
      });
    } catch (err: any) {
      console.error("Evaluation error:", err);
      res.status(500).json({ message: "Evaluation failed", error: err && err.message ? err.message : "unknown" });
    }
  });

  app.post("/api/grade-elaboration", aiRateLimit, async (req, res) => {
    const parsed = gradeElaborationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.format() });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ message: "Grading service not configured" });
    }

    const { stepId, traineeExplanation, dontKnow } = parsed.data;

    const step = await storage.getScenarioStep(stepId);
    if (!step) {
      return res.status(404).json({ message: "Step not found" });
    }

    const explanation = traineeExplanation?.trim() || "";
    if (!dontKnow && !explanation) {
      return res.status(400).json({ message: "traineeExplanation required when dontKnow is not set" });
    }

    // Look up the previous step for sequence-focused elaboration framing
    const allSteps = await storage.getScenarioSteps(step.scenarioId);
    const previousStep = allSteps
      .filter((s) => s.stepOrder === step.stepOrder - 1)
      .at(0);
    const previousStepAction = previousStep?.correctActions?.[0] || null;

    const correctActions = step.correctActions || [];
    const whyItMatters = step.whyItMatters || "Not specified";

    const userMessage = dontKnow
      ? `Scenario Question: ${step.prompt}
Previous Step's Correct Action: ${previousStepAction || "(none — this is the first step)"}
Current Step's Correct Action(s): ${correctActions.join("; ")}
Clinical Rationale (whyItMatters): ${whyItMatters}

The trainee said they don't know why this is the correct ${previousStepAction ? "step immediately after the previous action" : "first action"}. Teach them the reasoning following the structured format in your instructions.`
      : `Scenario Question: ${step.prompt}
Previous Step's Correct Action: ${previousStepAction || "(none — this is the first step)"}
Current Step's Correct Action(s): ${correctActions.join("; ")}
Clinical Rationale (whyItMatters): ${whyItMatters}
Trainee's Explanation: "${explanation}"

Evaluate their reasoning about why this is the correct ${previousStepAction ? "step immediately after the previous action" : "first action"}.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 600,
        system: dontKnow ? getDidNotKnowPrompt(!!previousStepAction) : getElaborationPrompt(!!previousStepAction),
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return res.status(502).json({ message: "Elaboration grader returned no text" });
      }

      let raw = textBlock.text.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      }

      const parsedResp = JSON.parse(raw);
      res.json({
        feedback: typeof parsedResp.feedback === "string" ? parsedResp.feedback.slice(0, 600) : "",
        captured: Array.isArray(parsedResp.captured) ? parsedResp.captured.map(String).slice(0, 8) : [],
        didNotMention: Array.isArray(parsedResp.didNotMention) ? parsedResp.didNotMention.map(String).slice(0, 8) : [],
        isReasonable: Boolean(parsedResp.isReasonable),
      });
    } catch (err: any) {
      console.error("Elaboration grading error:", err);
      res.status(500).json({ message: "Elaboration grading failed", error: err?.message ?? "unknown" });
    }
  });

  app.get("/api/scenarios", async (req, res) => {
    const allScenarios = await storage.getAllScenarios();
    const published = allScenarios.filter(s => s.published);
    const discipline = req.query.discipline as string | undefined;
    if (discipline) {
      return res.json(published.filter(s => s.discipline === discipline));
    }
    res.json(published);
  });

  app.get("/api/scenarios/:id", async (req, res) => {
    const scenario = await storage.getScenario(req.params.id);
    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found" });
    }
    res.json(scenario);
  });

  app.get("/api/scenarios/:id/steps", requireAuth, async (req, res) => {
    const steps = await storage.getScenarioSteps(req.params.id as string);
    res.json(steps);
  });

  app.post("/api/attempts", async (req, res) => {
    const parsed = createAttemptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
    }

    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({
        message: "Sign in to start a scenario.",
        code: "auth_required",
      });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "Session expired", code: "auth_required" });
    }

    if (!user.isAdmin && user.tier !== "pro") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todayCount = await storage.countUserAttemptsSince(userId, startOfDay);
      if (todayCount >= FREE_DAILY_LIMIT) {
        sendUpgradeNudgeEmail(user.email, user.name).catch(() => {});
        return res.status(429).json({
          message: "You've used today's free scenario. Upgrade for unlimited access.",
          code: "free_limit_reached",
          limit: FREE_DAILY_LIMIT,
          used: todayCount,
        });
      }
    }

    const attempt = await storage.createAttempt({
      userId,
      scenarioId: parsed.data.scenarioId,
      totalSteps: parsed.data.totalSteps,
      correctSteps: 0,
      responses: [],
    });
    res.json(attempt);
  });

  app.get("/api/me/stats", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const allAttempts = await storage.getUserAttempts(userId, 200);
    const completed = allAttempts.filter((a) => a.completedAt && typeof a.score === "number");
    const totalAttempts = allAttempts.length;
    const totalCompleted = completed.length;
    const avgScore = completed.length
      ? Math.round(completed.reduce((s, a) => s + (a.score || 0), 0) / completed.length)
      : 0;
    const bestScore = completed.length ? Math.max(...completed.map((a) => a.score || 0)) : 0;
    const passed = completed.filter((a) => (a.score || 0) >= 80).length;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await storage.countUserAttemptsSince(userId, startOfDay);

    const allScenarios = await storage.getAllScenarios();
    const scenarioMap = new Map(allScenarios.map((s) => [s.id, s]));

    const recent = allAttempts.slice(0, 10).map((a) => ({
      id: a.id,
      scenarioId: a.scenarioId,
      scenarioTitle: scenarioMap.get(a.scenarioId)?.title || "Unknown scenario",
      discipline: scenarioMap.get(a.scenarioId)?.discipline || null,
      startedAt: a.startedAt,
      completedAt: a.completedAt,
      score: a.score,
    }));

    res.json({
      totalAttempts,
      totalCompleted,
      avgScore,
      bestScore,
      passed,
      todayCount,
      dailyLimit: (user.isAdmin || user.tier === "pro") ? null : FREE_DAILY_LIMIT,
      tier: user.tier,
      recent,
    });
  });

  app.post("/api/me/onboard", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const user = await storage.markOnboarded(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ ok: true });
  });

  app.patch("/api/admin/scenarios/:id/publish", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const user = await storage.getUser(userId);
    if (!user?.isAdmin) return res.status(403).json({ message: "Forbidden" });
    const { published } = z.object({ published: z.boolean() }).parse(req.body);
    const scenario = await storage.setScenarioPublished(req.params.id as string, published);
    if (!scenario) return res.status(404).json({ message: "Scenario not found" });
    res.json(scenario);
  });

  app.post("/api/contact", async (req, res) => {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.format() });
    }
    sendContactEmail(parsed.data.name, parsed.data.email, parsed.data.message).catch(() => {});
    res.json({ ok: true });
  });

  app.post("/api/notify-interest", async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      discipline: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid email" });
    sendNotifyInterestEmail(parsed.data.discipline, parsed.data.email).catch(() => {});
    res.json({ ok: true });
  });

  app.patch("/api/attempts/:id", requireAuth, async (req, res) => {
    const parsed = updateAttemptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
    }
    const existing = await storage.getAttempt(req.params.id as string);
    if (!existing) {
      return res.status(404).json({ message: "Attempt not found" });
    }
    if (existing.userId !== (req.session as any).userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const updated = await storage.updateAttempt(req.params.id as string, {
      completedAt: parsed.data.completedAt ? new Date(parsed.data.completedAt) : undefined,
      score: parsed.data.score,
      correctSteps: parsed.data.correctSteps,
      responses: parsed.data.responses,
      criticalFailure: parsed.data.criticalFailure,
      criticalCriterionViolated: parsed.data.criticalCriterionViolated ?? undefined,
      endedEarly: parsed.data.endedEarly,
    });
    if (!updated) {
      return res.status(404).json({ message: "Attempt not found" });
    }
    res.json(updated);
  });

  // ===== Organizations / Bulk Licensing =====

  // Create an organization and a Stripe Checkout Session. Codes + active
  // status are NOT generated here — that happens via the Stripe webhook
  // (checkout.session.completed) so we only fulfill on confirmed payment.
  app.post("/api/organizations", async (req, res) => {
    const parsed = createOrganizationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.format() });
    }
    const data = parsed.data;
    const ppsc = pricePerSeatCents(data.seats);
    const months = data.courseMonths;
    const totalCents = ppsc * data.seats * months;
    const ownerUserId = req.session.userId ?? null;

    const org = await storage.createOrganization({
      name: data.name.trim(),
      contactName: data.contactName.trim(),
      contactEmail: data.contactEmail.toLowerCase().trim(),
      billingEmail: data.billingEmail.toLowerCase().trim(),
      orgType: data.orgType,
      seats: data.seats,
      pricePerSeatCents: ppsc,
      courseMonths: months,
      totalCents,
      status: "pending",
      ownerUserId,
      notes: data.notes ?? null,
      stripeSessionId: null,
    });

    let checkoutUrl: string;
    try {
      const stripe = await getUncachableStripeClient();
      const protocol = req.headers["x-forwarded-proto"] ?? "https";
      const host = req.headers["x-forwarded-host"] ?? req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: data.billingEmail.toLowerCase().trim(),
        line_items: [
          {
            quantity: data.seats,
            price_data: {
              currency: "usd",
              unit_amount: ppsc * months,
              product_data: {
                name: `Simtura.ai Pro — ${data.name.trim()}`,
                description: `${data.seats} seats · ${months} month${months === 1 ? "" : "s"} of Pro access per seat · ${data.orgType}`,
              },
            },
          },
        ],
        metadata: {
          organizationId: org.id,
          seats: String(data.seats),
          courseMonths: String(months),
        },
        success_url: `${baseUrl}/organizations/${org.id}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/organizations?canceled=1`,
      });

      if (!session.url) {
        throw new Error("Stripe did not return a checkout URL");
      }
      await storage.setOrganizationStripeSession(org.id, session.id);
      checkoutUrl = session.url;
    } catch (err: any) {
      console.error("[stripe] failed to create checkout session:", err?.message ?? err);
      return res.status(502).json({
        message: "Could not start payment. Please try again or contact support.",
      });
    }

    console.log(`[orgs] Created org ${org.id} "${org.name}" — ${data.seats} seats × ${months}mo @ $${(ppsc / 100).toFixed(2)}/seat/mo = $${(totalCents / 100).toFixed(2)} — awaiting payment`);
    res.json({ ...toPublicOrg(org, 0), checkoutUrl });
  });

  // Get an organization. Only the owner (or an admin) may view it.
  app.get("/api/organizations/:id", async (req, res) => {
    const org = await storage.getOrganization(req.params.id);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (org.ownerUserId && org.ownerUserId !== req.session.userId) {
      const viewer = await storage.getUser(req.session.userId);
      if (!viewer?.isAdmin) {
        return res.status(403).json({ message: "Not authorized for this organization" });
      }
    }
    const redeemed = await storage.countRedeemedCodes(org.id);
    res.json(toPublicOrg(org, redeemed));
  });

  // List codes for an org
  app.get("/api/organizations/:id/codes", async (req, res) => {
    const org = await storage.getOrganization(req.params.id);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    if (org.ownerUserId && req.session.userId && org.ownerUserId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized for this organization" });
    }
    const codes = await storage.getOrganizationCodes(org.id);
    res.json(codes.map(toPublicCode));
  });

  // Cohorts for an org
  app.get("/api/organizations/:id/cohorts", async (req, res) => {
    const org = await storage.getOrganization(req.params.id);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    if (org.ownerUserId && req.session.userId && org.ownerUserId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const result = await storage.getCohorts(org.id);
    res.json(result);
  });

  app.post("/api/organizations/:id/cohorts", async (req, res) => {
    const org = await storage.getOrganization(req.params.id);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    if (org.ownerUserId && req.session.userId && org.ownerUserId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const { name, discipline, startDate, endDate, seatCount } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: "name, startDate, and endDate are required" });
    }
    const cohort = await storage.createCohort({
      organizationId: org.id,
      name,
      discipline: discipline ?? "EMS",
      startDate,
      endDate,
    });
    // Assign unredeemed codes to this cohort if seatCount specified
    if (seatCount && seatCount > 0) {
      const allCodes = await storage.getOrganizationCodes(org.id);
      const unassigned = allCodes.filter(c => !c.cohortId && !c.redeemedByUserId);
      const toAssign = unassigned.slice(0, seatCount).map(c => c.id);
      if (toAssign.length > 0) await storage.assignCodesToCohort(cohort.id, toAssign);
    }
    res.json(cohort);
  });

  // Students who have redeemed codes for this org
  app.get("/api/organizations/:id/students", async (req, res) => {
    const org = await storage.getOrganization(req.params.id);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    if (org.ownerUserId && req.session.userId && org.ownerUserId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const students = await storage.getOrgStudents(org.id);
    res.json(students);
  });

  // Attempts for all students in this org (joined with scenario title)
  app.get("/api/organizations/:id/performance", async (req, res) => {
    const org = await storage.getOrganization(req.params.id);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    if (org.ownerUserId && req.session.userId && org.ownerUserId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const students = await storage.getOrgStudents(org.id);
    const userIds = students.map(s => s.id);
    const attempts = await storage.getAttemptsForUsers(userIds);
    res.json(attempts);
  });

  // List orgs owned by the current user
  app.get("/api/organizations/mine/list", requireAuth, async (req, res) => {
    const orgs = await storage.getOrganizationsForOwner(req.session.userId!);
    const out = await Promise.all(
      orgs.map(async (o) => toPublicOrg(o, await storage.countRedeemedCodes(o.id))),
    );
    res.json(out);
  });

  // Redeem a code → upgrade current user to Pro
  app.post("/api/redeem-code", requireAuth, async (req, res) => {
    const parsed = redeemCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid code format" });
    }
    const code = parsed.data.code.trim().toUpperCase();
    const existing = await storage.getOrganizationCodeByCode(code);
    if (!existing) {
      return res.status(404).json({ message: "Code not found. Double-check with your organization." });
    }
    if (existing.redeemedByUserId) {
      if (existing.redeemedByUserId === req.session.userId!) {
        return res.status(400).json({ message: "You've already redeemed this code." });
      }
      return res.status(409).json({ message: "This code has already been redeemed by another user." });
    }
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(404).json({ message: "User not found" });

    const redeemed = await storage.redeemOrganizationCode(code, user.id, user.email);
    if (!redeemed) {
      return res.status(409).json({ message: "Code was just redeemed by someone else." });
    }
    const updatedUser = await storage.setUserOrgPremium(user.id, existing.organizationId);
    res.json({
      ok: true,
      user: updatedUser
        ? {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            tier: updatedUser.tier,
          }
        : null,
    });
  });

  // ---------------------------------------------------------------
  // Flashcards (FSRS-based spaced repetition)
  // ---------------------------------------------------------------

  /**
   * Sync flashcards from a completed attempt.
   * - Creates a deck for the scenario+user if it doesn't exist
   * - Creates one card per scenario step if cards don't exist
   * - Marks cards from missed steps with priorityBoost = true
   */
  app.post("/api/flashcards/sync-from-attempt", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const schema = z.object({
      attemptId: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
    }

    const attempt = await storage.getAttempt(parsed.data.attemptId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.userId !== userId) return res.status(403).json({ message: "Forbidden" });

    const scenario = await storage.getScenario(attempt.scenarioId);
    if (!scenario) return res.status(404).json({ message: "Scenario not found" });

    const steps = await storage.getScenarioSteps(scenario.id);
    if (steps.length === 0) return res.json({ created: 0, boosted: 0 });

    // Find or create deck
    let deck = await storage.getDeckByScenarioAndUser(scenario.id, userId);
    if (!deck) {
      deck = await storage.createDeck({
        userId,
        scenarioId: scenario.id,
        attemptId: attempt.id,
        title: scenario.title,
      });
    }

    // Find existing cards in this deck (by sourceStepId)
    const existingCards = await storage.getCardsByDeck(deck.id);
    const existingStepIds = new Set(existingCards.map(c => c.sourceStepId).filter(Boolean));

    // Determine which steps were missed in this attempt
    const responses = (attempt.responses ?? []) as Array<{ stepId: string; score?: number; isCorrect?: boolean }>;
    const missedStepIds = new Set(
      responses
        .filter(r => r.isCorrect === false || (typeof r.score === "number" && r.score < 70))
        .map(r => r.stepId)
    );

    // Create cards for any new steps. Each step may have:
    //   - Legacy shape: step.prompt + step.correctActions (one card per step)
    //   - Multi-question shape: step.questions JSONB array (one card per question)
    let created = 0;
    for (const step of steps) {
      if (existingStepIds.has(step.id)) continue;
      const why = step.whyItMatters ?? "";
      const initialState = newCardState();
      const isBoosted = missedStepIds.has(step.id);

      // Determine question shape
      const questions = Array.isArray(step.questions) ? step.questions as Array<{ prompt?: string; correctActions?: string[] }> : [];

      if (questions.length > 0) {
        // Multi-question: one card per question
        for (const q of questions) {
          const qPrompt = typeof q.prompt === "string" ? q.prompt.trim() : "";
          const qActions = Array.isArray(q.correctActions) ? q.correctActions.map(String) : [];
          if (!qPrompt || qActions.length === 0) continue;
          const correctActions = qActions.join("; ");
          const back = why ? `${correctActions}\n\nWhy it matters: ${why}` : correctActions;
          await storage.createCard({
            deckId: deck.id,
            userId,
            front: qPrompt,
            back,
            sourceStepId: step.id,
            tags: [scenario.title],
            difficulty: initialState.difficulty,
            stability: initialState.stability,
            state: initialState.state,
            lapses: initialState.lapses,
            reps: initialState.reps,
            dueDate: initialState.dueDate,
            priorityBoost: isBoosted,
          });
          created++;
        }
      } else {
        // Legacy: one card per step using step.prompt + step.correctActions
        const stepPrompt = typeof step.prompt === "string" ? step.prompt.trim() : "";
        const stepActions = (step.correctActions ?? []).map(String);
        if (!stepPrompt || stepActions.length === 0) continue;
        const correctActions = stepActions.join("; ");
        const back = why ? `${correctActions}\n\nWhy it matters: ${why}` : correctActions;
        await storage.createCard({
          deckId: deck.id,
          userId,
          front: stepPrompt,
          back,
          sourceStepId: step.id,
          tags: [scenario.title],
          difficulty: initialState.difficulty,
          stability: initialState.stability,
          state: initialState.state,
          lapses: initialState.lapses,
          reps: initialState.reps,
          dueDate: initialState.dueDate,
          priorityBoost: isBoosted,
        });
        created++;
      }
    }

    // Boost existing cards whose source step was missed in this attempt
    const cardsToBoost = existingCards
      .filter(c => c.sourceStepId && missedStepIds.has(c.sourceStepId) && !c.priorityBoost)
      .map(c => c.id);
    if (cardsToBoost.length > 0) {
      await storage.setCardPriorityBoost(cardsToBoost, true);
    }

    res.json({
      created,
      boosted: cardsToBoost.length,
      deckId: deck.id,
      totalCardsInDeck: existingCards.length + created,
    });
  });

  /**
   * Get the user's review queue.
   * Returns cards in priority order: boosted, new, then due-by-date.
   */
  app.get("/api/flashcards/queue", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cards = await storage.getQueueForUser(userId, limit);
    res.json({ cards, count: cards.length });
  });

  /**
   * Submit a review rating for a card.
   * Runs FSRS, persists new state, logs the review.
   */
  app.post("/api/flashcards/:id/review", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const cardId = req.params.id as string;

    const schema = z.object({
      rating: z.enum(["again", "hard", "good", "easy"]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
    }

    const card = await storage.getCard(cardId);
    if (!card) return res.status(404).json({ message: "Card not found" });
    if (card.userId !== userId) return res.status(403).json({ message: "Forbidden" });

    const result = gradeCard(card, parsed.data.rating);

    // Update card state. Priority boost gets cleared once reviewed.
    const updated = await storage.updateCardState(card.id, {
      difficulty: result.newDifficulty,
      stability: result.newStability,
      state: result.newState,
      lapses: result.newLapses,
      reps: result.newReps,
      dueDate: result.newDueDate,
      lastReviewedAt: result.newLastReviewedAt,
      priorityBoost: false,
    });

    // Log the review
    await storage.createReview({
      cardId: card.id,
      userId,
      rating: result.rating,
      previousDifficulty: result.previousDifficulty,
      previousStability: result.previousStability,
      previousState: result.previousState,
      newDifficulty: result.newDifficulty,
      newStability: result.newStability,
      newState: result.newState,
      scheduledFor: result.newDueDate,
    });

    res.json({
      card: updated,
      nextDueDate: result.newDueDate,
      newState: result.newState,
    });
  });

  // ---------------------------------------------------------------
  // Quiz / Drill mode (practice testing — Dunlosky HIGH utility)
  // ---------------------------------------------------------------

  /**
   * Helper: Build the pool of candidate questions for a user's quiz session.
   * Adaptive: missed-questions first, broaden if not enough.
   * Returns array of { stepId, questionIndex, prompt, correctAnswer, distractors }.
   */
  type QuizPoolItem = {
    stepId: string;
    questionIndex: number;
    prompt: string;
    correctAnswer: string;
    distractors: string[];
    sourceTier: 1 | 2 | 3; // 1=missed, 2=attempted, 3=all-published
  };

  async function buildQuizQuestionPool(userId: string): Promise<QuizPoolItem[]> {
    const seen = new Set<string>(); // dedupe key: stepId:questionIndex
    const pool: QuizPoolItem[] = [];

    // Pull all published scenarios for tier-3 broadening
    const allScenarios = await storage.getAllScenarios();
    const publishedScenarios = allScenarios.filter((s) => s.published);

    // Cache step lookups across passes
    const stepsByScenario = new Map<string, ScenarioStep[]>();
    async function getSteps(scenarioId: string): Promise<ScenarioStep[]> {
      const cached = stepsByScenario.get(scenarioId);
      if (cached) return cached;
      const steps = await storage.getScenarioSteps(scenarioId);
      stepsByScenario.set(scenarioId, steps);
      return steps;
    }

    function addStep(step: ScenarioStep, sourceTier: 1 | 2 | 3, onlyMissedIndices?: Set<number>) {
      const questions = Array.isArray(step.questions) ? (step.questions as any[]) : [];
      if (questions.length > 0) {
        questions.forEach((q, idx) => {
          if (onlyMissedIndices && !onlyMissedIndices.has(idx)) return;
          const key = `${step.id}:${idx}`;
          if (seen.has(key)) return;
          const qPrompt = typeof q.prompt === "string" ? q.prompt.trim() : "";
          const qActions = Array.isArray(q.correctActions) ? q.correctActions.map(String) : [];
          const qDistractors = Array.isArray(q.distractors) ? q.distractors.map(String) : [];
          if (!qPrompt || qActions.length === 0 || qDistractors.length !== 3) return;
          seen.add(key);
          pool.push({
            stepId: step.id,
            questionIndex: idx,
            prompt: qPrompt,
            correctAnswer: qActions[0],
            distractors: qDistractors,
            sourceTier,
          });
        });
      } else {
        const key = `${step.id}:0`;
        if (seen.has(key)) return;
        const sPrompt = typeof step.prompt === "string" ? step.prompt.trim() : "";
        const sActions = step.correctActions ?? [];
        const sDistractors = step.distractors ?? [];
        if (!sPrompt || sActions.length === 0 || sDistractors.length !== 3) return;
        seen.add(key);
        pool.push({
          stepId: step.id,
          questionIndex: 0,
          prompt: sPrompt,
          correctAnswer: sActions[0],
          distractors: sDistractors,
          sourceTier,
        });
      }
    }

    // TIER 1: Missed questions from user's attempt history
    const userAttempts = await storage.getUserAttempts(userId, 100);
    const missedByStepId = new Map<string, Set<number>>(); // stepId -> set of missed question indices
    for (const attempt of userAttempts) {
      const responses = (attempt.responses ?? []) as Array<{
        stepId: string;
        questionIndex?: number;
        isCorrect?: boolean;
        score?: number;
      }>;
      for (const r of responses) {
        const isWrong = r.isCorrect === false || (typeof r.score === "number" && r.score < 70);
        if (!isWrong) continue;
        const idx = typeof r.questionIndex === "number" ? r.questionIndex : 0;
        if (!missedByStepId.has(r.stepId)) missedByStepId.set(r.stepId, new Set());
        missedByStepId.get(r.stepId)!.add(idx);
      }
    }
    const missedEntries = Array.from(missedByStepId.entries());
    for (const [stepId, missedIndices] of missedEntries) {
      const step = await storage.getScenarioStep(stepId);
      if (!step) continue;
      addStep(step, 1, missedIndices);
    }

    // TIER 2: All questions from scenarios the user has attempted
    const attemptedScenarioIds = Array.from(new Set(userAttempts.map((a) => a.scenarioId)));
    for (const scenarioId of attemptedScenarioIds) {
      const steps = await getSteps(scenarioId);
      for (const step of steps) addStep(step, 2);
    }

    // TIER 3: All published scenarios (broadest fallback)
    for (const scenario of publishedScenarios) {
      const steps = await getSteps(scenario.id);
      for (const step of steps) addStep(step, 3);
    }

    return pool;
  }

  function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * POST /api/quiz/start
   * Body: { length: 5 | 10 | 20 }
   * Returns: { sessionId, questions: [{ id, stepId, questionIndex, prompt, choices }] }
   */
  app.post("/api/quiz/scenario/start", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const schema = z.object({
      length: z.union([z.literal(5), z.literal(10), z.literal(20)]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
    }
    const { length } = parsed.data;

    const pool = await buildQuizQuestionPool(userId);
    if (pool.length === 0) {
      return res.status(404).json({
        message: "No questions available. Complete a scenario first or wait until distractors are generated.",
      });
    }

    // Sort by tier (1 first, then 2, then 3), shuffle within each tier, then take N
    const tiered = [
      shuffleArray(pool.filter((p) => p.sourceTier === 1)),
      shuffleArray(pool.filter((p) => p.sourceTier === 2)),
      shuffleArray(pool.filter((p) => p.sourceTier === 3)),
    ].flat();
    const selected = tiered.slice(0, length);

    // Create the session row
    const [session] = await db.insert(quizSessions).values({
      userId,
      length,
    }).returning();

    // Build response: shuffle choices for each question (correct + 3 distractors)
    const questions = selected.map((q) => {
      const choices = shuffleArray([q.correctAnswer, ...q.distractors]);
      return {
        stepId: q.stepId,
        questionIndex: q.questionIndex,
        prompt: q.prompt,
        choices,
      };
    });

    res.json({
      sessionId: session.id,
      questions,
      total: questions.length,
    });
  });

  /**
   * POST /api/quiz/submit
   * Body: { sessionId, responses: [{ stepId, questionIndex, chosenAnswer }] }
   * Returns: { score, total, breakdown: [...] }
   */
  app.post("/api/quiz/scenario/submit", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const schema = z.object({
      sessionId: z.string().min(1),
      responses: z.array(z.object({
        stepId: z.string(),
        questionIndex: z.number().int().min(0),
        chosenAnswer: z.string(),
      })),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
    }
    const { sessionId, responses } = parsed.data;

    // Validate session
    const [session] = await db.select().from(quizSessions).where(eq(quizSessions.id, sessionId));
    if (!session) return res.status(404).json({ message: "Quiz session not found" });
    if (session.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    if (session.completedAt) return res.status(400).json({ message: "Session already submitted" });

    // Look up the correct answer + distractors for each response (rebuild choices for storage)
    let correctCount = 0;
    const breakdown: Array<{
      stepId: string;
      questionIndex: number;
      prompt: string;
      choices: string[];
      chosenAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      whyItMatters: string | null;
    }> = [];
    const responseRows: any[] = [];

    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      const step = await storage.getScenarioStep(r.stepId);
      if (!step) continue;

      let prompt = "";
      let correctAnswer = "";
      let distractors: string[] = [];
      const questions = Array.isArray(step.questions) ? (step.questions as any[]) : [];
      if (questions.length > 0) {
        const q = questions[r.questionIndex];
        if (!q) continue;
        prompt = typeof q.prompt === "string" ? q.prompt : "";
        correctAnswer = Array.isArray(q.correctActions) && q.correctActions.length > 0 ? String(q.correctActions[0]) : "";
        distractors = Array.isArray(q.distractors) ? q.distractors.map(String) : [];
      } else {
        prompt = step.prompt;
        correctAnswer = (step.correctActions ?? [])[0] || "";
        distractors = step.distractors ?? [];
      }
      if (!correctAnswer || distractors.length !== 3) continue;

      const choices = [correctAnswer, ...distractors];
      const isCorrect = r.chosenAnswer.trim() === correctAnswer.trim();
      if (isCorrect) correctCount++;

      breakdown.push({
        stepId: r.stepId,
        questionIndex: r.questionIndex,
        prompt,
        choices,
        chosenAnswer: r.chosenAnswer,
        correctAnswer,
        isCorrect,
        whyItMatters: step.whyItMatters ?? null,
      });

      responseRows.push({
        sessionId,
        stepId: r.stepId,
        questionIndex: r.questionIndex,
        choices,
        chosenAnswer: r.chosenAnswer,
        correctAnswer,
        isCorrect,
        displayOrder: i,
      });
    }

    if (responseRows.length > 0) {
      await db.insert(quizSessionResponses).values(responseRows);
    }

    const total = breakdown.length;
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    await db.update(quizSessions)
      .set({ score, completedAt: new Date() })
      .where(eq(quizSessions.id, sessionId));

    res.json({
      sessionId,
      score,
      correctCount,
      total,
      breakdown,
    });
  });

  /**
   * POST /api/quiz/:sessionId/boost-fsrs
   * Marks the flashcards corresponding to missed quiz questions with priorityBoost = true.
   * Lazily creates flashcards for missed questions that don't have one yet.
   * Returns: { boosted: number, created: number }
   */

  /**
   * POST /api/quiz/start (Day 6+, NREMT mode)
   * No body required (length is fixed at 25).
   * Returns: { sessionId, questionIndex, total, question }
   * where question is { id, category, subCategory, difficulty, questionText, options }.
   */
  app.post("/api/quiz/start", requireAuth, async (req, res) => {
    const userId = req.session.userId!;

    // Compute per-category starting difficulty from the user's history.
    const categoryDifficulty: Record<string, number> = await computeStartingDifficulties(userId);
    // Build the interleaved category sequence (25 slots).
    const categorySequence = buildCategorySequence();
    const blueprintJson: Record<string, number> = {};
    for (const cat of categorySequence) {
      blueprintJson[cat] = (blueprintJson[cat] ?? 0) + 1;
    }

    // Pick the first question.
    const firstCategory = categorySequence[0];
    const firstDifficulty = categoryDifficulty[firstCategory] ?? 3;
    const { question } = await pickNextQuestion(firstCategory, firstDifficulty, []);
    const shuffled = shuffleOptions(question);

    // Create the session row with all state needed to resume / serve subsequent questions.
    const [session] = await db.insert(quizSessions).values({
      userId,
      quizMode: "nremt",
      length: SESSION_LENGTH,
      blueprintJson,
      currentIndex: 0,
      categoryDifficulty,
      servedQuestionIds: [question.id],
    }).returning();

    // Write the placeholder response row (server is source of truth on what user saw).
    await db.insert(quizSessionResponses).values({
      sessionId: session.id,
      stepId: null,
      questionIndex: null,
      nremtQuestionId: question.id,
      choices: shuffled.options,
      chosenAnswer: null,
      correctAnswer: shuffled.options[shuffled.correctIndex],
      isCorrect: null,
      displayOrder: 0,
    });

    res.json({
      sessionId: session.id,
      questionIndex: 0,
      total: SESSION_LENGTH,
      question: questionForClient(shuffled),
    });
  });

  /**
   * POST /api/quiz/submit (Day 6+, NREMT mode)
   * Body: { sessionId, questionId, choiceIndex }
   * Returns:
   *   - { done: false, questionIndex, total, question }   — if more questions remain
   *   - { done: true, sessionId, score, ... }              — if this was the 25th question
   */
  app.post("/api/quiz/submit", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const schema = z.object({
      sessionId: z.string().min(1),
      questionId: z.string().min(1),
      choiceIndex: z.number().int().min(0).max(3),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
    }
    const { sessionId, questionId, choiceIndex } = parsed.data;

    // Validate session.
    const [session] = await db.select().from(quizSessions).where(eq(quizSessions.id, sessionId));
    if (!session) return res.status(404).json({ message: "Quiz session not found" });
    if (session.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    if (session.quizMode !== "nremt") return res.status(400).json({ message: "Wrong quiz mode" });
    if (session.completedAt) return res.status(400).json({ message: "Session already complete" });

    // Find the placeholder response row for this question.
    const [placeholder] = await db.select().from(quizSessionResponses)
      .where(and(
        eq(quizSessionResponses.sessionId, sessionId),
        eq(quizSessionResponses.nremtQuestionId, questionId),
      ));
    if (!placeholder) return res.status(400).json({ message: "Question not part of this session" });
    if (placeholder.chosenAnswer !== null) {
      return res.status(400).json({ message: "Question already answered" });
    }

    // Score the answer.
    const choices = placeholder.choices as string[];
    if (choiceIndex >= choices.length) {
      return res.status(400).json({ message: "choiceIndex out of range" });
    }
    const chosenAnswer = choices[choiceIndex];
    const isCorrect = chosenAnswer === placeholder.correctAnswer;

    // Update the placeholder with the user's choice.
    await db.update(quizSessionResponses)
      .set({ chosenAnswer, isCorrect })
      .where(eq(quizSessionResponses.id, placeholder.id));

    // Advance current_index. If this was the last question, mark the session complete.
    const nextIndex = session.currentIndex + 1;
    if (nextIndex >= SESSION_LENGTH) {
      // Compute final score and complete the session.
      const allResponses = await db.select().from(quizSessionResponses)
        .where(eq(quizSessionResponses.sessionId, sessionId));
      const correctCount = allResponses.filter((r) => r.isCorrect === true).length;
      const total = allResponses.length;
      const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

      await db.update(quizSessions)
        .set({ currentIndex: nextIndex, score, completedAt: new Date() })
        .where(eq(quizSessions.id, sessionId));

      return res.json({
        done: true,
        wasCorrect: isCorrect,
        correctAnswer: placeholder.correctAnswer,
        sessionId,
        score,
        correctCount,
        total,
      });
    }

    // Rebuild the category sequence deterministically and find the next category.
    const categorySequence = buildCategorySequence();
    const nextCategory = categorySequence[nextIndex];

    // Look up the difficulty of the question we just served (to know which category to adapt).
    const [justServedQuestion] = await db.select().from(nremtQuestions)
      .where(eq(nremtQuestions.id, questionId));
    if (!justServedQuestion) {
      return res.status(500).json({ message: "Just-served question vanished from bank" });
    }

    // Adapt the difficulty of the category the user just answered.
    const justServedCategory = justServedQuestion.category;
    const currentCategoryDifficulty = (session.categoryDifficulty as Record<string, number>) ?? {};
    const newDifficultyForServedCategory = adaptDifficulty(
      currentCategoryDifficulty[justServedCategory] ?? 3,
      isCorrect,
    );
    const updatedCategoryDifficulty = {
      ...currentCategoryDifficulty,
      [justServedCategory]: newDifficultyForServedCategory,
    };

    // Target difficulty for the NEXT question is its category's current value.
    const targetDifficulty = updatedCategoryDifficulty[nextCategory] ?? 3;

    // Pick the next question (excluding already-served).
    const { question: nextQuestion } = await pickNextQuestion(
      nextCategory,
      targetDifficulty,
      session.servedQuestionIds,
    );
    const nextShuffled = shuffleOptions(nextQuestion);

    // Write the placeholder for the next question.
    await db.insert(quizSessionResponses).values({
      sessionId,
      stepId: null,
      questionIndex: null,
      nremtQuestionId: nextQuestion.id,
      choices: nextShuffled.options,
      chosenAnswer: null,
      correctAnswer: nextShuffled.options[nextShuffled.correctIndex],
      isCorrect: null,
      displayOrder: nextIndex,
    });

    // Update the session state.
    await db.update(quizSessions)
      .set({
        currentIndex: nextIndex,
        categoryDifficulty: updatedCategoryDifficulty,
        servedQuestionIds: [...session.servedQuestionIds, nextQuestion.id],
      })
      .where(eq(quizSessions.id, sessionId));

    res.json({
      done: false,
      wasCorrect: isCorrect,
      correctAnswer: placeholder.correctAnswer,
      questionIndex: nextIndex,
      total: SESSION_LENGTH,
      question: questionForClient(nextShuffled),
    });
  });


  /**
   * GET /api/quiz/:sessionId/state (Day 6+, NREMT mode)
   * Session resume support. Returns:
   *   - { status: "active", questionIndex, total, question }  — pending question
   *   - { status: "complete", ...results payload }            — same shape as /results
   *   - 404                                                   — not found or wrong user
   */
  app.get("/api/quiz/:sessionId/state", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const sessionId = req.params.sessionId as string;

    const [session] = await db.select().from(quizSessions).where(eq(quizSessions.id, sessionId));
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    if (session.quizMode !== "nremt") return res.status(400).json({ message: "Wrong quiz mode" });

    // If session is complete, return the same payload shape as /results so the
    // client can render the results screen directly without a second call.
    if (session.completedAt) {
      const rows = await db
        .select({
          questionId: quizSessionResponses.nremtQuestionId,
          displayOrder: quizSessionResponses.displayOrder,
          chosenAnswer: quizSessionResponses.chosenAnswer,
          correctAnswer: quizSessionResponses.correctAnswer,
          choices: quizSessionResponses.choices,
          isCorrect: quizSessionResponses.isCorrect,
          category: nremtQuestions.category,
          subCategory: nremtQuestions.subCategory,
          difficulty: nremtQuestions.difficulty,
          questionText: nremtQuestions.questionText,
          explanation: nremtQuestions.explanation,
        })
        .from(quizSessionResponses)
        .innerJoin(
          nremtQuestions,
          eq(quizSessionResponses.nremtQuestionId, nremtQuestions.id),
        )
        .where(eq(quizSessionResponses.sessionId, sessionId))
        .orderBy(asc(quizSessionResponses.displayOrder));

      const byCategory: Record<string, { correct: number; total: number }> = {};
      for (const r of rows) {
        if (!byCategory[r.category]) byCategory[r.category] = { correct: 0, total: 0 };
        byCategory[r.category].total++;
        if (r.isCorrect) byCategory[r.category].correct++;
      }
      const breakdownByCategory = Object.entries(byCategory).map(([category, v]) => ({
        category,
        correct: v.correct,
        total: v.total,
        percent: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
      }));
      const missed = rows
        .filter((r) => r.isCorrect === false)
        .map((r) => ({
          questionText: r.questionText,
          choices: r.choices,
          chosenAnswer: r.chosenAnswer,
          correctAnswer: r.correctAnswer,
          explanation: r.explanation,
          category: r.category,
          subCategory: r.subCategory,
          difficulty: r.difficulty,
        }));

      return res.json({
        status: "complete",
        sessionId,
        score: session.score,
        correctCount: rows.filter((r) => r.isCorrect === true).length,
        total: rows.length,
        breakdownByCategory,
        missed,
      });
    }

    // Active session: find the placeholder row (most recent unanswered) and return its question.
    const [placeholder] = await db.select().from(quizSessionResponses)
      .where(and(
        eq(quizSessionResponses.sessionId, sessionId),
        sql`${quizSessionResponses.chosenAnswer} IS NULL`,
      ))
      .orderBy(sql`${quizSessionResponses.displayOrder} DESC`)
      .limit(1);
    if (!placeholder || !placeholder.nremtQuestionId) {
      return res.status(500).json({ message: "Active session has no pending question" });
    }
    const [question] = await db.select().from(nremtQuestions)
      .where(eq(nremtQuestions.id, placeholder.nremtQuestionId));
    if (!question) return res.status(500).json({ message: "Question not found" });

    // Return the question using the shuffled options the user already saw,
    // NOT the canonical bank order. Critical for resume integrity.
    res.json({
      status: "active",
      questionIndex: placeholder.displayOrder,
      total: SESSION_LENGTH,
      question: {
        id: question.id,
        category: question.category,
        subCategory: question.subCategory,
        difficulty: question.difficulty,
        questionText: question.questionText,
        options: placeholder.choices,
      },
    });
  });

  /**
   * GET /api/quiz/:sessionId/results (Day 6+, NREMT mode)
   * Idempotent fetch of completed-session results. For refresh / share / direct link.
   * Returns the same shape as the done-true response of /submit, plus per-category breakdown.
   */
  app.get("/api/quiz/:sessionId/results", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const sessionId = req.params.sessionId as string;

    const [session] = await db.select().from(quizSessions).where(eq(quizSessions.id, sessionId));
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    if (session.quizMode !== "nremt") return res.status(400).json({ message: "Wrong quiz mode" });
    if (!session.completedAt) return res.status(400).json({ message: "Session not yet complete" });

    const rows = await db
      .select({
        responseId: quizSessionResponses.id,
        questionId: quizSessionResponses.nremtQuestionId,
        displayOrder: quizSessionResponses.displayOrder,
        chosenAnswer: quizSessionResponses.chosenAnswer,
        correctAnswer: quizSessionResponses.correctAnswer,
        choices: quizSessionResponses.choices,
        isCorrect: quizSessionResponses.isCorrect,
        category: nremtQuestions.category,
        subCategory: nremtQuestions.subCategory,
        difficulty: nremtQuestions.difficulty,
        questionText: nremtQuestions.questionText,
        explanation: nremtQuestions.explanation,
      })
      .from(quizSessionResponses)
      .innerJoin(
        nremtQuestions,
        eq(quizSessionResponses.nremtQuestionId, nremtQuestions.id),
      )
      .where(eq(quizSessionResponses.sessionId, sessionId))
      .orderBy(asc(quizSessionResponses.displayOrder));

    // Per-category breakdown.
    const byCategory: Record<string, { correct: number; total: number }> = {};
    for (const r of rows) {
      if (!byCategory[r.category]) byCategory[r.category] = { correct: 0, total: 0 };
      byCategory[r.category].total++;
      if (r.isCorrect) byCategory[r.category].correct++;
    }
    const breakdownByCategory = Object.entries(byCategory).map(([category, v]) => ({
      category,
      correct: v.correct,
      total: v.total,
      percent: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
    }));

    const missed = rows
      .filter((r) => r.isCorrect === false)
      .map((r) => ({
        questionText: r.questionText,
        choices: r.choices,
        chosenAnswer: r.chosenAnswer,
        correctAnswer: r.correctAnswer,
        explanation: r.explanation,
        category: r.category,
        subCategory: r.subCategory,
        difficulty: r.difficulty,
      }));

    res.json({
      sessionId,
      score: session.score,
      correctCount: rows.filter((r) => r.isCorrect === true).length,
      total: rows.length,
      breakdownByCategory,
      missed,
    });
  });

  return httpServer;
}
