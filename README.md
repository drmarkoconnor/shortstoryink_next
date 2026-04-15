# shortstory.ink — Phase 1 foundation

This repository now hosts the **new frontend foundation** for shortstory.ink:

- Next.js App Router
- React
- Tailwind CSS
- Supabase-backed authentication/session wiring
- GitHub CI + Netlify hosting config

This phase intentionally ships only the application shell and route scaffolding.

## What exists in Phase 1

- Public landing shell: `/`
- Auth routes: `/auth/sign-in`, `/auth/callback`
- Authenticated application shell: `/app`
- Role/workflow placeholders:
  - `/app/workshop`
  - `/app/writer`
  - `/app/teacher`
  - `/app/teacher-studio`

## Environment variables

Copy `.env.example` to `.env.local` and fill values from your existing Supabase
project.

Required now:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Expected soon (server-side workflows):

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`
- `AUTH_REDIRECT_BASE_URL`

## Local development

1. Install dependencies.
2. Configure `.env.local`.
3. Run the app and visit `http://localhost:3000`.

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

