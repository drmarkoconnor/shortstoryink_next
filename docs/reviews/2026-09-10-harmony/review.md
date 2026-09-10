# Lighter studio: consistency pass, 10 September 2026

Mark approved the lighter contrast and increased space and asked for harmony across all pages. The initial pass was source-level. Mark subsequently approved the standalone local Playwright fallback; the screenshot and interaction checks below supersede the earlier pending-browser status.

## Shared direction
Warm ivory canvas, white form surfaces, dark green text and actions, sage selection, fine borders, serif headings and manuscripts, one system sans-serif stack for controls. Keep text comfortably readable and make breathing room with margins and padding rather than lighter body text.

## Page-family coverage

| Surface | Source-level changes / shared coverage | Visual review |
| --- | --- | --- |
| Public home | Retained approved composition; shared button, type and mobile styles | Pending |
| Sign-in, registration, confirmation, password recovery | Shared branded frame, guide and account navigation, open forms, consistent actions | Pending |
| Account | Open page heading and consistent form fields/actions | Pending |
| Guide overview and five chapters | Shared header, separate guide navigation, active-page state, roomier reading sections | Pending; embedded guide screenshots still show previous interface |
| Writer home and draft composer | Shared fields, actions and navigation; manuscript editing unchanged | Pending |
| Reading room | Shared controls, typography and responsive spacing | Pending |
| Writer material, example and feedback lists | Open page introductions with consistent headings and vertical rhythm | Pending |
| Annotated reading | Consistent inline/margin numbers, cross-paragraph note visibility, focus mode hides markers, toggle/Escape dismissal | Pending interaction QA |
| Published feedback, revision and export | Shared actions, manuscript surfaces and print contrast | Pending; verify print layout |
| Teaching overview | Retained approved composition; coherent studio sub-navigation | Pending |
| Review queue | Clear page heading, more separation between queue and reading area | Pending |
| Teacher manuscript and annotations | Shared control/field styles; manuscript data and anchor calculations preserved | Pending |
| Groups and archive | Open headings, roomier shared cards and form fields, plain labels | Pending |
| Handout editor | Shared controls and typography; existing save behaviour retained | Pending; save/reload still requires signed-in rehearsal |
| Saved passages, library and feedback memory | Correct active navigation, open headings, roomier filters, source filters wrap across rows | Pending |
| Source reader and passage capture | Reading-library sub-navigation and consistent controls | Pending |
| Error/loading states and route aliases | Shared palette and typography; aliases reuse canonical components | Pending |

## Token contrast checks

Calculated contrast for the solid shared tokens: body text on ivory 11.34:1, secondary text on ivory 5.44:1, white primary-button text on green 9.39:1, and placeholder text on white 4.82:1. These arithmetic checks do not cover opacity variants, rendered screenshots, focus, or full accessibility compliance.

## Verification
Typecheck and ESLint passed after the main consistency edits. All 23 automated tests passed, including privacy, ownership, manuscript preservation and revisions. Final Netlify build/deployment passed. Preview: https://6aa2d4948ad84f7ecfacdd61--storyink.netlify.app. All 30 read-only HTTP checks passed (public pages, illustration, protected redirects and removed test route). Signed-in behaviour and visual fidelity are not established by these checks.

No production deployment, application database write, authentication change or migration edit was made as part of this consistency pass. The current preview remains a review candidate until desktop/mobile capture and signed-in interactions can be checked. Previous guide screenshots need refreshing from the accepted final design.


## Refreshed walkthrough and browser review
Mark approved proceeding on 10 September and requested current screenshots and a less cramped walkthrough. Replaced all guide imagery with 14 compressed WebP captures (663 KB total) from the current public pages and actual application components using fictional example writing. Rebuilt the overview as chapter rows and the five chapters as sequential, numbered steps with generous spacing, accurate captions and full-size image links.

All six guide pages passed at 1360px desktop and 390px phone widths: images decoded, no horizontal overflow, active navigation and full-size image links worked. Visually reviewed the rendered guides and writer, feedback, revision, teacher review and handout examples. Local browser checks also exercised draft confirmation, feedback notes, revision confirmation/history, teacher publish confirmation and illustration insertion. No browser page errors remained. Fixed malformed form padding utilities and explicit London date formatting to prevent locale-dependent hydration mismatches.

Evidence is in `guide-captures/`, `guide-qa/` and `guide-qa/report.json`. The fictional fixture is archived in `guide-fixture.tsx.txt` and removed from application routes before building. Protected screenshots use real components with synthetic data and blocked API requests; these checks do not verify authenticated persistence, sharing or print output. Preview sign-in trouble remains unverified: public Identity settings returned 200, but no authenticated login was performed.

Typecheck, ESLint and all 23 automated tests passed. Production deployment remains unchanged.

Final Netlify production build and draft deployment passed. Updated walkthrough: https://6aa2de70960074b7274f0c4e--storyink.netlify.app/guide/new-writers. This is the latest draft preview; production is unchanged.
Final draft HTTP verification: all 44 checks passed, including six guide pages, all 14 refreshed image assets, protected redirects and the removed fixture route returning 404.
