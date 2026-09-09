# Supabase exit — Netlify migration handoff

## Current decision

On September 9 Mark clarified that the main objective is to remove the Supabase dependency, including its manual inactivity restoration. He authorised migration if technically possible and desirable on cost. The preceding stabilisation release is complete; it was not the requested backend replacement. Explain this distinction plainly and do not treat further stabilisation work as fulfilling the migration.

**Technical answer: yes.** Netlify Database can replace PostgreSQL hosting; Netlify Identity can replace sign-in. The application must also replace Supabase's query API and authentication integration. Netlify's database wakes automatically on a query after idle sleep, addressing the original operational frustration.

**New prerequisite: the existing team is on a legacy Free plan, not a database-eligible credit plan.** No hosting plan, database, authentication service or live application has been changed during this migration assessment. No paid subscription is authorised yet. The latest production release remains the Supabase-backed stabilisation recorded in [the preceding handoff](handoff-workshop-stabilisation-2026-09-08.md).

## Account evidence, September 9

Read-only Netlify MCP and CLI calls confirmed:

- One accessible team: `drmarkoconnor`, ID `604dff94a9112e607f4fa007`; Mark is Owner.
- Account type `free-is-free`, created in 2021; `credit_features.included=false`.
- `listAccountTypesForUser` returns `credit-free` with `available=false`, `credit-personal` with `available=true`, and `credit-pro` with `available=true`. A second Free team is therefore not offered through the current account API. Do not claim the API result rules out converting the existing team through Netlify's billing UI.
- The existing team's older allowances include 100 GiB bandwidth and 300 build minutes. Capability `used` counters were not treated as measured traffic or billing usage.
- Target site remains **storyink**, ID `d8bc3715-124c-43a2-846d-009b995bb694`, https://shortstory.ink. Do not target the older similarly named site.

Private API responses are under `.local-backups/2026-09-09-pre-deploy/`: `migration-account.private.json` and `migration-plans.private.json`. They may contain credentials or billing details: never print, publish or commit them. The repository documents no Supabase project ref because Netlify scans its configured value.

## Cost recommendation and unresolved choice

Recommend a separate **Personal** team dedicated to this writing site if Mark accepts **US$9/month**, before applicable taxes. It supplies 1,000 shared monthly credits and includes Identity. Keep automatic credit purchases disabled unless explicitly authorised. This preserves the legacy plan for the other sites. Netlify's account API offers Personal, but checkout/payment requirements and successful team creation still need verification.

For comparison, Supabase Pro starts at US$25/month. A new subscription is not a saving against the current US$0 Supabase Free plan; the benefit is removing manual restoration with a lower starting subscription than Supabase Pro. Migration engineering and ongoing maintenance are separate costs. Sources: [Netlify pricing](https://www.netlify.com/pricing/), [Supabase pricing](https://supabase.com/pricing), [Identity pricing](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/plans-and-pricing/).

Illustrative database compute at minimum scale is 10 credits per active database hour, including idle time before sleep. Twenty active hours would consume 200 credits, leaving 800 of Personal's allowance for deployment, hosting, further database activity and other meters. This is arithmetic, not a forecast from measured class usage. Limit database scale to one unit initially and retain five-minute idle sleep; avoid polling and database writes on every keystroke. Production deployments consume credits too, so use previews for rehearsal.

Storage pricing remains unclear in the current public database billing page: it still references July 1, 2026 although this review is in September. Do not promise a complete fixed monthly bill without checking checkout/usage meters. With auto recharge off, credit exhaustion can pause the destination site's service. Sources: [Database billing](https://docs.netlify.com/build/data-and-storage/netlify-database/billing-and-usage/), [automatic sleep and wake](https://docs.netlify.com/build/data-and-storage/netlify-database/configure-sleep-on-inactivity/), [credit limits](https://docs.netlify.com/manage/accounts-and-billing/billing/resume-paused-projects/).

Converting the whole existing team to credit-based Free may avoid a subscription, if the billing UI offers it. It also permanently changes the allowances for every site and pools their credit consumption. **Do not silently convert the whole team.** Netlify also says a site transferred to a credit-based team cannot be transferred back to a legacy team. This hosting-plan restriction is separate from an application-data rollback. Source: [Netlify's irreversible plan/transfer rules](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-legacy-plans/billing-faq-for-legacy-plans/).

The next input needed is Mark's acceptance of the separate US$9/month Personal destination, or a different explicit plan choice. This is a newly discovered billing/irreversibility decision, not a SKILL.md approval requirement and not a request to re-authorise the migration itself.

## Implementation scope once the destination is settled

The source inventory finds 45 application/library/component/middleware files referencing the Supabase integration. Most database access is server-side. Browser authentication appears in sign-in, sign-up, password settings and logout; server authentication also covers callback/session refresh, account administration, writer lookup and publication notifications.

| Current integration | Replacement |
| --- | --- |
| Supabase PostgreSQL and PostgREST query builders | `@netlify/database` with parameterised SQL and explicit server data operations |
| Supabase browser/server auth and middleware | `@netlify/identity`, verified server identity and tested Next.js cookie/session handling |
| Supabase account UUIDs referenced by application rows | Preserve application UUIDs; map independently verified Netlify identities to them |
| Supabase `auth.uid()` / database role context | Restricted runtime role and transaction-scoped verified user context, with adapted RLS; never grant browser SQL access |
| Service-only submission/publication RPCs | Preserve atomic locks, permissions, idempotency, revision uniqueness and exact manuscript text |
| Auth-admin email lookups and user deletion | Verified identity mapping and Netlify administration; retain Resend for workshop notification delivery |

Use a migration branch and protected previews. A database package installation/deploy can provision a database automatically; do not add it to production main before the destination is selected. Netlify requires `@netlify/database`; use its pool for transaction-scoped access. Read package APIs before implementation, including real Identity SSR/admin support. Read Netlify coding context again if platform behaviour changes.

Build a clean baseline from the actual live schema, incorporating the applied stabilisation migration. Do not replay historic destructive Supabase reset/seed scripts. The earlier private export contains application rows and auth identity mapping, not auth password/session backups. Password portability is unproven: investigate supported import before deciding on a reset process. Never grant ownership by an unverified email claim. Do not send bulk invites or reset messages without explicit authorisation.

Preserve all 16 application tables, profiles, writing, annotation offsets, feedback, teaching library and memberships. The preceding verification recorded 35 auth accounts, 6 profiles and 21 submissions; refresh the snapshot before migration because this is a live site. There were no storage objects at the preceding inspection.

Acceptance requires synthetic teacher/writer/peer accounts, a complete sign-in → submit → annotate → publish → revise → export loop, account and reset journeys, negative privacy tests, actual PostgreSQL concurrent-write checks, idle wake-up and measured database activity. First test synthetic data; then restore the private snapshot into the protected destination and compare every original row count and content hash. Do not claim browser verification until a Browser connection is available.

For final cutover: establish a short write freeze, take a fresh snapshot, import and verify, switch the application, then verify live access and writes. Retain Supabase as an untouched rollback source temporarily; completion means the running site has no calls to Supabase, not merely that the tables were copied. Reconcile any new destination writes before an application rollback. Preserve the existing elegant interface throughout; the imaginative park scene remains later work.

Netlify's [migration guide](https://docs.netlify.com/build/data-and-storage/netlify-database/switch-to-netlify-database/) provides the platform sequence. The application-specific privacy and write-freeze requirements above remain necessary.
