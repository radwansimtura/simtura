import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const gradeAnswerSchema = z.object({
  stepId: z.string().min(1),
  questionIndex: z.number().int().min(0).optional(),
  traineeAnswer: z.string().min(1).max(2000),
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
  "included": [<short bullet strings of correct elements the trainee covered>],
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
      const included = Array.isArray(parsedResp.included) ? parsedResp.included.map(String).slice(0, 8) : [];
      const missed = Array.isArray(parsedResp.missed) ? parsedResp.missed.map(String).slice(0, 8) : [];
      const summary = typeof parsedResp.summary === "string" ? parsedResp.summary.slice(0, 300) : "";

      res.json({ score, included, missed, summary });
    } catch (err: any) {
      console.error("Grading error:", err);
      res.status(500).json({ message: "Grading failed", error: err?.message ?? "unknown" });
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
    const attempt = await storage.createAttempt({
      scenarioId: parsed.data.scenarioId,
      totalSteps: parsed.data.totalSteps,
      correctSteps: 0,
      responses: [],
    });
    res.json(attempt);
  });

  app.patch("/api/attempts/:id", async (req, res) => {
    const parsed = updateAttemptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
    }
    const updated = await storage.updateAttempt(req.params.id, {
      completedAt: parsed.data.completedAt ? new Date(parsed.data.completedAt) : undefined,
      score: parsed.data.score,
      correctSteps: parsed.data.correctSteps,
      responses: parsed.data.responses,
    });
    if (!updated) {
      return res.status(404).json({ message: "Attempt not found" });
    }
    res.json(updated);
  });

  return httpServer;
}
