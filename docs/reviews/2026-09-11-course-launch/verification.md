# Course and commonplace implementation — 11 September 2026

Implemented the approved first stage of the foundations review: a flexible course map, two complete illustrated/printable sessions, returning-student guidance, feedback expectations, a private writer commonplace and a revision-reflection entry point. The remaining ten course sessions are labelled as planned, not ready. Teachers have a direct preview entry in Teaching studio and their account menu.

Commonplace notes use the existing snippets table and owner-only row-level policies. All reads use the restricted authenticated client and an explicit owner filter. Server actions derive ownership from the verified session, validate lengths/tags/source links, and force private visibility. A stable note UUID allows retry without another row. Cross-owner conflict/update/delete attempts are denied by the database. Teacher previews do not expose writer capture actions. No schema migration is required.

The commonplace stores a passage or observation, source, optional source link, personal note and craft tag. It supports search, filtering, editing and confirmed deletion. Capture is available from the two lessons, authorised group handouts and published annotated examples. Revision notes are optional, private commonplace entries; they are separate from the submitted manuscript and can be revisited from the notebook.

Course companion links query current shared-document metadata at request time, using the same membership criterion as the existing writer handout reader. Historical snapshot documents were not overwritten. New course examples are original fictional miniatures, not reused student manuscripts.

## Completed verification

- 25 automated tests passed, including new commonplace validation and database owner/peer/teacher/anonymous isolation tests. The retry path and cross-owner upsert attempt were exercised against the real production baseline in local PGlite.
- Production Next build, TypeScript and ESLint passed; no temporary QA routes remain in the build.
- Desktop (1360 × 900) and phone (390 × 900) browser checks passed for course overview, both lessons, guidance and return pages; no horizontal overflow.
- Passage selection, source retention, saving, error retention, note editing, case-insensitive search, craft filtering, deletion confirmation and teacher lesson preview passed with synthetic persistence.
- Inspected screenshots and improved the phone search field so it takes a full row.
- Print-media captures checked; interactive controls are hidden and the close-reading observation has a dedicated print rendering.
- Existing writing, recovery, mock submission, revision and handout regression checks passed at 1487 and 390 widths. Changed regression captures are archived here without replacing historical review evidence.

## Limits and next live check

The Browser connection reported no available browser. Used the standalone local Playwright fallback previously authorised by Mark. Local component tests use synthetic data, not a live account. They do not demonstrate real cross-device persistence or email delivery. Database tests demonstrate the storage/privacy contract independently.

A consenting returning student still needs to receive a reset email and complete the live account → group materials → submission → published feedback → revision cycle before broad invitations. No reset emails, invitations or student-account changes were performed. An invitation draft and facilitator guidance are in launch-pack.md.
