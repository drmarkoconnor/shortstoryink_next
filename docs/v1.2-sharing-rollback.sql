-- EMERGENCY ROLLBACK REFERENCE ONLY — do not run during normal deploy.
-- Purpose: immediately restore manuscript visibility to owner/editor only
-- without destroying v1.2 share/reader-response data.
--
-- Run only against the confirmed production database and only after taking
-- the normal database snapshot.

begin;

drop policy if exists "private workshop submissions" on public.submissions;

create policy "private workshop submissions" on public.submissions as restrictive
for select to public using (
  studio_auth.uid() is not null
  and (
    author_id = studio_auth.uid()
    or private.workshop_is_teacher()
  )
);

commit;

-- After this policy change:
-- - writers retain access to their own manuscripts;
-- - editors/admins retain access;
-- - explicitly shared peers can no longer read manuscripts;
-- - submission_share_recipients and reader_responses remain preserved;
-- - application code may be reverted separately after privacy is restored.
