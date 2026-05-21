# Scenario 1A — Drill Mode Script (v2)

**Patient:** 70-year-old male, substernal chest pressure
**Scenario type:** NREMT E202 Patient Assessment/Management — Medical
**Mode:** Continuous 15-minute Drill Mode (voice-based)
**Total possible points:** 42
**Grading:** End-of-scenario evaluation by Sonnet against the E202 skill sheet

---

## 1. Architecture overview

Drill Mode runs as a continuous 15-minute voice exam simulation. Two systems run in parallel:

**Runtime (real-time response routing):**
- Captures candidate speech via Deepgram Nova-3 streaming with VAD gating
- Routes each utterance to either a patient line, an evaluator line, or a clipboard-write animation using client-side keyword routing with Haiku fallback for ambiguous cases
- Plays pre-cached TTS audio for the appropriate response
- Tracks the full transcript with timestamps
- **This system does not grade.** It only handles response routing for immersion.

**End-of-scenario grading (Sonnet, single call):**
- Receives the full transcript with timestamps when the scenario ends
- Evaluates against all 42 graded points and 13 critical criteria
- Returns structured scoring report
- This is where the actual grading lives.

**The split matters because** the runtime doesn't need to be exhaustive about phrasings or "correct" articulations. The patient and evaluator just need to respond naturally in real-time. Whether the candidate's articulation actually earned the point is decided later by Sonnet, which is much better at congruency judgment than any pattern library could be.

---

## 2. Voice & visual conventions

**Two voices:**
- **EVALUATOR** — calm, neutral, mid-40s female. Speaks only when delivering clinical information the candidate cannot observe directly (vitals, assessment findings, ALS arrival, handoff). Never offers feedback, encouragement, or scoring signals.
- **PATIENT** — 70-year-old male, mildly dyspneic, short phrases between breaths. Uncomfortable but conversational. Same voice across all sessions for continuity.

**v1 visual treatment (decided during build):**

The runtime does **not** trigger visual cuts when patient lines fire or when clipboard
events fire. Instead:

- The background loop plays continuously throughout the entire 15-minute session.
- Patient and evaluator audio plays over the continuous background — **no patient
  close-up cut** when a P-line fires.
- The ambient writing already present in the background loop (the actor periodically
  marking a clipboard, captured in the loop itself) is the only "evaluator writing" the
  candidate sees — **no clipboard cut** when a graded action fires.
- The transcript continues to log `clipboard_write` events for end-of-scenario grading.
  Sonnet sees those events; the candidate doesn't visually.
- The `CW` notation throughout Section 3 below still refers to the logical
  clipboard-write event being recorded for grading; in v1 it does **not** imply a visible
  cut.

Reason: live testing showed that a full-screen swap to a short clipboard or patient clip
read as a gray flash at exactly the moment the candidate should feel "the simulation
acknowledged me." Trusting the continuous background loop produced a calmer, more
immersive experience. Asset-side details in `docs/scenarios/1a/asset-list.md` §A3, §A4
(both DEFERRED for v1).

Underlying principle: see `decisions.md` D-9 ("Simulation should not fake what the real
exam doesn't fake"). The "no patient cuts," "no clipboard cuts," and the "no mid-session
feedback" rule restated below are three applications of the same principle — on the
real NREMT exam the evaluator's pen on the clipboard is the candidate's only ambient
feedback signal, and it doesn't correlate one-to-one with graded actions.

**Original design (preserved for reference, NOT used in v1 runtime):**

- Brief visual cut (~1-2.5 seconds) showing the evaluator writing on her clipboard
- Fires whenever the candidate performs an action that would be marked on the skill
  sheet, **whether or not the point was actually earned**
- Also fires at ambient intervals throughout the session independent of candidate action
- 3 animation variants (~1s, ~2s, ~2.5s) in rotation to prevent visible repetition

**Core design principle (unchanged):**
> The evaluator **speaks** only when she has clinical information to deliver. The
> candidate cannot infer scoring from any in-session signal — the only writing they see
> is the ambient loop activity (hits, misses, and ambient timing are visually
> indistinguishable). Scoring only surfaces in the post-scenario report.

**No mid-session feedback:**
- No time prompts
- No "good job" or "you missed that"
- No score updates
- Only the visible countdown timer
- Matches the real NREMT exam — candidates don't know how they did until afterward

---

## 3. Response lines

The lines below are what the patient and evaluator say. There are no preset trigger phrase lists — the runtime classifier determines whether a candidate utterance is a question to the patient, a request for clinical data from the evaluator, or a verbal declaration, and routes accordingly.

**Notation:**
- `Pn` = patient response line
- `En` = evaluator response line
- `CW` = clipboard write animation (no audio)
- `[silent]` = no visible or audible response (the action is logged in the transcript for end-of-scenario grading)

---

### 3.1 Dispatch / opening

**D1 — Dispatch (auto-plays at t=0:00)**

> "You arrive on scene to find a 70-year-old male complaining of chest pain. He appears
> pale and diaphoretic. You may begin."

Updated from the original "dispatched to 23 Pine Street…" framing during build. v1 opens
with arrival-on-scene narration and verbally delivers the pale/diaphoretic finding the
candidate would otherwise see — the visual is a healthy standardized actor at rest, not a
symptomatic patient (see `asset-list.md` §A1 Decision note).

Scene safety is **not** pre-resolved. Candidate must verbalize it to be graded for it.

---

### 3.2 Scene size-up

Order matches the official E202 sheet: PPE → scene safety → NOI → number of patients → ALS → spinal stabilization.

**S1 — PPE precautions** *(1 point on sheet)*

Candidate verbalizes putting on gloves / BSI / PPE.
Response: `CW` (clipboard write only — no audio)

---

**S2 — Scene safety** *(1 point on sheet; also a critical criterion)*

Candidate verbalizes determining the scene is safe.
Response: `CW` + evaluator audio (the candidate is asking a question, so the evaluator answers)

> **E-S2:** "Scene is safe."

---

**S3 — Nature of illness** *(1 point on sheet)*

Candidate verbalizes the nature of illness as chest pain / cardiac.
Response: `CW` only

---

**S4 — Number of patients** *(1 point on sheet)*

Candidate verbalizes or asks about the number of patients.
Response: `CW` + evaluator audio

> **E-S4:** "You have one patient."

---

**S5 — ALS request** *(1 point on sheet)*

Candidate verbalizes calling for ALS / paramedic backup.
Response: `CW` + evaluator audio

> **E-S5:** "ALS is en route. ETA approximately ten minutes."

---

**S6 — Spinal stabilization consideration** *(1 point on sheet)*

**This point requires two actions from the candidate:**
1. Ask the patient about recent trauma, falls, or spinal pain
2. Verbalize the determination that spinal stabilization is not indicated

Each action is logged independently. Sonnet awards the point at end-of-scenario only if both occurred.

When the candidate asks about trauma → patient line **P1** fires:

> **P1:** "No, I haven't fallen. No back or neck pain."

When the candidate verbalizes the determination → `CW` only.

---

### 3.3 Patient introduction & primary survey

**P2 — Patient's chief complaint response**

Fires when candidate first asks the patient an open-ended "what's going on" type question.

> **P2:** "I've got this pressure in the middle of my chest. Feels like someone's standing on top of me."

**Skill sheet:** Chief complaint (1 point on sheet)
Response: P2 audio + `CW`

---

**AVPU responses (P3–P6)**

The candidate may ask one or more orientation questions. Each gets the corresponding patient response. Sonnet awards the LOC point if the candidate confirmed alert and oriented status (typically by asking 2+ orientation questions).

> **P3 (name):** "My name is Ron."
> **P4 (location):** "I'm at home. In my living room."
> **P5 (date):** "It's [day of week]. [Month and year]." *(dynamically pulled from system clock)*
> **P6 (event):** "You're here because I'm having chest pain."

**Skill sheet:** AVPU / LOC (1 point)
Response: Patient line(s) audio + `CW` after each

---

**E1 — Pulse ox reading**

Fires when candidate places pulse ox or asks for SpO2.

> **E1:** "Pulse ox is 92 percent on room air."

This is the **pre-oxygen baseline** reading. Sets up the candidate to choose O₂ therapy (94% threshold).
Response: E1 audio + `CW`

---

**E2 — Airway patency**

Fires when candidate assesses airway / asks about airway patency.

> **E2:** "Airway is patent. Patient is speaking in full sentences."

**Skill sheet:** Airway assessment (1 point — part of the 3-point airway/breathing section)
Response: E2 audio + `CW`

---

**E3 — Respiratory / ventilation assessment**

Fires when candidate assesses breathing, chest rise, or asks about ventilation adequacy.

> **E3:** "Respirations are 19, slightly labored, with adequate tidal volume. Chest rise is symmetrical."

**Skill sheet:** Adequate ventilation assessment (1 point — part of the 3-point airway/breathing section)
Response: E3 audio + `CW`

---

**E4 — Oxygen application confirmation**

Fires when candidate applies oxygen via nasal cannula at 2-4 LPM.

> **E4:** "Oxygen is on at 4 liters per minute via nasal cannula. SpO2 is now 96 percent."

**Skill sheet:** Initiates appropriate oxygen therapy (1 point — part of the 3-point airway/breathing section; also a critical criterion if skipped entirely)
Response: E4 audio + `CW`

---

**E5 — Bleeding assessment**

Fires when candidate sweeps for major bleeding.

> **E5:** "No major bleeding noted."

**Skill sheet:** Assesses/controls major bleeding (1 point — part of the 3-point circulation section)
Response: E5 audio + `CW`

---

**E6 — Pulse finding**

Fires when candidate palpates the radial pulse.

> **E6:** "Radial pulse is present at 110, regular, normal quality."

**Skill sheet:** Checks pulse (1 point — part of the 3-point circulation section)
Response: E6 audio + `CW`

---

**E7 — Skin assessment**

Fires when candidate assesses skin color, temperature, or condition.

> **E7:** "Skin is cool, pale, and diaphoretic."

**Skill sheet:** Assesses skin (1 point — part of the 3-point circulation section)
Response: E7 audio + `CW`

---

**S7 — Priority / transport decision** *(1 point on sheet; also a critical criterion if not called within 15 min)*

Candidate verbalizes high priority and rapid transport.
Response: `CW` only (verbal declaration, evaluator just marks it)

---

### 3.4 History taking — OPQRST

Each patient response fires when the candidate asks the corresponding OPQRST question. Sonnet awards each point if the candidate elicited the underlying information, regardless of question phrasing.

> **P7 (Onset):** "It came on suddenly. I was just sitting on the couch watching a war movie."
> **P8 (Provocation):** "Nothing makes it better or worse. It's just been the same."
> **P9 (Quality):** "It's not really pain. It's more like pressure. Like someone's standing on my chest."
> **P10 (Radiation):** "Yeah, it's going down my left arm a little."
> **P11 (Severity):** "I'd say it's a seven out of ten."
> **P12 (Time):** "About 30 minutes ago."

**Skill sheet:** OPQRST = 6 points (1 each)
Response: Patient audio + `CW` after each

---

**P13 — Associated signs and symptoms** *(2 points on sheet — "Clarifying questions of associated signs and symptoms related to OPQRST")*

> **P13:** "Yeah, I'm feeling lightheaded. And kind of short of breath."

Response: P13 audio + `CW`

---

### 3.5 History taking — SAMPLE

> **P14 (Allergies):** "I'm allergic to peanuts. No medication allergies."
> **P15 (Medications):** "I take simvastatin for cholesterol, Eliquis for atrial fibrillation, metoprolol for blood pressure, and I have nitroglycerin for my chest pain. I took them all this morning except the nitro."
> **P16 (Past pertinent history):** "I have atrial fibrillation, high blood pressure, and high cholesterol."
> **P17 (Last oral intake):** "I had a ham sandwich about an hour and a half ago."
> **P18 (Events):** "I was sitting on the couch watching a war movie. Then the pressure started, just out of nowhere."

**Skill sheet:** SAMPLE = 5 points (1 each)
Response: Patient audio + `CW` after each

---

### 3.6 Secondary assessment

Cardiovascular and pulmonary focus for a chest pain patient.

**E8 — Lung sounds**

Fires when candidate auscultates lungs.

> **E8:** "Lung sounds are clear and equal bilaterally."

---

**E9 — Chest wall palpation**

Fires when candidate palpates the chest wall.

> **E9:** "No tenderness on palpation of the chest wall."

---

**E10 — JVD**

Fires when candidate assesses for jugular venous distension.

> **E10:** "No jugular venous distension noted."

---

**E11 — Peripheral edema**

Fires when candidate assesses for edema.

> **E11:** "No peripheral edema."

**Skill sheet:** Affected body system assessment = up to 5 points
The full 5 points are awarded when candidate covers cardiovascular AND pulmonary systems substantively. Partial coverage earns partial points (Sonnet judges).
Response: Each E line + `CW`

---

### 3.7 Vital signs

**E12 — Full vital signs**

Fires when candidate requests vitals or any specific vital sign. The runtime classifier should parse whether the candidate asked for the full set or just one value (e.g., just BP).

**Full set request:**
> **E12-full:** "Blood pressure is 164 over 92. Heart rate 110, regular, normal quality. Respirations 19, slightly labored. SpO2 is 96 percent on 4 liters."

**Partial request (single vital):**
The evaluator provides only what was asked. The candidate must ask for each vital separately to get them.

**Skill sheet:** Vital signs = 4 points (BP, pulse, respiratory rate, respiratory quality)
Response: Audio + `CW`

---

### 3.8 Field impression

**S8 — Field impression** *(1 point on sheet)*

Candidate verbalizes a field impression of ACS / cardiac / MI / heart attack.
Response: `CW` only (verbal declaration)

---

### 3.9 Interventions

This section has dependencies — nitro administration requires prior contraindication checks.

**For aspirin:**
Candidate verbalizes administering 324 mg of chewable aspirin (or 4× 81 mg).
Response: E13 audio + `CW`

> **E13:** "Aspirin administered, 324 milligrams chewed. Patient tolerated it well."

---

**For nitro — three required candidate actions before administration:**

1. **Confirm the nitro is the patient's prescription** → fires **P19:**
> **P19:** "Yes, this is mine. My doctor prescribed it."

2. **Confirm patient has not taken any doses today** → fires **P20:**
> **P20:** "No, I haven't taken any today."

3. **Confirm no ED medications in the last 24-48 hours** → fires **P21:**
> **P21:** "No, nothing like that."

After all three contraindication checks complete AND candidate verbalizes 0.4 mg SL administration:
Response: E14 audio + `CW`

> **E14:** "Nitroglycerin 0.4 milligrams administered sublingually. Patient holds it under his tongue."

If candidate attempts to administer nitro without completing all three contraindication checks: nitro is administered anyway (the runtime doesn't block actions), but Sonnet logs the procedural miss in the end-of-session report.

**Skill sheet:** Interventions = 1 point
The single point covers all interventions verbalized appropriately. Sonnet judges whether the candidate's full intervention set (O₂ continuation, position of comfort, aspirin, nitro with contraindication checks, expedited transport) was adequate.

---

### 3.10 Reassessment

**E15 — Reassessment findings**

Fires when candidate verbalizes reassessment of the patient.

> **E15:** "On reassessment: patient reports chest pressure is now 5 out of 10. BP 152 over 88. Heart rate 102. Respirations 18. SpO2 97 percent. Mental status unchanged, alert and oriented."

**Skill sheet:** Reassessment (1 point)
Sonnet awards the point if the candidate verbalized reassessing mental status, ABCs, and vitals (or specified the 5-minute interval for high-priority patients).
Response: E15 audio + `CW`

---

### 3.11 ALS handoff

**E16 — ALS arrival**

Auto-fires when the candidate completes reassessment (E15). **Concrete timing decided
during build: E16 plays 7 seconds after E15 finishes, OR immediately when the candidate
begins handoff content, whichever comes first.** The 7-second delay simulates realistic
ALS response time without making the candidate wait, and the handoff-begin trigger
guarantees the candidate never reaches handoff before ALS is present.

> **E16:** "ALS has arrived on scene."

Fallback triggers (in case candidate skips reassessment):
- Candidate begins attempting handoff → E16 fires before allowing E17 (same handoff-begin
  trigger as above)
- Candidate explicitly asks about ALS status → E16 fires if interventions section is
  complete

The principle: ALS arrival is driven by **candidate progress**, not the clock. The
candidate should never be stuck waiting for ALS that doesn't come, and should never reach
handoff without ALS present.

---

**E17 — Handoff acknowledgment** *(scenario terminates after this line)*

Fires when candidate completes a verbal report to ALS. **Concrete trigger decided during
build: E17 fires after 5 seconds of silence following handoff content** — i.e., the
candidate has begun handoff (which paused the keyword router; see runtime behavior), then
stopped speaking for 5 seconds without continuing the report. The silence window is
distinguishing "natural pause mid-handoff" from "report finished."

> **E17:** "Report received. Thank you. We've got him from here."

**Skill sheet:** Provides accurate verbal report (1 point; also a critical criterion if missing or inaccurate)

Sonnet evaluates the handoff content against the rubric. Required elements:
- Patient age and chief complaint
- Pertinent history (OPQRST + SAMPLE highlights)
- Assessment findings
- Vital signs (baseline + reassessment)
- Interventions performed and patient response
- Any changes in condition

After E17 plays, a chime indicates scenario end. End-of-session report appears (after Sonnet grading completes — typically 5-15 seconds).

---

## 4. Runtime behaviors

### 4.1 Response classification (client-side keyword routing + Haiku fallback)

Each candidate utterance gets classified into one of these categories:

| Category | Typical pattern | Response |
|---|---|---|
| Question to patient | "Sir...", "Do you...", "Did you...", "What...", "How..." directed at patient | Fires corresponding patient line |
| Request for clinical data | "BP", "pulse", "sat", "lung sounds", "skin", "vitals", "what is the..." | Fires corresponding evaluator line |
| Verbal declaration | "I'm putting on...", "I'm calling for...", "My field impression...", "This is a priority..." | Clipboard write only |
| Intervention action | "Administering 324 mg of aspirin", "Giving 0.4 mg nitro SL", "Placing on 4 LPM NC" | Fires corresponding evaluator confirmation + clipboard write |
| Ambiguous | Anything not confidently matched above | Haiku call to classify and route |

Client-side keyword routing handles ~80% of utterances. Haiku handles the remaining ~20%.

### 4.2 Voice Activity Detection (VAD)

Deepgram streaming opens only when the candidate is actively speaking. Silence between sentences doesn't burn transcription minutes. Endpointing tuned to 200-400ms of silence triggers end-of-utterance.

### 4.3 Edge case behaviors

**Dead air (60+ seconds of silence with no progress):** Evaluator does not prompt. Real evaluators don't prompt. The transcript logs the pause. End-of-scenario report flags it as "candidate paused [X] seconds at step [Y]."

**Off-script utterances the classifier can't route:** Haiku returns "unable to classify with confidence." Evaluator delivers neutral fallback: *"Please clarify your question."* This is consistent with real evaluator behavior.

**Critical criterion violations:** Scenario does NOT terminate immediately. It continues to completion. End-of-scenario report shows critical fail status. Pulling the candidate mid-scenario removes the practice value of finishing the rep — the fail flag is the consequence.

**Out-of-order completion:** Steps performed out of order still earn their point but are flagged in the report. Example: candidate does SAMPLE before OPQRST → both sections earn full points if completed, but flagged as "non-standard sequence."

**15-minute timer expiry:** Scenario terminates regardless of completion state. Report shows time expired and lists incomplete steps.

---

## 5. End-of-scenario grading (Sonnet)

When the scenario ends (handoff completed, timer expired, or candidate explicitly terminates), the full transcript is sent to Sonnet in a single call.

### 5.1 What Sonnet receives

- Full transcript of candidate utterances with timestamps
- Log of system responses played (which patient/evaluator lines fired, when)
- Log of actions taken (oxygen applied, aspirin given, etc.)
- Total elapsed time

### 5.2 What Sonnet evaluates

**42 graded points** against the E202 skill sheet (full breakdown in Section 6 below).

**13 critical criteria** from the official sheet:
- Failure to initiate or call for transport within 15-minute time limit
- Failure to take or verbalize appropriate PPE precautions
- Failure to determine scene safety before approaching patient
- Failure to voice and provide appropriate oxygen therapy
- Failure to assess/provide adequate ventilation
- Failure to find or appropriately manage problems associated with airway, breathing, hemorrhage or shock
- Failure to differentiate patient's need for immediate transportation vs. continued assessment/treatment at scene
- Performs secondary examination before assessing and treating threats to airway, breathing, and circulation
- Orders a dangerous or inappropriate intervention
- Failure to provide accurate report to arriving EMS unit
- Failure to manage the patient as a competent EMT
- Exhibits unacceptable affect with patient or other personnel
- Uses or orders a dangerous or inappropriate intervention

### 5.3 Cost optimization within the grading call

Haiku-first / Sonnet-fallback within a single grading session:
- **~80% of grading points** are objectively clear (did they ask, did they assess, did they verbalize). Haiku grades these.
- **~20% of grading points** are judgment calls (was the handoff complete enough, was the field impression articulated clearly enough, was their affect appropriate). Sonnet grades these.

### 5.4 What Sonnet returns

Structured JSON:
- `total_score`: X / 42
- `points_by_section`: scene size-up, primary survey, history taking, secondary assessment, vital signs, field impression, interventions, reassessment, handoff
- `critical_criteria_status`: pass / fail (with reason if fail)
- `points_missed`: list of missed points with brief explanations
- `non_standard_sequence_flags`: list of out-of-order completions
- `procedural_notes`: e.g., "Administered nitro without verifying ED medications"
- `strengths`: 2-3 specific things the candidate did well
- `areas_for_review`: 2-3 specific things to focus on for next attempt
- `total_time`: MM:SS

---

## 6. Scoring rubric (the canonical 42 points)

Mapped to the official E202 sheet for Sonnet to grade against.

### Scene size-up (5 points)
- **1pt** PPE precautions verbalized
- **1pt** Scene safety determined
- **1pt** Nature of illness identified
- **1pt** Number of patients confirmed
- **1pt** Additional EMS (ALS) requested
- **1pt** Spinal stabilization considered (requires both asking patient about trauma AND verbalizing determination)

*Note: official sheet labels this section as 5 points but lists 6 items — spinal consideration is often bundled into "scene size-up" general line in some versions. v1 doc treated this as 5 graded items in the section. Total below assumes the standard NREMT count.*

### Primary survey / resuscitation (8 points)
- **1pt** General impression verbalized
- **1pt** LOC / AVPU determined
- **1pt** Chief complaint / life-threats determined
- **1pt** Airway assessment
- **1pt** Adequate ventilation assured
- **1pt** Oxygen therapy initiated appropriately
- **1pt** Major bleeding assessed/controlled
- **1pt** Pulse checked
- **1pt** Skin assessed (color, temperature, OR condition)
- **1pt** Priority / transport decision identified

*Note: this section is 8 points on the sheet but the breakdown above totals 10 — the sheet groups airway/breathing as 3 and circulation as 3. Specifically: airway assessment + adequate ventilation + oxygen therapy = 3 points combined; bleeding + pulse + skin = 3 points combined.*

### History taking (13 points)
- **1pt** Onset
- **1pt** Provocation
- **1pt** Quality
- **1pt** Radiation
- **1pt** Severity
- **1pt** Time
- **2pt** Clarifying questions of associated signs and symptoms
- **1pt** Allergies
- **1pt** Medications
- **1pt** Past pertinent history
- **1pt** Last oral intake
- **1pt** Events leading to present illness

### Secondary assessment (5 points)
- Up to **5pt** Affected body part/system assessment (cardiovascular + pulmonary focus for chest pain)

### Vital signs (4 points)
- **1pt** Blood pressure
- **1pt** Pulse
- **1pt** Respiratory rate
- **1pt** Respiratory quality

### Field impression (1 point)
- **1pt** Field impression stated

### Interventions (1 point)
- **1pt** Proper interventions/treatment verbalized (covers O₂ continuation, position of comfort, aspirin 324 mg, nitro with contraindication checks, expedited transport)

### Reassessment (1 point)
- **1pt** Demonstrates how and when to reassess

### Handoff (1 point)
- **1pt** Accurate verbal report to arriving EMS unit

**Total: 42 points**

**Pass threshold:** 33/42 points (~79%) AND no critical criteria violations.
- Any critical criterion violation → `scenario_outcome: FAIL_CRITICAL_CRITERIA`
  regardless of point total
- < 33 points without CC violations → `scenario_outcome: FAIL_INSUFFICIENT_POINTS`
- ≥ 33 points with no CC violations → `scenario_outcome: PASS`

Threshold matches `docs/scenarios/1a/grading-prompt.md` §IMPORTANT GRADING NOTES item 6
and is what the wired Sonnet grading endpoint returns.

---

## 7. Patient clinical profile (for Sonnet's context)

- **Age:** 70-year-old male
- **Chief complaint:** Substernal chest pressure
- **Quality:** Pressure, "like someone standing on my chest"
- **Onset:** Sudden, 30 minutes ago, at rest watching TV
- **Radiation:** Left arm
- **Severity:** 7/10
- **Associated symptoms:** Lightheadedness, mild shortness of breath
- **Presentation:** Pale, cool, diaphoretic
- **PMH:** Atrial fibrillation (currently NSR), hypertension, hyperlipidemia
- **Medications:** Simvastatin, Eliquis, metoprolol, prescribed nitroglycerin (PRN)
- **Allergies:** Peanuts, no medication allergies
- **Last oral intake:** Ham sandwich 90 minutes ago
- **Vitals baseline:** BP 164/92, HR 110 (regular, normal quality), RR 19 (slightly labored), SpO₂ 92% room air / 96% on 4 LPM NC
- **Vitals reassessment (post-intervention):** BP 152/88, HR 102, RR 18, SpO₂ 97%, pain 5/10
- **Field impression:** Acute coronary syndrome

---

## 8. Open items

Status as of 2026-05-21. Resolved items are kept in place for traceability.

1. **Voice casting.** **[Pending]** — provider choice still open between **ElevenLabs**
   (original spec) and **Runway voice generation** (under evaluation; would consolidate
   the asset pipeline through one provider). v1 currently runs on macOS `say`
   placeholders. Profile requirements: mid-40s female evaluator (neutral) and 70yo male
   patient (mildly dyspneic). See `asset-list.md` §B1.

2. **Background loop generation.** **[Done]** — generated and in place at
   `client/public/drill-assets/scenario-1a/background-loop.mp4`. Final duration is 10s
   (Runway model max for the version used) rather than the originally-spec'd 15s. See
   `asset-list.md` §A2.

3. **Clipboard write animation variants.** **[Deferred — not used in v1]** — runtime no
   longer triggers clipboard cuts; the ambient writing in the background loop is the
   only writing visible. Three placeholder clips remain in the asset folder for
   potential future use. See `asset-list.md` §A4 and Section 2 above.

4. **Patient close-up animation.** **[Deferred — not used in v1]** — runtime no longer
   triggers patient close-up cuts; audio plays over the continuous background loop. The
   `patient-closeup.mp4` placeholder remains for potential future use. See `asset-list.md`
   §A3 and Section 2 above.

5. **Sonnet grading prompt.** **[Done]** — authored in `docs/scenarios/1a/grading-prompt.md`,
   wired into `server/drill-mode.ts` (`POST /api/drill/sessions/:id/grade`), and tested
   end-to-end with a representative sample transcript. Pass threshold 33/42 enforced.

6. **ALS auto-arrival timing.** **[Resolved]** — E16 fires 7 seconds after E15 finishes,
   OR immediately when the candidate begins handoff content, whichever comes first.
   Specified in Section 3.11.

7. **Position of comfort.** **[Resolved]** — kept as part of the single interventions
   point (IN1) rather than its own graded line. Sonnet judges adequacy of the full
   intervention set holistically per `grading-prompt.md` §Section 7.

8. **Mass scenario authoring.** **[Pending]** — Scenarios 2-9 (Trauma, Cardiac Arrest,
   BVM, Spinal, Joint Immobilization, Long Bone, Bleeding/Shock, Oxygen Admin) will need
   parameterized templates derived from the 1A structure. Scoped but not yet started.
   See `grading-prompt.md` §6 for the structural-template direction.
