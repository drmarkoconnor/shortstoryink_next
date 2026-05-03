# Session Note: Source Reader and Document Builder Handoff

Date: 2026-05-01

## Continuation note

Current branch as of the follow-up review:

- `document-builder-handout-readiness`

Current committed head:

- `8a196ae` - `Refine handout document builder`

Working tree status:

- in progress after writer-document exposure pass

This branch now includes the earlier document-builder correction work described
below, plus the newer handout-readiness pass:

- group availability metadata is saved in `teacher_documents.body.metadata.groupIds`
- `/app/teacher/documents` loads teacher-readable workshops for the document
  availability selector
- saved documents preserve and reload selected group IDs
- inserted snippet examples can omit teacher notes by default
- inserted snippet examples can be edited inside the handout without changing
  the source snippet
- example-block presentation was tightened for both editor and print preview
- delete behaviour now returns the builder to a fresh draft after removal
- snippet-library edits now tolerate older/local Supabase schemas where
  `snippet_category_id` is not yet visible in the PostgREST schema cache; the
  route falls back to updating text, note, category, and tags through snippet
  anchor metadata
- snippet text is now lightly cleaned on source-excerpt save and snippet-library
  update: line breaks, tabs, double spaces, control characters, and zero-width
  characters are collapsed/removed
- snippet library search now includes source/author fields and can filter by
  whether a teacher note is present
- snippet library and document builder attempt silent autosave when the page is
  hidden or the teacher follows an in-app link
- snippet/document saves refresh the relevant Next router/server data while
  keeping the active document in place
- teacher home now promotes Review, Archive, and Studio links, makes the
  awaiting-review count link to Review, and includes protected group CRUD
  controls
- `/app/writer` now surfaces group-available teaching documents in a compact
  document selector
- `/app/writer/documents/[documentId]` renders a read-only document only when
  the writer belongs to one of the document's saved availability groups
- Teacher Studio cards no longer stretch to fill the right-column height, which
  removes the large blank area shown in the 2026-05-01 screenshot
- Teacher Studio snippet panel now uses the former blank area for library
  intelligence: source/tag/note counts plus top categories, authors, and
  sources
- teacher user-access writer selection now loads the chosen writer immediately
  on dropdown change instead of requiring a separate Open/Load button
- document group availability checkboxes now trigger a short debounced save, so
  writer access changes persist without remembering the main Save button
- writer-facing exposed documents now use the same print shell conventions as
  the builder preview, include a `Print or save PDF` action, and render snippet
  examples with the polished quotation/attribution treatment

Teaching Library correction captured on 2026-05-02:

- do not build a broad Teaching Resources catalogue or curriculum system yet
- the product remains a feedback engine with strong teaching reuse
- Teaching Library v1 is intentionally constrained to notes, existing snippet
  examples, and lightweight references
- notes are teacher-written explanations with title, body, category, and tags
- references are only title, book/article/video type, optional URL, short note,
  category, and tags
- examples continue to be existing snippets; no duplicate example storage
- Library must focus on fast search, recall, and insertion into documents
- explicitly out of scope: lesson type, programme week, difficulty, curriculum
  structures, group exposure controls, large resource catalogues, external APIs,
  AI suggestions, and complex tagging

Validation from this follow-up review:

- `npm run typecheck` passed
- `npm run lint` passed
- `npm run build` passed
- `git diff --check` passed

Review note:

- the code branch is technically clean; the main remaining checks are manual UX
  checks for print preview, PDF filename/title restoration, snippet example
  selection/editing, and save/load of selected availability groups.

## Current branch state

Current branch:

- `document-builder-refinement-pass-v2`

Current committed base:

- `02d8b5e` - `persistant browser session and search completed`

At the time of this note, `main`, `origin/main`, and
`document-builder-refinement-pass-v2` point to `02d8b5e`.

There are also uncommitted working-tree changes for the latest document builder
correction pass:

- `app/api/teacher/documents/route.ts`
- `app/globals.css`
- `components/prototype/menu-tabs.tsx`
- `components/teacher/document-builder.tsx`

These uncommitted changes add document deletion, improve print behaviour, group
saved documents by type, and continue the document-builder simplification pass.

## Recent milestone commits

Recent relevant history:

- `02d8b5e` - persistent browser session and source-reader text search completed
- `90ed20d` - Gutenberg/Gutendex source search and text loading
- `a60f706` - merge snippet library management
- `51e9e45` - consolidate snippet library management
- `d9c540e` - snippet reuse v1: search and insert into comments
- `dd16e09` - merge teacher comment snippet categorisation
- `5ed9873` - review comment and snippet categorisation
- `e6b363c` - merge approved feedback export document fixes
- `472f443` - feedback export document controls and appendix fixes

## Product position

The app has moved beyond the core submit/review/publish feedback loop into the
teacher studio layer described in `docs/teacher-area-roadmap.md`.

The current teacher-side model is:

- Desk / review queue for immediate manuscripts
- Reading workspace for close manuscript feedback
- Snippet library for reusable teaching examples
- Source reader for external/public-domain source extraction
- Tiptap-based document builder for composing teaching documents

The guiding product principle remains:

- fast capture first
- organisation second
- calm editorial/studio surfaces rather than dashboard sprawl

## Feedback export status

The feedback export route is approved for now.

Implemented/fixed recently:

- professional feedback document export
- feedback document notes / appendix controls corrected
- appendix tightened so empty appendix fields do not render
- simple bullet styling for next steps and suggested reading
- teacher display name normalisation removes `Dr`
- print/save PDF button remains
- published-only export restriction remains

Future possibility noted by the user:

- later versions may move to a Pandoc/LaTeX-style export pipeline

Do not revisit export unless a new focused ticket asks for it.

## Review workspace status

Implemented:

- comment categorisation after first read-through
- fixed category list
- inline category assignment
- right-panel category assignment
- uncategorised count and review flow
- snippets can be promoted from comments
- lightweight tags in panel
- right panel can be collapsed
- publish-to-writer flow again leaves the teacher able to reach the feedback
  document without detouring through archive

Known product note:

- categorisation is working but visually a little busy; this is parked for a
  later visual refinement.

## Snippet library status

Implemented:

- `/app/teacher/snippets`
- single active snippet-management surface
- search snippets
- filter by fixed categories
- category counts in filter labels
- edit snippet text/category/tags/note
- delete snippets
- uncategorised cleanup with selected/bulk delete
- source snippets appear with attribution metadata
- old Teacher Studio duplicate snippet surface was simplified into orientation
  links/metadata

Small UX correction:

- old `Use in review` style action was reframed as source-oriented viewing where
  appropriate, because many snippets come from locked/published source contexts.

## Source reader status

Implemented route:

- `/app/teacher/sources/read`

Current capabilities:

- paste long source text
- upload UTF-8 `.txt` files
- enter source metadata once
- read in a manuscript-like pane
- select across multiple paragraphs/lines
- save selected text as snippets
- snippets inherit source metadata
- snippets appear in snippet library and document builder
- clear source text without deleting saved snippets
- session snippets list for the current reading session
- visible save confirmation and saved-snippet count
- in-text search within loaded/pasted/uploaded source text
- previous/next search match navigation
- search highlights do not intentionally replace or destabilise snippet
  selection
- source text and metadata persist in browser `sessionStorage` for the current
  browser session/tab
- source reader and right panel now have independent desktop scroll regions, so
  long texts do not push the controls out of reach

Session persistence:

- uses `sessionStorage`
- does not store whole source texts in Supabase
- clear source text removes the sessionStorage copy

Fields persisted in browser session:

- source text
- author
- title
- source/collection
- source URL
- chapter/section
- licence/source note
- loaded filename/source label
- Gutenberg ID when available
- in-text search query and active match index
- Gutendex search query and language filter

## Gutenberg/Gutendex status

Implemented:

- compact `Find text` search panel inside source reader
- server route for Gutendex metadata search
- server route for loading selected Gutenberg plain text
- source-provider helper at `lib/source-providers/gutenberg.ts`
- provider mapping from Gutendex result to source metadata fields
- plain-text format detection
- safe Gutenberg text URL guard
- conservative Project Gutenberg boilerplate trimming

Important operational note:

- Gutendex is the intended API, but it has shown upstream timeout/reliability
  problems from the local development environment.
- The app now reports a clear upstream timeout message and exposes an
  `Open Gutendex query` diagnostic link rather than silently failing.

Do not scrape/crawl Project Gutenberg pages. Continue to use Gutendex or
approved API/mirror-style approaches.

Recommended next source/API step:

- add a better provider/import abstraction only when introducing the next source
  provider, likely manual URL import or richer Gutenberg format selection
- do not add Open Library, Internet Archive, EPUB, AI, or full source-session
  database persistence until separately requested

## Document builder status

Implemented route:

- `/app/teacher/documents`

Foundation:

- Tiptap-based document builder
- free/open-source Tiptap packages only
- no Tiptap Cloud or paid/pro extensions
- documents save to `teacher_documents`
- document type stored in document metadata
- saved documents can be loaded
- snippets insert into documents as custom snippet/example nodes
- custom snippet nodes preserve snippet ID, text, category, tags, source
  metadata, and now note/commentary
- preview/rendering is visually dominant on the left
- editor/controls sit on the right

Recent refinement direction:

- the builder is being constrained into a structured composition tool, not a
  generic word processor
- house style controls presentation
- teacher controls structure and content, not arbitrary typography

Formatting now intentionally constrained:

- undo / redo
- add section
- move section up/down
- bold / italic
- H1 / H2 / H3
- bullet list
- numbered list
- insight/commentary block
- insert snippet as example block

Removed/restricted:

- table insertion
- table styling
- underline
- arbitrary font/colour/size controls
- paid/pro editor features

Example block status:

- inserted snippets automatically become example blocks
- excerpt text uses serif styling
- attribution is restrained: author/title/source-style metadata
- snippet note appears below as optional teacher commentary
- visual style is closer to printed literary example than dashboard card

Current uncommitted document-builder corrections:

- print/save PDF title is set to `Document title - YYYY-MM-DD`
- `MenuTabs` is now marked as `print-controls` so the tab/nav bar does not print
- `DELETE /api/teacher/documents?id=...` added
- builder has a Delete button for saved documents, with confirmation
- saved-document select is grouped by document type via `optgroup`

These should be committed before starting a new feature branch.

## Database and migrations

Relevant migrations already introduced in this development sequence:

- `supabase/migrations/20260428_teacher_documents.sql`
- `supabase/migrations/20260429_external_source_snippets.sql`

Important:

- document saving/deleting depends on the `teacher_documents` migration
- external source snippets depend on the external source snippet migration
- whole source texts are not stored in Supabase for source-reader v1

## Validation status

Recent validation has been run repeatedly during the source-reader and
document-builder passes.

Most recent validation after the document-builder correction pass:

- `npm run lint` passed
- `npm run typecheck` passed
- `npm run build` passed
- `git diff --check` passed

Manual checks still useful after IDE restart:

- document builder print preview no longer includes tab/nav bar
- default save-PDF filename includes title and date
- delete saved document works and reloads the next available document or a new
  draft
- saved-document selector is grouped by type
- source-reader session restores after navigating away and back
- source-reader clear removes restored session
- source-reader independent scrolling works with a long text

## Recommended next actions

Before new feature work:

1. Review the current uncommitted document-builder changes.
2. Manually check print preview and delete behaviour.
3. Commit the current branch with a focused message, e.g.
   `Refine document builder print and saved document controls`.
4. Merge to `main` if approved.

Likely next refinement tickets:

1. Document builder outline/section navigator.
   Keep it small. Avoid drag/drop for now.
2. Document builder print polish.
   Confirm margins, page breaks, header/footer, and example block rendering in
   actual PDF output.
3. Source import reliability.
   Add provider fallback/diagnostics or manual URL import only if Gutenberg
   reliability continues to block use.
4. Review categorisation visual simplification.
   Current functionality works; the interface could become calmer.

Avoid for now unless explicitly requested:

- full Teacher Studio dashboard
- AI source selection
- Open Library / Internet Archive integration
- EPUB support
- full-text database indexing
- persistent whole-source sessions in Supabase
- drag/drop document builder
- Pandoc/LaTeX export replacement
