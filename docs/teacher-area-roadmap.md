# Teacher Area Roadmap

## Status

Foundational product document

## Purpose

This document defines the intended long-term direction of the teacher area in
shortstory.ink. It should be treated as a foundational reference for future UI,
workflow, data-model, and ticket decisions.

The teacher side is not a generic dashboard. It is a calm editorial studio:
first for close reading and feedback, then for building reusable teaching
knowledge from that work.

---

## Core product philosophy

The teacher area exists so that a teacher can:

- read student work comfortably and closely
- respond quickly and intelligently with minimal friction
- highlight passages and attach comments as they read
- optionally categorise comments and snippets, without being forced to do so
  during capture
- collect reusable snippets and examples from student work and external
  materials
- turn those materials into reusable teaching resources
- build a searchable, sortable, retrievable teaching library over time

### Governing principle

The teacher side should feel like a **teacher studio with a queue at the
front**, not a generic admin dashboard.

---

## Primary design principle

### Fast capture first, organisation second

While reading, the teacher must be able to create comments and snippets quickly,
with minimal interruption.

Categorisation should be optional at capture time.

If no category is chosen, the item should default to:

- `Uncategorised`

This is a deliberate product choice. It preserves reading flow and avoids
forcing premature structure.

Later, the teacher should be able to:

- categorise
- re-categorise
- tag
- sort
- filter
- archive
- reuse

---

## Top-level teacher-area model

The teacher area should develop around three linked layers:

### 1. Desk

The immediate working surface for what needs attention now.

This includes:

- drafts waiting for review
- oldest waiting draft
- drafts in progress
- unpublished feedback drafts
- version/revision warnings
- lightweight group filtering where useful

The Desk should not become a bloated dashboard.

It should feel like a compact editorial desk with a clear next action.

### 2. Reading Workspace

The manuscript-centred area for close reading and response.

This includes:

- manuscript as the visual centre
- quick highlight-to-comment flow
- comment creation with optional categorisation
- snippet capture with optional categorisation
- private draft comments before publication
- final feedback composed from overview + selected anchored comments
- version awareness when newer revisions exist

The workspace must support close, serious reading with minimal mouse movement
and minimal interface clutter.

### 3. Studio / Library

The knowledge-building area for reusable teaching material.

This includes:

- teacher-owned snippets
- imported source material
- notes
- documents
- saved resources
- searchable collections
- archive and retrieval functions

This is where teaching knowledge accumulates over time.

---

## Object definitions

Clear definitions are essential. The teacher area should distinguish the
following objects:

### Comment

A response attached to student text, primarily for that student’s improvement.

Typical properties:

- anchored to a manuscript passage
- may be private before publish
- may be published later
- may be optionally categorised
- defaults to `Uncategorised` if no category is chosen
- may later contribute to reusable comment patterns

### Snippet

A reusable example or extract kept by the teacher for teaching, illustration,
inspiration, or reference.

Typical properties:

- teacher-owned
- searchable
- filterable
- taggable
- categorisable
- defaults to `Uncategorised` if no category is chosen
- may come from student work or imported source material
- independent of the student feedback flow once saved as a snippet
- reusable across documents, groups, and teaching contexts

### Note

A private teacher working artefact used for synthesis, reflection, or
organisation.

Typical properties:

- private by default
- more freeform than a comment
- may collect snippets or thoughts
- may later be promoted into a document

### Document

A composed output built for a specific teaching purpose.

Examples:

- workshop handout
- themed anthology
- internal teacher note pack
- teaching resource
- cohort-specific material
- newsletter content

Documents should support saving, sorting, retrieving, archiving, and reuse.

---

## Teacher workflow model

### A. Draft response workflow

The teacher should be able to:

1. open the next draft waiting for attention
2. read and annotate as they go
3. highlight passages quickly
4. create comments with minimal friction
5. save selected passages as snippets
6. optionally leave comments/snippets uncategorised during first capture
7. add a short overall overview
8. publish feedback

### B. Pedagogical synthesis workflow

The teacher should also be able to:

1. collect snippets from student drafts
2. bring in external material from open-source APIs or local files
3. save excerpts as teacher-owned snippets
4. search/filter snippets by text, tag, category, source, or theme
5. drag snippets into notes or documents
6. build workshop handouts, internal notes, or teaching resources
7. archive and retrieve materials over time

---

## Versioning principles

Version handling must be explicit and calm.

### Key rules

- the teacher should normally see the latest version by default
- if current comments refer to an older version, the UI should say so clearly
- useful comments should be partially migratable forward
- a new feedback layer should be possible for each new version
- prior feedback context should remain visible where useful
- if a writer uploads a newer version before an earlier one has been
  reviewed/published, the earlier version may be deletable as effectively
  superseded draft material

### Desired future capabilities

- re-read latest draft with earlier comments visible
- selectively carry useful comments forward
- mark prior comments resolved
- build a new feedback layer on the latest version

---

## Information architecture recommendation

The teacher area should move toward this top-level structure:

- **Desk**
- **Studio**
- **Groups**

Possible later addition if needed:

- **Library**

### Desk

Queue-led, action-led, compact, immediate.

### Studio

Snippets, notes, imported materials, documents, reusable resources.

### Groups

Cohorts, assignments, group-based filtering, teacher/student organisation.

This is preferable to a single overloaded “teacher home” page.

---

## What should be de-emphasised on the main surface

The teacher area should not foreground:

- access management
- generic admin controls
- metadata overload
- settings-heavy interfaces

These can be collapsed, moved lower, or tucked into secondary surfaces.

Group management remains important, but should not dominate the main
reading-and-response flow.

---

## Product direction: long-term stance

The teacher side should help the teacher become better over time by
accumulating:

- recurring craft patterns
- favourite comments
- recurring issues
- reusable examples
- personal editorial language
- teaching resources

This is a major differentiator for the product.

The app should not only help teachers respond to individual drafts. It should
help them build a living teaching practice.

---

## Phased roadmap

## Phase 1 — Teacher desk and reading loop

Goal: make the core draft-feedback workflow clean, fast, and obvious.

Includes:

- desk queue clarity
- waiting / in review / published states
- oldest waiting surfaced
- drafts in progress surfaced
- unpublished feedback drafts surfaced
- version indicators improved
- warning when newer revision exists
- manuscript-centred reading workspace
- quick highlight → comment flow
- quick highlight → snippet flow
- optional categorisation with default `Uncategorised`
- publish model based on overview + selected anchored comments

## Phase 2 — Snippets as first-class teacher objects

Goal: make snippets genuinely useful and reusable.

Includes:

- snippet object redesign
- independent teacher-owned snippets
- search/filter/tag/category
- scrollable snippet list
- quick snippet capture during reading
- annotate snippet independently
- drag snippet into note/document/comment
- save to collections/themes

## Phase 3 — Teacher studio and document creation

Goal: support synthesis and resource-building.

Includes:

- teacher notes
- note creation from snippets
- document builder
- workshop handouts
- anthologies of examples
- internal teaching resources
- saved and retrievable documents
- archive and library functions

## Phase 4 — Imported materials and pedagogical memory

Goal: connect outside material and build long-term teaching intelligence.

Includes:

- import from open-source APIs
- import from local files where supported
- save excerpts/snippets from imported material
- reusable comment bank
- favourite comments
- recurring craft issue tracking
- reusable example collections
- richer library/retrieval systems

---

## Recommended next tickets

### Ticket 1

**Teacher Desk: queue and status clarity**

Focus:

- waiting / in review / published clarity
- oldest waiting surfaced
- drafts in progress surfaced
- unpublished feedback drafts surfaced
- version/revision warnings

### Ticket 2

**Reading Workspace: highlight-to-comment and highlight-to-snippet flow**

Focus:

- minimal mouse movement
- fast passage selection
- instant comment/snippet creation
- optional categorisation
- default to `Uncategorised`

### Ticket 3

**Reading Workspace: publish staging model**

Focus:

- draft/private comments
- overall overview field
- selected anchored comments
- staged publish flow
- clear teacher mental model of draft vs published feedback

### Ticket 4

**Snippet model redesign**

Focus:

- teacher-owned snippet object
- searchable/filterable/taggable
- independent from manuscript version
- snippet CRUD
- scrollable snippet toolbox

### Ticket 5

**Snippet toolbox and document seeding**

Focus:

- drag snippet into note/document/comment
- create new note/document from snippet
- library-style retrieval
- searchable collections

---

## Working rules for future tickets

When making teacher-area decisions, prefer:

- calm over busy
- manuscript-centred over dashboard-heavy
- fast capture over mandatory structure
- optional organisation over forced classification
- reusable teaching knowledge over disposable UI gestures
- incremental delivery over speculative overbuilding

When in doubt, ask:

1. Does this help the teacher read and respond more fluently?
2. Does this help the teacher build reusable knowledge from the work?
3. Does this preserve a calm editorial atmosphere?

If the answer to all three is no, the feature is probably not core.

---

## Implementation note

This document should be treated as foundational and consulted before:

- teacher UI redesigns
- snippet/data-model changes
- document-builder work
- library/import features
- role/workspace restructuring

It should also be cross-referenced from any broader app architecture or
product-roadmap docs.
