-- Hotfix: allow writers to delete only their own submitted drafts.

begin;

drop policy if exists "writers delete own submitted submissions" on public.submissions;

create policy "writers delete own submitted submissions"
on public.submissions for delete
using (
  author_id = auth.uid()
  and status = 'submitted'
);

commit;
