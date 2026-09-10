# Annotated examples: notes beside their highlights

Mark’s two supplied live screenshots showed setup forms occupying the teacher’s first screen and a detached, independently scrolling annotation list. The writer reader also had a separate notes column. This follow-up makes both readers use the same popup and navigation components.

1. Enter the reading: teacher metadata and group visibility collapse behind a labelled disclosure; publication is separate and collapsed. The manuscript starts beneath clear controls. Source review confirms the existing forms and server actions are retained.
2. Read a note: both roles use numbered markers and clickable highlights. One popup opens beside the marker when space permits, or below it within phone viewport bounds. It shows the quote and full comment; teachers can expand Edit note. Escape/Close restores marker focus, outside click dismisses, and scrolling the marker offscreen closes the popup. Overlapping annotations retain separate markers and manuscript text.
3. Move through the story: both roles show one section at a time, Previous/Next and a section selector, plus larger text and focus controls. Section changes clear the note.

Local browser checks passed at 1360px and 390px for both roles with no page errors or horizontal overflow. Checked popup bounds, highlight/marker activation, overlapping notes, Escape focus return, section navigation, writer focus mode, teacher edit failure retention, and new annotation failure/retry with exact selection offsets. API calls were intercepted using fictional data; no live account records were changed. The temporary fixture was removed before building. Screenshots and browser-report.json are in this folder.

Also fixed new-note save failures hiding the composer: the text remains open for retry; it closes only on success. All 23 existing automated tests passed during the change. These local checks do not establish authenticated database persistence.

Final production build, type validation and ESLint passed. Temporary fixture absent from build routes.
