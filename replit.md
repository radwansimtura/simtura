# Simtura.ai

Simtura.ai provides AI-powered, interactive patient scenario simulations with immersive first-person video for healthcare professionals to practice patient assessments and decision-making.

## Run & Operate

*   **Install dependencies**: `npm install`
*   **Run development server**: `npm run dev` (concurrently runs client and server)
*   **Build**: `npm run build`
*   **Typecheck**: `npm run typecheck`
*   **Codegen (Drizzle)**: `npm run generate-drizzle-types`
*   **DB Push (Drizzle)**: `npm run db:push`
*   **Required Env Vars**: `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## Stack

*   **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui, wouter, framer-motion
*   **Backend**: Express.js, TypeScript
*   **Database**: PostgreSQL
*   **ORM**: Drizzle ORM
*   **Validation**: _Populate as you build_
*   **Build Tool**: Vite

## Where things live

*   `client/`: Frontend source code
*   `server/`: Backend source code
*   `shared/`: Shared types and utilities
*   `client/public/videos/`: Video assets
*   `client/public/images/covers/`: Scenario cover images
*   `server/db/schema.ts`: Database schema definition (Drizzle)
*   `server/routes.ts`: API route definitions and `PUBLISHED_EMS_TITLES` allowlist
*   `server/stripeClient.ts`: Stripe integration
*   `server/webhookHandlers.ts`: Stripe webhook processing
*   `server/seed.ts`: Seed data and `SCENARIO_COVERS` mapping
*   `shared/schema.ts`: Pricing tiers (`PRICING_TIERS`)

## Architecture decisions

*   **Monorepo Structure**: Client and server in a single repository for easier development and type sharing.
*   **Video-first Simulation**: Core interaction revolves around first-person video playback, augmented with interactive questions.
*   **Stripe for Payments**: All payment and subscription logic (individual Pro, organizational licensing) is handled through real Stripe Checkout and webhooks for robust, secure transactions.
*   **Idempotent Seed Data**: Database seeding logic in `server/seed.ts` is designed to be idempotent, ensuring consistent scenario data across deployments.
*   **Dedicated Webhook Handler**: Stripe webhook processing is explicitly handled with raw body parsing *before* `express.json()` to ensure signature verification, enhancing security.

## Product

*   **Interactive Scenario Trainer**: Cinematic play-pause-question flow with instant feedback.
*   **Discipline-specific Scenarios**: Content tailored for EMS (EMR, EMT, Paramedic) and Nursing (RN, LPN, BSN).
*   **Organizational Licensing**: Bulk seat purchasing, code generation, and dashboard for managing users.
*   **Individual Pro Subscription**: Monthly subscription for premium features managed via Stripe.
*   **Dark Mode**: Default dark mode with toggle support.

## User preferences

_Populate as you build_

## Gotchas

*   H.264 video playback cannot be verified via Playwright Chromium; always test video features in a real browser.
*   Stripe webhooks require raw body for signature verification; `stripe-replit-sync` manages endpoint.
*   To re-extract or change a scenario cover image, use the `ffmpeg` command specified in "Video Assets" and update `SCENARIO_COVERS` in `server/seed.ts`.
*   Public visibility for EMS scenarios is gated by the `PUBLISHED_EMS_TITLES` allowlist in `server/routes.ts`.

## Pointers

*   [React Documentation](https://react.dev/learn)
*   [Vite Documentation](https://vitejs.dev/guide/)
*   [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
*   [Tailwind CSS Documentation](https://tailwindcss.com/docs)
*   [Stripe API Documentation](https://stripe.com/docs/api)