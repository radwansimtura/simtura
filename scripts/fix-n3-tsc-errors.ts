// Phase N3 cleanup:
// 1. Delete the dormant scenario boost-fsrs route entirely (depends on stepId
//    being non-null, which Phase N1 relaxed). No UI ever called it.
// 2. Add nremtQuestions table import.
// 3. Add asc from drizzle-orm.
// 4. Tighten categoryDifficulty type cast.
import { readFileSync, writeFileSync } from "node:fs";

const path = "server/routes.ts";
let src = readFileSync(path, "utf8");

function replaceOnce(needle: string, replacement: string, label: string): void {
  const idx = src.indexOf(needle);
  if (idx === -1) throw new Error(`Edit "${label}": needle not found`);
  if (src.indexOf(needle, idx + 1) !== -1) throw new Error(`Edit "${label}": needle matched multiple times`);
  src = src.slice(0, idx) + replacement + src.slice(idx + needle.length);
  console.log(`✓ ${label}`);
}

// Edit 1: Delete the dormant scenario boost-fsrs route.
// Anchor on the full route signature + the unique closing pattern that follows.
// The route ends with "res.json({ boosted: boosted + created, created });" then "});" then blank then "return httpServer;".
// We delete from the blank line BEFORE the route signature through and including the route's closing "});" + the blank after.
replaceOnce(
  `
  app.post("/api/quiz/scenario/:sessionId/boost-fsrs", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const sessionId = req.params.sessionId as string;

    // Validate session
    const [session] = await db.select().from(quizSessions).where(eq(quizSessions.id, sessionId));
    if (!session) return res.status(404).json({ message: "Quiz session not found" });
    if (session.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    if (!session.completedAt) return res.status(400).json({ message: "Session not submitted yet" });

    // Pull all wrong-answer responses
    const wrongResponses = await db.select().from(quizSessionResponses)
      .where(and(
        eq(quizSessionResponses.sessionId, sessionId),
        eq(quizSessionResponses.isCorrect, false),
      ));
    if (wrongResponses.length === 0) {
      return res.json({ boosted: 0, created: 0 });
    }

    // For each wrong response, find or create the corresponding flashcard
    let boosted = 0;
    let created = 0;
    const cardIdsToBoost: string[] = [];

    for (const r of wrongResponses) {
      // Find existing card by user + sourceStepId
      const existingCards = await db.select().from(flashcards)
        .where(and(
          eq(flashcards.userId, userId),
          eq(flashcards.sourceStepId, r.stepId),
        ));

      if (existingCards.length > 0) {
        // Boost all existing cards from this step. (Single-q steps → 1 card. Multi-q steps → multiple cards;
        // we boost all since we don't currently track per-question card mapping. Reasonable v1 behavior.)
        cardIdsToBoost.push(...existingCards.map((c) => c.id));
      } else {
        // No card exists yet. Lazily create one for this question.
        const step = await storage.getScenarioStep(r.stepId);
        if (!step) continue;

        // Find or create deck for this scenario
        let deck = await storage.getDeckByScenarioAndUser(step.scenarioId, userId);
        if (!deck) {
          const scenario = await storage.getScenario(step.scenarioId);
          deck = await storage.createDeck({
            userId,
            scenarioId: step.scenarioId,
            attemptId: null,
            title: scenario?.title || "Quiz-generated deck",
          });
        }

        // Build card content from the question
        const questions = Array.isArray(step.questions) ? (step.questions as any[]) : [];
        let front = "";
        let back = "";
        if (questions.length > 0 && questions[r.questionIndex]) {
          const q = questions[r.questionIndex];
          front = typeof q.prompt === "string" ? q.prompt : "";
          const qActions = Array.isArray(q.correctActions) ? q.correctActions.map(String) : [];
          const why = step.whyItMatters ?? "";
          back = why ? \`\${qActions.join("; ")}\\n\\nWhy it matters: \${why}\` : qActions.join("; ");
        } else {
          front = step.prompt;
          const why = step.whyItMatters ?? "";
          back = why ? \`\${(step.correctActions ?? []).join("; ")}\\n\\nWhy it matters: \${why}\` : (step.correctActions ?? []).join("; ");
        }
        if (!front || !back) continue;

        const initial = newCardState();
        const scenario = await storage.getScenario(step.scenarioId);
        const newCard = await storage.createCard({
          deckId: deck.id,
          userId,
          front,
          back,
          sourceStepId: step.id,
          tags: scenario ? [scenario.title] : [],
          difficulty: initial.difficulty,
          stability: initial.stability,
          state: initial.state,
          lapses: initial.lapses,
          reps: initial.reps,
          dueDate: initial.dueDate,
          priorityBoost: true, // boost on creation
        });
        cardIdsToBoost.push(newCard.id);
        created++;
      }
    }

    // Boost all collected cards in one shot
    if (cardIdsToBoost.length > 0) {
      // Use storage helper if available, else direct update
      await storage.setCardPriorityBoost(cardIdsToBoost, true);
      boosted = cardIdsToBoost.length - created; // created were already boosted on insert
    }

    res.json({ boosted: boosted + created, created });
  });
`,
  "",
  "Edit 1: delete dormant scenario boost-fsrs route",
);

// Edit 2: Add nremtQuestions to the schema import block. Anchor on quizSessionResponses
// which we know is already imported (Day 5).
replaceOnce(
  "  quizSessionResponses,",
  "  quizSessionResponses,\n  nremtQuestions,",
  "Edit 2: import nremtQuestions table",
);

// Edit 3: Add asc to the drizzle-orm import. Match the existing import line.
replaceOnce(
  "import { and, eq",
  "import { and, asc, eq",
  "Edit 3: import asc from drizzle-orm",
);

// Edit 4: Tighten categoryDifficulty type. The error comes from indexing into
// what TS narrowed to {} from the helper return.
replaceOnce(
  "    const categoryDifficulty = await computeStartingDifficulties(userId);",
  "    const categoryDifficulty: Record<string, number> = await computeStartingDifficulties(userId);",
  "Edit 4: widen categoryDifficulty type to Record<string, number>",
);

writeFileSync(path, src);
console.log("\nFixes applied.");
