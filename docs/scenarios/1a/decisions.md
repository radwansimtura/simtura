# Scenario 1A — Drill Mode Implementation Decisions

Running log of decisions made during implementation that aren't covered by the four canonical spec docs (`drill-mode-script-v2.md`, `grading-prompt.md`, `asset-list.md`, `routing-logic.md`). When a decision changes, update the entry in place rather than appending a new one.

---

## D-1. "Scenario 1A" identity

**Decision:** Drill Mode for Scenario 1A attaches to the existing prod scenario row with UUID `11111111-aaaa-1111-aaaa-111111111111`, titled "Scenario 1A — Chest Pain / Heart Problems (NREMT Practice)".

This scenario row was added directly to prod (not via `server/seed.ts`), so the seed file does not contain it. The `drillSessions` table references this UUID as the `scenarioId` foreign key.

Other scenarios do not get Drill Mode in v1.

---

## D-2. Deepgram transport — server-proxied, not direct browser WebSocket

**Decision:** The browser does NOT open a direct WebSocket to Deepgram. Instead, the Simtura backend mints short-lived tokens (or proxies the streaming connection through a server-side WebSocket) so `DEEPGRAM_API_KEY` is never exposed to the client.

Rationale:
- The existing codebase has zero client-side env var usage (no `import.meta.env` in production code). Adding `DEEPGRAM_API_KEY` to the client bundle would be a divergence and a key-leak risk.
- The proxy can also add per-user rate limiting, billing telemetry, and session lifecycle hooks.

Functionally identical to a direct connection for the runtime router's purposes — only the transport differs. Reflected in `routing-logic.md` section 0.

---

## D-3. Entry point UX — pre-start landing (Option A), gated to Scenario 1A

**Decision:** Modify `client/src/pages/scenario-trainer.tsx` to add a pre-start landing screen that appears BEFORE the existing Learn Mode auto-start, with two CTAs: "Start Learn Mode" and "Start Drill Mode". The pre-start landing is gated to scenario UUID `11111111-aaaa-1111-aaaa-111111111111` only. All other scenarios keep their current auto-start behavior unchanged.

Implementation of the landing UI itself is Phase 4 work. Phase 1 only scaffolds the route at `/drill/scenario-1a` so navigation paths exist.

---

## D-4. Feature flag — server-side env var, exposed via API

**Decision:** Gating is via the `DRILL_MODE_ENABLED` env var, read server-side only. A `GET /api/feature-flags` endpoint returns `{ drillModeEnabled: boolean }` so the client can hide the entry-point button and the `/drill/scenario-1a` page can show a "coming soon" state when the flag is off.

When the flag is `true`, the entry point appears for Scenario 1A and the drill page renders normally. When `false` or unset, the drill page renders a "coming soon" placeholder and the entry point is suppressed.

---

## D-5. Database schema migrations — additive only, no auto-push

**Decision:** New schema additions are made to `shared/schema.ts` but `npm run db:push` is NOT run automatically — the dev environment is connected to the prod Postgres instance, so any push is a prod migration. Schema changes require explicit user approval before pushing.

For Phase 1, the `drillSessions` table is defined in code only. Push happens after user sign-off.

---

## D-6. Out-of-scope for v1 (deferred to later phases)

Per the build spec §7 and confirmed:
- Real asset generation (Runway, ElevenLabs) — Phase 2 uses macOS `say` + ffmpeg-generated solid-color MP4s
- R2 bucket / CDN setup — mock assets served from `client/public/drill-assets/scenario-1a/`
- Production deployment of Drill Mode
- Service worker caching — Phase 1 uses in-browser memory cache
- Mobile responsiveness — desktop-only first build
- Multi-scenario support — Scenario 1A only
- Analytics / billing / paywall changes

---

## D-7. Reuse the existing Anthropic SDK client

**Decision:** The Drill Mode grading endpoint reuses the `anthropic` singleton already initialized in `server/routes.ts:80` (`new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 15000 })`). No second SDK instance.

The 15-second timeout may need to be raised for grading calls (which can run 5-15s by spec); evaluate during Phase 3 implementation.

---

## D-8. Known limitation: greedy regex first-match position in multi-intent routing

`routeUtteranceMulti` sorts within-category by `u.search(regex)` (first match position). Several rules use greedy `.*` spans (e.g., `\bscene\b.*\b(safe|...)`), which can match incidentally early in a multi-clause utterance and report a misleading position. When that happens alongside a same-category match elsewhere in the sentence, the responses can play out of the order the candidate actually said them.

**Symptom:** mild — audio plays in a slightly wrong order on contrived utterances containing red-herring keywords ("check the scene later... how many patients... scene is safe"). Grading is unaffected because Sonnet sees the full transcript with timestamps.

**How to apply:** revisit if Phase 5 testing surfaces it. Cheapest fix is tightening the greedy patterns to clause-bounded forms (e.g., `[^.,;?!]{0,40}?` instead of `.*`). A more rigorous fix uses `matchAll` and chooses the position assignment that minimizes ordering inversions, but that's overkill until real candidate speech proves it's needed.

---

## D-9. Simulation should not fake what the real exam doesn't fake

**Decision:** The real NREMT psychomotor exam uses standardized patient actors who do not
act out symptoms convincingly — clinical findings (pallor, diaphoresis, posture changes)
are delivered by the evaluator narrating the scene, not depicted visually. The evaluator
is mostly a background presence and rarely makes sustained eye contact with the
candidate; during the station the candidate's only ambient feedback is the evaluator's
pen moving on the clipboard. Drill Mode mirrors this rather than dramatizing it:

- **Patient is visually static across the entire scenario** — a standardized actor at
  rest, not a faked-symptomatic patient. Pale/cool/diaphoretic findings are delivered
  via evaluator audio (D1 opening, E7 skin). See `asset-list.md` §A1.
- **No patient close-up cuts** when P-lines fire. Audio plays over the continuous
  background loop. See `asset-list.md` §A3 (DEFERRED).
- **Clipboard writing is ambient**, baked into the background loop — not triggered as
  cuts on graded actions. The candidate cannot distinguish a hit from a miss from idle
  ambient writing. See `asset-list.md` §A4 (DEFERRED) and `drill-mode-script-v2.md` §2.
- **No mid-session feedback** — no "good, that's a point" between steps, no score
  updates, no encouragement. Real evaluators don't do this; the simulation doesn't
  either. Locked in `drill-mode-script-v2.md` §2.

**Reusable principle for future scenarios:** When designing any visual or audio element,
ask **"does this happen on the real exam?"** If not, leave it out — even if it would
feel more immersive. The simulation's value is fidelity to the real exam experience, not
theatrical enhancement.

This principle has been applied to A1 (no symptom depiction), A3 (no patient cuts), and
A4 (no clipboard cuts). Future scenarios (Trauma, Cardiac Arrest, BVM, Spinal, Joint
Immobilization, Long Bone, Bleeding/Shock, Oxygen Admin) should be audited against this
question before adding novel visual or audio treatments — and again after any user
testing that surfaces a "wouldn't it feel more real if…" instinct.

**Relationship to D-6:** D-6 lists v1 mock-asset deferrals as "later-phase work" (real
Runway/ElevenLabs generation, R2 CDN, service-worker caching — all expected to land
eventually). D-9 is categorically different: A3 and A4 are not deferred to a later phase,
they are decided to be absent from the design entirely. D-6 still applies to A1's v1
asset generation pipeline; D-9 is what makes the A3/A4 deferrals permanent rather than
temporary.
