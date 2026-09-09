# Netlify migration — release and handoff

## Current state

**The live writing studio has migrated from Supabase to Netlify Database and Netlify Identity.** Mark upgraded the existing team to Personal and repeatedly authorised completion. No further plan or migration approval is needed.

- Site: **storyink**, ID `d8bc3715-124c-43a2-846d-009b995bb694`, https://shortstory.ink. Do not target the older similarly named site.
- Team: `drmarkoconnor`, ID `604dff94a9112e607f4fa007`, verified `credit-personal`. Automatic credit purchases are disabled.
- Final production deployment: `6aa17f236c2a2500089f2c9e`, published 9 September 2026 at 15:46:55 UTC from merged commit `ca4547d85376217317ee9a87388eda67d3e59fb4`. [PR #1](https://github.com/drmarkoconnor/shortstoryink_next/pull/1) is merged; local main is synchronised. The preceding clean manual deployment `6aa17b2ab77b111dc9b73ccc` is retained as an additional Netlify rollback release. Migration and release work are complete.
- Netlify Identity instance: `6aa129dd145522096fa7e192`. Registration is reopened; email confirmation remains required.
- All 16 application tables, 35 application accounts and 20 confirmed Netlify login mappings were imported into production in one transaction. Every table count and content hash matched the frozen-source export before commit. This includes 21 submissions, 544 snippets, 12 teacher documents, 56 feedback items and two teaching examples.
- The 15 unconfirmed source accounts remain reserved in the application account map, without being activated. They must verify their email through signup before gaining access.
- Existing confirmed users must use **Forgot password once** to set a new Netlify password. The supported Identity admin API does not import Supabase password hashes. No bulk invitation/reset emails were sent.
- The elegant interface is preserved. Only authentication guidance and necessary session behaviour changed. The imagination-park idea is a future feature, not part of this release.

## Verification

- 22 automated tests pass, using the actual Netlify baseline inside a platform-owned transaction. GitHub CI passed typecheck, tests, lint and build on both the final PR commit and merged main commit; [final main CI run](https://github.com/drmarkoconnor/shortstoryink_next/actions/runs/34372357566). The Netlify Git production build also passed.
- Real PostgreSQL tests passed for every migrated writer's isolation, anonymous denial, role protection, simultaneous submission retry deduplication, publication waiting for a comment transaction, published-feedback locking, and competing revision exclusion. Temporary fixtures were removed and all original public hashes remained identical.
- The deployed teacher/writer/peer HTTP rehearsal passed sign-in, writer provisioning, teacher-route denial, expired-session renewal before SSR, the real submission action, annotations, draft privacy, publication, peer isolation, export and the real bound revision action. Synthetic accounts and writing from these rehearsals were removed.
- The exact production import was first rehearsed on a fresh branch with the maintenance gate active. Its 35 accounts, 20 mappings and all 16 hashes matched. Production then passed the same import verification.
- Live public pages, protected-page/API denial, removal of both temporary import endpoints, and nine browser JavaScript bundles passed read-only checks, repeated successfully after the final merged production release. The bundles contain no Supabase client or connection references.
- A database branch was confirmed idle, then woke and returned all 21 submissions in **1,868ms**. Settings: min CU 0.25, max CU 1, inactivity sleep 300 seconds. This addresses manual inactivity restoration; credit exhaustion remains a separate hosting limit.
- Browser automation was unavailable. Do not claim screenshots, visual browser testing or email-delivery testing. The HTTP checks and database checks above were performed against deployed services.

## Runtime architecture and invariants

`@netlify/database` supplies the server connection automatically. `lib/data/query.ts` adapts the application's existing query shapes to parameterised SQL over a fixed table allowlist. It is not exposed as a generic HTTP SQL API. `lib/data/client.ts` uses a transaction-local verified application UUID and restricted `studio_authenticated` / `studio_anon` roles for RLS. Privileged operations remain server-only and require verified authentication plus the existing route/action guards.

`studio_auth.users` preserves original application UUIDs and maps them to independent Netlify Identity UUIDs. Only an Identity-verified email can attach an unmapped account. Ambiguous email matches, changed identity IDs and blocked accounts fail closed. Role selection never comes from user-editable Identity metadata. Verified email changes are synchronised to the private map so notifications use the current address.

**Identity 2.0 SSR issue:** the SDK's `getUser()` returned a verified JWT-claims fallback without `confirmedAt` in Next.js, causing a sign-in loop. `lib/auth/verified-identity.ts` instead reads the actual Next request cookie and verifies it with the configured Netlify `/user` endpoint, requiring `confirmed_at`. Never replace this with unsigned JWT decoding or the incomplete SDK fallback. Browser and admin operations use `@netlify/identity`.

Middleware renews expiring sessions before SSR and forwards the renewed cookies. JWT expiry decoding is only a refresh hint; it does not authenticate a user. Private responses are not cached. Logout clears local recovery drafts and auth cookies even if the service is temporarily unavailable. Preview builds suppress workshop notification emails.

Preserve manuscript storage, paragraph identity and annotation offsets. Multipart FormData normalises new submissions' wire line endings to CRLF, as before migration; stored source manuscripts were preserved exactly during transfer. Do not normalise imported text.

## Native migrations and cutover lessons

The production baseline is `netlify/database/migrations/001_workshop-baseline/migration.sql`. It includes the verified live schema and the preceding workshop stabilisation. **It is now applied in production: never edit it. Add a new migration.** Netlify owns the outer transaction; BEGIN/COMMIT must not be added to migration files.

The first exact cutover rehearsal exposed an inherited COMMIT wrapper: Netlify reported `unexpected transaction status idle` after executing DDL. The corrected baseline was tested on a fresh branch and then applied successfully in production. Older rehearsal branches may have the earlier checksum and must not be reused for migrations.

Current CLI builds use `@netlify/database` and the native migration directory. An older cached CLI source referred to `@netlify/db`; do not install that old package or the old Neon extension. Use the complete CLI build/deploy lifecycle with the Next adapter; a separate plain `.next` upload with `--no-build` packages the wrong static root.

Production connection APIs supplied only a read-only connection despite an explicit owner-role request; a snapshot API request returned HTTP500. The normal deployed runtime correctly had `netlifydb_owner`. The cutover therefore used a short, rehearsed maintenance deployment and a digest-locked one-time import through that runtime. It required a random secret, exact payload SHA256, two-hour expiry, an empty destination and an atomic hash-verified import. **Those endpoints, guards and helper have been removed from the application.** No connection credentials were returned through an endpoint, and no private data SQL was committed.

## Backups and rollback

Private files are under `.local-backups/2026-09-09-netlify-migration/`. They contain student data, credentials or billing details: never print, publish or commit them.

- `final-application-snapshot.json`: final export after source writes were frozen.
- `identity-mappings.private.json`: 20 old-application/new-Identity UUID mappings.
- `production-cutover-report.private.json`: committed production account counts and all verified table hashes.
- `http-rehearsal-*.private.json`, `database-checks.private.json`, `live-release-checks.private.json`: verification evidence.
- `cutover-implementation/`: private archive of the removed temporary operations.
- `cleanup-report.private.json`: registration settings and obsolete variable removal.
- `retirement-report.private.json`: retirement results for temporary deployments and database branches.
- Earlier Supabase configuration/deployment backups remain under `.local-backups/2026-09-09-pre-deploy/`.

**Supabase is retained as frozen rollback material; it no longer serves the application.** Statement triggers named `studio_cutover_freeze` on the 16 public tables and `auth.users` prevent stale clients from changing the source. The freeze changes no original rows. The source may pause later without affecting the Netlify application.

`scripts/supabase-cutover.mjs --execute unfreeze` removes only this freeze. Do not run it casually: once Netlify has new writes, an application rollback also requires data reconciliation and restoration of the old Supabase environment. Prefer a forward fix. Do not delete the source project without a separate retention decision.

Migration scripts are explicit, one-time operational records, not routine app commands. Some depend on private dated snapshots and the cached local CLI helper path. Read and adapt them before reuse. Historical Supabase verification scripts no longer have their old runtime client dependencies installed. Never replay old reset/seed migrations.

## Cleanup and remaining operational notes

The six Supabase site environment variables and five temporary migration/cutover variables have been removed. The standalone diagnostic Identity account was deleted. Temporary migration deployments, including the maintenance deployment and original draft PR preview, were successfully deleted; the live deployment and original Supabase rollback releases were retained.

Netlify returned HTTP401 for deletion of four idle rehearsal database branches: `migrate/netlify-database-identity`, `migration-rehearsal`, `migration-cutover-rehearsal`, and `migration-cutover-v2`. Their deployed temporary endpoints are gone. These copies remain within the same Netlify account and can be removed through its database dashboard; **never delete the production branch**. This cleanup limitation does not create a Supabase dependency or prevent student use. Record their removal if completed later.

Netlify's Personal allowance is shared with the existing team's other sites. Automatic credit purchases are off; inspect usage before expanding class traffic. Database sleep/wake is automatic. Do not promise an unlimited fixed bill or change the plan/automatic-purchase setting without authorisation.

## Product work after migration

Follow the [product brief](product-brief.md), [teacher roadmap](teacher-area-roadmap.md) and [feedback export roadmap](export-feedback-packet-roadmap.md). Mark wants sophisticated, elegant visuals with more imaginative interaction. A suitable next prototype is an annotated scene organised around **someone, somewhere, under internal or external pressure**, with selectable craft notes and a prompt-to-draft path. Keep keyboard access, readable text and reduced motion central. The Miss Brill park idea is a teaching direction, not a request to replace the current design during migration.

Sources for platform behaviour: [Netlify Database migrations](https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/), [Identity](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/get-started/), [pricing](https://www.netlify.com/pricing/). Runtime observations above take precedence over earlier assumptions in the preceding stabilisation handoff.
