import type { Express, Request, Response } from "express";
import { readFileSync } from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "./db";
import { drillSessions } from "../shared/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "./auth";

const createSessionSchema = z.object({
  scenarioId: z.string().uuid(),
  scenarioKey: z.string().min(1),
});

const updateSessionSchema = z.object({
  endReason: z.enum(["handoff_completed", "timer_expired", "candidate_terminated", "abandoned"]).optional(),
  totalElapsedSeconds: z.number().int().nonnegative().optional(),
  transcriptJson: z.array(z.unknown()).optional(),
});

const routeSchema = z.object({
  utterance: z.string().min(1),
  state: z.record(z.unknown()),
});

// ---------------------------------------------------------------------------
// Grading — real Sonnet call replaces the prior mock.
// ---------------------------------------------------------------------------

// Current Sonnet alias. Pricing $3/1M input, $15/1M output.
const GRADING_MODEL = "claude-sonnet-4-6";
// The grading prompt's output-size estimate (1.2–1.8K tokens) is too low in
// practice: 42 points × ~200 tokens of evidence each + 13 critical criteria
// pushes typical output past 3K and often above 5K. 8192 leaves headroom
// without provoking the SDK's non-streaming HTTP-timeout guard.
const GRADING_MAX_TOKENS = 8192;

// Read the grading prompt once at module load and slice out the prompt body
// — everything from the "You are an experienced NREMT..." opening through
// "# THE TRANSCRIPT TO GRADE", stripping the `{transcript_json}` placeholder.
// The transcript JSON lives in the per-request user message so the prefix
// stays byte-stable and the prompt cache can hit on subsequent calls.
function loadGradingPromptPrefix(): string {
  const file = readFileSync(
    path.join(process.cwd(), "docs/scenarios/1a/grading-prompt.md"),
    "utf8",
  );
  const start = file.indexOf("You are an experienced NREMT");
  // `{transcript_json}` is referenced in the explanatory prose before the
  // actual placeholder, so anchor the search past the prompt-body start.
  const end = start === -1 ? -1 : file.indexOf("{transcript_json}", start);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      "[drill-mode] grading prompt markers not found in docs/scenarios/1a/grading-prompt.md",
    );
  }
  const prefix = file.slice(start, end).trim();
  if (!prefix) {
    throw new Error("[drill-mode] grading prompt prefix sliced to empty");
  }
  return prefix;
}

const GRADING_PROMPT_PREFIX = loadGradingPromptPrefix();

// Grading generates ~5K output tokens at ~50 tok/sec → ~100s; allow 3 min.
const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 180_000,
});

// Transcript shape transformations: stored as camelCase per
// client/src/lib/drill-mode/types.ts, but the prompt's input contract
// (docs/scenarios/1a/grading-prompt.md §1) is snake_case and splits
// clipboard writes into a separate system_actions_log array.
interface CandidateTranscriptEntry {
  timestamp_seconds: number;
  speaker: "candidate" | "system";
  text?: string;
  event?: string;
  line_id?: string;
}

interface SystemActionLogEntry {
  timestamp_seconds: number;
  event: string;
}

interface GradingPayload {
  scenario_id: string;
  scenario_type: string;
  total_time_used_seconds: number;
  scenario_end_reason: string;
  candidate_transcript: CandidateTranscriptEntry[];
  system_actions_log: SystemActionLogEntry[];
}

function buildGradingPayload(
  scenarioKey: string,
  transcript: unknown,
  totalElapsedSeconds: number,
  endReason: string,
): GradingPayload {
  const entries = Array.isArray(transcript) ? transcript : [];
  const candidate_transcript: CandidateTranscriptEntry[] = [];
  const system_actions_log: SystemActionLogEntry[] = [];

  for (const raw of entries) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as {
      timestampSeconds?: number;
      speaker?: string;
      text?: string;
      event?: string;
      lineId?: string;
    };
    const ts = typeof e.timestampSeconds === "number" ? e.timestampSeconds : 0;

    if (e.speaker === "candidate") {
      candidate_transcript.push({
        timestamp_seconds: ts,
        speaker: "candidate",
        text: e.text ?? "",
      });
      continue;
    }

    if (e.speaker === "system") {
      if (e.event === "clipboard_write") {
        system_actions_log.push({
          timestamp_seconds: ts,
          event: e.lineId ? `${e.lineId}_clipboard_write` : "clipboard_write",
        });
        continue;
      }
      const entry: CandidateTranscriptEntry = {
        timestamp_seconds: ts,
        speaker: "system",
        event: e.event ?? "system_event",
      };
      if (e.lineId) entry.line_id = e.lineId;
      if (e.text) entry.text = e.text;
      candidate_transcript.push(entry);
    }
  }

  return {
    scenario_id: scenarioKey,
    scenario_type: "nremt_medical",
    total_time_used_seconds: totalElapsedSeconds,
    scenario_end_reason: endReason,
    candidate_transcript,
    system_actions_log,
  };
}

// Response validation — schema mirrors §OUTPUT FORMAT in grading-prompt.md.
const sectionScoreSchema = z.object({
  earned: z.number().int(),
  possible: z.number().int(),
});

const gradingResponseSchema = z.object({
  total_score: z.number().int().min(0).max(42),
  passed_critical_criteria: z.boolean(),
  scenario_outcome: z.enum([
    "PASS",
    "FAIL_CRITICAL_CRITERIA",
    "FAIL_INSUFFICIENT_POINTS",
  ]),
  total_time_used_seconds: z.number().int().nonnegative(),
  section_scores: z.object({
    scene_size_up: sectionScoreSchema,
    primary_survey: sectionScoreSchema,
    history_taking: sectionScoreSchema,
    secondary_assessment: sectionScoreSchema,
    vital_signs: sectionScoreSchema,
    field_impression: sectionScoreSchema,
    interventions: sectionScoreSchema,
    reassessment: sectionScoreSchema,
    handoff: sectionScoreSchema,
  }),
  point_by_point: z.array(
    z.object({
      point_id: z.string(),
      name: z.string(),
      earned: z.boolean(),
      evidence: z.string().optional(),
      note: z.string().optional(),
    }),
  ),
  critical_criteria: z.array(
    z.object({
      criterion_id: z.string(),
      name: z.string(),
      violated: z.boolean(),
      evidence: z.string().optional(),
    }),
  ),
  procedural_notes: z.array(z.string()),
  non_standard_sequence_flags: z.array(z.string()),
  strengths: z.array(z.string()),
  areas_for_review: z.array(z.string()),
  summary_comment: z.string(),
});

type GradingResponseRaw = z.infer<typeof gradingResponseSchema>;

// Server-side camelCase shape — kept loose since the client interprets the
// stored JSON via its own GradingResult type. Locally typed so the function
// has a meaningful return contract.
interface GradingResult {
  totalScore: number;
  passedCriticalCriteria: boolean;
  scenarioOutcome: "PASS" | "FAIL_CRITICAL_CRITERIA" | "FAIL_INSUFFICIENT_POINTS";
  totalTimeUsedSeconds: number;
  sectionScores: {
    sceneSizeUp: { earned: number; possible: number };
    primarySurvey: { earned: number; possible: number };
    historyTaking: { earned: number; possible: number };
    secondaryAssessment: { earned: number; possible: number };
    vitalSigns: { earned: number; possible: number };
    fieldImpression: { earned: number; possible: number };
    interventions: { earned: number; possible: number };
    reassessment: { earned: number; possible: number };
    handoff: { earned: number; possible: number };
  };
  pointByPoint: Array<{
    pointId: string;
    name: string;
    earned: boolean;
    evidence?: string;
    note?: string;
  }>;
  criticalCriteria: Array<{
    criterionId: string;
    name: string;
    violated: boolean;
    evidence?: string;
  }>;
  proceduralNotes: string[];
  nonStandardSequenceFlags: string[];
  strengths: string[];
  areasForReview: string[];
  summaryComment: string;
}

function toGradingResult(snake: GradingResponseRaw): GradingResult {
  return {
    totalScore: snake.total_score,
    passedCriticalCriteria: snake.passed_critical_criteria,
    scenarioOutcome: snake.scenario_outcome,
    totalTimeUsedSeconds: snake.total_time_used_seconds,
    sectionScores: {
      sceneSizeUp: snake.section_scores.scene_size_up,
      primarySurvey: snake.section_scores.primary_survey,
      historyTaking: snake.section_scores.history_taking,
      secondaryAssessment: snake.section_scores.secondary_assessment,
      vitalSigns: snake.section_scores.vital_signs,
      fieldImpression: snake.section_scores.field_impression,
      interventions: snake.section_scores.interventions,
      reassessment: snake.section_scores.reassessment,
      handoff: snake.section_scores.handoff,
    },
    pointByPoint: snake.point_by_point.map((p) => ({
      pointId: p.point_id,
      name: p.name,
      earned: p.earned,
      evidence: p.evidence,
      note: p.note,
    })),
    criticalCriteria: snake.critical_criteria.map((c) => ({
      criterionId: c.criterion_id,
      name: c.name,
      violated: c.violated,
      evidence: c.evidence,
    })),
    proceduralNotes: snake.procedural_notes,
    nonStandardSequenceFlags: snake.non_standard_sequence_flags,
    strengths: snake.strengths,
    areasForReview: snake.areas_for_review,
    summaryComment: snake.summary_comment,
  };
}

export interface GradingUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  estimatedCostUsd: number;
}

// Sonnet 4.6 pricing: $3/1M input, $15/1M output. Cache reads at ~0.1x of
// input; ephemeral 5-minute cache writes at 1.25x of input.
function summarizeUsage(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}): GradingUsage {
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheCreate = usage.cache_creation_input_tokens ?? 0;
  const cost =
    (inputTokens * 3 + cacheCreate * 3.75 + cacheRead * 0.3) / 1_000_000 +
    (outputTokens * 15) / 1_000_000;
  return {
    inputTokens,
    outputTokens,
    cacheReadInputTokens: cacheRead,
    cacheCreationInputTokens: cacheCreate,
    estimatedCostUsd: cost,
  };
}

function logGradingUsage(sessionId: string | null, usage: GradingUsage) {
  console.log(
    `[drill-mode] graded session=${sessionId ?? "(none)"} | input=${usage.inputTokens} cache_read=${usage.cacheReadInputTokens} cache_create=${usage.cacheCreationInputTokens} output=${usage.outputTokens} | cost=$${usage.estimatedCostUsd.toFixed(4)}`,
  );
}

async function gradeWithSonnet(
  payload: GradingPayload,
): Promise<{ result: GradingResult; usage: GradingUsage }> {
  const response = await anthropicClient.messages.create({
    model: GRADING_MODEL,
    max_tokens: GRADING_MAX_TOKENS,
    system: [
      {
        type: "text",
        text: GRADING_PROMPT_PREFIX,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: JSON.stringify(payload, null, 2),
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    console.error("[drill-mode] grading: Sonnet returned no text block", response.content);
    throw new Error("Sonnet returned no text block");
  }

  // If the model ran out of room mid-JSON, the parse below will throw a
  // useless "unterminated string" error. Catch the underlying cause here.
  if (response.stop_reason === "max_tokens") {
    console.error(
      `[drill-mode] grading: Sonnet hit max_tokens (${GRADING_MAX_TOKENS}). Output was truncated.`,
    );
    throw new Error(
      `Grading response was truncated at max_tokens (${GRADING_MAX_TOKENS}). Increase GRADING_MAX_TOKENS.`,
    );
  }

  let raw = textBlock.text.trim();
  // Strip ```json``` fence if the model wrapped its response.
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("[drill-mode] grading: invalid JSON from Sonnet. Raw text:\n", raw);
    throw new Error(
      `Grading response was not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const validated = gradingResponseSchema.safeParse(parsed);
  if (!validated.success) {
    console.error(
      "[drill-mode] grading: schema validation failed. Issues:",
      JSON.stringify(validated.error.issues, null, 2),
    );
    console.error("[drill-mode] grading: raw response:\n", raw);
    throw new Error("Grading response did not match expected schema");
  }

  return {
    result: toGradingResult(validated.data),
    usage: summarizeUsage(response.usage),
  };
}

// Exported for sanity-test scripts. Route handler below also uses this.
export async function gradeDrillSession(args: {
  scenarioKey: string;
  transcript: unknown;
  totalElapsedSeconds: number;
  endReason: string;
}): Promise<{ result: GradingResult; usage: GradingUsage }> {
  const payload = buildGradingPayload(
    args.scenarioKey,
    args.transcript,
    args.totalElapsedSeconds,
    args.endReason,
  );
  return gradeWithSonnet(payload);
}

// ---------------------------------------------------------------------------
// Haiku routing — real call replaces the prior mock. Used when the
// client-side keyword router doesn't have a confident match (~20% of
// utterances per spec). Latency budget per docs/scenarios/1a/routing-logic.md
// is 200-300ms; on Haiku failure we return the UNINTELLIGIBLE / E-fallback
// shape so the simulation keeps moving (per §8 of the same doc).
// ---------------------------------------------------------------------------

const ROUTING_MODEL = "claude-haiku-4-5";
const ROUTING_MAX_TOKENS = 256; // ~80 token JSON + safety margin.
// Per the spec: "Haiku API failure or timeout (>1 second) → fall back to
// E-fallback". 1500ms gives a small buffer over the 1s budget.
const ROUTING_TIMEOUT_MS = 1500;

const haikuClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: ROUTING_TIMEOUT_MS,
});

// Slice the routing prompt's static prefix from §4.1 of routing-logic.md
// — from the intro through "# AVAILABLE RESPONSES". Per-call session state,
// instructions, and the candidate utterance go in the user message after
// the cache boundary so the prefix stays byte-stable.
//
// Note on caching: Haiku 4.5's minimum cacheable prefix is 4096 tokens; the
// prefix loaded here is ~1200 tokens, so the cache_control marker is a no-op
// until the prefix grows past the threshold. The marker stays so caching
// kicks in automatically once we cross it.
function loadRoutingPromptPrefix(): string {
  const file = readFileSync(
    path.join(process.cwd(), "docs/scenarios/1a/routing-logic.md"),
    "utf8",
  );
  const start = file.indexOf("You are a real-time response router");
  const end = start === -1 ? -1 : file.indexOf("# SESSION STATE", start);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      "[drill-mode] routing prompt markers not found in docs/scenarios/1a/routing-logic.md",
    );
  }
  const prefix = file.slice(start, end).trim();
  if (!prefix) {
    throw new Error("[drill-mode] routing prompt prefix sliced to empty");
  }
  return prefix;
}

const ROUTING_PROMPT_PREFIX = loadRoutingPromptPrefix();

interface RoutingSessionStateInput {
  elapsedSeconds?: number;
  airwayAssessed?: boolean;
  ventilationAssessed?: boolean;
  oxygenApplied?: boolean;
  edMedsAsked?: boolean;
  reassessmentComplete?: boolean;
  alsArrived?: boolean;
}

function buildRoutingUserMessage(
  utterance: string,
  state: RoutingSessionStateInput,
): string {
  // Spec uses primary_survey_complete as context. Conservative derivation:
  // airway + ventilation + oxygen all addressed.
  const primarySurveyComplete = Boolean(
    state.airwayAssessed && state.ventilationAssessed && state.oxygenApplied,
  );

  return [
    `# SESSION STATE`,
    ``,
    `Elapsed time: ${state.elapsedSeconds ?? 0} seconds`,
    `Primary survey complete: ${primarySurveyComplete}`,
    `ED meds check complete: ${Boolean(state.edMedsAsked)}`,
    `Reassessment complete: ${Boolean(state.reassessmentComplete)}`,
    `ALS has arrived: ${Boolean(state.alsArrived)}`,
    ``,
    `# INSTRUCTIONS`,
    ``,
    `1. Read the candidate's utterance below.`,
    `2. Return ONLY a JSON object with this exact structure:`,
    ``,
    `{`,
    `  "category": "PATIENT_QUESTION" | "CLINICAL_DATA_REQUEST" | "VERBAL_DECLARATION" | "INTERVENTION_ACTION" | "STATUS_CHECK" | "UNINTELLIGIBLE",`,
    `  "line_id": "<P1-P21 or E1-E17 or null if VERBAL_DECLARATION>",`,
    `  "fire_clipboard_write": <boolean>,`,
    `  "confidence": <0.0-1.0>,`,
    `  "reasoning": "<one sentence explanation>"`,
    `}`,
    ``,
    `3. If confidence < 0.5, return UNINTELLIGIBLE with line_id "E-fallback".`,
    `4. Do not invent line IDs not in the list above.`,
    `5. Do not return text outside the JSON.`,
    ``,
    `# UTTERANCE TO CLASSIFY`,
    ``,
    JSON.stringify(utterance),
  ].join("\n");
}

const routingResponseSchema = z.object({
  category: z.enum([
    "PATIENT_QUESTION",
    "CLINICAL_DATA_REQUEST",
    "VERBAL_DECLARATION",
    "INTERVENTION_ACTION",
    "STATUS_CHECK",
    "UNINTELLIGIBLE",
  ]),
  line_id: z.union([z.string(), z.null()]),
  fire_clipboard_write: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

// Server-side result shape — matches the camelCase RouterResult the client
// orchestrator already consumes (client/src/lib/drill-mode/types.ts).
// declarationTags is left empty for Haiku results — the keyword router is
// the path that produces tagged declarations; if Haiku classifies an
// utterance as VERBAL_DECLARATION the orchestrator still logs the
// clipboard event but doesn't mutate the per-tag state.
interface HaikuRouterResult {
  category: string;
  lineId: string | null;
  declarationTags: string[];
  fireClipboardWrite: boolean;
  confidence: number;
  reasoning: string;
  source: "haiku" | "fallback";
}

export interface RoutingUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  estimatedCostUsd: number;
}

// Haiku 4.5 pricing: $1/1M input, $5/1M output. Cache writes 1.25x = $1.25/1M;
// cache reads 0.1x = $0.10/1M (per Anthropic prompt-cache pricing).
function summarizeRoutingUsage(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}): RoutingUsage {
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheCreate = usage.cache_creation_input_tokens ?? 0;
  const cost =
    (inputTokens * 1 + cacheCreate * 1.25 + cacheRead * 0.1) / 1_000_000 +
    (outputTokens * 5) / 1_000_000;
  return {
    inputTokens,
    outputTokens,
    cacheReadInputTokens: cacheRead,
    cacheCreationInputTokens: cacheCreate,
    estimatedCostUsd: cost,
  };
}

function logRoutingUsage(
  utterance: string,
  usage: RoutingUsage | null,
  latencyMs: number,
  source: HaikuRouterResult["source"],
) {
  const head = utterance.length > 50 ? `${utterance.slice(0, 50)}…` : utterance;
  if (!usage) {
    console.log(
      `[drill-mode] routed (${source}) "${head}" | no-usage | ${latencyMs.toFixed(0)}ms`,
    );
    return;
  }
  console.log(
    `[drill-mode] routed (${source}) "${head}" | input=${usage.inputTokens} cache_read=${usage.cacheReadInputTokens} cache_create=${usage.cacheCreationInputTokens} output=${usage.outputTokens} | cost=$${usage.estimatedCostUsd.toFixed(5)} | ${latencyMs.toFixed(0)}ms`,
  );
}

function fallbackRouting(reasoning: string, source: HaikuRouterResult["source"] = "fallback"): HaikuRouterResult {
  return {
    category: "UNINTELLIGIBLE",
    lineId: "E-fallback",
    declarationTags: [],
    fireClipboardWrite: false,
    confidence: 0,
    reasoning,
    source,
  };
}

async function routeWithHaiku(
  utterance: string,
  state: RoutingSessionStateInput,
): Promise<{ result: HaikuRouterResult; usage: RoutingUsage | null }> {
  try {
    const response = await haikuClient.messages.create({
      model: ROUTING_MODEL,
      max_tokens: ROUTING_MAX_TOKENS,
      system: [
        {
          type: "text",
          text: ROUTING_PROMPT_PREFIX,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: buildRoutingUserMessage(utterance, state),
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.error("[drill-mode] routing: Haiku returned no text block", response.content);
      return { result: fallbackRouting("Haiku returned no text"), usage: null };
    }

    let raw = textBlock.text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("[drill-mode] routing: invalid JSON. Raw text:\n", raw);
      return { result: fallbackRouting("Haiku response not JSON"), usage: null };
    }

    const validated = routingResponseSchema.safeParse(parsed);
    if (!validated.success) {
      console.error(
        "[drill-mode] routing: schema mismatch",
        JSON.stringify(validated.error.issues),
      );
      return { result: fallbackRouting("Haiku response schema mismatch"), usage: null };
    }

    const r = validated.data;
    const usage = summarizeRoutingUsage(response.usage);

    // Confidence gate. Per the prompt itself Haiku should already self-gate
    // at <0.5, but we double-check server-side as a belt-and-suspenders
    // measure. Tag the source as "haiku" so logs make it clear the call
    // landed even though we treated the result as fallback.
    if (r.confidence < 0.5) {
      return {
        result: fallbackRouting(
          `Haiku low confidence (${r.confidence.toFixed(2)}): ${r.reasoning}`,
          "haiku",
        ),
        usage,
      };
    }

    return {
      result: {
        category: r.category,
        lineId: r.line_id,
        declarationTags: [],
        fireClipboardWrite: r.fire_clipboard_write,
        confidence: r.confidence,
        reasoning: r.reasoning,
        source: "haiku",
      },
      usage,
    };
  } catch (err) {
    console.error("[drill-mode] routing: Haiku call failed", err);
    return {
      result: fallbackRouting(
        `Haiku call failed: ${err instanceof Error ? err.message : String(err)}`,
      ),
      usage: null,
    };
  }
}

// Exported for sanity-test scripts. The route handler below uses this too.
export async function routeDrillUtterance(args: {
  utterance: string;
  state: RoutingSessionStateInput;
}): Promise<{
  result: HaikuRouterResult;
  usage: RoutingUsage | null;
  latencyMs: number;
}> {
  const t0 = Date.now();
  const { result, usage } = await routeWithHaiku(args.utterance, args.state);
  return { result, usage, latencyMs: Date.now() - t0 };
}

export function registerDrillModeRoutes(app: Express) {
  app.post("/api/drill/sessions", requireAuth, async (req: Request, res: Response) => {
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.format() });
    }
    const userId = req.session.userId!;
    const [row] = await db
      .insert(drillSessions)
      .values({
        userId,
        scenarioId: parsed.data.scenarioId,
        scenarioKey: parsed.data.scenarioKey,
      })
      .returning();
    res.json(row);
  });

  app.patch("/api/drill/sessions/:id", requireAuth, async (req: Request, res: Response) => {
    const parsed = updateSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.format() });
    }
    const userId = req.session.userId!;
    const [existing] = await db
      .select()
      .from(drillSessions)
      .where(eq(drillSessions.id, req.params.id as string))
      .limit(1);
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ message: "Session not found" });
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.endReason) {
      updates.endReason = parsed.data.endReason;
      updates.endedAt = new Date();
    }
    if (parsed.data.totalElapsedSeconds !== undefined) {
      updates.totalElapsedSeconds = parsed.data.totalElapsedSeconds;
    }
    if (parsed.data.transcriptJson !== undefined) {
      updates.transcriptJson = parsed.data.transcriptJson;
    }
    const [row] = await db
      .update(drillSessions)
      .set(updates)
      .where(eq(drillSessions.id, req.params.id as string))
      .returning();
    res.json(row);
  });

  app.post("/api/drill/sessions/:id/grade", requireAuth, async (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const [existing] = await db
      .select()
      .from(drillSessions)
      .where(eq(drillSessions.id, req.params.id as string))
      .limit(1);
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ message: "Session not found" });
    }

    try {
      const { result, usage } = await gradeDrillSession({
        scenarioKey: existing.scenarioKey,
        transcript: existing.transcriptJson,
        totalElapsedSeconds: existing.totalElapsedSeconds ?? 0,
        endReason: existing.endReason ?? "candidate_terminated",
      });
      logGradingUsage(existing.id, usage);

      await db
        .update(drillSessions)
        .set({
          gradingResultJson: result as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(drillSessions.id, req.params.id as string));

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[drill-mode] grading failed for session", req.params.id, err);
      return res.status(500).json({
        message: "Grading failed — see server logs for details.",
        error: message,
      });
    }
  });

  app.post("/api/drill/route", requireAuth, async (req: Request, res: Response) => {
    const parsed = routeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.format() });
    }

    const t0 = Date.now();
    const { result, usage } = await routeWithHaiku(
      parsed.data.utterance,
      parsed.data.state as RoutingSessionStateInput,
    );
    logRoutingUsage(parsed.data.utterance, usage, Date.now() - t0, result.source);

    res.json(result);
  });
}
