import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Input for generating distractors for one question.
 */
export interface DistractorInput {
  prompt: string;                // The question text
  correctAnswers: string[];      // The correct answer(s) — often a single canonical string
  scenarioContext?: string;      // Optional: scenario title or background for richer distractors
  whyItMatters?: string;         // Optional: clinical rationale, helps generate plausible-but-wrong
}

/**
 * Output: 3 wrong-answer strings, each plausible enough to feel right to a novice.
 */
export type DistractorOutput = string[];

const SYSTEM_PROMPT = `You are an NREMT exam writer generating multiple-choice distractors.

Your job: given an EMS question and its correct answer, write exactly 3 plausible-but-wrong answer options that an EMT student might pick if they don't fully understand the material.

Quality requirements:
- Each distractor must be CLEARLY WRONG to someone who knows the material, but PLAUSIBLE to a student who's still learning.
- Use common student misconceptions, partially-correct-but-incomplete answers, or correct-for-different-scenarios answers.
- Match the length, style, and specificity of the correct answer. If the correct answer is 5 words, distractors should be roughly 5 words. Don't make distractors obviously longer/shorter.
- Don't include "all of the above," "none of the above," or trick options.
- Don't repeat or rephrase the correct answer.
- Each distractor must be a complete, standalone answer (not a partial phrase).

Output: ONLY a JSON array of 3 strings. No preamble, no explanation, no markdown fences. Example:
["Distractor one", "Distractor two", "Distractor three"]`;

/**
 * Generate 3 distractors for a single question. Returns array of 3 wrong-answer strings.
 * Throws on API failure or malformed response.
 */
export async function generateDistractors(input: DistractorInput): Promise<DistractorOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const correctAnswerText = input.correctAnswers.join("; ");

  const userMessage = `Question: ${input.prompt}

Correct answer: ${correctAnswerText}
${input.whyItMatters ? `\nWhy this is correct: ${input.whyItMatters}` : ""}
${input.scenarioContext ? `\nScenario context: ${input.scenarioContext}` : ""}

Generate 3 distractors as a JSON array.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Distractor generator returned no text");
  }

  let raw = textBlock.text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Distractor generator did not return an array");
  }
  if (parsed.length !== 3) {
    throw new Error(`Distractor generator returned ${parsed.length} items, expected 3`);
  }
  const cleaned = parsed.map((d) => {
    if (typeof d !== "string") throw new Error("Distractor was not a string");
    return d.trim();
  });
  if (cleaned.some((d) => !d)) {
    throw new Error("Distractor generator returned empty string");
  }
  return cleaned;
}
