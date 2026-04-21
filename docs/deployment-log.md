# Deployment Log

## 20 April 2026 — Recovery And Reading-Feedback Milestone

### Local git status

- milestone branch committed from `recovery-email-debug`
- merged locally into `main`
- fresh follow-on branch created: `roadmap-next`

### Key local commits

- `0e8cf38` — `Stabilize auth and build reading feedback workflow`
- merge commit on `main` — `Merge recovery and reading-feedback milestone`

### Scope included in this milestone

- auth and `/app` route recovery
- restored submit -> review -> feedback core flow
- ABU baseline access model and group management
- teacher review workspace recovery and polish
- writer feedback workspace recovery and polish
- snippet persistence and teacher-side save flow
- Teacher Studio snippet desk
- snippet categories
- feedback/craft categories
- first export route and subsequent student-facing annotated export revision
- initial paged/chunked reading groundwork

### Database migrations added in this milestone

- `supabase/migrations/20260419_snippets_foundation.sql`
- `supabase/migrations/20260420_snippet_categories.sql`
- `supabase/migrations/20260420_feedback_categories.sql`

### Important deployment note

Local repository state is ahead of `origin/main`, but remote push was blocked by
machine-level GitHub authentication issues.

To complete deployment from this machine:

1. Re-authenticate GitHub:
   - `gh auth login -h github.com`
2. Push `main`:
   - `git checkout main`
   - `git push origin main`
3. Optionally push the next development branch:
   - `git checkout roadmap-next`
   - `git push -u origin roadmap-next`

### Product notes carried forward

- paged reading is promising, but stable desktop folio height is still needed to
  remove jumpy page-height changes
- snippets are teacher curation material and are no longer intended for student
  export packets
- export is now student-facing and should continue to prioritize manuscript +
  teacher annotation clarity over platform complexity

## 21 April 2026 — Reading Frame Pass And Category Cleanup

- stable paged reading is approved for this version/pass after reducing folio
  jumping and tuning chunk size, but should receive further attention once the
  rest of the app settles
- feedback category "tone" was an unnecessary development concept; it should not
  remain part of the product model and has been removed from the current schema
  path
