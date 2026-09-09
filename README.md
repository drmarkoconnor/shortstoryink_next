# shortstory.ink — writing and teaching studio

## Current work and handoff

Read [the active Netlify migration handoff](docs/handoff-netlify-migration-2026-09-09.md)
before changing the backend or deploying. It records the live state, private
backup locations, completed checks and remaining cutover work. The preceding
[workshop stabilisation handoff](docs/handoff-workshop-stabilisation-2026-09-08.md)
documents the privacy and submission invariants that must be preserved.

The application supports manuscript submission and revision, private teacher
feedback, printable feedback packets and reusable teaching materials:

- Next.js App Router
- React
- Tailwind CSS
- Netlify Database and Netlify Identity integration on the migration branch
- GitHub CI + Netlify hosting config

The migration branch is not the production release until the handoff confirms cutover.

## What exists in Phase 1

- Public landing shell: `/`
- Auth routes: `/auth/sign-in`, `/auth/sign-up`
- Authenticated application shell: `/app`
- Role/workflow placeholders:
  - `/app/workshop`
  - `/app/writer`
  - `/app/teacher`
  - `/app/teacher-studio`

## Product documentation

- Teacher-side product and workflow decisions should follow
  `docs/teacher-area-roadmap.md`.
- Writer-facing feedback export planning should follow
  `docs/export-feedback-packet-roadmap.md`.

## Environment variables

Copy `.env.example` to `.env.local` for optional local configuration. Netlify
provisions the deployed database connection automatically. Database credentials
and identity admin tokens must never reach browser code.

Application configuration:

- `NEXT_PUBLIC_APP_URL`
- `APP_URL`
- Optional Resend and teacher AI settings listed in `.env.example`

The runtime does not require Supabase settings. Its historical SQL and export
scripts are retained as migration references; never replay their reset/seed
scripts into the Netlify database.

Schema migrations live in `netlify/database/migrations`. Data restoration uses
the explicit private snapshot import script, followed by row/hash verification.

## Local development

1. Install dependencies.
2. Configure `.env.local`.
3. Use `netlify dev` for local database work. Verify Identity on a deployed
   preview: its SDK does not currently support local Identity development.

## Quality gates

Before merging foundation changes, run:

- typecheck
- lint
- production build

## Deployment

- GitHub workflow: `.github/workflows/ci.yml`
- Netlify config: `netlify.toml`

Netlify must have the same environment variables configured as local
development.
