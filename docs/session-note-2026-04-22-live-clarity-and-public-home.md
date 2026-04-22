# Session Note — 22 April 2026

## Product decisions confirmed

- shortstory.ink is a calm, teacher-led close-reading and writing studio.
- The immediate product priority is live-app trust and clarity before deeper
  teacher-studio architecture.
- Readability comes before dark-theme subtlety.
- Public onboarding is now **sign-up only from an approved/authenticated email
  address**.
- The earlier Try Writing / magic-link entry route should no longer be treated
  as current public onboarding.
- The `/try-writing` route has now been retired from the app code. Public
  onboarding should remain sign-up only.

## Ticket completed in this session

### Global Readability And Contrast Pass

Implemented as a shared visual-system pass:

- brighter silver text scale in `tailwind.config.ts`
- stronger `.surface` panel contrast in `app/globals.css`
- `.muted` moved to a more legible supporting text colour
- body text-shadow removed
- shared cards, tabs, buttons, and app header made clearer
- teacher review and writer feedback side rails made more readable
- generic account styling brought closer to the app's visual language

Manuscript/folio behaviour, pagination, comments, snippets, and export logic
were intentionally not changed.

Validation during the session:

- `npm run lint` passed
- `npm run build` passed
- `npm run typecheck` passed
- `git diff --check` passed

## Ticket started in this session

### Public Landing Page V1

Implemented a first stronger homepage at `/`:

- warm, British, teacherly language
- public explanation of close reading, anchored feedback, and revision
  continuity
- hero image using `assets/images/piltopen.jpg`
- top-right sign-in button
- bottom sign-up call to action

Corrections made after review:

- removed the obsolete Try Writing link from the homepage
- removed hero buttons for `Request your place` and `Return to your work`
- removed extra explanatory CTA copy under the hero
- changed bottom CTA text to simply `Sign up`
- made the pen image more visible while keeping it subtle
- replaced a fragile arbitrary Tailwind gradient with standard Tailwind layers
  after the page appeared partly unstyled locally

## Runtime issue resolved

The dev server produced:

```text
Cannot find module './331.js'
```

This was treated as stale/corrupted `.next` generated output after Fast Refresh
or build churn. The fix was:

- stop the running dev server on port 3000
- remove `.next`
- restart `npm run dev`

After that:

- `/` returned 200
- `/auth/sign-in` returned 200
- `/auth/sign-up` returned 200

The dev server was stopped at the end of the session.

## Important repo-state caution

There is unrelated image asset churn in the working tree:

- old nested `assets/images/...` files show as deleted
- new flat image files show as untracked

This appears to be an asset reorganisation and should be handled deliberately
before commit/deploy. The new homepage currently imports:

- `assets/images/piltopen.jpg`

So any deploy/commit that includes the homepage must also include the intended
image asset state.

## Follow-up retirement pass

After this note was first written, the obsolete Try Writing path was removed
from active app code:

- `/try-writing` route removed
- `/auth/complete-trial` routes removed
- Try Writing panel component removed
- Try Writing workshop helpers removed
- feedback notification emails no longer generate magic links
- teacher review/export labels no longer surface `try_writing`

The homepage image was regularised to the flat asset path:

- `assets/images/piltopen.jpg`

The image was resized for web use and made slightly more visible in the hero.

## Current next likely tickets

1. Finish reviewing/committing the asset cleanup so the homepage asset path is
   stable in git.
2. Writer landing page adjustments.
3. Continue public explanatory pages:
   - how it works
   - for writers
   - for teachers
   - privacy/data
   - contact
   - FAQ
4. Reframe teacher home so it reads as a teacher dashboard/studio first and
   admin/access management second.

## Standing product constraints carried forward

- Keep the manuscript/folio experience central.
- Keep teacher tools private for now.
- Teacher Studio is core product, not admin.
- Teacher-created/imported texts are a future separate content type, not student
  submissions.
- Text excerpts and teaching-response snippets are separate future snippet
  families.
- Avoid broad admin/platform complexity until the close-reading loop is excellent.
