# Writing-theme illustrations — 10 September 2026

Added thirteen original pen-and-watercolour illustrations, matching the warm ivory, sage and olive palette of the existing six settings: Openings, Endings, Feeling stuck, Time in fiction, Clarity, Editing, Free writing, Metaphors and images, Location, Character, Plot, Voice and Theme.

All artwork is stored locally as 1774 × 887 WebP assets. Generation provenance is recorded in sources.json. The handout picker now offers nineteen illustrations, with search and Writing themes / Settings filters. The gallery scrolls independently of the caption, size and insertion controls. Existing saved illustration identifiers remain stable. The reading-room setting explorer retains its six setting choices.

## Verification

- All 23 automated tests and targeted ESLint passed.
- Local browser checks at 1360 × 900 and 390 × 900 passed: collection counts, case-insensitive search, empty search state, all thirteen new illustration insertions, captions, compact sizing, image decoding and preview.
- Inspected desktop and mobile picker captures; no horizontal overflow; insertion controls remain visible.
- Print-media screenshots captured alongside handout previews.
- These checks used synthetic component data with API requests intercepted; they do not verify authenticated live saving.
- Temporary fixture removed before the production build.

See checks.json and the picker, handout and print PNGs in this directory.

Production build and its TypeScript/ESLint validation passed.
