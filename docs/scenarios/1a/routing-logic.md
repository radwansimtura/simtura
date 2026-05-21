# Scenario 1A — Runtime Routing Logic Spec

**Purpose:** Specifies how the Drill Mode runtime takes each candidate utterance (transcribed by Deepgram) and routes it to the correct response (patient line, evaluator line, or clipboard write).

**Architectural context:** This routing layer runs in real-time during the 15-minute session. It does NOT grade. Grading happens at scenario end via Sonnet. The router's only job is to keep the simulation responsive and believable.

**Performance targets:**
- 80% of utterances routed via client-side keyword router (free, sub-50ms)
- 20% of utterances escalated to Haiku (~$0.001 per call, ~200-300ms latency)
- Total response time from end-of-utterance to start-of-response audio: 500-900ms

---

## 0. Implementation note (v1)

Deepgram connectivity is **server-proxied**, not direct client → Deepgram WebSocket. Rationale: avoids exposing `DEEPGRAM_API_KEY` in the browser bundle. The Simtura backend mints short-lived tokens (or proxies the streaming connection through a server-side WebSocket) so the client never sees the raw key.

Functionally identical to a direct client connection from the runtime's perspective — the keyword router and Haiku fallback both run in the browser as specified below. Only the audio transport path changes.

---

## 1. Routing pipeline

Every candidate utterance goes through this pipeline:

```
1. Deepgram returns final transcript chunk (via server proxy)
2. Client-side keyword router examines the utterance
3. If high-confidence match → fire response immediately
4. If no high-confidence match → escalate to Haiku
5. Haiku returns structured classification → fire response
6. If Haiku also can't classify → fire fallback ("Please clarify your question")
7. Log everything to transcript (for end-of-scenario grading)
```

---

## 2. Utterance categories

Every candidate utterance falls into one of these categories:

| Category | Fires |
|---|---|
| **Question to patient** | Corresponding patient line audio (P1-P21) + clipboard write |
| **Request for clinical data** | Corresponding evaluator line audio (E1-E12) + clipboard write |
| **Verbal declaration** | Clipboard write only (no audio) |
| **Intervention action** | Corresponding evaluator confirmation audio (E13, E14, E16) + clipboard write |
| **Status check** | Evaluator response if applicable, otherwise nothing |
| **Unintelligible / off-script** | Evaluator fallback ("Please clarify your question") |

---

## 3. Client-side keyword router

A lightweight pattern-matching layer that handles obvious cases without an LLM call.

### 3.1 Routing rules (in priority order)

The router applies rules top-to-bottom. First match wins.

#### Rule 1: Verbal declarations (clipboard write only)

These are statements the candidate makes that don't require a response — the evaluator just marks the sheet.

**Pattern triggers:**
- "I'm putting on..." / "Putting on..." / "Donning..." → likely PPE declaration
- "BSI..." / "Standard precautions..." → PPE declaration
- "NOI is..." / "Nature of illness is..." / "This is a medical call" → NOI declaration
- "Calling for ALS" / "Requesting ALS" / "ALS backup" / "Paramedic backup" → ALS request (also fires E-S5 since ALS confirmation is needed)
- "Spinal stabilization is not indicated" / "No need for spinal precautions" / "C-spine not indicated" / "Not applying spinal precautions" → spinal determination
- "Field impression is..." / "My field impression..." / "I believe this is..." / "This appears to be..." (followed by ACS-like terms) → field impression
- "High priority" / "Load and go" / "Priority patient" / "Rapid transport" / "Expediting transport" / "Transport now" → transport decision
- "General impression:" / "General impression is..." → general impression
- "Reassessing every 5 minutes" / "Reassessment every five minutes" / "I'll reassess..." → reassessment

#### Rule 2: Intervention actions (evaluator confirmation + clipboard)

These trigger specific evaluator confirmation lines.

| Pattern | Fires |
|---|---|
| "324 mg aspirin" / "324 milligrams of aspirin" / "Four baby aspirin" / "Four 81 mg aspirin" / "Chewable aspirin" / "ASA 324" | E13 (aspirin confirmation) |
| "0.4 mg nitro" / "0.4 milligrams of nitroglycerin" / "Sublingual nitro" / "Nitro SL" / "Place nitro under the tongue" / "One nitro tablet" | E14 (nitro confirmation) — BUT only if contraindication checks complete |
| "Place pulse ox" / "Pulse oximeter on" / "Sat probe" / "Get a pulse ox" / "What's the SpO2" / "Check the sat" | E1 (pulse ox reading) |
| "Apply oxygen" / "Place on oxygen" / "Nasal cannula" / "NC at 4" / "4 liters via NC" / "Starting O2" / "Initiating oxygen therapy" / "Putting on a cannula" | E4 (O2 application confirmation) |

#### Rule 3: Requests for clinical data (evaluator responds)

Keywords that indicate the candidate wants information from the evaluator about the patient.

| Keyword group | Fires |
|---|---|
| "airway" + ("patent" / "open" / "assess" / "check") | E2 |
| "breathing" / "ventilation" / "chest rise" / "respiratory effort" / "tidal volume" | E3 |
| "bleeding" / "hemorrhage" / "blood loss" / "sweep" | E5 |
| "radial pulse" / "pulse" + ("check" / "palpate" / "feel" / "what's") (in primary survey context) | E6 |
| "skin" + ("color" / "temp" / "temperature" / "condition" / "feel" / "moisture") | E7 |
| "lung sounds" / "auscultate lungs" / "breath sounds" / "listen to lungs" / "lungs" + ("clear" / "sound" / "listen") | E8 |
| "chest wall" / "palpate the chest" / "press on the chest" / "tenderness" | E9 |
| "JVD" / "jugular venous distension" / "neck veins" / "jugular" | E10 |
| "edema" / "swelling in legs" / "pedal edema" / "peripheral edema" | E11 |
| "blood pressure" / "BP" (alone) / "what's the BP" | E12-bp (partial) |
| "heart rate" / "HR" / "pulse rate" (in vitals context) | E12-hr (partial) |
| "respiratory rate" / "respirations" / "RR" (in vitals context) | E12-rr (partial) |
| "vitals" / "full set of vitals" / "baseline vitals" / "vital signs" | E12-full |

**Disambiguation note:** "Pulse" appears in multiple contexts. Use this rule:
- "pulse" + ("rate" / "ox" / "oximeter" / "oximetry") → pulse ox (E1) or HR (E12-hr) depending on context
- "pulse" + ("radial" / "check" / "palpate" / "feel") alone → primary survey pulse check (E6)
- "pulse" in a vitals-set request → E12-hr

The router can use the elapsed scenario time to disambiguate. Early in the scenario (before ~6 minutes), pulse references usually mean primary survey. Later (after vitals are requested), they mean the formal vitals pulse.

#### Rule 4: Questions to patient (patient responds)

Keywords that indicate a question directed at the patient.

| Pattern | Fires |
|---|---|
| "fall" / "trauma" / "back pain" / "neck pain" / "spinal" / "hurt yourself" / "hit your head" | P1 (trauma denial) |
| "what's going on" / "what's wrong" / "what's bothering you" / "why did you call" / "chief complaint" / "tell me what's wrong" | P2 (chest pressure complaint) |
| "your name" / "what's your name" / "name please" | P3 (name) |
| "where are you" / "do you know where" / "what place" / "location" | P4 (location) |
| "what day" / "what date" / "what year" / "what month" / "today's date" | P5 (date) |
| "do you know why" / "why are we here" / "what's happening to you" | P6 (event) |
| "suddenly or gradually" / "how did this start" / "when did it begin" / "what were you doing when" | P7 (onset) |
| "anything make it" / "better or worse" / "what makes it" / "any relief" | P8 (provocation) |
| "describe the pain" / "what does it feel like" / "how does it feel" / "sharp or dull" / "pressure or pain" / "what kind of pain" | P9 (quality) |
| "radiate" / "does it travel" / "does it move" / "pain anywhere else" / "spread" | P10 (radiation) |
| "scale of 1 to 10" / "0 to 10" / "rate the pain" / "pain scale" / "how bad" | P11 (severity) |
| "when did this start" / "how long ago" / "how long" + ("ago" / "have you") / "time it started" | P12 (time) |
| "other symptoms" / "nausea" / "vomiting" / "dizziness" / "lightheaded" / "shortness of breath" + (question context) / "any other" / "anything else" + (symptom context) | P13 (associated symptoms) |
| "allergies" / "allergic to" / "any allergies" | P14 (allergies) |
| "what medications" / "what meds" / "do you take" / "current medications" / "any medications" / "prescription" + (medication context) | P15 (medications) |
| "past medical history" / "PMH" / "medical history" / "any health" / "chronic conditions" / "any conditions" | P16 (PMH) |
| "last time you ate" / "last meal" / "last oral intake" / "anything to eat or drink" / "when did you last" + (food context) | P17 (last oral intake) |
| "before this started" / "leading up to" / "events leading" / "what were you doing earlier" / "walk me through" + (event context) | P18 (events) |
| "is this your prescription" / "is this yours" / "your doctor prescribe" / "is this nitro yours" | P19 (nitro prescription confirmation) |
| "taken any today" / "how many doses" / "any doses already" / "taken nitro before" | P20 (no doses taken) |
| "erectile dysfunction" / "ED medications" / "Viagra" / "Cialis" / "Levitra" / "sildenafil" / "tadalafil" / "sexually enhancing" / "PDE5" | P21 (no ED meds) |

#### Rule 5: Status checks (conditional response)

| Pattern | Fires |
|---|---|
| "where's ALS" / "is ALS here" / "ETA on ALS" / "paramedics arrived" | E16 if reassessment complete, otherwise no response |
| "I'd like to give a report" / "handing off" / "transferring care" / "report to ALS" / [followed by handoff content] | E17 fires after handoff content is delivered (Deepgram captures the report, E17 plays when candidate finishes) |

#### Rule 6: Fallback

If none of the above rules match, escalate to Haiku.

---

### 3.2 Implementation notes for the keyword router

**Match logic:**
- Use case-insensitive substring matching
- Handle multi-word phrases as ordered token sequences (allow filler words between, e.g., "I'd like to put on my gloves" still matches "put on" + "gloves")
- Don't require exact keyword presence — use fuzzy matching with edit distance ≤ 2 for medical terms (Deepgram is accurate but not perfect)

**Context tracking:**

The router maintains a small session state to disambiguate:

```javascript
{
  elapsed_seconds: 0,
  primary_survey_complete: false,
  contraindication_checks_complete: {
    prescription_confirmed: false,
    doses_today_asked: false,
    ed_meds_asked: false
  },
  reassessment_complete: false,
  als_arrived: false
}
```

These flags are updated as patient and evaluator lines fire. They prevent things like nitro firing before contraindication checks complete, or ALS arriving before reassessment.

**Confidence scoring:**

Each match returns a confidence score 0.0-1.0:
- Multi-keyword match with strong context: 0.95+
- Single keyword match with weak context: 0.6-0.8
- Marginal match: 0.4-0.6

Confidence < 0.7 → escalate to Haiku rather than fire immediately. Better to take a 200ms Haiku call than fire the wrong response.

---

## 4. Haiku fallback

For the ~20% of utterances the keyword router can't confidently classify, escalate to Haiku.

### 4.1 Haiku routing prompt

```
You are a real-time response router for an EMT exam simulation. A candidate just said something to a simulated patient and evaluator. Your job is to classify the candidate's utterance so the simulation can fire the correct response.

# CONTEXT

The candidate is treating a 70-year-old male patient with chest pain. Two simulated characters can respond:
- PATIENT (the 70yo male) — responds to direct questions about himself
- EVALUATOR (NREMT exam evaluator, a neutral observer) — supplies clinical findings the candidate cannot observe directly

The candidate's utterance must be routed to one of these categories:

1. PATIENT_QUESTION — candidate is asking the patient something. Identify which patient line to fire.
2. CLINICAL_DATA_REQUEST — candidate wants the evaluator to supply a finding (vitals, lung sounds, etc.). Identify which evaluator line to fire.
3. VERBAL_DECLARATION — candidate is making a statement that requires no audio response, only a clipboard mark.
4. INTERVENTION_ACTION — candidate is performing an intervention (giving aspirin, administering nitro). Identify which evaluator confirmation to fire.
5. STATUS_CHECK — candidate is asking about ALS status, time, or other meta-information.
6. UNINTELLIGIBLE — utterance is unclear, off-script, or cannot be confidently routed.

# AVAILABLE RESPONSES

Patient lines:
- P1: trauma denial ("No, I haven't fallen. No back or neck pain.")
- P2: chief complaint ("I've got this pressure...")
- P3: name ("My name is Ron.")
- P4: location ("I'm at home. In my living room.")
- P5: date (dynamic)
- P6: event ("You're here because I'm having chest pain.")
- P7: onset ("It came on suddenly...")
- P8: provocation ("Nothing makes it better or worse.")
- P9: quality ("It's not really pain. It's more like pressure...")
- P10: radiation ("Yeah, it's going down my left arm a little.")
- P11: severity ("I'd say it's a seven out of ten.")
- P12: time ("About 30 minutes ago.")
- P13: associated symptoms ("I'm feeling lightheaded. And kind of short of breath.")
- P14: allergies ("I'm allergic to peanuts. No medication allergies.")
- P15: medications (full list)
- P16: PMH ("I have atrial fibrillation, high blood pressure, and high cholesterol.")
- P17: last oral intake ("I had a ham sandwich about an hour and a half ago.")
- P18: events ("I was sitting on the couch watching a war movie...")
- P19: nitro prescription confirmation ("Yes, this is mine. My doctor prescribed it.")
- P20: no doses taken ("No, I haven't taken any today.")
- P21: no ED meds ("No, nothing like that.")

Evaluator lines:
- E-S2: scene safety ("Scene is safe.")
- E-S4: patient count ("You have one patient.")
- E-S5: ALS en route
- E1: pulse ox reading
- E2: airway patency
- E3: respiratory assessment
- E4: O2 on
- E5: no bleeding
- E6: pulse finding
- E7: skin finding
- E8: lung sounds
- E9: chest wall
- E10: JVD
- E11: edema
- E12-full: complete vitals set
- E12-bp / E12-hr / E12-rr / E12-spo2: partial vitals
- E13: aspirin administered
- E14: nitro administered
- E15: reassessment findings
- E16: ALS arrived
- E17: handoff acknowledgment
- E-fallback: "Please clarify your question."

Clipboard write only (verbal declarations):
- PPE precautions
- Scene safety verbalization (in addition to firing E-S2)
- NOI declaration
- Number of patients verbalization (in addition to firing E-S4)
- ALS request (in addition to firing E-S5)
- Spinal determination
- General impression
- Field impression
- Priority/transport decision
- Reassessment specification

# SESSION STATE

Elapsed time: {elapsed_seconds} seconds
Primary survey complete: {primary_survey_complete}
ED meds check complete: {ed_meds_check_complete}
Reassessment complete: {reassessment_complete}
ALS has arrived: {als_arrived}

# INSTRUCTIONS

1. Read the candidate's utterance below.
2. Return ONLY a JSON object with this exact structure:

{
  "category": "PATIENT_QUESTION" | "CLINICAL_DATA_REQUEST" | "VERBAL_DECLARATION" | "INTERVENTION_ACTION" | "STATUS_CHECK" | "UNINTELLIGIBLE",
  "line_id": "<P1-P21 or E1-E17 or null if VERBAL_DECLARATION>",
  "fire_clipboard_write": <boolean>,
  "confidence": <0.0-1.0>,
  "reasoning": "<one sentence explanation>"
}

3. If confidence < 0.5, return UNINTELLIGIBLE.
4. Do not invent line IDs not in the list above.
5. Do not return text outside the JSON.

# UTTERANCE TO CLASSIFY

"{candidate_utterance}"
```

### 4.2 Haiku cost estimate

- Prompt size: ~1,200 tokens (mostly the line catalog)
- Utterance: ~20 tokens average
- Output: ~80 tokens (JSON)
- **Cost per Haiku call:** ~$0.001
- **Expected Haiku calls per session:** 10-15 (~20% of ~60 total utterances)
- **Total Haiku cost per session:** $0.01-0.015

This is within the architecture budget.

---

## 5. Special case handling

### 5.1 Multi-intent utterances

Sometimes a candidate combines multiple things in one sentence:
- "Scene is safe, I'm putting on my gloves, and I have one patient who appears to be in cardiac distress."

This single utterance covers:
- Scene safety (S2 point)
- PPE (S1 point)
- Number of patients (S4 point — though candidate didn't directly ask)
- General impression (PS1 point)

**Handling:** The router or Haiku should detect multi-intent and fire all relevant responses in sequence with brief pauses. Order: scene safety confirmation (E-S2 audio) → clipboard write for PPE → patient count confirmation (E-S4 audio) → clipboard write for general impression.

Total response time for multi-intent utterances may stretch to 2-3 seconds, but the candidate has just finished a long sentence, so the delay feels natural.

### 5.2 Nitro contraindication gating

E14 (nitro administered) should not fire until all three contraindication checks have completed (P19, P20, P21 have all played). If the candidate attempts to administer nitro before checking:

**Runtime behavior:** Fire E14 anyway (the runtime doesn't block actions). Log the procedural miss in the transcript. Sonnet handles the consequence at end-of-scenario grading — specifically, this triggers CC9 (critical fail for dangerous intervention).

**Why allow the action through:** Blocking the action would feel artificial and break immersion. Real exams don't stop you mid-administration. The consequence comes in the final scoring.

### 5.3 Out-of-order patient questions

A candidate might ask SAMPLE questions before OPQRST, or interleave them. The runtime fires the requested response regardless of order. Sonnet handles "out of order" as a transcript-level flag at grading.

### 5.4 Repeated questions

A candidate might ask the same thing twice (e.g., asks for BP, gets distracted, asks again). The runtime fires the same response both times. No special handling needed.

### 5.5 Self-correction mid-utterance

"Let me check the radial—wait, first let me put on gloves and check scene safety."

Deepgram's interim results may capture the partial utterance ("Let me check the radial") and trigger pulse check before the candidate self-corrects. To handle this:

**Endpointing tuning:** Wait for 300-400ms of silence before treating an utterance as final. This catches most self-corrections.

**False-fire recovery:** If the candidate self-corrects after a response has fired, the response plays out, but the candidate's correction is also captured in the transcript. Sonnet handles the messy reality at grading — the candidate's correct action is recorded.

### 5.6 Long handoff reports

The handoff is a sustained monologue (~60-90 seconds typically). During the handoff:
- The runtime should detect that the candidate has entered "handoff mode" (started with "I'd like to give a report" or began listing patient details)
- Suppress routing during the handoff — the candidate is delivering a structured report, not asking questions
- The full handoff transcript is captured for end-of-scenario grading
- E17 fires when the candidate explicitly signals completion ("Anything else?" / "That's my report" / "Any questions?") or after 5+ seconds of silence following handoff content

---

## 6. Logging requirements

Every routing decision is logged for end-of-scenario grading and for system telemetry.

**Per-utterance log entry:**

```json
{
  "timestamp_seconds": 87.3,
  "candidate_utterance": "I'd like to put my pulse oximeter on the patient's finger.",
  "router_used": "keyword" | "haiku" | "fallback",
  "router_confidence": 0.92,
  "fired_response": {
    "audio_line_id": "E1",
    "clipboard_write": true,
    "fire_delay_ms": 340
  },
  "haiku_reasoning": null
}
```

This log is appended to the transcript that gets sent to Sonnet for grading.

---

## 7. Performance and latency targets

| Stage | Target latency |
|---|---|
| Deepgram returns transcript (end-of-utterance) | 250-400ms |
| Keyword router classification | <50ms |
| Haiku fallback classification (when needed) | 200-300ms |
| Audio fetch from cache | <100ms |
| Visual cut transition | 100-200ms |
| **Total perceived latency (keyword path)** | **400-700ms** |
| **Total perceived latency (Haiku path)** | **650-1000ms** |

The keyword path covers 80% of utterances and feels snappy. The Haiku path is reserved for ambiguous cases where the slight delay is acceptable.

---

## 8. Failure modes and degradation

**Deepgram outage or high latency:**
- Fall back to Web Speech API for transcription
- Quality degrades but the scenario can still run
- Flag the session as "transcription degraded" in the grading log

**Haiku API failure or timeout (>1 second):**
- Fall back to E-fallback ("Please clarify your question.")
- Log the failure
- Continue scenario

**Audio asset 404 or load failure:**
- Skip the audio, fire clipboard write only
- Log the failure
- Continue scenario

**Network completely fails mid-session:**
- Show error overlay
- Allow candidate to either restart or save partial transcript for grading
- Don't lose data

The principle: the simulation should be resilient. Real EMT exams continue even when something goes wrong. A glitch shouldn't end the session.

---

## 9. Implementation tasks for engineering

Ordered by sequence:

1. **Web Speech API integration** for fallback transcription (~1 day)
2. **Deepgram streaming client (via server proxy)** with VAD gating (~3 days)
3. **Keyword router module** (~3-4 days, mostly writing the rules and testing)
4. **Haiku fallback integration** including the prompt above (~1 day)
5. **Session state tracking** (the small JSON object that tracks scenario progress, ~1 day)
6. **Asset loading and audio playback** including pre-caching via service worker (~2 days)
7. **Visual cut transitions** between background loop, patient close-up, and clipboard writes (~2 days)
8. **Transcript logging** for grading handoff (~1 day)
9. **End-of-scenario grading call** to Sonnet with prompt assembled from transcript (~1 day)
10. **End-of-session report rendering** from Sonnet's JSON output (~2 days)
11. **Error handling and graceful degradation** (~2 days)
12. **Integration testing** end-to-end (~3-5 days)

**Total estimate:** 22-27 working days for first-pass runtime build.

---

## 10. Validation plan

Before launch:

1. **Unit test the keyword router** against ~100 sample candidate utterances drawn from real EMT student speech patterns (Abbey's YouTube transcript is one source; recordings of other EMT students if available).

2. **Measure routing accuracy** — what percentage of utterances are correctly routed by keyword vs. requiring Haiku vs. completely missed.

3. **End-to-end dry runs** — internal team members play through the scenario, find broken phrasings, expand the keyword rules.

4. **Latency benchmarking** — verify that the response-time targets are met under realistic conditions (browser variation, network variation).

5. **Cost tracking** — measure actual Haiku call frequency in production. Target: ≤20% of utterances escalate. If higher, the keyword router needs expansion.

---

## 11. Open implementation questions

1. **Where does the keyword router run?** Client-side (in the browser) is faster but harder to update. Server-side is easier to iterate but adds a network round trip. **Recommendation:** Client-side as a compiled JavaScript module. Bundle updates with frontend releases.

2. **How aggressive should VAD be?** Tighter VAD (shorter silence before endpoint) feels more responsive but cuts off candidates who pause to think. Looser VAD feels slower but more forgiving. **Recommendation:** Start at 300ms silence threshold, tune based on user testing.

3. **Should partial vitals requests be supported?** The E12-full vs. E12-bp/hr/rr/spo2 split assumes candidates ask for specific vitals. But what if they ask "blood pressure and pulse"? Two-vital partial request. **Recommendation:** For v1, treat any multi-vital request as E12-full. Single-vital requests get partial responses.

4. **Repeat scenario detection.** If a candidate runs Scenario 1A three times in a row, should anything change? **Recommendation:** No. Pure repetition is the point of Drill Mode. Sonnet's grading will reflect improvement (or lack of it) across sessions.

5. **Anti-gaming protection.** Could a candidate memorize the script and game the system? **Recommendation:** Yes, and that's fine. Memorization of the assessment sequence is what passing the real exam requires. If they game Drill Mode well, they pass the real one. The grading still requires articulating each step — they can't just say "do everything" and get all the points.
