# Export Feedback Packet Roadmap

## Status

Foundational product and technical roadmap document.

## Purpose

This document defines the direction for writer-facing export output in
shortstory.ink, with an initial focus on PDF-style feedback packets generated
from the existing feedback publishing flow.

It should guide later design, data-model, rendering, and ticket decisions
before major export implementation begins.

The export should feel like a personal editorial packet: literary, calm,
professional, and genuinely useful for revision.

It should feel as though a careful reader has considered the writer's work and
offered guidance with taste, seriousness, and generosity.

It should not feel like:

- a dashboard printout
- a generic SaaS report
- a chaotic marked-up manuscript
- a plain administrative record

---

## 1. Product purpose

The export system exists to give the writer a durable, legible, reflective
record of feedback that can be printed, saved, reread, and worked from during
revision.

Its primary job is not merely to duplicate what is on screen. It should:

- preserve the teacher's editorial voice
- present feedback in a calmer and more complete reading format
- support offline review, printing, and slower reflection
- turn inline comments into a coherent packet rather than a fragmented overlay
- help the writer move from response to revision

The export should belong to the same product family as the reading workspace,
but it should be composed more like a finished editorial handout.

---

## 2. Export template structure

### v1 priority template

The first export template to build later should be:

- **Feedback Packet — overview + annotated manuscript**

This is the main writer-facing export and should be treated as the first
implementation target.

### Template sections

#### 1. Cover page

Should include:

- shortstory.ink branding
- submission title
- writer name
- teacher name
- date, without timestamp
- version number
- word count
- cohort/group metadata

The cover should feel restrained and literary, more like a slim editorial
packet than a course handout.

#### 2. Editorial letter

Should include:

- teacher overview or summary
- warm, serious, literary tone

This section should read like a short editorial letter rather than a status
note.

#### 3. Key revision themes

Should include:

- 3–5 themes where available
- derived from comment categories or craft areas
- `Uncategorised` where needed

This section should help the writer see the larger pattern of feedback without
needing to infer it from scattered comments alone.

#### 4. Annotated manuscript

Should include:

- clean manuscript text
- comments shown in context without visual chaos
- numbered inline markers
- margin/comment blocks where possible
- graceful fallback for long comments
- cut suggestions shown as light grey strikethrough in manuscript plus a
  margin/comment note

The manuscript should remain readable as a piece of writing, not become a dense
markup surface.

#### 5. Comments grouped by craft category

Should include:

- all comments by default
- grouping by category where available
- clear inclusion of `Uncategorised` comments

This gives the writer a second way to read the feedback: by theme rather than
by manuscript sequence.

#### 6. Suggested reading / next steps

Initially this may be:

- manually entered
- placeholder-driven

Later it can draw from:

- snippet/library material
- public-domain texts
- open-source material
- teacher-owned reusable guidance

This section should support:

- suggested authors
- suggested stories
- revision exercises
- workshop instructions
- what to do next

### Future templates

Mentioned for later planning, not for current implementation:

- Workshop sheet
- Close reading packet
- Comments-only report
- Snippet anthology
- Revision checklist

For product priority:

1. Feedback Packet with annotated manuscript
2. Workshop sheet later

---

## 3. Visual design principles

The export should feel like:

- an editorial letter
- literary journal restraint
- high-quality writing course material

It should not feel like:

- dashboard cards
- a modern SaaS report
- a dense academic form

### Visual rules

- Typography should be elegant and calm, with clear hierarchy and generous line
  spacing.
- The manuscript should remain central and readable.
- Comments should be visually secondary to the writing, but still easy to find.
- Page furniture should be restrained.
- Metadata should be present but quiet.
- Category groupings should aid understanding, not clutter the packet.
- Cut suggestions should remain visible but softened with light grey
  strikethrough treatment.

### Tone of composition

The packet should feel professional and considered, as if assembled by a
thoughtful editor rather than exported by a software tool.

---

## 4. Content and data-model considerations

The export feature should separate:

- canonical feedback content
- rendered export sections
- reusable teaching material
- export metadata

### Canonical content already present or adjacent

Current and near-current source material may include:

- submission title and body
- writer identity
- teacher identity
- version
- created/published dates
- feedback summary
- inline feedback items
- feedback categories
- cohort/workshop metadata

### Teacher-added extra copy

The export system should eventually support teacher-added copy such as:

- personal note
- reading suggestions
- revision exercises
- workshop instructions
- what to do next
- suggested authors/stories

This should preferably become stored, searchable, and reusable over time rather
than remaining export-only free text.

For v1, simple manual fields or placeholders are acceptable if that keeps the
implementation small.

### Suggested content structure direction

The export pipeline should be able to assemble a packet from a content object
with sections such as:

- cover metadata
- editorial letter
- revision themes
- annotated manuscript entries
- grouped comments
- next steps / reading suggestions

That structure should remain renderer-agnostic enough to support a later,
different PDF pipeline if needed.

### Revision continuity

For v1:

- focus mainly on the current version

For v2:

- show a previous-version summary where useful
- allow importing an earlier teacher overview into a newer packet
- include a simple revision history timeline
- avoid mixing older comments into current feedback in confusing ways

---

## 5. Privacy rules

Writer-facing exports must preserve strong boundaries around student work.

### Hard rules

- Do not include other students' snippets in writer PDFs.
- Do not expose other writers' text in another writer's packet.
- Do not treat saved student snippets as generally reusable writer-facing export
  material without explicit future consent and anonymisation rules.

### Allowed future sources

- teacher-approved public snippets
- public-domain or open-source texts
- manually entered teacher examples
- teacher-owned reusable teaching material

### Consent principle

Student work from one writer must not appear in another writer's export unless
an explicit future consent and anonymisation system exists.

---

## 6. Technical approach

### v1 rendering direction

For v1, prefer polished HTML/CSS print-to-PDF rather than LaTeX or Pandoc.

Reasons:

- easier integration with the existing Next.js app
- easier browser preview
- faster visual iteration
- lower tooling complexity

### Architectural principle

Even if v1 uses HTML/CSS print rendering, the content structure should remain
clean enough that a later Pandoc, LaTeX, or more advanced PDF pipeline remains
possible.

### Likely rendering flow

Later implementation should likely support:

- server-assembled export view data
- browser preview route or print route
- print stylesheet or dedicated export layout
- PDF generation via browser print or headless rendering

### Export timing and lifecycle

The future export flow should support:

- preview before publish
- generation/download after publish
- regeneration on demand
- stored metadata/content where appropriate

This export lifecycle relates to feedback publishing inside the app. It is not
only an email-delivery concern.

### Technical design guardrails

- keep export composition separate from visual rendering
- avoid hard-coding dashboard UI into printable layouts
- keep comment numbering deterministic
- preserve manuscript readability before embellishment
- ensure long comments degrade gracefully across page breaks
- ensure cut suggestions remain visually consistent between app and export

---

## 7. Phased roadmap

### Phase 0 — Foundations and content model

- define packet section structure
- define required metadata and optional fields
- decide what is canonical vs derived
- define privacy rules for export source material
- define teacher-added copy fields for v1 and later reuse

### Phase 1 — Feedback Packet v1

Build the first writer-facing export:

- cover page
- editorial letter
- key revision themes
- annotated manuscript
- grouped comments by category
- suggested reading / next steps placeholder section

This phase should prioritise polish, legibility, and calm print composition over
feature breadth.

### Phase 2 — Preview and regeneration flow

- preview before publish
- regenerate after publish
- persist useful export metadata
- improve teacher control over export-ready copy

### Phase 3 — Reusable teaching material integration

- connect next steps/reading suggestions to reusable teacher-owned material
- support searchable extra-copy content
- support optional recommendation blocks from teacher library content

### Phase 4 — Revision continuity

- previous-version summary support
- simple revision timeline
- import prior overview into current packet where appropriate

### Phase 5 — Additional export templates

- Workshop sheet
- Close reading packet
- Comments-only report
- Snippet anthology
- Revision checklist

---

## 8. First implementation ticket recommendation

### Recommended first ticket

**Create export packet content contract and preview route for a single published
submission**

This first implementation ticket should:

- define the server-side packet view model for one published submission
- map current submission, summary, comments, category, and metadata fields into
  export sections
- create a dedicated preview route or print-safe page for the Feedback Packet
- render only the first template structure, without trying to solve all future
  templates
- use HTML/CSS print styling, not a separate PDF toolchain

### Explicitly not in the first ticket

- advanced PDF infrastructure
- reusable teacher-library integration
- multiple export templates
- cross-version history rendering
- automated recommendation systems

### Success criteria for the first ticket

- one published submission can produce a coherent export preview
- the packet feels literary and restrained rather than dashboard-like
- summary, comments, and manuscript appear in a clear revision-friendly order
- category grouping and `Uncategorised` handling are correct
- the structure is stable enough for later PDF generation and regeneration

---

## Cross-reference

Related planning documents:

- `docs/product-brief.md`
- `docs/features-core-submit-review-feedback.md`
- `docs/teacher-area-roadmap.md`

This roadmap should be consulted before major export work changes the writer
feedback output surface.
