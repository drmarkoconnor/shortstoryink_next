# Session Note: Studio Memory, Library Performance, and Next Roadmap

Date: 2026-05-13

## Branch and intent

Working branch for this pass:

- `studio-memory-library-performance`

This pass moved the teacher Studio closer to a reusable teaching-memory layer.
The main goal was to make saved snippets, curated Library material, previous
comments, and writer-specific feedback patterns easier to find and reuse without
turning the product into a broad admin platform.

## What changed

### Feedback Memory

Added a first Feedback Memory surface:

- route: `/app/teacher/feedback-memory`
- entry point from Studio
- top-level teacher tab label: `Memory`
- searches previously written feedback comments
- keeps anchored quote context where present
- filters by writer and feedback category
- supports copying comment text or comment plus quote
- opens the originating workshop item with a feedback focus query

Feedback Memory currently loads from `feedback_items`, joins back to submissions
and writer profiles, and uses a temporary client-side cap.

### Studio updates

Studio now includes Feedback Memory as a visible first-class card alongside:

- Snippet Library
- Teaching Library
- Document Builder
- Source capture

The Studio page now fetches major metrics in parallel, including the Feedback
Memory count.

### Curated Library filtering

The Teaching Library now treats examples more deliberately:

- saved snippets only appear as Library examples when they look curated
- a snippet counts as curated when it has a non-uncategorised category, a
  reviewed/ready/favourite status, or one or more snippet use flags
- this keeps raw capture noise out of the higher-value Library surface

### Teaching Library usability

The Library surface has been pushed toward a denser retrieval table:

- table-style listing for notes, examples, and references
- visible type/category/tag/source/updated/action columns
- copy action for fast reuse
- hover/focus preview and expandable full preview
- direct link into the document builder
- clearer counts for notes, examples, and references

### Snippet Library triage polish

The snippet workbench has additional triage polish:

- can show AI-reviewed rows directly in the table
- can clear that focused table mode
- tracks failed AI triage targets so they can be retried
- reduces unnecessary router refreshes after local state already reflects the
  update

### Review workspace memory

The teacher review workspace now receives writer-specific Feedback Memory for
the current writer, excluding the currently open submission. This is intended to
support pattern recognition while reading without forcing the teacher away from
the manuscript.

### Performance and data limits groundwork

Added database indexes for:

- feedback by teacher and created date
- feedback by submission and created date
- feedback comment full-text search
- snippets by teacher and updated date
- snippet category/status JSON anchor fields
- snippet text full-text search

Current temporary client-side limits are:

- snippets: `2000`
- teaching library notes/references: `2000`
- feedback memory: `600`

These are still temporary. Proper pagination and server-side search remain the
next infrastructure step if the product keeps accumulating material.

## Product direction to preserve

The teacher area should continue to feel like a calm editorial studio:

- fast capture while reading
- organisation later
- reusable teaching knowledge over dashboard sprawl
- Studio as the accumulation layer for snippets, sources, notes, documents, and
  feedback memory

## Requested next roadmap focus

The next return-to-project focus should include the document builder,
especially making it quicker to use and combine:

- snippets
- Library items
- Feedback Memory comments and anchored quotes

The document builder should become the place where the teacher can rapidly pull
from these stores and assemble useful outputs, without too much modal or search
friction.

Other requested roadmap topics to carry forward:

- review limits for submitted pieces, including per-piece and per-writer
  constraints
- review overall Supabase limits and cost/scale ceilings before usage grows
- explore a newsletter layer for selected writing, teaching notes, or community
  updates
- build toward a community of reviewers
- support comments/discussion on pieces where appropriate
- allow writers to host or showcase completed stories once they are ready

## Suggested next technical tickets

1. Run a manual UX pass on `/app/teacher-studio`, `/app/teacher/library`,
   `/app/teacher/snippets`, `/app/teacher/feedback-memory`, and
   `/app/teacher/documents`.
2. Improve Document Builder insertion so snippets, Library entries, and Feedback
   Memory items can be searched and inserted from one fast retrieval surface.
3. Replace temporary client-side load caps with paginated server-side search for
   snippets, Library entries, and Feedback Memory.
4. Add Supabase scale notes covering storage, row counts, full-text indexes,
   auth/user limits, and likely upgrade points.
5. Sketch the product boundary between writer portfolios/hosted completed
   stories, newsletter publishing, reviewer community, and private teacher
   feedback.

## Cautions

- Feedback Memory is useful but still early. It should not become noisy inside
  the reading workspace.
- Library should remain curated; raw snippets belong in Snippet Library until
  reviewed or categorised.
- Avoid adding curriculum/admin metadata before the close-reading and document
  assembly loop feels excellent.
