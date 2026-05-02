# Simtura.ai - Clinical Training Simulation Platform

## Overview
Simtura.ai is an AI-powered training platform for healthcare professionals (EMS and Nursing) that provides interactive patient scenario simulations with immersive first-person video experiences. Users practice patient assessments, make critical decisions, and receive instant feedback through a cinematic play-pause-question flow.

## Architecture
- **Frontend**: React + Vite + TypeScript with Tailwind CSS and shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter for client-side routing
- **Animations**: framer-motion for transitions and fluid homepage animation

## Key Pages
- `/` - Landing page with fluid animated background, two discipline cards (EMS + Nursing)
- `/ems` - EMS scenarios page with EMS hero background, filtered to EMS discipline
- `/nursing` - Nursing scenarios page with hospital hero background, filtered to Nursing discipline
- `/scenarios` - Redirects to EMS page (legacy route support)
- `/scenario/:id` - Immersive video-based scenario trainer with play-pause-question flow

## Disciplines
- **EMS**: Field-based scenarios for EMR, EMT, AEMT, Paramedic
- **Nursing**: Hospital-based scenarios for RN, LPN, BSN

## Trainer Flow
1. Intro screen with dispatch info → "Respond to Call"
2. Dispatch video plays (ambulance driving / hospital approach)
3. Step video plays (first-person POV)
4. Video pauses → Question UI appears over frozen frame
5. User selects action → Submit → Feedback shown
6. Click "Next Step" → Next step video plays → Question → Feedback → repeat
7. After final step → Departure video plays
8. Results screen with score and step-by-step review

## Data Model
- `scenarios` - Training scenarios with title, description, difficulty, category, certLevel, discipline, departureVideoUrl
- `scenarioSteps` - Individual steps with correct/incorrect actions, feedback, videoUrl
- `attempts` - User attempt tracking with score, responses, timing

## Video Assets
- Located in `client/public/videos/`
- Naming convention: `s{scenarioNum}-step{stepNum}-{description}.mp4`
- Departure videos: `s{scenarioNum}-departure.mp4`
- Generic dispatch video: `ambulance-driving.mp4`
- 50+ scenario-specific first-person videos across 9 scenarios
- Per-scenario cover images extracted from key video frames via ffmpeg, stored in `client/public/images/covers/sN-cover.jpg`. Mapping lives in `SCENARIO_COVERS` in server/seed.ts; `ensureScenarioCovers()` runs at startup to keep DB rows in sync (idempotent). To re-extract or change a cover: `ffmpeg -ss 00:00:03 -i client/public/videos/<src>.mp4 -vframes 1 -q:v 3 -vf scale=1280:-1 client/public/images/covers/sN-cover.jpg`.
- Note: H.264 video playback can NOT be verified via Playwright Chromium (codec missing); always test video features in a real browser.

## API Routes
- `GET /api/scenarios` - List all scenarios (supports `?discipline=EMS` or `?discipline=Nursing` filter)
- `GET /api/scenarios/:id` - Get single scenario
- `GET /api/scenarios/:id/steps` - Get steps for a scenario
- `POST /api/attempts` - Start a new attempt
- `PATCH /api/attempts/:id` - Update attempt with results

## Theme
- Dark mode default with toggle support
- Inter font family
- Blue primary color (hue 217)
- Medical/healthcare aesthetic

## Seed Data
- 12 scenarios seeded on startup (5 EMS + 1 Nursing + 1 EMS hemorrhage + 1 EMS combative overdose + 1 EMS pediatric asthma + 1 EMS multi-patient MVC + 1 EMS elderly anticoagulated fall + 1 EMS tension pneumothorax)
- Scenario 1: Sports Injury - Primary Assessment (7 steps, EMS)
- Scenario 2: Severe Asthma Attack (10 steps, EMS, adult patient Marcus 28M)
- Scenario 3: Respiratory Failure - Elderly Patient (8 steps, EMS, 72M COPD history found unresponsive in bed; flow: BSI/scene + ALS request → patient contact in hallway → bedside general impression / AVPU → OPA insertion → BVM ventilations w/ O2 → circulation assessment with continuous BVM → transfer to stretcher → en route reassessment in ambulance; critical steps are 4, 5, 6, 7). Videos shipped (Kling 30 Pro, frame-pair generated): s3-step2-approach, s3-step3-bedside, s3-step4-opa, s3-step5-bvm, s3-step6-circulation, s3-step7-transfer, s3-step8-enroute. Step 1 (BSI/PPE / Scene Safety / Resources) has no video — handled by null videoUrl, multi-question UI shows immediately. departureVideoUrl is null (en-route step is the finale). Title added to PUBLISHED_EMS_TITLES allowlist in server/routes.ts. Re-seed logic in `seedDatabase` deletes & recreates the old 6-step scenario 3 if step count != 8.
- Scenario 4: Motor Vehicle Collision (EMS)
- Scenario 5: Cardiac Arrest - Witnessed (EMS)
- Scenario 6: Acute Stroke - CVA Recognition (19 steps, Nursing, patient Robert Hernandez 67M, 7 scenes covering recognition through ICU transfer)
- Scenario 7: Severe Hemorrhage - Thigh Laceration (8 steps, 12 questions, EMS, 22M arterial bleed from broken glass; tourniquet application is critical step). Videos shipped: s7-step1-ppe, s7-step2-scene-approach, s7-step3-patient-contact, s7-step5-breathing, s7-step6-tourniquet (AI-generated via Veo), s7-step7-transport (AI-generated via Veo), s7-step8-enroute. Step 4 (General Impression) has no video yet — handled by null videoUrl, question UI shows immediately.
- Scenario 8: Combative Overdose - Suspected Opioid Reversal (9 steps, EMS, 30F suspected heroin overdose found unresponsive at home; opioid toxidrome → BVM → IN naloxone 4 mg → patient wakes combative and refuses transport; critical steps are 4, 5, 6, 7, 8). Videos shipped (Seedance-generated): s8-step1-arrival, s8-step3-discover, s8-step5-airway-opa, s8-step7-naloxone, s8-step8-combative, s8-step9-enroute. Steps 2 (Scene Size-Up door approach), 4 (General Impression / sternal rub), and 6 (BVM ventilations) have no video yet — handled by null videoUrl, question UI shows immediately. Title added to PUBLISHED_EMS_TITLES allowlist in server/routes.ts.
- Scenario 9: Pediatric Asthma Attack - Acute Exacerbation (10 steps, EMS, 6yo male severe asthma exacerbation after outdoor play; SpO2 85% RA, tripoding, retractions, nasal flaring, mom on scene; assist with patient's own albuterol MDI + spacer → high-flow O2 via NRB → rapid transport upright with mother riding along; critical steps are 4, 6, 7, 9). Videos shipped (Kling Pro + Seedance, frame-pair generated): s9-step1-approach, s9-step2-first-sight, s9-step3-inhaler, s9-step4-nrb, s9-step5-circulation, s9-step7-enroute. Steps 3 (#patients/spinal), 4 (General Impression/AVPU), 5 (Airway), and 9 (Priority/Transport) have no video — handled by null videoUrl, question UI shows immediately. Title added to PUBLISHED_EMS_TITLES allowlist in server/routes.ts.
- Scenario 10: Multi-Patient MVC - Driver #1 (Post-Triage) (7 steps, EMS, 4-patient T-bone collision at intersection in the rain; user has just completed primary triage and Driver #1 is identified as RED priority — 30s male restrained driver, airbag deployed, head laceration with brisk bleeding, AVPU=V, suspected c-spine injury). Flow: BSI/scene + MCI / START triage decisions (no video) → scene approach / triage overview of all 4 patients → patient contact w/ Driver #1 / general impression / AVPU → airway with manual c-spine + suction → breathing / O2 via NRB at 15 LPM → c-collar + rapid extrication onto long backboard → en-route reassessment & trauma center notification. Critical steps are 4, 5, 6. Videos shipped (Kling 30 Pro, frame-pair generated): s10-step2-scene, s10-step3-approach, s10-step4-airway, s10-step5-breathing, s10-step6-extrication, s10-step7-enroute. Step 1 (BSI/PPE/Scene Size-Up + START triage) has no video — handled by null videoUrl, multi-question UI shows immediately. departureVideoUrl is null (en-route step is the finale). Title added to PUBLISHED_EMS_TITLES allowlist in server/routes.ts.
- Scenario 12: Tension Pneumothorax - Industrial Chest Trauma (7 steps, EMS, 38M construction worker struck in the R chest by a swinging steel I-beam at a high-rise foundation pour ~10 min ago; large purple ecchymosis over R anterior/lateral chest, progressive dyspnea, AOx3 but anxious/air-hungry, RR 30 labored with accessory muscle use, SpO2 88% RA, HR 130, BP starting at 110/74 trending downward; classic evolving R-sided tension pneumothorax — decreased/absent BS on R with hyperresonance, JVD, possible early tracheal deviation; needle decompression is paramedic-only so EMT-level care is recognition + high-flow O2 + position + RAPID ALS intercept + rapid transport + assist ventilations gently if tiring). Flow: BSI/PPE/Scene Size-Up + ALS request (no video) → construction site scene approach with foreman waving EMS in → patient contact / general impression / AVPU + chest exposure → airway/breathing assessment / tension pneumothorax RECOGNITION (decreased R BS, hyperresonance, JVD, tracheal deviation) → high-flow O2 via NRB + decompression considerations → c-spine + long-board packaging onto stretcher + load → en-route ALS intercept / serial reassessment / trauma bay notification. Critical steps are 4, 5, 6. Videos shipped (Kling 30 Pro, frame-pair generated): s12-step2-approach, s12-step3-patient-contact, s12-step4-airway-breathing, s12-step5-oxygen, s12-step6-packaging, s12-step7-enroute. Step 1 (BSI/PPE/Scene Size-Up) has no video — handled by null videoUrl, multi-question UI shows immediately. departureVideoUrl is null (en-route step is the finale). Title added to PUBLISHED_EMS_TITLES allowlist in server/routes.ts.
- Scenario 11: Elderly Fall - Possible Head Injury (Anticoagulated) (7 steps, EMS, 82F skilled-nursing-facility resident, witnessed fall from her walker, struck right forehead on bedside table, brief LOC; baseline mild dementia, AFib on apixaban 5mg BID with last dose ~6 hours ago — high-risk for delayed intracranial hemorrhage / "talk-and-die"; large boggy R-frontal hematoma, periorbital ecchymosis, mildly confused but alert, R pupil sluggish on penlight). Flow: BSI/PPE/Scene Size-Up + ALS request (no video) → hallway approach with charge nurse / pre-scene info gathering → room entry / scene assessment / mechanism analysis → patient contact / general impression / AVPU + AMPLE / anticoag identification → focused neuro / pupils / O2 / glucose / 12-lead → c-collar + spinal precautions + scoop-stretcher packaging → en-route serial neuro reassessment + destination decision (Level II trauma center) + trauma-alert hospital notification. Critical steps are 3, 4, 5, 6. Videos shipped (Kling 30 Pro, frame-pair generated): s11-step2-hallway, s11-step3-room-entry, s11-step4-patient-contact, s11-step5-neuro, s11-step6-ccollar, s11-step7-enroute. Step 1 (BSI/PPE/Scene Size-Up) has no video — handled by null videoUrl, multi-question UI shows immediately. departureVideoUrl is null (en-route step is the finale). Title added to PUBLISHED_EMS_TITLES allowlist in server/routes.ts.
- Public visibility for EMS scenarios is gated by `PUBLISHED_EMS_TITLES` allowlist in server/routes.ts — add the title there to surface a scenario on /ems.
- Each step has a unique first-person POV video
- Each scenario has a departure video
- AI video generation: 8s clips, 16:9, first-person POV, person_generation: "allow_adult"
- EMS videos: EMT's blue nitrile-gloved hands
- Nursing videos: Nurse's purple nitrile-gloved hands, hospital setting
