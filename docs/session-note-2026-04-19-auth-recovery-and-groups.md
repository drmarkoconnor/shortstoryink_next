# Session Note — 19 April 2026

## Summary

This session focused on **recovery and stabilization**, not feature expansion.

The main goals were:

- restore reliable auth and app entry
- remove route/auth regressions caused by recent navigation changes
- restore the core submit -> review -> feedback loop
- simplify access so new users can use the app without teacher setup friction

Current outcome:

- new users are reaching the correct app area
- sign-in/sign-up flow is functioning again
- submit / review / feedback flow is functioning again
- the new group model with ABU baseline is in place and appears to be working

## Stabilization decisions made

### 1. `/app` route contract restored

The app had drifted into a mixed state where some pages lived at root routes
like `/writer` and `/teacher`, while redirects, nav, middleware, and auth
callbacks still expected `/app/...`.

Decision:

- restore `/app` as the canonical authenticated entry contract
- keep direct routes where useful, but treat `/app/...` as the stable main path

### 2. Supabase auth callback restored

The app was still generating `/auth/callback` links while the callback route had
been removed.

Decision:

- restore `/auth/callback`
- route sign-up confirmation back through `/auth/callback?next=/app`
- let successful password sign-in enter through `/app` and let server-side role
  logic route the user onward

### 3. Core submit / review / feedback pages restored

The following were restored as working routes:

- `/app/writer`
- `/app/writer/feedback`
- `/app/writer/feedback/[submissionId]`
- `/app/writer/revise/[submissionId]`
- `/app/teacher`
- `/app/teacher/review-desk`
- `/app/workshop/[submissionId]`
- `/app/teacher/archive`
- `/app/teacher-studio`

### 4. Account/profile feature kept non-blocking

The account UI remains secondary.

Decision:

- do not let account/profile UX block entry into the core app
- keep profile rows for role/access purposes
- avoid adding new account requirements during stabilization

## Access model decision: groups + ABU

The old membership flow required teacher action before a new writer could really
use the app.

That was judged to be unnecessary friction.

### New baseline model

- every non-teacher user should always have a baseline access group
- that baseline group is **ABU** = `Authorised Basic User`
- ABU is implemented as a real group/workshop record
- ABU membership is auto-created/ensured in code

### Practical effect

- new users no longer wait for manual teacher assignment before using the app
- teachers manage extra groups on top of the baseline
- ABU is always present and should not be removable from a user

### Teacher controls now in place

- create a new group
- add a writer to a group
- remove a writer from a non-ABU group
- view each writer’s current memberships
- delete writer accounts from the teacher screen

### Current limitation

Deletion is intentionally limited to **writer accounts** for now.

Teacher/admin deletion was not expanded during this session because it deserves
more careful handling around authored feedback, ownership, and safety.

## Language decision

The term **group** is closer to the intended concept than **workshop** when we
are talking about access/membership.

Decision:

- use **group** for access/membership UI
- keep **review** / editorial workflow language where that still makes sense
- do not rename database tables or internal implementation names yet

This keeps the UX clearer without taking on a risky data-model rename.

## What appears stable right now

Working or largely restored:

- landing page
- sign up
- sign in
- Supabase email confirmation path
- app entry through `/app`
- writer submit flow
- teacher review flow
- writer feedback flow
- baseline ABU access model
- teacher group management UI

## What has not been fully tested yet

Not all paths were exhaustively verified in live end-to-end use.

Areas still worth deliberate manual testing:

- forgot password flow
- teacher/admin role edge cases
- direct URL access to protected routes after stale sessions
- deletion edge cases for writers with mixed old/new schema data
- ABU behavior across old accounts and partially migrated accounts
- legacy-schema fallback behavior if older tables are still encountered

## Recommended next development areas

Tomorrow should focus on **actual product development**, not more auth churn,
unless testing reveals a concrete regression.

Suggested priorities:

### 1. Writer experience refinement

- make the writer home calmer and clearer
- improve empty states
- make group selection and submission status easier to understand

### 2. Teacher group management refinement

- better group/member overview
- clearer distinction between baseline ABU and optional groups
- safer delete-user UX with explicit confirmation language

### 3. Review workflow quality

- improve review desk usability
- refine inline feedback workflow
- tighten publish/update feedback behavior

### 4. Revision loop polish

- make version history easier to follow
- ensure writers clearly understand what draft version they are revising from

### 5. Product-shaping decisions

- define what groups actually mean pedagogically
- decide whether submissions should default into ABU or whether ABU is only an
  access baseline and named groups should become the real instructional spaces
- decide whether teacher review should eventually filter by group

## Guiding constraint for next session

Do not destabilize auth again unless a real bug requires it.

The next session should prefer:

- small product-facing improvements
- clearer UX
- better review and revision flow quality
- minimal schema churn

## Validation status at end of session

At the end of this session:

- build validation passed
- the app was behaving much better in manual use
- the user reported that:
  - new users are getting to the right place
  - submit / review / feedback is working
  - groups and ABU seem to be working

