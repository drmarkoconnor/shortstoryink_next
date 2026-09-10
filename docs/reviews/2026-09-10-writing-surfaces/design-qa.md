# Writing surface design QA

Source visual truth: docs/reviews/2026-09-10-writing-surfaces/02-place-to-begin.png (the second displayed mockup selected by Mark).
Implementation screenshot: docs/reviews/2026-09-10-writing-surfaces/implementation/writer-1487-empty.png. Source and implementation are 1487 × 1058 pixels; browser viewport 1487 × 1058 CSS pixels at density 1. State: empty editor, scrolled to writing area. Focused/filled states and 390px phone captures are adjacent.
Full-view comparison: docs/reviews/2026-09-10-writing-surfaces/comparison.png. Source left, implementation right, both reduced equally for comparison. The writing region is the primary content of the full-view comparison; separate crop was unnecessary.

## Findings
No actionable P0/P1/P2 findings remain.
- Typography: existing literary serif and system sans-serif retained; readable 19px manuscript text, 36px draft heading, persistent small label and invitation.
- Layout: pale sage writing surface above sharing controls; fine dividers; generous spacing; phone fields stack. The source’s three-column sharing row is reproduced on desktop. Existing status counts, real recovery wording and previous-submission controls are intentionally retained.
- Tokens: surface #f0f3ec, border #7c8e80 (3.10:1), focus #496859 (5.50:1), readable #637067 placeholder. Border is deliberately a little stronger than the generated reference. No shadows added.
- Assets: selected reference uses no illustration assets. Existing handout illustrations retained with their original proportions.
- Copy: exact draft invitation and placeholder adopted. Sharing follows drafting; guide caption updated to describe the new arrangement.

## Comparison history
First desktop capture showed the first typing line too far inset from the left edge. Corrected to a left-aligned first line while constraining long text with right padding. Adjusted sheet height, sharing heading and row proportions; re-captured desktop/mobile, empty/focus/filled and other editable surfaces. Final browser checks passed with no page errors.

## Interaction checks
Desktop and phone: type a draft, set title, reload and recover identical text/title, invoke local fixture submission confirmation, verify sharing below writing, inspect revision and handout surfaces, switch handout to preview and confirm editing surface is hidden. No horizontal overflow on inspected screens. Existing automated suite: 23 tests passed. API requests intercepted; authenticated persistence is not established by these checks.

## Implementation checklist
Completed selected writer layout, consistent editable surfaces, visible focus, responsive fields, draft recovery checks and refreshed guide imagery. Temporary fictional fixture removed from app routes before build.

## Follow-up polish
No blocking visual issues. The guide screenshots use fictional writing.

final result: passed
