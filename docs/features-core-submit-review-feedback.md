# shortstory.ink — Core Features List (Submit → Review → Feedback)

## Scope and source of truth

This document defines the **implementation feature list** for the first working
core loop:

> Submit → Review → Feedback → Reflect/Revise

Source inputs:

- `docs/product-brief.md` (governing product vision and priorities)
- `docs/migration-note.md` (Next.js + Supabase direction)
- `docs/teacher-area-roadmap.md` (teacher desk, reading workspace, and studio
  direction)
- Current Phase 1 app shell in `app/`

This list intentionally excludes Eleventy-era implementation assumptions.

## Authentication policy (decision)

- Default sign-in method should be **email + password** for established
  accounts.

- Middleware/session handling in `lib/supabase/middleware.ts` is auth-method
  agnostic and should remain unchanged.

## Core user roles for this phase

- **Writer**: submits work, receives feedback, views revision history.
- **Teacher**: reviews submissions, leaves inline and summary feedback, controls
  review visibility.
- (Optional later) **Peer reviewer** under teacher-controlled permissions.

## Core workflow surfaces (must ship first)

1. Writer submission surface (`/app/writer`)
2. Teacher review queue (`/app/teacher`)
3. Teacher review detail with inline feedback (`/app/workshop/[submissionId]`)
4. Writer feedback view (`/app/writer/feedback`)
5. Minimal status trail for submission lifecycle

## Feature list by workflow step

### A) Submit (Writer)

- Create submission with title + body text (rich text optional later).
- Save submission with status `submitted`.
- Associate submission with writer, workshop/cohort, and created timestamp.
- Show writer confirmation and current status.

### B) Review queue (Teacher)

- List submissions awaiting review.
- Sort by submitted date (oldest first by default).
- Basic filters: cohort/workshop, status.
- Open submission detail from queue.

### C) Review detail (Teacher)

- Read full submission in a calm typography-first layout.
- Add inline comments anchored to text ranges.
- Add summary feedback block.
- Mark review state (e.g., `in_review`, `feedback_published`).
- Publish feedback to writer.

### D) Feedback view (Writer)

- View inline comments in context of original text.
- View summary feedback.
- See publish timestamp and reviewer identity.
- Option to start revision/resubmission (stub allowed in first cut).

### E) Revision loop (minimum viable)

- Resubmission creates a new version linked to original submission.
- Preserve prior feedback history by version.
- Teacher can distinguish latest version from earlier drafts.

## Data contract (Supabase-aligned, minimal)

Minimum entities required:

- `profiles` (id, role)
- `workshops` / `cohorts` (lightweight)
- `submissions` (id, author_id, workshop_id, title, body, status, version,
  created_at)
- `feedback_threads` or `feedback_items` (submission_id, anchor, comment,
  author_id, created_at)
- `feedback_summaries` (submission_id, summary, author_id, published_at)

### Inline anchor contract (locked)

Inline feedback anchors should use a **selection-range JSON shape** tied to a
block/paragraph identifier:

- `blockId` (string)
- `startOffset` (number)
- `endOffset` (number)
- `quote` (string)
- optional context strings for resilience (`prefix`, `suffix`)

This range model is now the default for first-pass implementation.

Notes:

- Keep model minimal for first release.
- Preserve ownership and privacy rules from `docs/product-brief.md`.

## UX constraints to preserve

- Dark-mode-first, literary, restrained interface.
- No generic SaaS dashboard clutter.
- Inline feedback is central; detached comments are secondary.
- Workshop core is prioritized over broader feature sprawl.

## Locked prototype decisions (15 April 2026)

These are now treated as **approved UI direction** for the app shell and teacher
workspace prototypes.

- **Visual language is locked**: current typography, color palette, spacing
  density, and literary styling direction are approved.
- **Review desk layout is locked**:
  - wider central reading lane,
  - compact comment popout above the reading panel,
  - queue + tools in left rail.
- **Review detail route shape is locked**:
  - queue items open into `/app/workshop/[submissionId]`,
  - this route is the canonical inline review detail surface.
- **Snippets desk is locked as-is** (commonplace / craft snippet workflow).
- **Resources desk is intentionally different from snippets** and should be
  implemented as a **Finder-style media library**:
  - left panel = category/filter rail of resource links,
  - resource types include: YouTube shorts/videos, PDFs, Word docs, published
    story links, and general website links,
  - open behavior supports both in-app preview where feasible and external
    reader/site handoff when needed.
- Category management (add/rename/delete with safe fallback category) remains a
  useful teacher tool in both snippets and resources.

### UX follow-up note (review detail)

- Revisit right-hand feedback panel behavior for reading mode:
  - allow panel collapse/hide when user wants uninterrupted reading,
  - allow quick reveal/pop-out when user wants full comment list context.

### Resource open-mode policy

For implementation planning, use this simple rule set:

- **In-app preview preferred** for text/web content and embeddable PDFs.
- **External handoff** for unsupported or restricted media (or when embedding is
  blocked).
- Always preserve the original source URL and attribution metadata.

## Out of scope (defer)

- Writer snippet/commonplace full system implementation.
- Deep third-party API integrations for external media providers.
- Multi-teacher marketplace.
- Open peer feedback by default.

## Implementation order (next execution plan)

1. Replace sign-in default with email+password form + server action.
2. Build writer submission create/list surface.
3. Build teacher queue and review detail.
4. Build writer feedback view.
5. Add versioned resubmission linkage.

## Stratified core-flow build plan (execution layers)

The team should now execute the core loop in layers so each stage is testable
and shippable.

### Layer 0 — Foundation (already established)

- Next.js App Router + Tailwind + Supabase wiring.
- Session middleware and protected app shell.
- Prototype UI language baseline.

### Layer 1 — Domain + auth baseline (first active build layer)

- Finalize email/password-first authentication UX.
- Add/confirm minimal DB schema and RLS policies for: `profiles`, `workshops`,
  `submissions`, `feedback_items`, `feedback_summaries`.
- Define status enum lifecycle: `submitted` → `in_review` →
  `feedback_published`.

### Layer 2 — Writer submit flow

- Writer can create submission (title/body/workshop).
- Writer sees status and timestamp in writer dashboard.
- Submission ownership and access controls validated.

### Layer 3 — Teacher queue + review detail

- Teacher queue lists pending work with status filters.
- Teacher opens submission detail and adds inline + summary feedback.
- Teacher can publish feedback state transition.

### Layer 4 — Writer feedback consumption

- Writer sees inline comments in context and summary block.
- Writer sees publish metadata (when/by whom).
- Writer can begin a revision from the feedback screen.

### Layer 5 — Revision/versioning

- Resubmission creates linked new version.
- Previous versions and feedback remain visible in history.
- Teacher view defaults to latest version while preserving access to prior
  drafts.

### Exit criteria to move beyond core loop

- Core loop acceptance criteria (below) pass end-to-end in one workshop cohort.
- Critical auth/data privacy checks pass.
- Feedback publish and revision history paths are stable.

## Acceptance criteria for “core loop working”

- A writer can sign in, submit text, and see submitted status.
- A teacher can open the submission, add inline + summary feedback, and publish.
- The writer can see published feedback in context.
- A revised version can be resubmitted while preserving prior version history.
