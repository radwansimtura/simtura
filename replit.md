# Simtura.ai - EMS Training Simulation Platform

## Overview
Simtura.ai is an AI-powered training platform for EMS personnel (EMTs, Paramedics, etc.) that provides interactive patient scenario simulations. Users practice patient assessments, make critical decisions, and receive instant feedback.

## Architecture
- **Frontend**: React + Vite + TypeScript with Tailwind CSS and shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter for client-side routing

## Key Pages
- `/` - Landing page with hero, features, how-it-works, certification levels
- `/scenarios` - Scenario browser with search and filtering (cert level, difficulty)
- `/scenario/:id` - Interactive step-by-step scenario trainer with vitals, feedback, scoring

## Data Model
- `scenarios` - Training scenarios with title, description, difficulty, category, cert level
- `scenarioSteps` - Individual steps within scenarios with correct/incorrect actions and feedback
- `attempts` - User attempt tracking with score, responses, timing

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
- Covers: Sports Injury, Pediatric Asthma, Respiratory Failure, MVC, Cardiac Arrest
