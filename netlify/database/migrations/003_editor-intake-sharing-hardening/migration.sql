-- v1.2 hardening after migration 002 was applied to the preview branch.
-- Keep applied migrations immutable; this migration only refines policies/functions.

create or replace function private.is_submission_author(
  p_submission_id uuid,
  p_profile_id uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_profile_id is not null and exists (
    select 1 from public.submissions s
    where s.id = p_submission_id and s.author_id = p_profile_id
  );
$$;

create or replace function private.can_read_shared_submission(
  p_submission_id uuid,
  p_profile_id uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_profile_id is not null and exists (
    select 1
    from public.submission_share_recipients sr
    join public.submissions s on s.id = sr.submission_id
    join public.workshop_members wm
      on wm.profile_id = sr.recipient_id
     and wm.workshop_id = s.workshop_id
    join public.workshops w on w.id = s.workshop_id
    where sr.submission_id = p_submission_id
      and sr.recipient_id = p_profile_id
      and coalesce(w.slug,'') <> 'authorised-basic-user'
      and lower(btrim(w.title)) <> 'authorised basic user'
  );
$$;

revoke all on function private.is_submission_author(uuid,uuid) from public;
revoke all on function private.can_read_shared_submission(uuid,uuid) from public;
grant execute on function private.is_submission_author(uuid,uuid) to studio_anon, studio_authenticated, netlifydb_owner;
grant execute on function private.can_read_shared_submission(uuid,uuid) to studio_anon, studio_authenticated, netlifydb_owner;

drop policy if exists "share rows visible to participants and editors" on public.submission_share_recipients;
create policy "share rows visible to participants and editors"
on public.submission_share_recipients
for select to studio_authenticated
using (
  recipient_id = studio_auth.uid()
  or shared_by = studio_auth.uid()
  or private.is_submission_author(submission_id, studio_auth.uid())
  or public.current_user_is_teacher()
);

drop policy if exists "reader responses visible to writer responder and editor" on public.reader_responses;
create policy "reader responses visible to writer responder and editor"
on public.reader_responses
for select to studio_authenticated
using (
  author_id = studio_auth.uid()
  or private.is_submission_author(submission_id, studio_auth.uid())
  or public.current_user_is_teacher()
);

drop policy if exists "private workshop submissions" on public.submissions;
create policy "private workshop submissions" on public.submissions as restrictive
for select to public using (
  studio_auth.uid() is not null
  and (
    author_id = studio_auth.uid()
    or private.workshop_is_teacher()
    or private.can_read_shared_submission(id, studio_auth.uid())
  )
);

create or replace function public.delete_reader_response(
  p_actor_id uuid,
  p_submission_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare removed integer;
begin
  if not exists (
    select 1
    from public.submission_share_recipients sr
    join public.submissions s on s.id=sr.submission_id
    join public.workshop_members wm
      on wm.workshop_id=s.workshop_id and wm.profile_id=sr.recipient_id
    where sr.submission_id=p_submission_id and sr.recipient_id=p_actor_id
  ) then
    raise exception 'This piece is not currently shared with you.' using errcode='42501';
  end if;
  delete from public.reader_responses
  where submission_id=p_submission_id and author_id=p_actor_id;
  get diagnostics removed=row_count;
  return jsonb_build_object('removed',removed);
end;
$$;

create or replace function public.correct_editor_assigned_submission(
  p_editor_id uuid,
  p_submission_id uuid,
  p_author_id uuid,
  p_workshop_id uuid,
  p_title text,
  p_body text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare editor_role text; piece public.submissions%rowtype;
begin
  select role::text into editor_role from public.profiles where id=p_editor_id;
  if editor_role not in ('teacher','admin') then
    raise exception 'Editor access required.' using errcode='42501';
  end if;
  select * into piece from public.submissions where id=p_submission_id for update;
  if not found or piece.source<>'editor_import' or piece.status::text<>'submitted' then
    raise exception 'This imported manuscript is no longer editable.' using errcode='22023';
  end if;
  if exists(select 1 from public.feedback_items where submission_id=p_submission_id)
     or exists(select 1 from public.submission_share_recipients where submission_id=p_submission_id)
     or exists(select 1 from public.reader_responses where submission_id=p_submission_id) then
    raise exception 'This manuscript is locked because reading or feedback has begun.' using errcode='22023';
  end if;
  if p_author_id<>piece.author_id then
    raise exception 'Imported manuscript ownership cannot be reassigned after it reaches the desk.' using errcode='22023';
  end if;
  if piece.parent_submission_id is not null and p_workshop_id<>piece.workshop_id then
    raise exception 'A revision cannot be moved to a different writing group.' using errcode='22023';
  end if;
  if not exists(
    select 1 from public.profiles where id=p_author_id and role::text='writer'
  ) or not exists(
    select 1 from public.workshop_members where profile_id=p_author_id and workshop_id=p_workshop_id
  ) then
    raise exception 'Choose a valid writer and writing group.' using errcode='42501';
  end if;
  update public.submissions
  set workshop_id=p_workshop_id,title=btrim(p_title),body=p_body
  where id=p_submission_id;
  return jsonb_build_object('id',p_submission_id);
end;
$$;

revoke all on function public.delete_reader_response(uuid,uuid) from public,studio_anon,studio_authenticated;
revoke all on function public.correct_editor_assigned_submission(uuid,uuid,uuid,uuid,text,text) from public,studio_anon,studio_authenticated;
grant execute on function public.delete_reader_response(uuid,uuid) to netlifydb_owner;
grant execute on function public.correct_editor_assigned_submission(uuid,uuid,uuid,uuid,text,text) to netlifydb_owner;
