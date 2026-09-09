# Workshop stabilisation — handoff and change notes

## Read this first

Mark authorised the first recommendation in the September 8 review: stabilise the private workshop before the Netlify backend migration and interactive writing-world work. Preserve the existing elegant literary visual language. Keep this file current during implementation and after verification.

The broader intent is reliable, low-maintenance access for students, followed by Netlify Database/Identity evaluation, then one annotated park scene connecting close reading to original writing. This pass is the reliability and privacy foundation, not a backend migration or visual redesign.

References: `docs/review-2026-09-08-netlify-and-writing-studio.md`, `docs/product-brief.md`, `docs/migration-note.md`, `docs/teacher-area-roadmap.md`, `docs/features-core-submit-review-feedback.md`.

## Production release — September 9, 2026

**The authorised stabilisation release is live at https://shortstory.ink and verified.** This remains Supabase-backed; migration to Netlify Database/Identity is the next separate phase.

- Mark explicitly approved applying the migration and deploying the matching app by saying “go ahead.” No further rollout approval is needed for this completed release.
- Supabase applied `workshop_stabilisation` as version **20260909064353**. The repository migration has been renamed to `supabase/migrations/20260909064353_workshop_stabilisation.sql` to match that recorded version. Its SQL is identical to the rehearsed file originally generated as `20260908165328_workshop_stabilisation.sql`. Historical private verification reports retain that original filename and the SQL checksum.
- Netlify site: `storyink`, ID `d8bc3715-124c-43a2-846d-009b995bb694`.
- Verified release deploy: **6aa0ff577e91fc6e96289e31**, published **2026-09-09 06:44:03 UTC**. [Deploy logs](https://app.netlify.com/projects/storyink/deploys/6aa0ff577e91fc6e96289e31). [Immutable release URL](https://6aa0ff577e91fc6e96289e31--storyink.netlify.app).
- Subsequent automatic production deploy: **6aa10564a3f2100007014784**, source **89bedf268e9d34f5dbb8eadbe13069040e063a7d**, published **2026-09-09 07:07:37 UTC**, state `ready`. [Deploy logs](https://app.netlify.com/projects/storyink/deploys/6aa10564a3f2100007014784). [GitHub CI 34322181701](https://github.com/drmarkoconnor/shortstoryink_next/actions/runs/34322181701) also succeeded. The final production sign-in returned HTTP 200; both internal-file probes remained HTTP 404. Runtime application code is unchanged from the live account/workshop verification below.
- Migration and promotion were separated by about 10 seconds. The old version was retained until the new draft was ready, then the existing draft was promoted with Netlify's `restoreSiteDeploy` API.
- A fresh application snapshot is in `.local-backups/2026-09-09-pre-deploy/`. The restore/migration rehearsal passed again. **After deployment and fixture cleanup, all 16 application tables still match the backup by row count and PostgreSQL content hash; all original 35 auth accounts remain.** The only new field on existing submission rows is NULL `client_request_id`.
- Live read-only verification: a real writer now sees **zero** other writers' submissions; UPDATE on `role` is denied; UPDATE on `display_name` remains allowed.
- `scripts/verify-live-workshop.mjs --execute https://shortstory.ink` passed all six check groups. It created three isolated temporary accounts, exercised real authentication cookies and HTTP routes, and removed their sessions/accounts/submissions/comments afterward. No notification or recovery email was sent. The publication HTTP route was exercised only as an identical retry after the database RPC committed, avoiding email delivery.
- Verified live: public sign-in; rejected invalid auth callback; authenticated Account and reset-password pages; display-name update; blocked role escalation; actual password update and subsequent login; idempotent submission; peer isolation; teacher annotation save; hidden draft comments; writer denied publication; publication retry; published-feedback reading; locked comments; export; revision numbering and retry deduplication.
- **Still unverified:** actual reset-email delivery and the email-link/PKCE journey; browser rendering, keyboard/mobile interactions and mounted-form draft recovery; simultaneous PostgreSQL sessions. No Browser connection was available. HTTP/API tests do not replace these checks. The 16 local regression tests cover draft storage/auth validation and database invariants separately.
- Security advisors now report only the pre-existing informational `review_summaries` no-policy finding and disabled leaked-password protection. The helper/search-path warnings addressed by this release are gone. Leave the legacy table closed; review Auth protection separately using the links below.

### Deployment lessons for the next model

Use Netlify CLI **27.5.1** with the full `netlify deploy` build lifecycle for this Next.js adapter. A separate `netlify build` followed by `netlify deploy --no-build` with publish `.next` bypasses the adapter's temporary static-directory swap. The initial incorrectly packaged draft **6aa0fcdaa06d4284a7afce4a** was deleted and was never published to the main domain. The corrected release serves sign-in with HTTP 200 and returns HTTP 404 for internal `/server/app/index.html` and `/.env.local` paths.

The adapter copies a local `.env.local` into its server package during a local build. `scripts/deploy-prepared-workshop.mjs` temporarily parks that file in the private backup directory, supplies the configured Netlify production environment to the build, performs the complete draft deploy, and restores `.env.local` in `finally`. The uploaded function archive was checked for environment files and local backups. Do not deploy the repository root or private backup directory. Production environment values are in a private ignored export for this release only; never print or commit them.

The wrapper and verification scripts contain release-specific private artifact paths. Read them before reuse and prepare a fresh release directory/config export for a future release. They are not CI requirements. Repository/CI tracking of the released application is recorded at the end of this file.

## Latest status — live inspection after Mark resumed Supabase

On September 8, Mark manually resumed the existing project so the live checks could proceed. The project reached `ACTIVE_HEALTHY`; its ID matches `.env.local`. Early reads during `COMING_UP` returned no public tables, but the complete schema appeared once startup finished. Do not interpret those startup reads as data loss.

The September 8 findings below are the pre-release baseline. The completed September 9 release above supersedes the earlier pending status.

- Inventory: 16 public tables, all with RLS enabled; 6 profiles (5 writers, 1 admin), 35 auth accounts, 21 submissions, 56 feedback comments, 21 summaries, 544 snippets, 12 teacher documents and 2 teaching examples. Storage contains zero objects. Do not remove auth accounts merely because they lack modern profiles.
- No duplicate revision-chain/version pairs, broken roots or cross-owner roots were found.
- Recorded migration history contains only `20260403/000001_initial_schema`, `20260409/000002_teacher_auth_rls`, and `20260410120000/writer_feedback_token`. The actual schema is substantially newer. This confirms that replaying repository migrations wholesale would be unsafe.
- A read-only transaction using a writer's role context reproduced access to **two other writers' submissions**. The role column has ordinary authenticated UPDATE permission. No live role was changed, and no manuscript text was emitted in the check. The sampled account saw zero unpublished comments in the current data; the policy defect still exists independently of that sample.
- Netlify's live domain `https://shortstory.ink` belongs to site **`storyink`**, ID `d8bc3715-124c-43a2-846d-009b995bb694`; current deploy at inspection was `6a041cde963d4000081bd55f`. A separate older site called `shortstoryink` also exists. Do not deploy to the similarly named older site by mistake.

### Private application backup and successful rehearsal

Files are under `.local-backups/2026-09-08-pre-stabilisation/`, ignored by Git; directory permissions are 0700 and snapshot files 0600. Do not commit, publish, attach to a PR or expose this directory through a web server. The snapshot contains private writing and account metadata.

- `application-snapshot.json`: approximately 1.57 MB, exported in a single read-only repeatable-read transaction through the authenticated Supabase CLI/Management API. Contains every public application table, counts/hashes, table/constraint/index definitions, and auth identity mappings.
- `catalog.json`: live columns, policies, grants, functions, triggers, indexes, enum types and preflight checks.
- `export.sql`: exact read-only snapshot query.
- `verification.json`: snapshot and migration SHA-256 hashes, counts, successful checks and explicit limitations.
- Reproduce with `node scripts/rehearse-workshop-snapshot.mjs .local-backups/2026-09-08-pre-stabilisation`. This script operates only on local PGlite and never connects to Supabase.

The script restored all 16 application tables with matching PostgreSQL row hashes and counts, applied the exact prepared migration, and proved every original row/field stayed unchanged (apart from the added NULL request-ID field). All five existing writers retained their own submissions and lost access to peers; role changes were rejected; teacher access and permitted display-name updates continued to work. Anonymous submission/example reads were denied. `npm test` also passed all 16 synthetic regression tests again after the live-informed SQL adjustment.

**Backup scope:** this is a verified application-data/schema snapshot and identity map, not a complete Supabase disaster-recovery backup. It does not include password hashes, sessions, platform configuration, full role/default ACL definitions, or platform event-trigger registrations. Authentication is represented by an ID-only fixture in local rehearsal. Preserve the Supabase project; a full auth/platform export remains a prerequisite for retiring it during the Netlify migration. True concurrent PostgreSQL sessions and actual browser/auth flows are still untested.

Backup tooling notes: `supabase backups list` reports no available backups and PITR disabled. Normal `db dump` could not run because neither Docker nor Podman is installed. The authorised `brew install libpq` attempt failed because Command Line Tools are missing; Homebrew auto-updated itself/tap metadata before failing, but libpq was not installed. Avoid repeating that installation without addressing the missing tools. The fallback uses `supabase db query --linked --project-ref ... --file ... --output json`; this CLI requires `--linked` alongside `--project-ref`. A temporary CLI export script containing connection credentials was deleted after use.

### Live advisor findings and resulting adjustment

The stabilisation migration prepared after inspection (and applied on September 9) also fixes the mutable search path of `public.set_updated_at()` and conditionally revokes public/client EXECUTE on the platform DDL event-trigger function `public.rls_auto_enable()`. These changes passed both test suites and the live-snapshot rehearsal. The existing teacher helper is already moved behind the private helper by the main migration.

Remaining advisor context:

- `review_summaries` is an old RLS-enabled table with no policies. Preserve its deny-by-default behaviour until its legacy role is understood; do not grant access merely to silence an informational lint. [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Leaked-password protection is disabled in Auth. This has not been changed. [Password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Performance findings include 12 unindexed foreign keys, 29 auth/RLS init-plan opportunities, 30 multiple-permissive-policy findings and 22 unused indexes. Do not remove indexes based on low-use statistics after a long pause. Performance cleanup is separate from the privacy release.
- Run advisors again after the real migration, and verify actual API/browser behaviours before calling the live release complete.

## Starting state (before implementation)

- Next.js 15 / React 19 / Supabase, hosted through Netlify.
- Initial typecheck, lint and production build passed in the preceding review.
- Supabase connector reported the `shortstoryink` project INACTIVE on September 8. Its confirmed project ref is retained in the private snapshot and configured `SUPABASE_PROJECT_ID`; avoid hard-coding it in repository files because Netlify scans that configured value. No live policy verification or mutations had been performed at that point.
- No available Browser connection in the preceding review. Do not describe browser flows as visually verified.
- Existing migration history contains destructive resets, seeded content and hotfixes outside migrations. Never replay everything into a populated production database.
- The review document was already untracked at the start of this implementation; preserve it.

## Implementation scope

1. Enforce private submission access, published-feedback visibility and protected roles.
2. Enforce teaching-example group visibility consistently and fail closed on permission errors.
3. Complete usable profile/password settings and recovery; validate auth redirects.
4. Recover unfinished submission/revision text without a database request on every keystroke.
5. Make publication and revision creation atomic/idempotent where practical.
6. Add regression tests for access boundaries and failure cases; run the normal quality gates.

## Change log

### September 8 — local implementation complete; live rollout pending

- Added `supabase/migrations/20260909064353_workshop_stabilisation.sql`, generated through the pinned Supabase CLI. It is an additive transaction; it was subsequently applied on September 9; see the production release record above.
- Restricted ordinary profile updates to `display_name`, revoking both table and historical column grants. Role checks use a narrowly scoped private definer helper to avoid recursive profile policies; public compatibility helpers are invoker functions.
- Added restrictive SELECT policies over existing permissive policies: submissions are owner/teacher only; students see feedback only after publication; example and annotation access respects enabled-group membership. Reader pages now query examples with the user's session, allowing the database to enforce the rule. Lookup failures no longer mean unrestricted access.
- New server-only draft RPC validates writer identity, group membership and the basic-group 2,000-word limit, preserves manuscript whitespace, serialises a writer's submissions, and deduplicates retries using a client request UUID. Revision chains gain a unique version index and reject revisions from outdated or unpublished sources. Direct client inserts into submissions are blocked.
- New server-only publication RPC commits summary and submission status together. Identical retries return the original result without sending another email. Changed summaries after publication are rejected, preserving the existing read-only publication model.
- A feedback trigger locks the parent submission, rejects changes after publication, and marks the first comment `in_review` within the comment transaction. This shares the publication lock and closes the comment-save/publication race. Writer deletion also checks the current status in the DELETE itself and checks that a row was actually deleted.
- Added account-scoped browser recovery for new drafts and each revision, with exact text preservation, seven-day expiry on read, a download button, storage/conflicting-tab warnings, and clearing only the confirmed submitted copy. Normal edits do not write to the database. Logout clears this account's local recovery keys.
- Submission and revision forms retain controlled text on failed saves; successful saves clear the matching recovery copy. Revision submission and new submission use the same database operation.
- Implemented display-name updates and password changes; enabled Account navigation for teacher and writer. Removed unimplemented account controls from the rendered page. Names now appear in the header from the actual profile.
- Completed the password-reset destination, validation and session-exchange error handling. Auth redirects accept only safe internal paths. Reset emails give a neutral account-existence response and explain that the PKCE link should open in the requesting browser. Added a general studio loading-error boundary.
- Escaped manuscript titles in feedback notification HTML. Emails are sent after database commit; delivery remains best effort.
- Added executable PostgreSQL-policy/transaction tests with PGlite plus auth/recovery unit tests, `npm test`, and a CI test step. Pinned PGlite, tsx and Supabase CLI dev dependencies; ignored CLI temporary metadata.
- Updated compatible dependencies: Next 15.5.15 → 15.5.25 and the four direct Tiptap packages 3.22.5 → 3.31.3. A scoped `next` override selects PostCSS 8.5.28 because Next 15 pins an older vulnerable copy. Keep this override until a supported framework release bundles a safe version; validate it when upgrading. The final installation audit reported zero vulnerabilities, down from 37. No forced Next 16 upgrade was made.
- Linked this handoff prominently from README. The older README phase description is marked historical. Preserved the preceding review document.

Dependency references: [Tiptap maintainer advisory](https://github.com/ueberdosis/tiptap/security/advisories/GHSA-cp6q-959q-f8rh), [PostCSS advisory](https://github.com/advisories/GHSA-r28c-9q8g-f849). The complete advisory set was checked through npm audit; the links explain the editor update and scoped override.

## Verification

- `npm test`: **16 passed, 0 failed**. Tests execute the actual new migration against a synthetic PostgreSQL fixture, including anonymous/student/teacher reads, profile escalation attempts, hidden-group access, service-only RPC permissions, exact text and word limits, retry deduplication, revision ownership/uniqueness, rollback after a deliberately failed publication, locked published comments and atomic start of review.
- `npm run typecheck`: passed after dependency updates.
- `npm run lint`: passed after dependency updates. Next warns that its lint command will be removed in Next 16; migration to the ESLint CLI is deferred.
- `npm run build`: **passed** on Next 15.5.25, including compilation, lint/type checks, all 48 static pages and build traces. Only a webpack cache-size performance warning was emitted.
- `npm ls next postcss @tiptap/core @tiptap/react @tiptap/starter-kit --depth=1`: coherent Tiptap 3.31.3 dependencies and PostCSS override resolved successfully.
- Final dependency installation: audit reported **0 vulnerabilities** on September 8, 2026. This is a point-in-time dependency report, not proof that the application has no security issues.
- `git diff --check`: passed.

### Verification limits

PGlite runs PostgreSQL locally with synthetic accounts and a minimal `auth.uid()` fixture. It applies the core and teaching-example schema migrations, strips only the unavailable `pgcrypto` extension declaration (UUID generation is built in), simulates broad historic grants, then applies the new migration. This proves the exercised SQL/RLS behaviour, not the exact shape of the live database. Tests use one database connection, so true simultaneous multi-session lock behaviour still needs a PostgreSQL rehearsal.

No Docker/local Supabase stack or available Browser connection was present. Real reset-email delivery, PKCE cookies, login/logout, mounted React form recovery, keyboard/mobile presentation, and the Tiptap editor must be exercised in a protected preview. Do not claim end-to-end or visual verification. At the end of the initial implementation, no live SQL inventory, backups or advisors had run. The subsequent live inspection and application-backup rehearsal above supersede that limitation. Production migration/deployment and HTTP/API checks subsequently completed on September 9; see the release record above.

## Deployment checklist — completed steps and remaining checks

1. **Completed for application stabilisation:** Mark resumed the confirmed project; actual schema/access rules were inventoried and an application snapshot was exported and restored successfully. Full auth/platform backup is still outstanding for the later backend migration; see the scope limits above.
2. **Completed at inspection:** existing revision chains have no duplicate versions, missing roots or mismatched ownership. Recheck immediately before the live migration if new writing has arrived; preserve text and annotation anchors.
3. **Completed locally:** the exact new migration passed a private restoration of the actual schema/data and the synthetic suite. Live advisor findings were reviewed. A full Supabase/browser staging rehearsal remains outstanding. Never run a blanket `db push` or replay historical reset/seed migrations into a populated database.
4. **Completed September 9:** coordinated database/application release. For any future rehearsal, the release order is: apply **only** `20260909064353_workshop_stabilisation.sql` using the migration mechanism after inventory/rehearsal, then deploy this application revision. The new app requires its RPCs; the old app's direct writer inserts will be blocked by the migration, so keep this interval short and stop student writes during it. Switching the new reader pages before the policies exist would leave old broad database access in place.
5. **HTTP/API checks completed with temporary teacher and two writer accounts; browser/email-link checks remain:** verify sign-in, display-name change, reset email → callback → new password → sign-in, new submission, first comment, publish, writer feedback, revision and export. Use direct API requests to prove one student cannot read another's writing or change roles, or read unpublished feedback/hidden examples. Confirm the auth callback URL is allowed for the exact preview/production origin, including the reset `next` query. Check custom auth email templates if the existing project uses them.
6. Exercise offline/failed saves, refresh recovery, two tabs, storage denied/full, stale-group recovery, logout on a shared device, duplicate submission/publish requests, and simultaneous comment/publish/delete/revision attempts. Check teacher editor typing/paste/table/underline behaviour following the Tiptap update. Check new account/form flows on keyboard and mobile.
7. **Release recorded above.** Before a student pilot, complete the remaining browser and reset-email journey checks. Do not describe HTTP/API coverage as visual verification.

Rollback is coordinated: reverting only the frontend after this migration will restore code that attempts now-blocked direct inserts. Prefer a forward fix; if rollback is necessary, prepare a reviewed compatibility change or restore the backup during a write freeze. Retain and reconcile any work created after release. Do not remove the privacy/role protections just to make old code run.

## Intentional limits and next work

- This pass does **not** solve Supabase's inactivity pausing. The next phase is the Netlify Database/Identity rehearsal in the review, including real plan/credit checks, identity mapping and a tested data migration. Preserve the current PostgreSQL invariants when replacing Supabase-specific helpers.
- New submission/revision writes require the modern schema. Legacy reads/deletion remain for existing compatibility, but the old legacy creation fallback was removed rather than bypassing the new guarantees. Inventory production before release.
- Example access retains the existing rule: membership in **any** enabled group grants access. Since baseline membership is automatic, hiding an example from one class alone does not hide it from members of another enabled group. Mark must hide it from every relevant group if it should be unavailable to that writer. A different precedence model would be a product-policy change.
- Local recovery is a device convenience, not encrypted storage or cross-device backup. Keys are scoped by account; someone with device/browser access can inspect local storage. Copies expire when read and are cleared by the application's logout control; browser eviction, external sign-out or simply closing the browser have different behaviour. Downloads provide an independent copy.
- A revision whose save committed but whose response was lost may appear blocked after reloading the old source because the successor now exists. The recovery text remains downloadable and version history shows the successor. There is no automatic reconciliation of this recovered text with that saved successor yet.
- Notification delivery is best effort after commit, not a durable outbox. Retries suppress duplicate sends, but a process failure between commit and email can mean a missed notification; the saved work remains available in the studio.
- Baseline membership provisioning still runs during profile reads. Move this to idempotent onboarding in a later pass. Broader pagination/search and component splitting remain follow-ups.
- Preserve ink/parchment/serif styling. After the backend rehearsal, build one annotated park scene around “someone, somewhere, under pressure,” reusing teaching examples and annotations, linked to a real writing response. Do not expand into a large visual world before the basic student loop is proven.

## Repository release record

The source release is identified by the main-branch commit titled **“Stabilise private workshop, recovery and publishing”**, containing this handoff, application changes, migration, tests and verification scripts. Keep Git-based deployments on this revision or a compatible successor; reverting only the application to the older direct-insert implementation is incompatible with the new database policy. The verified manual deploy above remains an immutable reference even if Netlify subsequently publishes an identical Git-triggered build. Private backups, credentials, generated deployment bundles and test-account journals are excluded from the commit.

### Clean-checkout CI follow-up

The first pushed release commit (`0e33f66`) exposed two missing explicit result types in PostgreSQL test queries when GitHub ran a fresh typecheck. Follow-up commit `89ca33e` adds `{ status: string }` result types and stops tracking the generated `tsconfig.tsbuildinfo` cache. Application runtime code is unchanged. [GitHub CI run 34321493909](https://github.com/drmarkoconnor/shortstoryink_next/actions/runs/34321493909) passed installation, typecheck, all 16 tests, lint and build from a fresh checkout.

### Netlify automatic-build follow-up

Netlify built the application successfully for `89ca33e`, but its subsequent secret scan blocked publication because this handoff and two verification scripts contained the configured `SUPABASE_PROJECT_ID`. The verified manual production release stayed live. Commit `89bedf2` removes those hard-coded identifiers; both verification scripts now require the confirmed `SUPABASE_PROJECT_ID` in their environment and retain their project-mismatch checks. Set it from the linked project's configuration before running either script. Masked values from an environment export are unsuitable: confirm against the configured Supabase URL or project dashboard. Secret scanning remains fully enabled; no keys or paths have been exempted. The private snapshot rehearsal passed after this adjustment, and the Git-triggered production deployment and CI both succeeded, as recorded above. Automatic publishing is repaired.

This final documentation-only release record is committed with `[skip ci]` to preserve the verified deployment without rebuilding unchanged application code. See Netlify's [deploy-skipping documentation](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/). The next implementation phase remains the Netlify backend rehearsal; this release does not prevent Supabase inactivity pausing.
