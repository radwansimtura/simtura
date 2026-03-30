import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { z } from "zod";

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

  const PUBLISHED_EMS_TITLES = ["Sports Injury - Primary Assessment"];

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
