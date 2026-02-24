# Simtura.ai - EMS Training Simulation Platform

## Overview
Simtura.ai is an AI-powered training platform for EMS personnel (EMTs, Paramedics, etc.) that provides interactive patient scenario simulations with immersive first-person video experiences. Users practice patient assessments, make critical decisions, and receive instant feedback through a cinematic play-pause-question flow.

## Architecture
- **Frontend**: React + Vite + TypeScript with Tailwind CSS and shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter for client-side routing
- **Animations**: framer-motion for transitions

## Key Pages
- `/` - Landing page with hero, features, how-it-works, certification levels
- `/scenarios` - Scenario browser with search and filtering (cert level, difficulty)
- `/scenario/:id` - Immersive video-based scenario trainer with play-pause-question flow

## Trainer Flow
1. Intro screen with dispatch info → "Respond to Call"
2. Dispatch video plays (ambulance driving)
3. Step video plays (first-person POV of EMT arriving/acting)
4. Video pauses → Question UI appears over frozen frame
5. User selects action → Submit → Feedback shown
6. Click "Next Step" → Next step video plays → Question → Feedback → repeat
7. After final step → Departure video plays (ambulance leaving scene)
8. Results screen with score and step-by-step review

## Data Model
- `scenarios` - Training scenarios with title, description, difficulty, category, cert level, departureVideoUrl
- `scenarioSteps` - Individual steps with correct/incorrect actions, feedback, videoUrl
- `attempts` - User attempt tracking with score, responses, timing

## Video Assets
- Located in `client/public/videos/`
- Naming convention: `s{scenarioNum}-step{stepNum}-{description}.mp4`
- Departure videos: `s{scenarioNum}-departure.mp4`
- Generic dispatch video: `ambulance-driving.mp4`
- 35+ scenario-specific first-person videos across 5 scenarios

## API Routes
- `GET /api/scenarios` - List all scenarios
- `GET /api/scenarios/:id` - Get single scenario
- `GET /api/scenarios/:id/steps` - Get steps for a scenario
- `POST /api/attempts` - Start a new attempt
- `PATCH /api/attempts/:id` - Update attempt with results

## Theme
- Dark mode default with toggle support
- Inter font family
- Blue primary color (hue 217)
- Medical/emergency services aesthetic

## Seed Data
- 5 realistic EMS scenarios seeded on startup
- Scenario 1: Sports Injury - Primary Assessment (12 steps, full primary assessment sequence: BSI → Scene Safety → Additional Resources → Patient Count → MOI → Spinal → Life Threats → AVPU → Airway → Breathing → Circulation → Transport Priority)
- Scenario 2: Severe Asthma Attack (10 steps, adult patient Marcus 28M)
- Scenario 3: Respiratory Failure - Elderly Patient
- Scenario 4: Motor Vehicle Collision
- Scenario 5: Cardiac Arrest - Witnessed
- Each step has a unique first-person POV bodycam video
- Each scenario has a departure video
- AI video generation: 8s clips, 16:9, first-person POV with EMT's blue nitrile-gloved hands, person_generation: "allow_adult"
