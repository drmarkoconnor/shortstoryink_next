# shortstory.ink v1.1 release checklist

Use this after CI and the Netlify Deploy Preview are green and before merging the v1.1 studio simplification to production.

## Automated gate

- Typecheck passes.
- Regression tests pass.
- Lint passes.
- Production build passes.
- Netlify Deploy Preview is `ready`.

## Writer rehearsal

- Sign in with a real invited writer account.
- Writer navigation is: Writing, Feedback, Reading, Commonplace.
- No course link or course promotion is visible to the writer.
- Direct `/app/course` access returns the writer to Writing.
- The submission selector defaults to the writer's real writing group when they belong to one, rather than ABU.
- Existing draft recovery still works.
- A test piece can be submitted once without duplication.
- Waiting / in review / feedback-ready counts make sense.
- Published feedback opens beside the manuscript.
- Create a fresh editor comment on a selected whole word, publish it, and confirm the first selected character remains highlighted when the writer revisits it.
- Check one previously affected legacy comment and confirm the one-character display drift is repaired without altering manuscript text.
- A revision can be created without overwriting the earlier version.

## Editor rehearsal

- Sign in with the editor account.
- Editorial desk loads the real queue.
- A submitted piece opens in the reading workspace.
- The live review layout gives useful space to Marginalia rather than a narrow stack of secondary tools.
- Highlight-to-comment works.
- Draft comments remain private until publish.
- Publishing returns cleanly to the Editorial desk.
- Open **Comments and writer examples** and remove a disposable/test comment from reusable memory.
- Confirm removing a comment from memory does **not** remove the published feedback from the writer's manuscript.
- Editorial studio still retains course material as material in development.

## Privacy and data safety

- Writer A cannot read Writer B's manuscript or feedback.
- Writer routes do not expose the course.
- Editor-only routes remain editor-only.
- No schema, role or Netlify Identity changes were introduced unless explicitly planned.
- Manuscript text and paragraph identity remain unchanged; legacy anchor repair is display-only.

## Visual check

- Public home is clearly invitation-led rather than course-led.
- Dark room / warm paper hierarchy remains readable on desktop.
- Writing, Feedback, Reading and Commonplace are visually distinguishable without heavy colour coding.
- Editor workspace remains manuscript-centred.
- Check one phone/tablet viewport before production release.
- Record further visual refinement separately; do not hold the core workflow release for a later style-comparison exercise unless readability or navigation is impaired.

## Production check

- Merge only after the preview rehearsal succeeds.
- Confirm the production deployment is `ready`.
- Open `/` and `/auth/sign-in` on production.
- Run one read-only sign-in check if authentication code changed.
- Do not alter Netlify billing, automatic credit purchase settings, production database branches or the frozen Supabase rollback source as part of routine product work.
