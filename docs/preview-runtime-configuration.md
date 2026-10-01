# Projects preview availability and the 404 regression

## Cause and deployment boundary

`projectsEnabled()` formerly depended on either a runtime `WRITER_PROJECTS_ENABLED` or Netlify's `CONTEXT=deploy-preview`. The latter is a build-time context, not guaranteed in a deployed Next.js server function. A successful build could therefore serve a disabled Projects API (404) and hide the Projects page/navigation at runtime.

Setting an environment variable also requires a new deploy. Do not equate a green build or a configuration-tool acknowledgement with a working route.

## Fix

`next.config.ts` resolves and compiles only two non-secret switches into the build:

- `WRITER_PROJECTS_ENABLED`: explicit false always disables; explicit true enables; otherwise only deploy-preview enables it. Production remains disabled without explicit approval.
- `STUDIO_SUPPRESS_EMAIL`: true in non-production Netlify builds or when explicitly requested. A preview must not email real writers even when CONTEXT is absent from the runtime.

This keeps server pages, navigation and the API on the same deployment-specific setting. No passwords, tokens, database URLs or other environment variables are exposed. Changing either switch requires a new deploy. The switches do not bypass authentication, writer role checks or manuscript ownership.

## Verification

`tests/deployment-flags.test.ts` evaluates the actual Next config in isolated processes for preview, production, explicit disable, branch deploy and email suppression.

`projects-preview-smoke.yml` waits for the exact PR head's Netlify success and then makes read-only unauthenticated requests to that PR's actual preview. The Projects API must return its own JSON 401 (enabled but authentication required), not 404; the page must redirect to the preview sign-in, which must return 200. No real user, login token, manuscript, database write or email is involved.

This deployed check is deliberately narrower than the outstanding real Identity-authenticated save/export rehearsal. Independent encrypted-backup restoration is still a separate release gate. Do not merge the pilot merely because availability is fixed.

References checked 30 September 2026:
- https://docs.netlify.com/build/functions/environment-variables/
- https://nextjs.org/docs/pages/api-reference/config/next-config-js/env
