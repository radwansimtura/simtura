import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "./auth";
import { contactSchema } from "@shared/schema";

const FREE_DAILY_LIMIT = 1;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const gradeAnswerSchema = z.object({
  stepId: z.string().min(1),
  questionIndex: z.number().int().min(0).optional(),
  traineeAnswer: z.string().min(1).max(2000),
});

const evaluateSchema = z.object({
  stepId: z.string().min(1),
  traineeResponse: z.string().min(1).max(2000),
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

  const PUBLISHED_EMS_TITLES = ["Sports Injury - Primary Assessment", "Sports Injury - Primary Assessment (Copy)"];

  app.post("/api/grade-answer", async (req, res) => {
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

    const systemPrompt = `You are a strict but fair clinical-training grader. You DO NOT provide medical advice or invent new clinical guidance. Your ONLY job is to compare a trainee's free-text answer against a single pre-validated, licensed-professional-approved correct answer and return a congruency score from 0 to 100.

Scoring guide:
- 100 = Trainee's answer fully matches all key clinical elements of the correct answer (intervention, dose, route, rationale where applicable). Wording can differ.
- 80-99 = All critical elements present, minor secondary details missing.
- 60-79 = Most critical elements present but at least one important specific is missing or vague.
- 40-59 = Partial match; trainee identified the right general direction but missed multiple key specifics.
- 1-39 = Largely incorrect or missed the core action.
- 0 = Completely wrong, irrelevant, or unsafe.

Return ONLY a JSON object (no markdown fences, no commentary) with this exact shape:
{
  "score": <integer 0-100>,
  "correct": [<short bullet strings of correct elements the trainee covered>],
  "missed": [<short bullet strings of key elements from the correct answer the trainee did NOT cover>],
  "summary": "<one sentence, max 25 words, factual comparison only — do NOT add medical advice>"
}`;

    const userPrompt = `QUESTION:
${prompt}

CORRECT ANSWER (validated by licensed clinician — this is the source of truth):
${correctAnswer}

TRAINEE'S ANSWER:
${traineeAnswer}

Grade the trainee's answer against the correct answer. Return JSON only.`;

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

  app.post("/api/evaluate", async (req, res) => {
    const parsed = evaluateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.format() });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ message: "Evaluation service not configured" });
    }

    const { stepId, traineeResponse } = parsed.data;

    const step = await storage.getScenarioStep(stepId);
    if (!step) {
      return res.status(404).json({ message: "Step not found" });
    }

    const systemPrompt = `You are a strict but supportive EMS training evaluator grading a trainee against the NREMT E202 Patient Assessment/Management — Medical skill sheet.

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

    const userMessage = `Step Prompt: ${step.prompt}
Correct Actions Required: ${JSON.stringify(step.correctActions)}
Common Incorrect Actions: ${JSON.stringify(step.incorrectActions)}
Critical Criterion This Step Can Violate: ${step.criticalCriterion || "None"}
Why It Matters Clinically: ${step.whyItMatters || "Not specified"}
NREMT Skill Sheet Item: ${step.nremtSkillSheetItem || "Not specified"}
Trainee's Response: "${traineeResponse}"

Evaluate the trainee's response.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return res.status(502).json({ message: "Evaluator returned no text" });
      }

      let raw = textBlock.text.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
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
      res.status(500).json({ message: "Evaluation failed", error: err?.message ?? "unknown" });
    }
  });

  app.get("/api/scenarios", async (req, res) => {
    const scenarios = await storage.getAllScenarios();
    const discipline = req.query.discipline as string | undefined;
    if (discipline) {
      let filtered = scenarios.filter(s => s.discipline === discipline);
      if (discipline === "EMS") {
        filtered = filtered.filter(s => PUBLISHED_EMS_TITLES.includes(s.title));
      }
      return res.json(filtered);
    }
    const visible = scenarios.filter(s => s.discipline !== "EMS" || PUBLISHED_EMS_TITLES.includes(s.title));
    res.json(visible);
  });

  app.get("/api/scenarios/:id", async (req, res) => {
    const scenario = await storage.getScenario(req.params.id);
    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found" });
    }
    res.json(scenario);
  });

  app.get("/api/scenarios/:id/steps", async (req, res) => {
    const steps = await storage.getScenarioSteps(req.params.id);
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

    if (user.tier !== "pro") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todayCount = await storage.countUserAttemptsSince(userId, startOfDay);
      if (todayCount >= FREE_DAILY_LIMIT) {
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
      dailyLimit: user.tier === "pro" ? null : FREE_DAILY_LIMIT,
      tier: user.tier,
      recent,
    });
  });

  app.post("/api/contact", async (req, res) => {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.format() });
    }
    // Log for now — production would email or persist
    console.log("[contact]", {
      name: parsed.data.name,
      email: parsed.data.email,
      length: parsed.data.message.length,
    });
    res.json({ ok: true });
  });

  app.patch("/api/attempts/:id", requireAuth, async (req, res) => {
    const parsed = updateAttemptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
    }
    const existing = await storage.getAttempt(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Attempt not found" });
    }
    if (existing.userId !== (req.session as any).userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const updated = await storage.updateAttempt(req.params.id, {
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

  return httpServer;
}
