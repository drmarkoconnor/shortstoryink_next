**shortstory.ink — backend and writing-studio review**

8 September 2026. Assessment and proposed work; no migration or deployment performed.

Moving away from Supabase is feasible. The frontend is already configured for Netlify. The proposed move is to replace Supabase's database, authentication and access-control integration while preserving the Next.js application and its literary design. Netlify Database's automatic wake-up addresses Mark's specific frustration with restoring an inactive Supabase project manually.

The strongest product direction is to complete the reliable private workshop, then connect its existing annotated stories, snippets and teaching documents through one imaginative scene-based exercise. The project already contains much of the foundation for this.

**Grounding and limits**

Reviewed the product brief, migration note, core feature contract, teacher roadmap, feedback-export roadmap, May 3 and May 13 handoffs, and deployment history, together with authentication, submission/revision/publishing paths, SQL policies, writer examples, account settings, teacher retrieval and document-building code.

The migration note supersedes the brief's older Eleventy implementation preference. The product principles still apply: elegance, teacher efficiency, precise inline feedback, private writing, fast capture followed by organisation, and a coherent reading-to-revision loop. The README describes an earlier shell-only stage and needs updating.

Verification on this checkout: `npm run typecheck`, `npm run lint`, and `npm run build` all passed. Lint reports that `next lint` is deprecated; the build emitted a webpack cache performance warning. No behavioural test suite is configured in package.json or CI. These checks do not verify production data, authentication, permissions, delivery of email or browser interactions.

The Browser runtime returned no available browsers. Consequently this is a source-code and product-document review, not a screenshot-based UX audit. Production Supabase policies, grants, applied migration history, row counts, storage objects, Netlify account plan and actual credit usage were not inspected. Security findings below describe the checked-in rules and need confirmation against the live database or an isolated restored copy.

**Hosting decision**

Supabase Free pauses after one week of inactivity; Pro starts at US$25/month and does not pause for inactivity. Paying for the existing service is the smallest operational change if an immediate class launch matters more than changing providers. [Supabase pricing](https://supabase.com/pricing)

Netlify Database is managed PostgreSQL. It sleeps after five idle minutes by default and resumes when the next query arrives. Netlify describes typical additional wake-up latency as under a second, without guaranteeing that timing. This is a good match for intermittent courses and writing groups. [Database overview](https://docs.netlify.com/build/data-and-storage/netlify-database/) · [Sleep and automatic resumption](https://docs.netlify.com/build/data-and-storage/netlify-database/configure-sleep-on-inactivity/)

| Option | Published starting allowance | Implication for this project |
| --- | --- | --- |
| Netlify Free | US$0; 300 credits/month | Suitable for a measured pilot; not an unlimited classroom service. |
| Netlify Personal | US$9/month; 1,000 credits/month | Plausible first paid tier for a sole owner; optional paid auto recharge. |
| Existing Supabase Pro | From US$25/month | Avoids backend migration and inactivity pausing; Netlify frontend hosting remains separate. |

Netlify prices are from its current [plan documentation](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/). These are starting prices, not a forecast of the complete bill.

Two conditions matter particularly for Mark. Database is available only on credit-based Netlify plans, so an older account may require a plan change. Also, exhausting the shared credit allowance can pause projects; Netlify's pricing FAQ says one project's overage can pause all projects on the account. Check the effect on Mark's other sites before changing plans. [Database availability](https://docs.netlify.com/build/data-and-storage/netlify-database/) · [Credit limits and pausing](https://www.netlify.com/pricing/)

Database compute currently costs 10 credits per unit; the Free database also has a separate 48-unit monthly compute ceiling. Other hosting usage consumes credits too. As illustrative arithmetic, 300 credits fund at most 30 minimum-unit database hours before any other usage. Reading or drafting entirely in the browser need not keep the database active, but frequent server saves or polling can extend its active time. Measure real class sessions and tune saving accordingly. The billing page still contains storage-promotion wording referencing July 1, 2026, which is already past; do not promise continuing free storage without checking the account's actual terms. [Database billing and limits](https://docs.netlify.com/build/data-and-storage/netlify-database/billing-and-usage/)

Netlify also currently provides Identity, including email/password, recovery and server verification, on credit-based plans at no additional cost. Its current package is `@netlify/identity`. It is the natural authentication candidate for the requested Netlify-centred setup, subject to proving the Next.js session and recovery flows in a preview. Database alone does not replace Supabase Auth. [Identity availability](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/overview/) · [Current integration](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/get-started/)

**What the migration involves**

A source scan found 41 files directly importing Supabase helpers or SDKs and queries against 16 relation names, including legacy submission tables. Supabase's role extends well beyond storing manuscripts. There were no Storage or Realtime SDK calls in the scanned application directories; live storage still needs inventorying before it can be ruled out.

| Current responsibility | Proposed replacement |
| --- | --- |
| Next.js, React, Tailwind, domain, Netlify hosting | Retain the existing application and design. |
| Supabase PostgreSQL | Netlify Database, with an audited PostgreSQL baseline and controlled data import. |
| Supabase Auth, cookies, callbacks, admin user lookup | Netlify Identity plus server-verified sessions and a stable mapping to existing profile IDs. |
| Supabase query builders and row policies using `auth.uid()` | Server-side data functions with explicit ownership, publication and group checks; adapt any retained database policies to the new identity context. |
| Feedback/submission notification email | Retain the existing Resend integration and verify it independently. |
| Files, if live inventory finds any | Assess separately; no need to add file infrastructure merely because the brief envisages uploads. |

Most data access is already server-side, which helps. Extracting functions such as `createSubmission`, `publishFeedback` and `getVisibleExamples` will centralise rules and prevent vendor calls spreading further through pages. Keep database credentials server-only and use a restricted runtime database role. Copying SQL tables does not reproduce Supabase's API, auth schema, role grants or request identity.

Preserve profile IDs, manuscript text, revision relationships, annotation JSON, snippets and source attribution. In particular, do not reflow or normalise saved manuscript text during transfer: the comments refer to text offsets. Existing passwords and sessions should not be assumed portable. For a small cohort, a deliberate invitation/reset process may be simpler; preserve account ownership through a verified identity mapping and test it before choosing that approach.

This is a moderate backend migration across several workflows, rather than a connection-string edit. A credible sequence is:

1. Inventory the live schema, applied hotfixes, identities, counts and any storage; obtain a verified backup. Inspect current Netlify plan and team-wide usage.
2. Establish a clean schema baseline and explicit access rules. Do not replay the destructive historical reset or the content-import migrations as a production migration strategy.
3. Build a separate preview with synthetic teacher and writer accounts. Prove sign-in, reset, submit, annotate, publish, revise and export, including access-denied cases.
4. Migrate an authorised snapshot into a protected rehearsal environment. Check row counts, ownership, text hashes, links and annotation positions. Test wake-up after inactivity and measure credits during a representative class session.
5. Schedule a short write freeze, take the final export, import, verify, then switch the backend. Keep the source and backups for a defined rollback window. If the new system has accepted writes, reconcile those before rolling back; simply reverting code could lose new student work.

Netlify documents a preview-first PostgreSQL migration process, including Supabase as a source. Its generic guide acknowledges a write-loss window; the write freeze above deliberately closes that gap for this application. Preview databases can contain production copies, so protect preview access and disable real notification recipients during rehearsal. [Netlify migration guide](https://docs.netlify.com/build/data-and-storage/netlify-database/switch-to-netlify-database/)

**Code findings to address before a student pilot**

1. **Potential role escalation through profile updates — highest priority.** The profile UPDATE policy checks the row owner but does not restrict which fields change. The same row stores the trusted `role`. If ordinary authenticated users retain UPDATE privilege on that column, they could change their role. Restrict user-editable columns and keep role changes behind an authorised server operation. Verify grants and test that a writer cannot change roles. Evidence: [profile policy](../supabase/migrations/20260415_reset_modern_schema_and_seed.sql#L261), [role lookup](../lib/auth/get-current-profile.ts#L13).

2. **Private-workshop promises do not match the checked-in read policies.** Submission policies permit fellow group members to read work. Feedback policies permit reading without requiring publication. The April 16 hotfix retains those rules. Since all writers are automatically added to the baseline group, this deserves particular attention. Enforce owner/teacher-only access until explicit peer sharing exists, and withhold teacher draft feedback at the data boundary. Page filters alone do not protect a directly exposed database API. Evidence: [submission and feedback policies](../supabase/migrations/20260415_reset_modern_schema_and_seed.sql#L290), [hotfix](../supabase/seeds/20260416_hotfix_rls_stack_depth.sql#L38), [baseline membership](../lib/auth/get-current-profile.ts#L48).

3. **Teaching-example group visibility is not consistently enforced.** Database SELECT policies check `published` but not the hidden-group rules implemented by the page. In addition, the page treats a failed hidden-group lookup like an empty list, potentially granting access on an error. Make a single visibility rule authoritative and fail closed on missing permission data. Evidence: [example policies](../supabase/migrations/20260510_annotated_story_examples.sql#L131), [reader access check](../app/app/writer/examples/[exampleId]/page.tsx#L101).

4. **Account settings and password recovery are incomplete.** Profile and password forms have TODOs and no persistence handlers. The password-reset email points to the account area, so sending a recovery email does not complete a usable password-change journey. Wire these controls and test the complete recovery path. The callback also accepts an unrestricted `next` destination and ignores session-exchange errors; validate an internal destination and present a recoverable error. Evidence: [security form](../components/account/security-section.tsx#L2), [profile form](../components/account/profile-section.tsx#L2), [reset destination](../components/auth/sign-in-panel.tsx#L31), [callback](../app/auth/callback/route.ts#L9).

5. **Unsubmitted writing lacks recovery.** The submission and revision forms keep text in browser component state, with no draft persistence or leave-page recovery found. Add a recoverable private draft, clear saving/saved/error states, and protection against refresh or failed submissions. Keep local recovery scoped by account and make server saves economical. Evidence: [submission state](../components/writer/writer-submission-composer.tsx#L73), [revision state](../components/writer/revision-draft-form.tsx#L55).

6. **Publishing and revision numbering need transaction guarantees.** Publishing updates the summary and submission status separately; failure between them can leave inconsistent state. Revisions calculate maximum version plus one, then insert without a corresponding uniqueness constraint in the checked-in schema. Use transactions and a unique revision identity, handle retries idempotently, and deliver notifications after a committed publication. Evidence: [publish writes](../app/api/workshop/[submissionId]/publish/route.ts#L51), [revision insertion](../app/app/writer/revise/[submissionId]/page.tsx#L241).

**Maintainability and teaching efficiency**

The code is substantially beyond a prototype shell: it includes reading in context, anchored notes, source capture, document autosave, group distribution, print/export and writer-specific Feedback Memory. Preserve those investments.

The highest-value technical follow-ups are paginated server search, one coherent schema path and shared data operations. Current limits load up to 2,000 snippets, 2,000 library items and 600 feedback-memory entries; searching those loaded subsets can miss older material. Large workspaces also combine many responsibilities: the review component is 2,757 lines, snippet library 2,151, and document builder 2,014. Extract selection/annotation, persistence, retrieval and presentation concerns as these areas change. Add behavioural tests for the private workshop boundary and saving/revision failures rather than tests that merely repeat implementation. Evidence: [query limits](../lib/teacher-library/query-limits.ts), [review workspace](../components/teacher/review-workspace.tsx), [document builder](../components/teacher/document-builder.tsx).

Move baseline-group provisioning out of routine profile reads. `getCurrentProfile` currently looks up or creates the baseline workshop and attempts a membership upsert for writers; an idempotent signup/setup step is a better home for this work. Also update README and reconcile migrations versus manually applied seed-directory hotfixes before migration.

For students, give the returning writer one calm next action: continue a draft, read new feedback, or try this week's exercise. Explain who can see each piece before submission. Keep a revision note such as “What I tried to change” alongside version history, and allow private drafting while a submitted version awaits review.

For Mark, the strongest next tool is a single insertion search across snippets, teaching notes, references and Feedback Memory. Start with a practical intent such as “Prepare a 20-minute session on subtext”: retrieve three examples, add a discussion question and an exercise, save a handout, then choose the group. This extends the existing Document Builder without requiring a full curriculum-management system. Preserve private teacher notes separately from shared materials, and require a deliberate permission decision before reusing identifiable student writing.

For Mark's own writing, add a private notebook and prompt session reachable from the teacher account. Currently `requireWriter` redirects teacher/admin users out of the writer area, so the app does not naturally support switching between teaching and personal writing. A private writing desk should not require demoting the account or submitting personal experiments to a class queue.

**The imagination-world concept**

“Someone, somewhere, under pressure” is a useful starting point. Add **what they want, what they cannot admit, and what changes**. Let the writer leave elements unresolved; the mechanism should invite discovery rather than prescribe a plot formula.

The first release should be one carefully made park scene. Retain the ink, parchment, burgundy and serif language. Use a restrained illustration with a few discoverable objects, optional gentle motion and a reading view that remains typographically central. Existing reader code already has tap/focus note controls and reduced-motion CSS; build on those rather than assuming it is hover-only.

The proposed interaction is:

1. **Enter the scene.** Explore a bench, a bandstand, an object someone is carrying and a passing conversation.
2. **Notice.** Selecting a detail reveals a short passage and a question. The learner can think before opening Mark's note.
3. **See the craft.** A note links the exact words to point of view, motif, subtext, rhythm or a change in emotional pressure.
4. **Try the move.** Carry that observation into a 150–300-word exercise with a different character and situation.
5. **Keep or share.** Save the response privately; deliberately choose whether to submit it. Mark can reuse the scene, notes and exercise in a handout.

Miss Brill is a strong first teaching text. One possible reading connects the band to her sense of belonging, the overheard conversation to the collapse of that belief, and the fur to an indirect expression of feeling. Treat these as discussion-opening interpretations, with exact textual evidence and Mark's editorial voice. Preserve the source and edition when preparing the annotated text. [Mansfield's story](https://www.gutenberg.org/files/1429/1429-h/1429-h.htm#chap09)

An accompanying original exercise could be: “A person waits on a park bench, hoping to be recognised. Someone nearby mistakes them for somebody else. Write the moment without naming the person's strongest feeling.” Let users keep the person and place while changing just the pressure, or keep the pressure while changing point of view. This produces meaningful variations without needing AI story generation.

Technically, reuse `teaching_examples`, their annotations, and `ExampleReadingWorkspace`. Add a small scene definition whose hotspots point to annotation IDs and optional exercises, with a connection to saved drafts. Keep annotation anchors tied to a text version; editing a source must flag stale anchors rather than silently moving comments. Avoid a second independent annotation system. Evidence: [existing reader](../components/writer/example-reading-workspace.tsx), [example model](../lib/teaching-examples/types.ts), [anchor helpers](../lib/teaching-examples/anchors.ts).

The scene must also work as an ordered list with keyboard and touch controls. Notes should remain open when selected, be dismissible, and never obscure the only copy of a passage. Provide a plain reading option and respect reduced motion. These are requirements for the future scene, not claims of verified current accessibility.

The prompt library can begin with Mark-curated combinations. The repository already contains optional AI snippet triage, but the proposed park and writing exercises can work without calling it. If AI assistance expands later, keep it optional, teacher-directed and explicit about what text is sent; the core writing loop should remain usable without it.

**Recommended order**

First, verify and repair access control, password recovery and draft protection. Next, prove one complete workshop loop on Netlify Database and Identity, measure the cost, and migrate with a rehearsed rollback. Then build one annotated park scene linked to an actual writing response. Expand the world only after a small student pilot shows that writers can move comfortably from noticing a technique to trying it themselves.
