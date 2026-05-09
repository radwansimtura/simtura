import { fsrs, createEmptyCard, Rating, State, type Card as FSRSCard } from "ts-fsrs";
import type { Flashcard } from "@shared/schema";

/**
 * FSRS scheduler instance with default parameters.
 * For v1, we use defaults. Later we can add per-user weight optimization
 * once users have ~1000+ reviews of history.
 */
const scheduler = fsrs();

/**
 * 4-button rating values from the Anki-style UI.
 * Maps directly to FSRS Rating enum.
 */
export type CardRating = "again" | "hard" | "good" | "easy";

const ratingMap: Record<CardRating, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

function stringToState(s: string): State {
  switch (s) {
    case "new": return State.New;
    case "learning": return State.Learning;
    case "review": return State.Review;
    case "relearning": return State.Relearning;
    default: return State.New;
  }
}

function stateToString(s: State): "new" | "learning" | "review" | "relearning" {
  switch (s) {
    case State.New: return "new";
    case State.Learning: return "learning";
    case State.Review: return "review";
    case State.Relearning: return "relearning";
    default: return "new";
  }
}

function dbToFsrsCard(card: Flashcard): FSRSCard {
  if (card.state === "new" && card.stability === 0 && card.difficulty === 0) {
    return createEmptyCard(card.createdAt);
  }
  return {
    due: card.dueDate,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: stringToState(card.state),
    last_review: card.lastReviewedAt ?? undefined,
    learning_steps: 0,
  };
}

export interface GradedCardResult {
  previousDifficulty: number;
  previousStability: number;
  previousState: "new" | "learning" | "review" | "relearning";
  newDifficulty: number;
  newStability: number;
  newState: "new" | "learning" | "review" | "relearning";
  newReps: number;
  newLapses: number;
  newDueDate: Date;
  newLastReviewedAt: Date;
  rating: number;
}

export function gradeCard(card: Flashcard, rating: CardRating, now: Date = new Date()): GradedCardResult {
  const fsrsRating = ratingMap[rating];
  const fsrsCard = dbToFsrsCard(card);
  const recordLog = scheduler.repeat(fsrsCard, now);
  // Cast: fsrsRating is always a graded value (1-4), never Rating.Manual (0)
  const result = recordLog[fsrsRating as 1 | 2 | 3 | 4];

  return {
    previousDifficulty: card.difficulty,
    previousStability: card.stability,
    previousState: card.state as "new" | "learning" | "review" | "relearning",
    newDifficulty: result.card.difficulty,
    newStability: result.card.stability,
    newState: stateToString(result.card.state),
    newReps: result.card.reps,
    newLapses: result.card.lapses,
    newDueDate: result.card.due,
    newLastReviewedAt: now,
    rating: fsrsRating,
  };
}

export interface NewCardState {
  difficulty: number;
  stability: number;
  state: "new";
  lapses: number;
  reps: number;
  dueDate: Date;
}

export function newCardState(now: Date = new Date()): NewCardState {
  const empty = createEmptyCard(now);
  return {
    difficulty: empty.difficulty,
    stability: empty.stability,
    state: "new",
    lapses: empty.lapses,
    reps: empty.reps,
    dueDate: empty.due,
  };
}

export function parseRating(s: unknown): CardRating | null {
  if (s === "again" || s === "hard" || s === "good" || s === "easy") return s;
  return null;
}
