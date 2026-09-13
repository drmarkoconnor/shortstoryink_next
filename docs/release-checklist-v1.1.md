# shortstory.ink v1.1 release checklist

Use this before merging or promoting a significant writer/editor experience change.

## Automated gate

- Typecheck passes.
- Workshop regression tests pass.
- Lint passes.
- Production build passes.
- Netlify Deploy Preview is `ready`.

## Writer rehearsal

- Sign in with an existing writer account.
- Writer navigation is: Writing, Feedback, Reading, Commonplace.
- No course link or course promotion is visible to the writer.
- Direct `/app/course` access returns the writer to Writing.
- Existing draft recovery still works.
- A test piece can be submitted once without duplication.
- Waiting / in review / feedback-ready counts make sense.
- Published feedback opens beside the manuscript.
- A revision can be created without overwriting the earlier version.

## Editor rehearsal

- Sign in with an editor account.
- Editorial desk loads the real queue.
- A submitted piece opens in the reading workspace.
- Highlight-to-comment works.
- Draft comments remain private until publish.
- Publishing returns cleanly to the Editorial desk.
- Writer sees only published feedback.

## Privacy and data safety

- Writer A cannot read Writer B's manuscript or feedback.
- No schema, role or Netlify Identity changes were introduced unless explicitly planned.
- Manuscript text, paragraph identity and annotation offsets remain unchanged.

## Visual check

- Public home is clearly invitation-led rather than course-led.
- Dark room / warm paper hierarchy remains readable on desktop.
- Writing, Feedback, Reading and Commonplace are visually distinguishable without heavy colour coding.
- Editor workspace remains manuscript-centred.
- Check one phone/tablet viewport before production release.

## Production check

- Merge only after the preview rehearsal succeeds.
- Confirm the production deployment is `ready`.
- Open `/` and `/auth/sign-in` on production.
- Run one read-only sign-in check if authentication code changed.
- Do not alter Netlify billing, automatic credit purchase settings, production database branches or the frozen Supabase rollback source as part of routine product work.
