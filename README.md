# shortstory.ink — writing and teaching studio

A Next.js application for manuscript submission and revision, private teacher
feedback, printable feedback packets and reusable teaching materials. The backend
uses Netlify Database and Netlify Identity.

## Read before changing the application

- [Active migration and release handoff](docs/handoff-netlify-migration-2026-09-09.md): live status, verification, private backups and rollback.
- [Workshop stabilisation](docs/handoff-workshop-stabilisation-2026-09-08.md): privacy, draft recovery and concurrent-write requirements.
- [Product brief](docs/product-brief.md), [teacher roadmap](docs/teacher-area-roadmap.md) and [feedback export roadmap](docs/export-feedback-packet-roadmap.md).

Preserve manuscript text and annotation offsets. Students may read only their own
submissions and published feedback; group membership does not grant access to
another student's writing. Profile edits must never allow role changes.

## Backend

Netlify supplies the deployed PostgreSQL connection automatically. Queries run
only on the server, using parameterised SQL and transaction-scoped restricted
roles. Identity sessions are verified against Netlify before mapping them to
application account UUIDs. Existing account UUIDs remain unchanged.

Schema migrations live in `netlify/database/migrations`. Netlify owns their
surrounding transaction. Never edit an applied migration or add transaction
wrappers; add a new migration instead. Historical Supabase SQL/export scripts are
retained for backup and rollback reference. Never replay their reset/seed SQL.
The application has no runtime dependency on Supabase.

## Development and verification

Use Node 22.12 or later and install dependencies with `npm ci`. Optional settings
are documented in `.env.example`; keep credentials in ignored local environment
files or Netlify configuration. Never expose database credentials to the browser.

Use `netlify dev` for local database development. Identity must be tested on a
deployed preview because its SDK does not currently support local Identity.
Preview deployments suppress workshop notification emails.

Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` before
release. GitHub CI runs these checks independently. Deployment uses the complete
Netlify CLI build lifecycle so the Next.js adapter packages the correct assets;
do not separately deploy an ordinary `.next` build with `--no-build`.

The one-time migration scripts require explicit execution and private snapshot
files. Their former temporary HTTP endpoints are removed after cutover. Read the
handoff before attempting to use any migration or rollback tooling.
