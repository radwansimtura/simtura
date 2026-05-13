# Simtura — Deferred Items

Known limitations, soft-beta compromises, and explicit follow-ups for the
NREMT quiz mode and related infrastructure. Each item has a stable ID so
commits can reference it (e.g. `addresses D7`).

Last updated: Day 6 (post Phase N2). Tracked by Charlie.

---

## Category 1 — Question bank: content & coverage

### D1. Pediatric distribution under NREMT target
Current bank has 5/100 (5%) pediatric content vs NREMT's ~15%. Specifically
zero pediatric in Cardiology (0/22), Trauma (0/16), and only 1 in Medical
(1/28).
**Plan:** Phase N2.5 — generate ~10 targeted pediatric questions across
Cardiology, Trauma, Medical.

### D2. Bank size too small for serious adaptive sampling
100 questions ÷ 25 per session = 4 sessions before saturation. Adaptive
logic can't meaningfully differentiate users at this scale.
**Plan:** Scale to 300-500 questions before opening past ~50 active users.

### D3. Memorization risk on flat-bank architecture
Heavy users will memorize answers rather than learn content (the EMTprep
failure mode Charlie experienced).
**Plan:** Implement either template+variations (one concept, multiple
presentations) OR continuous regeneration cron job before opening past
~20-50 active users. Track repeat-rate metric on `quiz_session_responses`
to know when this hits.

### D4. No human-verified review
All 100 questions auto-approved as `reviewed_by='charlie-pre-beta'`.
**Plan:** Weekend review pass against Limmer eTextbook. Re-tag approved
ones as `reviewed_by='charlie-final'`, retire bad ones.

### D5. Source grounding is Claude's training knowledge, not actual textbook
Means a question could have a subtly outdated protocol, wrong dose, or
scope-creep distractor. Limmer eText is DRM-locked, can't be used as RAG
context.
**Plan:** RAG pipeline against legal sources — National EMS Education
Standards (DOT), state EMS protocols, NHTSA EMS Agenda. Public-domain,
closer to NREMT's actual source-of-truth than any textbook.

### D6. Source reference field deliberately fuzzy
Currently "Cardiology / ACS" not "AAOS Ch.14 p.412." False precision was
misleading.
**Plan:** Real citations come back once D5 is built.

---

## Category 2 — Adaptive sampling: algorithm

### D7. Level 1 difficulty steps are ±1 only
Real NREMT uses IRT and can jump multiple levels. We're conservative because
we have no calibration data on individual questions.
**Plan:** Once we have 1000+ response data points per question, fit IRT
parameters and use proper θ-based selection.

### D8. No IRT-based question weighting
Real NREMT scores by question difficulty (harder questions worth more).
Our scoring is flat (each question = 1 point).
**Plan:** When bank is calibrated, weight scoring by difficulty.

### D9. Exhaustion fallback is `console.warn`, not a real metric
When user has seen all questions in a category, we repeat and log to stdout.
**Plan:** `quiz_exhaustion_events` table with `(user_id, category,
session_id, tier, timestamp)`. When events cross threshold, that's the
trigger for memorization-defense work (D3).

### D10. No pediatric-vs-adult adaptive bias
Real NREMT enforces 85/15 within each non-Operations category. We don't
track this.
**Plan:** Add `is_pediatric: boolean` column to `nremt_questions`, bias
selection accordingly.

### D11. Rolling-average formula is arbitrary
Wrong-at-d3 contributes 2, right-at-d3 contributes 3. No empirical basis.
**Plan:** A/B test against alternative formulas once we have enough
sessions to measure outcomes (did users actually improve session-over-session).

### D12. Look-back window of 75 responses is arbitrary
~3 sessions. Could be wrong direction.
**Plan:** Same as D11 — empirical tuning once data exists.

---

## Category 3 — API & session: design

### D13. No deterministic session replay
Random shuffles + random pick on equal-difficulty pools means we can't
reproduce a session exactly. Makes debugging harder.
**Plan:** Store a session seed, derive all randomness from it.

### D14. No mid-session crash recovery
If user loses connection mid-quiz, session is abandoned.
**Plan:** Client periodically syncs session state; on reconnect, resume
from `current_index`.

### D15. No timer enforcement
Real NREMT has 2-hour limit. We don't enforce session time.
**Plan:** Track session start, optional countdown UI, hard cutoff at
configurable limit.

### D16. `boost-fsrs` (Day 5 flashcard integration) is dormant
Missed quiz questions should auto-promote into flashcard review.
**Plan:** Build NREMT version of boost-fsrs once Phase N4 ships and we
see how users actually use the quiz/flashcard combo.

### D17. No "test anxiety simulator" mode
Real NREMT can't be paused, no question count shown, no go-back. Our beta
defaults to having all helpers visible.
**Plan:** Add "exam simulation mode" toggle — hides progress, locks UI,
no back button. Important for serious test-prep users.

---

## Category 4 — UI/UX (Phase N4 — not built yet)

### D18. Explanation timing decision (A: end-only)
Evidence is mixed; chose end-only because it preserves exam-simulation feel.
**Plan:** Revisit with usage data. If users want immediate feedback, A/B
test option C (right/wrong tick mid-session, explanation at end).

### D19. No question flagging / "review this later" feature
Real test-prep apps let users mark questions for follow-up.
**Plan:** Add `flagged` boolean on `quiz_session_responses`, surface in
flashcards or a "review queue."

### D20. No per-question time tracking
Knowing which questions take 10 vs 90 seconds is gold for understanding
prep state.
**Plan:** Client sends `time_to_answer_ms` with each submit, store on
response row.

---

## Category 5 — Infrastructure: debt

### D21. Postgres SSL deprecation warning
Drizzle-kit and pg warn that `sslmode=require` will change behavior in
a future major version.
**Plan:** Update connection string to `verify-full` or
`uselibpqcompat=true&sslmode=require` before the next major bump.

### D22. No question-level review/edit UI
Currently you'd `UPDATE nremt_questions ... WHERE id = '...'` by hand
when weekend review surfaces a bad question.
**Plan:** Minimal admin page at `/admin/nremt` to edit / retire / approve
questions. Build alongside scenario admin if that exists.

### D23. One-shot patch scripts committed as historical record
`patch-generator-diversity.ts`, `patch-orchestrator-diversity.ts`,
`apply-nremt-schema.ts`, `apply-n3-schema.ts` are inert post-application.
**Plan:** Archive into `scripts/archive/` during quarterly cleanup. Not
urgent.

### D24. Repo ownership transferred to `radwansimtura/simtura` by Yousef
Push works via redirect, but `git remote -v` still points at old URL.
**Plan:** (a) Ask Yousef whether the ownership change was intentional,
(b) update remote URL, (c) establish a "communicate before changing
co-founder-touched infra" norm.

### D25. `/api/quiz/submit` latency ~3s per request
Live testing during Phase N3 showed each submit takes 2-3 seconds. Cause is
sequential DB roundtrips per request: fetch session, fetch placeholder, update
placeholder, fetch just-served question, pick next question, insert next
placeholder, update session. Six round trips. Painful UX — users tapping an
answer expect <500ms response.
**Plan:** Batch the writes into a single transaction; cache the session row
in a per-request memo so we don't re-fetch it; consider denormalizing the
just-served question's category onto the placeholder row so we don't have
to look it up. Real fix likely cuts this to ~500-800ms.

---

## How to use this file

- Reference items in commits: `addresses D7` or `partial fix for D3`.
- When an item is resolved, move to the "Resolved" section at the bottom
  with a commit SHA and date.
- New items: append with the next ID number, never reuse a retired ID.
- Categories can grow as new areas of debt show up.

## Resolved

(none yet)
