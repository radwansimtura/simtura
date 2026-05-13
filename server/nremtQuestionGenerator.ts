// NREMT question generator. Single-question generation with structured output
// and zod validation. Used by scripts/generate-nremt-questions.ts.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { InsertNremtQuestion } from "@shared/schema";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-5";

// NREMT EMT blueprint sub-areas per top-level category. AI is required to tag
// each question to one of these sub-areas, which becomes the sub_category value.
export const NREMT_CATEGORIES = {
  Airway: [
    "Airway management",
    "Respiratory emergencies",
    "Ventilation",
    "Oxygenation",
    "Pediatric airway",
  ],
  Cardiology: [
    "Acute coronary syndrome",
    "Cardiac arrest",
    "Arrhythmias",
    "Heart failure / pulmonary edema",
    "Cardiogenic shock",
    "AED / defibrillation",
  ],
  Trauma: [
    "Bleeding and shock",
    "Head and spine trauma",
    "Chest trauma",
    "Abdominal trauma",
    "Orthopedic trauma",
    "Burns",
    "Multi-system trauma",
  ],
  Medical: [
    "Neurological emergencies",
    "Endocrine emergencies (diabetes)",
    "Allergic reactions / anaphylaxis",
    "Toxicology / overdose",
    "Behavioral / psychiatric",
    "Obstetric / gynecologic",
    "Abdominal / GI",
    "Environmental emergencies",
    "Hematologic / renal",
    "Infectious disease",
  ],
  Operations: [
    "Scene size-up and safety",
    "Lifting and moving patients",
    "EMS communication and documentation",
    "Triage and MCI",
    "Hazmat awareness",
    "Vehicle extrication",
    "Medical-legal and ethics",
    "Ambulance operations",
  ],
} as const;

export type NremtCategory = keyof typeof NREMT_CATEGORIES;

// Human-readable descriptor of difficulty for the prompt.
const DIFFICULTY_DESCRIPTOR: Record<number, string> = {
  1: "Entry level. Straightforward recall of basic EMT facts — definitions, simple recognition, standard protocol step. A first-week EMT student should get this right.",
  2: "Basic. Single-step clinical reasoning with one common confounder. Tests core knowledge applied to a clear scenario.",
  3: "Competent. Two-step reasoning. Requires distinguishing similar conditions or selecting among reasonable interventions based on subtle findings. Median NREMT-style question.",
  4: "Advanced. Multi-step reasoning. Atypical presentation, pediatric/geriatric considerations, or interventions with nuanced contraindications. The kind of question that separates strong from average candidates.",
  5: "Expert. Edge cases — unusual presentations, simultaneous problems, or scope-of-practice decisions where the textbook answer requires recognizing limits of EMT scope. Should challenge a well-prepared candidate.",
};

// Zod schema for AI output validation. Mirrors InsertNremtQuestion shape but
// allows the AI to omit fields we set ourselves (status, reviewed_*).
const generatedQuestionSchema = z.object({
  questionText: z.string().min(20),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(40),
  subCategory: z.string().min(3),
  sourceReference: z.string().min(3),
});

type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

function buildPrompt(category: NremtCategory, difficulty: number, previousSubAreas: string[] = []): string {
  const subAreas = NREMT_CATEGORIES[category].map((s) => `  - ${s}`).join("\n");
  const difficultyDesc = DIFFICULTY_DESCRIPTOR[difficulty];

  const diversityBlock = previousSubAreas.length === 0
    ? ""
    : `

DIVERSITY REQUIREMENT:
You have already written questions in this category at this difficulty covering these sub-areas:
${previousSubAreas.map((s) => `  - ${s}`).join("\n")}
Pick a DIFFERENT sub-area from the list above unless the difficulty level genuinely demands one of these. The goal across the whole bank is broad coverage of EMT scope, not depth on one topic. Even if a covered sub-area feels like the most canonical choice for this difficulty, prefer an uncovered sub-area so the bank reflects the full breadth of NREMT testing.`;

  return `You are writing a single multiple-choice question for an EMT exam practice bank that mirrors the NREMT EMT cognitive examination. Output strictly valid JSON matching the schema below — no preamble, no markdown fences, no trailing commentary.

CATEGORY: ${category}
SUB-AREAS (pick exactly one and place it in subCategory):
${subAreas}${diversityBlock}

DIFFICULTY: ${difficulty} of 5
${difficultyDesc}

WRITING RULES:
- Stay strictly within EMT scope of practice. No paramedic-only interventions (IV meds, advanced airways, 12-lead interpretation, drug pushes other than EMT-permitted) as the "correct" answer.
- Question stem is one or two sentences. If clinical, include only the vitals/findings needed to answer. No paragraph-length scenarios.
- Exactly 4 options. One unambiguously correct. Distractors must be plausible — common student errors, similar-sounding interventions, or wrong-but-tempting choices. Avoid joke options or obviously wrong filler.
- All four options should be similar length and grammatical structure. Do not make the correct answer stand out by being noticeably longer or more detailed.
- Each option must be a SINGLE intervention or action, not compound. "Administer aspirin" is good. "Administer aspirin and place patient in position of comfort" is bad — pick one. Compound answers let test-takers game the question by counting interventions.
- Explanation: 2-4 sentences. State why the correct answer is correct, and briefly why the most tempting distractor is wrong.
- sourceReference: a generic topical pointer only, not a precise citation. Format as "Category / Sub-area" — e.g. "Airway / Ventilation", "Cardiology / ACS", "Operations / Triage". Do not cite specific textbooks, chapters, page numbers, or publication years; the question is generated from EMT scope knowledge, not from a specific source, and false-precision citations create misleading provenance.
- Do not reproduce or paraphrase any real NREMT exam question. Generate from first principles.

JSON SCHEMA:
{
  "questionText": "string — the question stem",
  "options": ["string", "string", "string", "string"],
  "correctIndex": 0 | 1 | 2 | 3,
  "explanation": "string — 2-4 sentences",
  "subCategory": "string — one of the sub-areas above, verbatim",
  "sourceReference": "string — reference at chapter/topic level"
}

Output only the JSON object.`;
}

export interface GenerateOptions {
  category: NremtCategory;
  difficulty: number;
  maxRetries?: number;
  /** Sub-areas already used for this (category, difficulty) bucket. Used to push the AI toward diverse coverage. */
  previousSubAreas?: string[];
}

/**
 * Generate one NREMT question. Retries on validation failure up to maxRetries.
 * Returns the question shaped as InsertNremtQuestion (status defaults to 'draft').
 * Throws if all retries fail.
 */
export async function generateNremtQuestion(
  opts: GenerateOptions,
): Promise<InsertNremtQuestion> {
  const { category, difficulty, maxRetries = 2, previousSubAreas = [] } = opts;
  if (difficulty < 1 || difficulty > 5) {
    throw new Error(`difficulty must be 1-5, got ${difficulty}`);
  }
  const prompt = buildPrompt(category, difficulty, previousSubAreas);

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text block in response");
      }
      const raw = textBlock.text.trim();
      // Strip any accidental markdown fences.
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
      const parsed: unknown = JSON.parse(cleaned);
      const validated: GeneratedQuestion = generatedQuestionSchema.parse(parsed);

      // Validate the sub-category is one of the allowed sub-areas.
      const allowed: readonly string[] = NREMT_CATEGORIES[category];
      if (!allowed.includes(validated.subCategory)) {
        throw new Error(
          `subCategory "${validated.subCategory}" not in allowed list for ${category}`,
        );
      }

      return {
        category,
        subCategory: validated.subCategory,
        difficulty,
        questionText: validated.questionText,
        options: validated.options,
        correctIndex: validated.correctIndex,
        explanation: validated.explanation,
        sourceReference: validated.sourceReference,
        status: "draft",
        reviewedBy: null,
        reviewedAt: null,
      };
    } catch (err) {
      lastError = err;
      // Retry silently up to maxRetries.
    }
  }
  throw new Error(
    `generateNremtQuestion failed after ${maxRetries + 1} attempts for ${category}/d${difficulty}: ${String(lastError)}`,
  );
}
