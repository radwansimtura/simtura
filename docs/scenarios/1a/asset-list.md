# Scenario 1A — Asset Generation List

**Purpose:** Production checklist for all visual and audio assets needed to ship Drill Mode for Scenario 1A.

**Tools required:**
- Runway (text-to-image + image-to-video)
- ElevenLabs (voice synthesis)
- Cloudflare R2 (storage and CDN)

**Estimated total cost:** ~$60-100 in API/credit usage for first-pass generation, allowing for 3-5 iteration cycles on each asset.

---

## Current status (as of 2026-05-21)

We are past Phase 1 and approximately halfway through Phase 4 (audio generation). Several
sections of this list deviate from what's actually been built; each is annotated below
with a **Decision** or **Status** callout. Quick summary:

- **A1 Master image:** generated. Uses a standardized adult actor at rest rather than the
  originally-spec'd 70yo symptomatic patient. See A1 Decision note.
- **A2 Background loop:** generated, in place. 10-second loop (Runway model maximum for
  the version used) rather than the originally-spec'd 15s.
- **A3 Patient close-up:** **DEFERRED** — not used in v1 runtime.
- **A4 Clipboard write variants:** **DEFERRED** — not used in v1 runtime.
- **B1 Voice casting:** pending. ElevenLabs vs. Runway voice generation is still being
  evaluated.
- **B2 Audio lines:** currently macOS `say` mocks (per `decisions.md` D-6). Real TTS
  generation waits on the B1 decision.
- **D Production sequencing:** preserved below for reference, but the pipeline has
  effectively skipped A3 and A4 and is currently iterating on B1.

The original spec text is retained below where possible; updates are marked inline so the
historical reasoning stays visible.

---

## Section A — Runway visual assets

### A1. Master reference image (single static image)

This is the foundation. Generate FIRST. Every other visual asset uses this as a seed.

**Tool:** Runway text-to-image
**Output:** 1 high-resolution PNG (4K target, 1920×1080 acceptable)
**Storage:** R2 bucket `simtura-assets/scenario-1a/master-image.png`

> **Decision (v1):** The original spec called for a 70-year-old symptomatic patient with
> progressive visual symptom changes throughout the scenario (pallor, diaphoresis, posture
> shifts). v1 instead uses a **standardized adult patient actor at rest** — visual is
> static across the entire scenario, and all clinical findings (pale, cool, diaphoretic,
> etc.) are delivered via evaluator audio rather than depicted visually.
>
> Reason: this matches the real NREMT exam, where the patient role is played by a healthy
> standardized actor who does not fake symptoms — the evaluator narrates findings instead.
> It also removes a class of uncanny-valley artifacts in image-gen output (overly dramatic
> symptom depiction, hospital-coded lighting) and keeps the actor visually believable.
>
> The locked master image reflects this direction: a mid-30s actor in a plain T-shirt and
> jeans, sitting calmly in a folding chair in a neutral testing-room setting. The prompt
> below is the v1 prompt used to generate that image.
>
> Underlying principle: see `decisions.md` D-9 ("Simulation should not fake what the real
> exam doesn't fake") — this decision is one of three concrete applications of that rule.

**Prompt (v1):**

> A mid-30s adult male actor with a neutral expression and average build sits calmly in a
> standard metal folding chair, wearing a plain gray T-shirt and dark blue jeans. He is at
> rest — hands resting on his knees, upright posture, looking forward in a relaxed
> manner. He is **not** portrayed as symptomatic. No pallor, no sweating, no posture
> changes, no chest-clutching. He is a healthy actor positioned in a testing room as the
> candidate-facing patient.
>
> The room is a plain, well-lit indoor testing environment with neutral beige walls and a
> simple vinyl or hardwood floor — NOT a bedroom or living room. No family photos,
> television, or domestic props. To the actor's right, about four feet away, sits a black
> canvas EMS gear bag on the floor, partially open.
>
> Lighting is even, soft, and neutral — no directional shadows, no warm "golden hour"
> color cast. The image should read as a calm, documented testing space.
>
> Photorealistic, documentary style. Camera at eye level, positioned as if a kneeling EMT
> trainee is approaching, looking past their shoulder toward the actor. No text, no logos,
> no signage.

**Iteration guidance:**

Failure modes to watch for and corrections:

| Problem | Adjustment |
|---|---|
| Actor portrayed as symptomatic (pale, sweating, hunched) | Re-emphasize "healthy actor at rest, neutral posture, no symptoms portrayed" |
| Room reads as bedroom / living room (couch, family photos, TV) | Re-emphasize "plain testing room, no domestic props" |
| Lighting too warm / cinematic | Soften to "even neutral lighting, no directional shadows" |
| Actor too elderly / frail-looking | Re-emphasize "mid-30s, average build, healthy appearance" |
| Wrong number of people in frame | Add "exactly one person: the actor. No evaluator in this image." |
| Camera angle too dramatic | Re-emphasize "eye level, calm framing, no low or canted angle" |

**Acceptance criteria before locking the master image:**

- Actor appears mid-30s, healthy, in plain T-shirt and jeans
- No visual symptoms portrayed (no pallor, sweating, posture issues, or chest-clutching)
- Setting reads as a neutral testing room, not a domestic space
- Lighting is even and neutral
- EMS gear bag visible on the floor
- Camera angle suggests first-person trainee perspective
- No artifacts (extra limbs, distorted faces, floating objects, text)

**Iteration budget:** Plan 5-15 generations. Save the seed/parameters when you get
something close — small prompt tweaks at the same seed preserve what you like while
changing one element.

---

### A2. Background ambient loop video

The continuous wide shot that plays underneath the entire 15-minute scenario.

**Tool:** Runway image-to-video, using A1 as the seed image
**Output:** 1 MP4 file, **10 seconds**, seamless loop
**Storage:** R2 bucket `simtura-assets/scenario-1a/background-loop.mp4`
**Resolution:** 720p (1280×720) — sufficient quality, reasonable bandwidth
**Codec:** H.264, target bitrate 1-2 Mbps for smooth streaming

> **Status (v1):** Generated and in place at
> `client/public/drill-assets/scenario-1a/background-loop.mp4`. Duration is **10 seconds**
> rather than the originally-spec'd 15s — that's the maximum clip length the Runway model
> version used supports. The loop carries the entire scenario; no patient close-up or
> clipboard cuts swap in over it (see A3/A4 below).
>
> The ambient writing motion (the evaluator periodically marking a clipboard, visible in
> the background loop itself) is the **only** clipboard-write visual in v1 — there is no
> overlay cut when grading events fire.

**Prompt for Runway (v1):**

> Subtle ambient motion in a calm indoor testing room. The mid-30s male actor in the
> folding chair sits at rest with normal, relaxed breathing (about 14-16 breaths per
> minute, healthy adult). His hands remain on his knees. He occasionally blinks and may
> shift his weight slightly once over the clip. He is not portrayed as symptomatic.
>
> An evaluator figure (visible peripherally in frame, not central) occasionally writes on
> her clipboard with a small natural pen motion — this ambient writing is the only
> "clipboard activity" the candidate will see during the full session.
>
> Even neutral lighting remains constant. No camera movement — camera holds completely
> steady. No directional shadows.
>
> Photorealistic, documentary style. The clip must loop seamlessly — end frame should
> match start frame closely so there is no visible jump on repeat.

**Acceptance criteria:**

- Actor's breathing is subtle and healthy (not the 18-20/min slightly-labored rate of the
  original symptomatic spec)
- Evaluator's clipboard writing happens at least once during the 10-second loop (this is
  the only "writing" visual the candidate gets — see A4 deferral)
- Camera is completely still
- Loop point is seamless (no visible cut)
- No sudden movements or distractions
- Lighting and color match the master image exactly

**Note on loop length:** 10 seconds is the v1 ceiling imposed by the Runway model version
in use. At 720p with this duration the file is well under 5 MB and streams effortlessly;
repeated viewing across a 15-minute session doesn't feel obviously looped because the
motion is intentionally subtle.

---

### A3. Patient close-up cut clip — **DEFERRED, not used in v1**

> **Status — DEFERRED for v1:** The visual engine no longer triggers a patient close-up
> cut when patient lines fire. Audio plays over the continuous background loop instead.
> The `patient-closeup.mp4` placeholder remains in the asset folder and the manifest field
> stays in `client/public/drill-assets/scenario-1a/manifest.json` for potential future
> use, but the runtime does not reference it.
>
> Reason: introducing a full-screen swap to a 6-second patient close-up clip every time a
> patient line fired added visual complexity without meaningfully improving immersion in
> v1's audio-first delivery model. The continuous background loop already shows the actor;
> the audio carries the conversation. The cut was load-bearing only if the patient was
> visually symptomatic (per the original spec) — and v1 dropped visual symptom depiction
> (see A1 Decision note), removing the original motivation for the cut.
>
> Underlying principle: see `decisions.md` D-9 ("Simulation should not fake what the real
> exam doesn't fake"). The deferral is permanent under that principle, not a v1-only
> deferral pending real assets (compare D-6, which is about mock-asset deferrals that
> will be replaced later).

The spec below is preserved for reference in case v2 reintroduces patient cuts.

---

#### Original spec (v1 NOT in use)

A brief shot of just the patient, used when the patient speaks. Same patient pose, tighter framing.

**Tool:** Runway image-to-video, using A1 as the seed image
**Output:** 1 MP4 file, 6 seconds, near-static
**Storage:** R2 bucket `simtura-assets/scenario-1a/patient-closeup.mp4`
**Resolution:** 720p

**Prompt:**

> Close-up shot of the 70-year-old male patient on the couch, from chest up. Same lighting and color grading as the wide shot. His mouth moves subtly as if he is speaking, but no specific lip sync is required. His expression is one of quiet discomfort. He breathes between phrases with visible effort. His right hand remains on his chest. His eyes look down or slightly toward the camera (which is positioned where the EMT trainee would be standing).
>
> Camera is steady. Warm natural light from window left. Photorealistic, documentary style.

**Acceptance criteria:**

- Framing is chest-up to forehead (not full body, not just face)
- Mouth movement is generic-speaking (no specific phrase being mouthed)
- Patient maintains the same posture and expression as the wide shot
- Clip can play under any patient audio line without looking mismatched
- Loops cleanly if needed (the patient should look the same at second 0 and second 6)

**Usage in runtime:** When ANY patient line fires (P1-P21), this clip plays for the duration of the audio. If the audio is shorter than 6 seconds, the clip is cut at the audio end. If longer than 6 seconds (rare — P15 medications is the longest at ~9 seconds), the clip loops once.

---

### A4. Clipboard write animation variants (3 clips) — **DEFERRED, not used in v1**

> **Status — DEFERRED for v1:** The visual engine no longer triggers clipboard cuts when
> graded actions fire. The ambient writing already in the background loop (A2) is
> sufficient feedback. Three placeholder `clipboard-{1,2,3}.mp4` files remain in the
> asset folder and the manifest still lists them for potential future use, but the
> runtime does not reference them.
>
> Reason: live testing showed that swapping to a 1-2.5s clipboard clip every time the
> candidate said something gradable read as a gray flash with placeholder assets, and even
> with finished assets it broke immersion at the exact moment the candidate should feel
> "the simulation acknowledged me." Trusting the ambient writing in the background loop
> produced a calmer, more believable experience. The transcript still logs each
> `clipboard_write` event for end-of-scenario grading — Sonnet sees them; the candidate
> doesn't.
>
> Underlying principle: see `decisions.md` D-9 ("Simulation should not fake what the real
> exam doesn't fake"). The deferral is permanent under that principle, not a v1-only
> deferral pending real assets (compare D-6, which is about mock-asset deferrals that
> will be replaced later).

The spec below is preserved for reference in case v2 reintroduces clipboard cuts.

---

#### Original spec (v1 NOT in use)

Brief visual cuts showing the evaluator marking her clipboard. Fired whenever a candidate action is logged for grading.

**Tool:** Runway image-to-video, using A1 as the seed image
**Output:** 3 MP4 files
**Storage:** R2 bucket `simtura-assets/scenario-1a/clipboard-{1,2,3}.mp4`
**Resolution:** 720p

**Variant 1 — Quick check (~1 second):**

> Close-up of the evaluator's hands and clipboard. She makes a small quick check mark on the paper, then her hand returns to neutral. No facial visible. Same lighting as the master image. Camera steady.

**Variant 2 — Standard write (~2 seconds):**

> Medium close-up of the evaluator from the chest up. She looks down at her clipboard, writes briefly with her pen (2-3 quick strokes), then looks back up toward the patient. Her expression remains neutral. Camera steady.

**Variant 3 — Brief glance + write (~2.5 seconds):**

> Medium shot of the evaluator. She glances up briefly toward the patient (or toward the trainee position off-camera), looks back down at her clipboard, makes a longer note (4-5 pen strokes), then looks up again. Neutral expression throughout. Camera steady.

**Acceptance criteria for all three:**

- Evaluator's appearance and clothing match A1 exactly
- Pen motion is realistic (no stuttering, no missing pen)
- No audio (these are visual-only assets)
- Lighting matches the master image
- Each clip starts and ends with the evaluator in a neutral position (so the cut back to the wide shot is seamless)

**Runtime usage:** The runtime picks one of the three at random when a clipboard write is triggered. Variant selection should favor variant 2 (~60% of fires), with variants 1 (~25%) and 3 (~15%) used for variety. Long sessions average a clipboard write every 15-25 seconds, so the rotation prevents visible repetition.

---

## Section B — ElevenLabs voice assets

### B1. Voice casting

> **Status (pending):** Production voices are not yet locked. v1 currently uses macOS
> `say` as a placeholder (per `decisions.md` D-6) so the runtime end-to-end can be
> exercised before final TTS spend. The provider choice is **between ElevenLabs (the
> original spec below) and Runway voice generation** — Runway is being evaluated as an
> alternative because the rest of the visual pipeline already runs through Runway, so
> consolidating providers may simplify the asset workflow. Decision still open.
>
> The voice *profile* requirements below apply regardless of provider.

Two distinct voices needed. Both should be locked in before any line generation.

**Evaluator voice profile:**
- Female, mid-40s
- Calm, neutral, professional
- Neither warm nor cold
- Clear American English, no strong regional accent
- Mid-range pitch
- Even pacing — neither rushed nor slow
- Conveys quiet authority without intimidation

Suggested ElevenLabs voice candidates to audition: "Rachel," "Charlotte," "Sarah," or any voice tagged "narrator" or "professional female." Generate sample lines from the script and select the one that best matches the profile.

**Patient voice profile:**
- Male, 70 years old
- Mildly dyspneic — slight breathiness between phrases
- Conversational but uncomfortable
- Clear American English
- Lower pitch range
- Short phrases, occasional pause for breath
- Not panicked, not stoic — quietly distressed

Suggested ElevenLabs voice candidates: any voice tagged "older male," "mature," or "narrator male" with adjustable stability/clarity settings. The voice should be tunable toward the mildly dyspneic quality.

**Voice settings recommended for both:**
- Stability: 0.4-0.6 (some natural variation, not robotic)
- Clarity/similarity boost: 0.7-0.8
- Style exaggeration: 0.0-0.2 (subtle, no theatrical delivery)

---

### B2. Audio line generation list

Generate one MP3 per line below. All MP3s should be 44.1kHz, mono, 96-128 kbps. Store in R2 with predictable naming: `simtura-assets/scenario-1a/audio/{line_id}.mp3`.

#### Evaluator lines

| Line ID | Text | Notes |
|---|---|---|
| D1 | "You arrive on scene to find a 70-year-old male complaining of chest pain. He appears pale and diaphoretic. You may begin." | Auto-plays at scenario start. Updated from the original "dispatched to 23 Pine Street…" framing — v1 opens with arrival-on-scene narration and verbally delivers the pale/diaphoretic finding the candidate would otherwise see (since the visual is a healthy standardized actor — see A1 Decision note). Slightly more formal delivery; this is the only "announcement" the evaluator makes. |
| E-S2 | "Scene is safe." | Brief, neutral. |
| E-S4 | "You have one patient." | Brief, neutral. |
| E-S5 | "ALS is en route. ETA approximately ten minutes." | Slightly slower delivery, this is informational. |
| E1 | "Pulse ox is 92 percent on room air." | Neutral data delivery. |
| E2 | "Airway is patent. Patient is speaking in full sentences." | Two-clause delivery, slight pause between clauses. |
| E3 | "Respirations are 19, slightly labored, with adequate tidal volume. Chest rise is symmetrical." | Data delivery, comma pauses natural. |
| E4 | "Oxygen is on at 4 liters per minute via nasal cannula. SpO2 is now 96 percent." | Two-clause delivery, slight pause between. |
| E5 | "No major bleeding noted." | Brief, neutral. |
| E6 | "Radial pulse is present at 110, regular, normal quality." | Data delivery. |
| E7 | "Skin is cool, pale, and diaphoretic." | Brief, three-element list. |
| E8 | "Lung sounds are clear and equal bilaterally." | Brief, neutral. |
| E9 | "No tenderness on palpation of the chest wall." | Brief, neutral. |
| E10 | "No jugular venous distension noted." | Brief, neutral. |
| E11 | "No peripheral edema." | Brief, neutral. |
| E12-full | "Blood pressure is 164 over 92. Heart rate 110, regular, normal quality. Respirations 19, slightly labored. SpO2 is 96 percent on 4 liters." | Longest line. Natural pauses between each vital sign. |
| E12-bp | "Blood pressure is 164 over 92." | Partial vitals — if candidate only asks for BP. |
| E12-hr | "Heart rate 110, regular, normal quality." | Partial vitals — pulse only. |
| E12-rr | "Respirations 19, slightly labored." | Partial vitals — respirations only. |
| E12-spo2 | "SpO2 is 96 percent on 4 liters." | Partial vitals — sat only. |
| E13 | "Aspirin administered, 324 milligrams chewed. Patient tolerated it well." | Two-clause delivery. |
| E14 | "Nitroglycerin 0.4 milligrams administered sublingually. Patient holds it under his tongue." | Two-clause delivery. |
| E15 | "On reassessment: patient reports chest pressure is now 5 out of 10. BP 152 over 88. Heart rate 102. Respirations 18. SpO2 97 percent. Mental status unchanged, alert and oriented." | Long line, multiple data points, natural pauses. |
| E16 | "ALS has arrived on scene." | Brief, neutral. |
| E17 | "Report received. Thank you. We've got him from here." | Slightly warmer delivery — this is the final line, light closure. |
| E-fallback | "Please clarify your question." | Used when classifier can't route an utterance. Should sound natural, not robotic. May need 2-3 variants to avoid repetition if it fires more than once per session. |

**Total evaluator lines:** 26

#### Patient lines

| Line ID | Text | Notes |
|---|---|---|
| P1 | "No, I haven't fallen. No back or neck pain." | Brief, two short sentences. |
| P2 | "I've got this pressure in the middle of my chest. Feels like someone's standing on top of me." | Initial complaint — slightly more strained, slightly breathier. |
| P3 | "My name is Ron." | Brief. |
| P4 | "I'm at home. In my living room." | Brief, two short phrases. |
| P5 | "It's [DAY OF WEEK]. [MONTH AND YEAR]." | Dynamic. See note below. |
| P6 | "You're here because I'm having chest pain." | Brief, slight emphasis on "chest pain." |
| P7 | "It came on suddenly. I was just sitting on the couch watching a war movie." | Two clauses, natural pause. |
| P8 | "Nothing makes it better or worse. It's just been the same." | Brief, slight resignation in delivery. |
| P9 | "It's not really pain. It's more like pressure. Like someone's standing on my chest." | Three short phrases, natural pauses, slight emphasis on "pressure." |
| P10 | "Yeah, it's going down my left arm a little." | Brief, slight emphasis on "left arm." |
| P11 | "I'd say it's a seven out of ten." | Brief. |
| P12 | "About 30 minutes ago." | Brief. |
| P13 | "Yeah, I'm feeling lightheaded. And kind of short of breath." | Two clauses, slight breathiness on "short of breath" (the line content matches the patient's state). |
| P14 | "I'm allergic to peanuts. No medication allergies." | Two short sentences. |
| P15 | "I take simvastatin for cholesterol, Eliquis for atrial fibrillation, metoprolol for blood pressure, and I have nitroglycerin for my chest pain. I took them all this morning except the nitro." | Longest patient line. List delivery with natural pauses between drugs. |
| P16 | "I have atrial fibrillation, high blood pressure, and high cholesterol." | List delivery, natural pauses. |
| P17 | "I had a ham sandwich about an hour and a half ago." | Brief. |
| P18 | "I was sitting on the couch watching a war movie. Then the pressure started, just out of nowhere." | Two clauses, slight emphasis on "out of nowhere." |
| P19 | "Yes, this is mine. My doctor prescribed it." | Two short sentences. |
| P20 | "No, I haven't taken any today." | Brief. |
| P21 | "No, nothing like that." | Brief. |

**Total patient lines:** 21

#### Note on P5 (dynamic date)

P5 is the AVPU date question response. The text needs to reflect the actual day the candidate is drilling. Two implementation options:

**Option A — Generate all 7 day-of-week variants once:**
- "It's Monday. November 2026."
- "It's Tuesday. November 2026."
- ...etc for all days

The month/year is updated every month with a fresh batch. Runtime selects the right one based on system date. ~365 lines per year, but each is ~3 seconds and only ever played once per session.

**Option B — Real-time TTS for P5 only:**
- All other lines are pre-cached
- P5 is generated live via ElevenLabs API when the candidate asks (~$0.001 per session)

**Recommendation: Option A.** Marginal cost is negligible (~$5 in TTS generation per year), and Option B introduces a runtime API dependency for a single line.

---

### B3. Total ElevenLabs generation summary

- Evaluator lines: 26
- Patient lines: 21 (plus 7 dynamic-date variants of P5 per month, refreshed monthly)
- Total unique lines for first-pass generation: ~50
- Estimated generation cost: $5-10 in ElevenLabs credits (one-time)
- Storage: ~5-8 MB total for all MP3 files

---

## Section C — Storage and CDN setup

All assets live in Cloudflare R2 for zero-egress cost.

**Bucket structure:**

```
simtura-assets/
  scenario-1a/
    master-image.png
    background-loop.mp4
    patient-closeup.mp4
    clipboard-1.mp4
    clipboard-2.mp4
    clipboard-3.mp4
    audio/
      D1.mp3
      E-S2.mp3
      E-S4.mp3
      ...
      P1.mp3
      P2.mp3
      ...
    audio/dates/
      P5-monday.mp3
      P5-tuesday.mp3
      ...
```

**Asset manifest file:** A single `manifest.json` per scenario lets the frontend know what to load.

```json
{
  "scenario_id": "1A",
  "version": "1.0",
  "assets": {
    "background_loop": "https://assets.simtura.ai/scenario-1a/background-loop.mp4",
    "patient_closeup": "https://assets.simtura.ai/scenario-1a/patient-closeup.mp4",
    "clipboard_writes": [
      "https://assets.simtura.ai/scenario-1a/clipboard-1.mp4",
      "https://assets.simtura.ai/scenario-1a/clipboard-2.mp4",
      "https://assets.simtura.ai/scenario-1a/clipboard-3.mp4"
    ],
    "audio_lines": {
      "D1": "https://assets.simtura.ai/scenario-1a/audio/D1.mp3",
      "E-S2": "https://assets.simtura.ai/scenario-1a/audio/E-S2.mp3"
      // ... full mapping
    }
  }
}
```

**Client-side caching:** Service worker caches all scenario assets on first session. Repeat sessions stream nothing from origin — all assets play from the user's device cache. This is the optimization that drops bandwidth on repeat users to near-zero.

---

## Section D — Production sequencing

> **Current pipeline position (2026-05-21):** Past Phase 1, currently iterating on Phase
> 4. Concretely:
> - Phase 1 (master image): **done** — A1 locked with the standardized actor (see
>   Decision note).
> - Phase 2 (video assets): **partially done** — A2 background loop generated and in
>   place. A3 and A4 deferred (not used in v1 runtime); placeholder files exist in the
>   asset folder for potential future use.
> - Phase 3 (voice casting): **pending** — choosing between ElevenLabs and Runway voice
>   gen. v1 runs on macOS `say` placeholders in the meantime.
> - Phase 4 (audio generation): **~halfway** — placeholder audio is in place via the
>   `say`-driven mock pipeline (`scripts/generate-drill-mocks.sh`). Real TTS generation
>   waits on the Phase 3 decision.
> - Phases 5-6 (storage/CDN, validation): **not yet started** — v1 serves assets out of
>   `client/public/drill-assets/scenario-1a/` rather than R2 per `decisions.md` D-6.
>
> The phased sequence below is preserved for reference; in practice A3 and A4 have been
> skipped entirely and the phase numbering remains a useful organizing tool even where
> individual steps are deferred.

Recommended order of operations:

**Phase 1 — Master image (Days 1-2)**
1. Draft the master image prompt (above)
2. Generate 5-10 candidates in Runway
3. Iterate prompt based on what's wrong
4. Lock the master image
5. Save seed and parameters for downstream use

**Phase 2 — Video assets (Days 3-5)**
6. Generate background loop (A2)
7. Generate patient close-up (A3)
8. Generate three clipboard write variants (A4)
9. Review all videos for consistency with master image
10. Re-generate any that don't match

**Phase 3 — Voice casting (Day 6)**
11. Audition ElevenLabs voice candidates for evaluator and patient
12. Generate sample test lines (3-5 per voice candidate)
13. Lock both voices

**Phase 4 — Audio generation (Days 7-8)**
14. Generate all 26 evaluator MP3s using locked voice
15. Generate all 21 patient MP3s using locked voice
16. Generate first batch of P5 date variants
17. Review for quality, regenerate any flat-sounding lines

**Phase 5 — Storage and deployment (Day 9)**
18. Upload all assets to R2 with the bucket structure above
19. Generate the manifest.json
20. Configure CDN domain (assets.simtura.ai → R2 bucket)
21. Set up service worker caching on frontend

**Phase 6 — Asset validation (Day 10)**
22. Load all assets in test environment
23. Play through full scenario end-to-end, verifying every line plays correctly
24. Check loop continuity, audio quality, visual transitions
25. Final sign-off

**Total time estimate:** 10 working days for first-pass asset production.

---

## Section E — Budget summary

| Asset category | Tool | Estimated cost |
|---|---|---|
| Master image generation | Runway | $5-15 (5-15 iterations) |
| Background loop | Runway | $5-10 (1-3 iterations) |
| Patient close-up | Runway | $5-10 (1-3 iterations) |
| Clipboard variants (3) | Runway | $10-20 (3-6 iterations total) |
| Voice casting auditions | ElevenLabs | $2-5 |
| Audio line generation (~50 lines) | ElevenLabs | $5-10 |
| P5 date variants (yearly) | ElevenLabs | $3-5 |
| Storage (R2, monthly) | Cloudflare | Negligible |
| **Total first-pass production cost** | | **$35-80** |

This is one-time per scenario. Amortized across thousands of drill sessions, the per-session asset cost approaches zero.

---

## Section F — Open items for production

1. **Voice rights and licensing.** Confirm that ElevenLabs-generated voices used in a paid product don't require additional licensing. (Standard ElevenLabs commercial tier should cover this — verify before launch.)

2. **R2 CDN setup.** The domain `assets.simtura.ai` needs to be configured to serve from R2 with proper CORS headers for browser-based audio/video playback.

3. **Browser compatibility.** MP3 + MP4 H.264 should play on all major browsers. Test on Safari, Chrome, Firefox, Edge before launch.

4. **Mobile considerations.** If Drill Mode supports mobile, video bitrates may need a lower-resolution alternate (480p) for cellular connections. Out of scope for v1 desktop-only launch.

5. **Backup voice generation.** If a voice provider has outages, having a secondary TTS option (e.g., OpenAI TTS) as fallback could maintain availability. Probably not needed for v1.

6. **Asset versioning.** If the master image is regenerated post-launch (better quality, etc.), all downstream assets need regeneration too. Plan a versioning scheme (`v1.0`, `v1.1`, etc.) in the manifest.json so frontend can detect and refresh.
