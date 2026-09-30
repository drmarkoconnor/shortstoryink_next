# shortstory.ink v1.2 — editor intake and selective group sharing

## Release intent

This release adds two connected routes into the existing manuscript → editorial feedback → revision loop:

1. **Editor intake**: an editor may paste work received elsewhere and assign it to the writer who owns it.
2. **Selective group sharing**: a writer may keep a manuscript version private or share it with selected current members of its real writing group.

Neither feature replaces the existing writer submission flow.

## Product rules

- Manuscripts remain private by default.
- ABU is an access baseline, not a sharing group.
- “Select everyone” means all other current writers in the manuscript's real group at that moment.
- Future group members do not inherit old shares.
- Sharing is specific to one manuscript version.
- Leaving a group revokes sharing access; rejoining does not restore old grants automatically.
- Peers read a clean manuscript and leave one whole-piece reader response.
- Peers never see editorial inline comments or feedback summaries.
- Reader responses are visible to the manuscript author, responder and editor, not to other readers.
- Imported manuscripts are owned by the nominated writer and marked `editor_import`.
- An imported manuscript may be corrected only before sharing or editorial commenting begins.
- Once imported onto the desk, writer ownership is fixed.

## Release gate

Before merge:

- Typecheck passes.
- Workshop/database regression tests pass, including migration 002.
- Lint passes.
- Production build passes.
- Netlify Deploy Preview is ready.
- Migration 002 applies successfully to the preview database branch.
- Preview sends no real notification emails.
- Automated privacy checks demonstrate:
  - an unselected same-group writer cannot read the manuscript;
  - a selected current group writer can;
  - another-group writer cannot;
  - ABU cannot be shared;
  - leaving/rejoining does not restore an old grant;
  - peer readers cannot see editorial feedback;
  - peer readers cannot see one another's responses;
  - manuscript author and editor can see reader responses.
- Existing writer submission, feedback publication and revision tests remain green.

## Mark's focused acceptance check

Mark should use only his normal editor account in Deploy Preview and inspect:

1. Editorial Desk → **Add a writer's piece**.
2. Select a writer and real writing group.
3. Paste and tidy a manuscript.
4. Review it before committing.
5. Confirm private is the default.
6. Optionally open sharing and confirm all current fellow writers are initially selected and can be deselected.
7. Add it to the desk.
8. Confirm it opens in the normal editorial reading workspace.
9. For a still-private untouched import, confirm **Correct imported piece** is available.

Do not require Mark to switch between dummy writer accounts or check several inboxes.

## Production deployment

Before merge, take/confirm the normal Netlify database snapshot. After merge:

- verify production deploy is `ready`;
- verify migration 002 is reported as applied;
- verify sign-in page is available;
- run the automated v1.2 privacy/workflow rehearsal using temporary fixtures only;
- remove all fixtures and verify cleanup;
- verify no unexpected notification email was sent by preview/test runs.

## Rollback strategy

The privacy-first rollback is to restore manuscript SELECT access to **owner or editor only** while leaving the new tables intact. That immediately disables peer manuscript reading without destroying sharing/response records.

Use the SQL in `docs/v1.2-sharing-rollback.sql` only if a production privacy fault requires emergency rollback. Application UI can then be reverted independently.
