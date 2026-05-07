import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "./auth";
import {
  contactSchema,
  createOrganizationSchema,
  redeemCodeSchema,
  pricePerSeatCents,
  type PublicOrganization,
  type PublicOrganizationCode,
} from "@shared/schema";
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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

const gradeAnswerSchema = z.object({
  stepId: z.string().min(1),
  questionIndex: z.number().int().min(0).optional(),
  traineeAnswer: z.string().min(1).max(2000),
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

  const PUBLISHED_EMS_TITLES = ["Sports Injury - Primary Assessment", "Sports Injury - Primary Assessment (Copy)", "Scenario 1A — Chest Pain / Heart Problems (NREMT Practice)", "Respiratory Failure - Elderly Patient", "Severe Hemorrhage - Thigh Laceration", "Combative Overdose - Suspected Opioid Reversal", "Pediatric Asthma Attack - Acute Exacerbation", "Multi-Patient MVC - Driver #1 (Post-Triage)", "Elderly Fall - Possible Head Injury (Anticoagulated)", "Tension Pneumothorax - Industrial Chest Trauma"];

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

  app.post("/api/evaluate", async (req, res) => {
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
    } catch (err) {
      console.error("Evaluation error:", err);
      res.status(500).json({ message: "Evaluation failed", error: err && err.message ? err.message : "unknown" });
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

  // Get an organization (auth: anyone with the ID can view dashboard once,
  // but we restrict mutations to owner). Returns 404 to non-owners if signed in
  // as a different user.
  app.get("/api/organizations/:id", async (req, res) => {
    const org = await storage.getOrganization(req.params.id);
    if (!org) return res.status(404).json({ message: "Organization not found" });
    if (org.ownerUserId && req.session.userId && org.ownerUserId !== req.session.userId) {
      return res.status(403).json({ message: "Not authorized for this organization" });
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
    const org = await storage.getOrganization(existing.organizationId);
    res.json({
      ok: true,
      organizationName: org?.name ?? null,
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

  return httpServer;
}
