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
- 50+ scenario-specific first-person videos across 6 scenarios

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
- 7 scenarios seeded on startup (5 EMS + 1 Nursing + 1 EMS hemorrhage)
- Scenario 1: Sports Injury - Primary Assessment (7 steps, EMS)
- Scenario 2: Severe Asthma Attack (10 steps, EMS, adult patient Marcus 28M)
- Scenario 3: Respiratory Failure - Elderly Patient (EMS)
- Scenario 4: Motor Vehicle Collision (EMS)
- Scenario 5: Cardiac Arrest - Witnessed (EMS)
- Scenario 6: Acute Stroke - CVA Recognition (19 steps, Nursing, patient Robert Hernandez 67M, 7 scenes covering recognition through ICU transfer)
- Scenario 7: Severe Hemorrhage - Thigh Laceration (8 steps, 12 questions, EMS, 22M arterial bleed from broken glass; tourniquet application is critical step). Videos shipped: s7-step1-ppe, s7-step2-scene-approach, s7-step3-patient-contact, s7-step5-breathing, s7-step6-tourniquet (AI-generated via Veo), s7-step7-transport (AI-generated via Veo), s7-step8-enroute. Step 4 (General Impression) has no video yet — handled by null videoUrl, question UI shows immediately.
- Public visibility for EMS scenarios is gated by `PUBLISHED_EMS_TITLES` allowlist in server/routes.ts — add the title there to surface a scenario on /ems.
- Each step has a unique first-person POV video
- Each scenario has a departure video
- AI video generation: 8s clips, 16:9, first-person POV, person_generation: "allow_adult"
- EMS videos: EMT's blue nitrile-gloved hands
- Nursing videos: Nurse's purple nitrile-gloved hands, hospital setting
