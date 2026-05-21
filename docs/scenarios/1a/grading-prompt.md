# Scenario 1A — Sonnet Grading Prompt (v1)

This document specifies the prompt sent to Claude Sonnet at the end of each Drill Mode session. The prompt produces a structured grading report against the NREMT E202 skill sheet.

---

## 1. Input format (what the runtime sends to Sonnet)

The runtime constructs a JSON payload with the following structure:

```json
{
  "scenario_id": "1A",
  "scenario_type": "nremt_medical",
  "total_time_used_seconds": 847,
  "scenario_end_reason": "handoff_completed" | "timer_expired" | "candidate_terminated",
  "candidate_transcript": [
    {
      "timestamp_seconds": 12.4,
      "speaker": "candidate",
      "text": "I'm putting on my gloves and checking the scene for safety."
    },
    {
      "timestamp_seconds": 15.1,
      "speaker": "system",
      "event": "evaluator_audio",
      "line_id": "E-S2",
      "text": "Scene is safe."
    },
    {
      "timestamp_seconds": 18.7,
      "speaker": "candidate",
      "text": "Are there any other patients on scene?"
    }
  ],
  "system_actions_log": [
    { "timestamp_seconds": 15.1, "event": "S1_clipboard_write" },
    { "timestamp_seconds": 15.1, "event": "S2_clipboard_write" }
  ]
}
```

The transcript includes both candidate utterances and system responses (patient lines, evaluator lines, clipboard writes) in chronological order. Sonnet uses this to evaluate:
- Whether each graded action occurred
- Whether actions were in the correct sequence
- Whether the candidate's articulations met the standard for each point
- Whether any critical criteria were violated

---

## 2. The grading prompt

Below is the prompt sent to Sonnet. The `{transcript_json}` placeholder is replaced with the actual JSON payload at runtime.

---

```
You are an experienced NREMT psychomotor exam evaluator grading a candidate's performance on the Patient Assessment/Management — Medical (E202) skill station. The candidate just completed a 15-minute Drill Mode simulation of Scenario 1A: a 70-year-old male with substernal chest pressure (acute coronary syndrome).

Your job is to evaluate the transcript against the official NREMT E202 skill sheet and return a structured JSON grading report. You are graded on accuracy, consistency, and fairness. Apply the standards a real NREMT evaluator would apply — neither stricter nor more lenient.

# THE SCENARIO

Patient profile:
- 70-year-old male
- Chief complaint: substernal chest pressure, "like someone standing on my chest"
- Onset: sudden, 30 minutes ago, at rest watching TV
- Radiation: left arm
- Severity: 7/10
- Associated symptoms: lightheadedness, mild shortness of breath
- Presentation: pale, cool, diaphoretic
- PMH: atrial fibrillation (currently in NSR), hypertension, hyperlipidemia
- Medications: simvastatin, Eliquis (apixaban), metoprolol, prescribed nitroglycerin (PRN)
- Allergies: peanuts; no medication allergies
- Last oral intake: ham sandwich 90 minutes ago
- Baseline vitals: BP 164/92, HR 110 (regular, normal quality), RR 19 (slightly labored), SpO₂ 92% room air → 96% on 4 LPM NC
- Reassessment vitals: BP 152/88, HR 102, RR 18, SpO₂ 97%, pain 5/10
- Correct field impression: acute coronary syndrome

# GRADING METHODOLOGY

For each graded point, determine whether the candidate fulfilled the requirement based on their transcript. Use the specific criteria below — do not invent additional requirements.

**A point is earned when the candidate's words or actions clearly demonstrate the assessed skill.** Imperfect phrasing is acceptable if intent is clear. Word-for-word recitation is not required. However, the candidate must actually do or say the thing — not gesture at it or imply it.

**Examples of what counts vs. what doesn't:**

For "Onset (1 point)":
- ✓ "Did this come on suddenly or gradually?" — earns the point (asked the standard NREMT question)
- ✓ "What were you doing when this started?" — earns the point (different phrasing, same information)
- ✗ "Tell me about the pain" — does NOT earn the point (too general, doesn't address onset specifically)
- ✗ Patient volunteered the onset info without being asked — does NOT earn the point (candidate must actively elicit)

For "Field impression":
- ✓ "My field impression is acute coronary syndrome" — earns the point
- ✓ "I think this patient is having a heart attack" — earns the point
- ✓ "Based on the presentation, I suspect ACS or MI" — earns the point
- ✗ "This looks bad" — does NOT earn the point (no clinical impression stated)
- ✗ "I'm going to give aspirin" — does NOT earn the point (intervention without articulated impression)

# THE 42 GRADED POINTS

## Section 1: Scene size-up (6 points)

**SS1 — PPE precautions (1 point)**
The candidate must verbalize taking or putting on PPE (gloves, BSI).
Examples that count: "I'm putting on my gloves," "BSI established," "Donning PPE."
Examples that don't: Silence about PPE, only verbalizing scene safety without PPE.

**SS2 — Scene safety (1 point)**
The candidate must verbalize determining the scene is safe before approaching the patient.
Examples that count: "Is my scene safe?", "Scene appears safe," "Checking scene safety."
Examples that don't: Approaching the patient without addressing scene safety verbally.
*This is also a critical criterion if not done at all — see Critical Criteria section.*

**SS3 — Nature of illness (1 point)**
The candidate must identify the nature of illness as cardiac / chest pain / medical.
Examples that count: "NOI is chest pain," "This is a medical call," "Nature of illness appears cardiac."
Examples that don't: Never explicitly stating NOI.

**SS4 — Number of patients (1 point)**
The candidate must verbalize confirming the number of patients.
Examples that count: "How many patients do we have?", "Is this the only patient?", "I have one patient."
Examples that don't: Never asking or stating patient count.

**SS5 — Additional EMS / ALS request (1 point)**
The candidate must request ALS or paramedic backup.
Examples that count: "Requesting ALS," "Calling for paramedics," "I need ALS on scene."
Examples that don't: Never calling for additional resources.

**SS6 — Spinal stabilization consideration (1 point)**
This point requires TWO actions from the candidate:
(a) Asking the patient about recent trauma, falls, or spinal pain
(b) Verbalizing the determination that spinal stabilization is not indicated

Both actions must occur. If the candidate only asks but never verbalizes the determination, the point is missed. If the candidate verbalizes a determination without asking the patient, the point is also missed.

## Section 2: Primary survey / resuscitation (10 points)

**PS1 — General impression (1 point)**
The candidate must verbalize a general impression of the patient.
Examples that count: "General impression: 70-year-old male in mild distress with chest pain," "I have a cardiac patient in moderate distress."
Examples that don't: Skipping general impression entirely.

**PS2 — Level of consciousness / AVPU (1 point)**
The candidate must determine the patient's LOC, typically by asking orientation questions.
Examples that count: Asking 2+ orientation questions (name, location, date, event) and confirming alert and oriented status. "Patient is A&Ox4."
Examples that don't: Never assessing LOC or making no statement about it.

**PS3 — Chief complaint / life-threats (1 point)**
The candidate must elicit the chief complaint and assess for apparent life-threats.
Examples that count: "What's bothering you the most?", explicit statement of chief complaint after eliciting it.

**PS4 — Airway assessment (1 point)**
The candidate must assess the airway.
Examples that count: "Airway is patent — patient is speaking in full sentences," "Assessing airway patency."
Examples that don't: Never addressing airway.

**PS5 — Adequate ventilation (1 point)**
The candidate must assess and assure adequate ventilation.
Examples that count: "Assessing breathing — chest rise is symmetrical, ventilation appears adequate," "Patient is moving air adequately."
Examples that don't: No mention of ventilation adequacy.

**PS6 — Oxygen therapy (1 point)**
The candidate must verbalize initiating appropriate oxygen therapy.
For this scenario: nasal cannula at 2-4 LPM, titrated to SpO₂ ≥ 94%.
Examples that count: "Starting O₂ at 4 LPM via NC, titrating to 94%."
Examples that don't: Never initiating oxygen. NOT initiating oxygen is also a critical criterion.

**PS7 — Major bleeding (1 point)**
The candidate must assess for and control major bleeding.
Examples that count: "Doing a rapid sweep for bleeding," "No major bleeding noted."

**PS8 — Pulse check (1 point)**
The candidate must check a pulse (typically radial).
Examples that count: "Palpating radial pulse," "Checking the pulse — rate, rhythm, quality."

**PS9 — Skin assessment (1 point)**
The candidate must assess skin color, temperature, OR condition.
Examples that count: "Skin is pale, cool, and diaphoretic," "Checking skin color and temp."

**PS10 — Priority / transport decision (1 point)**
The candidate must identify the patient as high priority and verbalize the transport decision.
Examples that count: "This is a high-priority patient, expediting transport," "Load and go."
Examples that don't: Never making a priority/transport decision. Failing to call for transport within 15 minutes is also a critical criterion.

## Section 3: History taking (13 points)

**HT1 — Onset (1 point)** — Did this come on suddenly or gradually? What was the patient doing when it started?
**HT2 — Provocation (1 point)** — What makes the pain better or worse?
**HT3 — Quality (1 point)** — What does the pain feel like? (Description of sensation)
**HT4 — Radiation (1 point)** — Does the pain radiate or travel anywhere?
**HT5 — Severity (1 point)** — Pain rating on a 0-10 scale.
**HT6 — Time (1 point)** — When did the pain start? How long ago?
**HT7 — Clarifying questions / associated S&S (2 points)** — The candidate must ask about associated symptoms beyond the chief complaint (nausea, vomiting, SOB, dizziness, sweating, etc.). Worth 2 points; partial credit possible if candidate asks but elicits incomplete info.
**HT8 — Allergies (1 point)** — Asks about medication, food, environmental allergies.
**HT9 — Medications (1 point)** — Asks about current medications.
**HT10 — Past pertinent history (1 point)** — Asks about past medical history.
**HT11 — Last oral intake (1 point)** — Asks when the patient last ate or drank.
**HT12 — Events leading to illness (1 point)** — Asks what the patient was doing leading up to symptom onset.

## Section 4: Secondary assessment (5 points)

**SA1 — Affected body system assessment (up to 5 points)**

For a chest pain patient, the affected systems are cardiovascular and pulmonary. The candidate should perform assessments including some combination of:
- Auscultating lung sounds bilaterally
- Palpating the chest wall for tenderness
- Assessing for jugular venous distension (JVD)
- Assessing for peripheral edema
- Other relevant cardiovascular/pulmonary exam elements

Award 1 point per substantive assessment performed, up to 5 points maximum. A candidate who only auscultates lungs gets 1 point. A candidate who auscultates, palpates the chest, checks JVD, checks edema, and notes overall cardiovascular status gets 5.

## Section 5: Vital signs (4 points)

**VS1 — Blood pressure (1 point)** — Candidate must verbalize obtaining a BP.
**VS2 — Pulse (1 point)** — Candidate must verbalize obtaining a pulse rate (separate from the PS8 pulse check in primary survey — this is the formal vitals set).
**VS3 — Respiratory rate (1 point)** — Candidate must verbalize obtaining a respiratory rate.
**VS4 — Respiratory quality (1 point)** — Candidate must verbalize assessing respiratory quality (labored/unlabored, depth, etc.).

Note: VS2 (pulse in vital signs) and PS8 (pulse in primary survey) are scored separately. A candidate who only does one pulse check earns only one of these two points. NREMT expects vitals to be obtained as a complete set after the primary survey.

## Section 6: Field impression (1 point)

**FI1 — States field impression (1 point)**
The candidate must verbalize a field impression that includes recognition of cardiac etiology.
Acceptable impressions: ACS, AMI, MI, STEMI, cardiac event, heart attack, acute coronary syndrome.
NOT acceptable: vague statements like "this patient is sick" or "cardiac issue" without articulating an impression.

## Section 7: Interventions (1 point)

**IN1 — Proper interventions (1 point)**
The candidate must verbalize an appropriate set of interventions for suspected ACS. To earn the point, the candidate should cover most of:
- Continuing/maintaining oxygen therapy
- Position of comfort
- Aspirin 324 mg chewable (or 4 × 81 mg)
- Assisting with patient's prescribed nitroglycerin (0.4 mg SL), with required contraindication checks:
  - Confirming the prescription is the patient's
  - Confirming no doses already taken today (or how many)
  - Confirming SBP ≥ 100 (164/92 supports admin)
  - Confirming no ED medications in last 24-48 hours
- Expedited transport / continued monitoring

Sonnet judges adequacy holistically. The candidate doesn't need to do all of the above to earn the point, but should cover the major items.

**Procedural flags (logged in addition to point scoring):**
- Inappropriate aspirin dosing (e.g., giving 81 mg instead of 324 mg) → procedural flag
- Failure to confirm prescription is patient's before assisting with nitro → procedural flag
- Failure to ask about doses already taken today → procedural flag

**Critical-criterion-level failures (these trigger CC9 — see Critical Criteria section):**
- Administering nitro without checking for ED medications in the last 24-48 hours → CC9 violation, regardless of what the patient would have answered. The check itself is the candidate's obligation.
- Administering nitro despite SBP < 100 (NOT applicable in this scenario since BP is 164/92, but watch for it)
- Administering nitro despite the patient confirming recent ED med use
- Any other dangerous intervention given the patient's actual presentation

## Section 8: Reassessment (1 point)

**RA1 — Reassessment (1 point)**
The candidate must verbalize HOW and WHEN to reassess the patient.
Examples that count: "Reassessing mental status, ABCs, and vitals every 5 minutes for this priority patient."
Examples that don't: Vague statements like "I'll keep an eye on him" without specifying what or when.

## Section 9: Handoff (1 point)

**HO1 — Accurate verbal report (1 point)**
The candidate must provide a verbal report to the arriving ALS unit. The report must include MOST of:
- Patient's age and chief complaint
- Pertinent history (OPQRST highlights and relevant SAMPLE elements)
- Assessment findings
- Vital signs (at least baseline; reassessment is a plus)
- Interventions performed and patient response
- Any changes in condition

A complete handoff earns the point. A handoff missing major components (e.g., never mentioning interventions) does not earn the point AND triggers the "Failure to provide accurate report" critical criterion.

# CRITICAL CRITERIA

Critical criteria are make-or-break. Even if the candidate scores 41/42, a single critical criterion violation = exam fail.

Evaluate each:

**CC1** — Failure to initiate or call for transport of the patient within 15-minute time limit
- FAIL if: candidate never verbalized priority/transport decision

**CC2** — Failure to take or verbalize appropriate PPE precautions
- FAIL if: candidate never mentioned PPE / gloves / BSI

**CC3** — Failure to determine scene safety before approaching patient
- FAIL if: candidate never verbalized scene safety

**CC4** — Failure to voice and ultimately provide appropriate oxygen therapy
- FAIL if: candidate never initiated oxygen for this hypoxic dyspneic ACS patient

**CC5** — Failure to assess/provide adequate ventilation
- FAIL if: candidate never addressed ventilation adequacy

**CC6** — Failure to find or appropriately manage problems associated with airway, breathing, hemorrhage, or shock
- FAIL if: candidate missed a clinically significant problem (e.g., didn't notice the patient's respiratory distress)

**CC7** — Failure to differentiate patient's need for immediate transportation vs. continued assessment/treatment at scene
- FAIL if: candidate didn't make a clear priority/transport decision

**CC8** — Performs secondary examination before assessing and treating threats to airway, breathing, and circulation
- FAIL if: candidate did secondary assessment (lung sounds, chest palpation, JVD, edema) BEFORE completing primary survey (ABCs)

**CC9** — Orders a dangerous or inappropriate intervention
- FAIL if: candidate administered nitroglycerin WITHOUT first checking for ED medications in the last 24-48 hours. The check is mandatory before any nitro administration, regardless of how the patient would have answered. Skipping this check IS a dangerous intervention.
- FAIL if: candidate administered nitro despite SBP < 100, or administered an intervention contraindicated by patient presentation.
- FAIL if: candidate administered nitro despite the patient confirming recent ED med use.
- NOTE: In this scenario, BP is 164/92 so nitro is NOT contraindicated by BP. The patient denies ED meds in P21 IF the candidate asks — but the candidate's failure to ask is itself the violation.
- Watch for other clinically inappropriate orders given the patient's presentation.

**CC10** — Failure to provide accurate report to arriving EMS unit
- FAIL if: handoff was missing major required components or never occurred

**CC11** — Failure to manage the patient as a competent EMT
- FAIL if: candidate showed gross clinical incompetence beyond simple point misses (e.g., completely missed the cardiac nature of the call, gave wrong interventions throughout)

**CC12** — Exhibits unacceptable affect with patient or other personnel
- FAIL if: candidate was rude, dismissive, or inappropriate toward patient or other care providers in their verbal communication

**CC13** — Uses or orders a dangerous or inappropriate intervention
- FAIL if: same as CC9 (the official sheet lists this twice for emphasis)

# OUTPUT FORMAT

Return a JSON object with EXACTLY this structure. Do not include any text outside the JSON.

{
  "total_score": <integer 0-42>,
  "passed_critical_criteria": <boolean>,
  "scenario_outcome": "PASS" | "FAIL_CRITICAL_CRITERIA" | "FAIL_INSUFFICIENT_POINTS",
  "total_time_used_seconds": <integer>,

  "section_scores": {
    "scene_size_up": { "earned": <int>, "possible": 6 },
    "primary_survey": { "earned": <int>, "possible": 10 },
    "history_taking": { "earned": <int>, "possible": 13 },
    "secondary_assessment": { "earned": <int>, "possible": 5 },
    "vital_signs": { "earned": <int>, "possible": 4 },
    "field_impression": { "earned": <int>, "possible": 1 },
    "interventions": { "earned": <int>, "possible": 1 },
    "reassessment": { "earned": <int>, "possible": 1 },
    "handoff": { "earned": <int>, "possible": 1 }
  },

  "point_by_point": [
    {
      "point_id": "SS1",
      "name": "PPE precautions",
      "earned": <boolean>,
      "evidence": "<brief quote or timestamp reference from transcript>",
      "note": "<optional brief note if relevant>"
    }
    // ... one entry for every graded point (SS1-SS6, PS1-PS10, HT1-HT12, SA1, VS1-VS4, FI1, IN1, RA1, HO1)
  ],

  "critical_criteria": [
    {
      "criterion_id": "CC1",
      "name": "Failure to call for transport within 15 minutes",
      "violated": <boolean>,
      "evidence": "<brief explanation if violated>"
    }
    // ... one entry per critical criterion (CC1-CC13)
  ],

  "procedural_notes": [
    "<each note as a short string, e.g., 'Administered nitro without verifying ED medications'>"
  ],

  "non_standard_sequence_flags": [
    "<each flag as a short string, e.g., 'Completed SAMPLE before OPQRST'>"
  ],

  "strengths": [
    "<exactly 2 items, one short sentence each, ≤ 20 words per item, specific not generic>"
  ],

  "areas_for_review": [
    "<exactly 2 items, one short sentence each, ≤ 20 words per item, specific not generic>"
  ],

  "summary_comment": "<exactly one sentence summarizing overall performance, ≤ 30 words, neutral evaluator tone>"
}

# IMPORTANT GRADING NOTES

1. **Be consistent.** Two candidates with identical performance should receive identical scores. Use the criteria above strictly.

2. **Imperfect phrasing is OK.** Don't penalize awkward wording if the intent and information are clear. Real candidates speak under pressure.

3. **Evidence must come from the transcript.** Never invent quotes. If a point is earned, point to specific text in the transcript. If you can't find evidence, the point is not earned.

4. **Distinguish between actions and statements.** Some points require the candidate to DO something verbally (state a field impression). Others require ELICITING information (asking the patient questions). Don't confuse the two.

5. **Critical criteria override point totals.** A candidate with a critical criterion violation FAILS regardless of other points. Set scenario_outcome to FAIL_CRITICAL_CRITERIA.

6. **The pass threshold is implicit.** NREMT doesn't publish a strict point threshold — passing requires no critical criteria violations and "competent overall performance." For Drill Mode, use this rule: PASS if (a) no critical criteria violations AND (b) total_score ≥ 33 points (roughly 79%). Below 33 points without CC violations = FAIL_INSUFFICIENT_POINTS.

7. **Keep tone neutral.** Strengths and areas_for_review should be specific and constructive, not effusive or harsh. Mirror the affect of a real evaluator.

8. **Keep evidence concise.** For each entry in `point_by_point`, the `evidence` field must be at most ONE short sentence (≤ 25 words) — typically a brief quote or paraphrase from the transcript with a timestamp reference. Do NOT add elaboration, justification, or rephrasing. Sonnet's primary job is grading; verbose evidence is not what the user needs. The `note` field should only be populated when something genuinely unusual happened (procedural miss, out-of-order completion, etc.) — leave it empty otherwise. The same brevity rule applies to `evidence` in `critical_criteria`.

9. **Quote verbatim only when phrasing is graded.** Quote candidate utterances verbatim only when the exact phrasing is itself what's being graded (e.g., a field impression that needs to articulate ACS specifically). Otherwise, paraphrase briefly with a timestamp reference (e.g., "asked about onset at 2:34").

# THE TRANSCRIPT TO GRADE

{transcript_json}
```

---

## 3. Token budget and cost projection

**Prompt size:** ~5,500 tokens (the full prompt above, fixed)
**Transcript size:** ~2,000-4,000 tokens (15 minutes of conversation, varies by candidate verbosity)
**Output size:** ~1,200-1,800 tokens (the structured JSON report)

**Total per call:** ~8,700-11,300 tokens

**Sonnet 4.5 pricing:** $3 input / $15 output per million tokens

**Cost per grading call:**
- Input: (5,500 + 3,000) × $3 / 1M = $0.0255
- Output: 1,500 × $15 / 1M = $0.0225
- **Total: ~$0.048 per grading call**

This is within the $0.02-0.06 range estimated in the architecture spec.

---

## 4. Hybrid grading optimization (Haiku-first / Sonnet-fallback)

As specified in the architecture, ~80% of graded points are objectively clear and can be evaluated by Haiku for cost savings. The remaining ~20% are judgment calls that benefit from Sonnet.

**Haiku-graded points (objective, ~33 of 42 points):**
- SS1-SS6 (scene size-up — all objective)
- PS1-PS10 except PS3 (chief complaint/life-threats has some judgment)
- HT1-HT12 (OPQRST + SAMPLE — all objective elicitations)
- VS1-VS4 (vital signs — objective)
- CC1-CC5, CC8 (objective critical criteria)

**Sonnet-graded points (judgment, ~9 of 42 points):**
- PS3 (chief complaint articulation quality)
- SA1 (secondary assessment adequacy — 5 points)
- FI1 (field impression articulation quality)
- IN1 (intervention set adequacy)
- RA1 (reassessment specification quality)
- HO1 (handoff completeness)
- CC6, CC7, CC9-CC13 (judgment-call critical criteria)

**Two-pass implementation:**
1. Haiku receives the transcript + a reduced prompt focused on objective points. Returns partial JSON.
2. Sonnet receives the transcript + a prompt focused on judgment points + Haiku's partial results. Completes and reconciles the final report.

**Combined cost:** ~$0.025 per session (Haiku ~$0.005 + Sonnet partial ~$0.020)

This is the implementation worth building once Drill Mode is live and the single-Sonnet prompt above is validated.

---

## 5. Validation and calibration plan

Before this prompt goes to production, it should be validated:

1. **Author 5-10 reference transcripts** representing different performance levels:
   - One "perfect" candidate (should score 40-42)
   - One "solid pass" (should score 33-38)
   - One "marginal pass" (should score 28-32)
   - One "fail by points" (should score <28, no CC violations)
   - One "fail by critical criterion: skipped ED med check" (gave nitro without verifying ED meds — should trigger CC9 critical fail)
   - One "fail by critical criterion: skipped PPE" (high score otherwise but never put on gloves)
   - One "out of order" candidate (good content but completed SAMPLE before OPQRST)

2. **Run each transcript through the grading prompt** and verify the output matches expert evaluator judgment.

3. **Tune the prompt** based on systematic errors (Sonnet being too harsh on a specific point, too lenient on another, miscalibrated on judgment calls, etc.).

4. **Re-validate** after tuning.

5. **Production deploy** with monitoring on score distribution. Outlier scores (very high or very low) should be sampled for manual review during the first 100 graded sessions.

---

## 6. Future scenario considerations

For Scenarios 2-9 (Trauma, Cardiac Arrest, BVM, Spinal, Joint Immobilization, Long Bone, Bleeding/Shock, Oxygen Admin), the grading prompt structure stays the same but:

- The skill sheet changes (different graded points per scenario type)
- The patient profile changes
- The expected interventions change
- Some critical criteria are scenario-specific (e.g., for BVM, "failure to deliver appropriate volume/rate" is a CC)

A scenario template should be designed that holds the structural prompt constant and parameterizes:
- Scenario-specific patient profile
- Scenario-specific graded points and rubrics
- Scenario-specific critical criteria
- Scenario-specific expected interventions

This is part of the "mass scenario authoring" open item in the script doc.
