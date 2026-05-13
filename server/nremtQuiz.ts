// NREMT quiz adaptive sampling logic.
//
// Designed to mirror real NREMT computer-adaptive testing (CAT) behavior:
// - Fixed category distribution per session (5/6/4/7/3 = 25 questions), matching
//   the NREMT EMT blueprint percentages (Airway 18-22%, Cardiology 20-24%, etc).
// - Difficulty adapts every question (±1, clamped [1,5]).
// - Per-category starting difficulty is biased by the user's rolling history
//   in that category (Level 2 collapsed into Level 1's starting state).
// - Category sequence is deterministic round-robin to interleave topics, like
//   real NREMT — no two consecutive same-category questions unless forced.
import { db } from "./db";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import {
  nremtQuestions,
  quizSessions,
  quizSessionResponses,
  type NremtQuestion,
} from "@shared/schema";

export const SESSION_LENGTH = 25;

export const SESSION_BLUEPRINT: Record<string, number> = {
  Airway: 5,
  Cardiology: 6,
  Trauma: 4,
  Medical: 7,
  Operations: 3,
};

const ALL_CATEGORIES = Object.keys(SESSION_BLUEPRINT);

/**
 * Build the interleaved category sequence for a session using deterministic
 * round-robin from the largest-remaining bucket. Spreads categories across
 * the session (no two consecutive same-category unless forced at the tail),
 * mirroring real-NREMT interleaving. Round-robin rather than random because
 * the real NREMT uses IRT to interleave intelligently; random picks produce
 * clumps that don't happen on the real exam.
 */
export function buildCategorySequence(): string[] {
  const remaining: Record<string, number> = { ...SESSION_BLUEPRINT };
  const sequence: string[] = [];
  let lastCategory: string | null = null;

  while (sequence.length < SESSION_LENGTH) {
    const candidates = ALL_CATEGORIES.filter((c) => remaining[c] > 0);
    if (candidates.length === 0) break;

    // Prefer categories OTHER than the last one to avoid back-to-back repeats.
    const nonRepeats = candidates.filter((c) => c !== lastCategory);
    const pool = nonRepeats.length > 0 ? nonRepeats : candidates;

    // Within the pool, pick the category with the most slots remaining.
    // Alphabetical tie-break for determinism.
    const maxCount = Math.max(...pool.map((c) => remaining[c]));
    const topCandidates = pool.filter((c) => remaining[c] === maxCount).sort();
    const pick = topCandidates[0];

    sequence.push(pick);
    remaining[pick]--;
    lastCategory = pick;
  }
  return sequence;
}

/**
 * Compute starting difficulty per category for a given user. New users start
 * every category at 3. Users with history start each category at their
 * rolling average across their last ~3 completed sessions (75 responses),
 * clamped [1,5].
 */
export async function computeStartingDifficulties(
  userId: string,
): Promise<Record<string, number>> {
  const recentResponses = await db
    .select({
      category: nremtQuestions.category,
      difficulty: nremtQuestions.difficulty,
      isCorrect: quizSessionResponses.isCorrect,
    })
    .from(quizSessionResponses)
    .innerJoin(
      nremtQuestions,
      eq(quizSessionResponses.nremtQuestionId, nremtQuestions.id),
    )
    .innerJoin(quizSessions, eq(quizSessionResponses.sessionId, quizSessions.id))
    .where(
      and(
        eq(quizSessions.userId, userId),
        eq(quizSessions.quizMode, "nremt"),
        sql`${quizSessions.completedAt} IS NOT NULL`,
      ),
    )
    .orderBy(sql`${quizSessions.startedAt} DESC`)
    .limit(75);

  const starts: Record<string, number> = {};
  for (const cat of ALL_CATEGORIES) {
    const catResponses = recentResponses.filter((r) => r.category === cat);
    if (catResponses.length === 0) {
      starts[cat] = 3;
      continue;
    }
    const sum = catResponses.reduce((acc, r) => {
      const adj = r.isCorrect ? r.difficulty : r.difficulty - 1;
      return acc + adj;
    }, 0);
    const avg = sum / catResponses.length;
    starts[cat] = Math.max(1, Math.min(5, Math.round(avg)));
  }
  return starts;
}

/** Adapt difficulty after an answer: ±1, clamped [1,5]. */
export function adaptDifficulty(current: number, wasCorrect: boolean): number {
  return Math.max(1, Math.min(5, current + (wasCorrect ? 1 : -1)));
}

/**
 * Pick the next question for a session. Tries in tiers (logged as exhaustionLevel):
 *   0. Exact (category, target difficulty), excluding already-served IDs.
 *   1. Same category, ±1 difficulty.
 *   2. Same category, any difficulty.
 *   3. Same category, repeat allowed (logs an exhaustion warning).
 */
export async function pickNextQuestion(
  category: string,
  targetDifficulty: number,
  excludeIds: string[],
): Promise<{ question: NremtQuestion; exhaustionLevel: number }> {
  const baseFilter = and(
    eq(nremtQuestions.status, "approved"),
    eq(nremtQuestions.category, category),
  );

  // Tier 0: exact match.
  const tier0 = await db
    .select()
    .from(nremtQuestions)
    .where(
      and(
        baseFilter,
        eq(nremtQuestions.difficulty, targetDifficulty),
        excludeIds.length > 0
          ? notInArray(nremtQuestions.id, excludeIds)
          : sql`true`,
      ),
    )
    .limit(50);
  if (tier0.length > 0) {
    return { question: pickRandom(tier0), exhaustionLevel: 0 };
  }

  // Tier 1: adjacent difficulty.
  const adjacent = [targetDifficulty - 1, targetDifficulty + 1].filter(
    (d) => d >= 1 && d <= 5,
  );
  if (adjacent.length > 0) {
    const tier1 = await db
      .select()
      .from(nremtQuestions)
      .where(
        and(
          baseFilter,
          inArray(nremtQuestions.difficulty, adjacent),
          excludeIds.length > 0
            ? notInArray(nremtQuestions.id, excludeIds)
            : sql`true`,
        ),
      )
      .limit(50);
    if (tier1.length > 0) {
      return { question: pickRandom(tier1), exhaustionLevel: 1 };
    }
  }

  // Tier 2: any difficulty in category.
  const tier2 = await db
    .select()
    .from(nremtQuestions)
    .where(
      and(
        baseFilter,
        excludeIds.length > 0
          ? notInArray(nremtQuestions.id, excludeIds)
          : sql`true`,
      ),
    )
    .limit(50);
  if (tier2.length > 0) {
    return { question: pickRandom(tier2), exhaustionLevel: 2 };
  }

  // Tier 3: allow repeats (bank depleted for this category — see D9 in DEFERRED.md).
  const tier3 = await db
    .select()
    .from(nremtQuestions)
    .where(baseFilter)
    .limit(50);
  if (tier3.length === 0) {
    throw new Error(`No approved questions in category ${category}`);
  }
  console.warn(`[nremtQuiz] Category ${category} exhausted, repeating a question.`);
  return { question: pickRandom(tier3), exhaustionLevel: 3 };
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle a question's options and recompute correctIndex. The shuffled
 * options + new correctIndex must be persisted on the response row so we
 * know which option position the user actually saw as correct.
 *
 * Mirrors real NREMT: same question can have option order vary across users,
 * preventing position-pattern memorization.
 */
export function shuffleOptions(q: NremtQuestion): {
  id: string;
  category: string;
  subCategory: string | null;
  difficulty: number;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceReference: string | null;
} {
  const originalOptions = q.options as string[];
  const correctText = originalOptions[q.correctIndex];
  const shuffled = [...originalOptions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const newCorrectIndex = shuffled.indexOf(correctText);
  return {
    id: q.id,
    category: q.category,
    subCategory: q.subCategory,
    difficulty: q.difficulty,
    questionText: q.questionText,
    options: shuffled,
    correctIndex: newCorrectIndex,
    explanation: q.explanation,
    sourceReference: q.sourceReference,
  };
}

/** Strip server-only fields before sending to client. correctIndex and
 *  explanation are omitted — client sees neither during the session
 *  (results screen is computed server-side and revealed at end, per D18). */
export function questionForClient(shuffled: ReturnType<typeof shuffleOptions>): {
  id: string;
  category: string;
  subCategory: string | null;
  difficulty: number;
  questionText: string;
  options: string[];
} {
  return {
    id: shuffled.id,
    category: shuffled.category,
    subCategory: shuffled.subCategory,
    difficulty: shuffled.difficulty,
    questionText: shuffled.questionText,
    options: shuffled.options,
  };
}
