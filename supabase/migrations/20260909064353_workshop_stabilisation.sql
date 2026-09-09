-- Additive stabilisation of the modern workshop. Apply once, after taking a backup.
-- Do NOT replay the historical reset/seed migrations into an existing project.
begin;

-- Harden the existing timestamp helper and Supabase's optional DDL trigger.
alter function public.set_updated_at() set search_path = '';
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- The definer is restricted to a boolean lookup for the verified request user.
-- Keeping it outside exposed schemas avoids the profiles-policy recursion.
create or replace function private.workshop_is_teacher()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles where id = auth.uid() and role::text in ('teacher', 'admin')
  );
$$;
revoke all on function private.workshop_is_teacher() from public;
grant execute on function private.workshop_is_teacher() to anon, authenticated, service_role;

-- Preserve both historical policy helper names without exposed definer functions.
create or replace function public.current_user_is_teacher()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.workshop_is_teacher();
$$;
create or replace function public.is_teacher()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.workshop_is_teacher();
$$;
revoke all on function public.current_user_is_teacher(), public.is_teacher() from public;
grant execute on function public.current_user_is_teacher(), public.is_teacher() to anon, authenticated, service_role;

-- Remove table AND pre-existing column grants. RLS alone cannot protect role.
revoke insert, update, delete on public.profiles from public, anon, authenticated;
do $$ declare col record; begin
  for col in select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
  loop
    execute format('revoke insert (%I), update (%I) on public.profiles from public, anon, authenticated', col.column_name, col.column_name);
  end loop;
end $$;
grant update (display_name) on public.profiles to authenticated;
create policy "profile update stays with owner" on public.profiles as restrictive
for update to public using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Restrictive gates constrain ALL historical permissive policies, including unknown hotfixes.
create policy "private workshop submissions" on public.submissions as restrictive
for select to public using (
  (select auth.uid()) is not null and
  (author_id = (select auth.uid()) or (select private.workshop_is_teacher()))
);
create policy "private published feedback items" on public.feedback_items as restrictive
for select to public using (
  (select auth.uid()) is not null and (
    (select private.workshop_is_teacher()) or exists (
      select 1 from public.submissions s where s.id = submission_id
      and s.author_id = (select auth.uid()) and s.status::text = 'feedback_published'
    )
  )
);
create policy "private published feedback summaries" on public.feedback_summaries as restrictive
for select to public using (
  (select auth.uid()) is not null and (
    (select private.workshop_is_teacher()) or (published_at is not null and exists (
      select 1 from public.submissions s where s.id = submission_id
      and s.author_id = (select auth.uid()) and s.status::text = 'feedback_published'
    ))
  )
);

create policy "examples respect enabled groups" on public.teaching_examples as restrictive
for select to public using (
  (select auth.uid()) is not null and (
    (select private.workshop_is_teacher()) or (status = 'published' and exists (
      select 1 from public.workshop_members m
      where m.profile_id = (select auth.uid()) and not exists (
        select 1 from public.teaching_example_hidden_groups h
        where h.example_id = teaching_examples.id and h.workshop_id = m.workshop_id
      )
    ))
  )
);
create policy "annotation follows example visibility" on public.teaching_example_annotations as restrictive
for select to public using (
  (select auth.uid()) is not null and (
    (select private.workshop_is_teacher()) or exists (
      select 1 from public.teaching_examples e where e.id = example_id and e.status = 'published'
    )
  )
);
create policy "hidden groups visible to relevant members" on public.teaching_example_hidden_groups as restrictive
for select to public using (
  (select auth.uid()) is not null and (
    (select private.workshop_is_teacher()) or exists (
      select 1 from public.workshop_members m
      where m.workshop_id = teaching_example_hidden_groups.workshop_id and m.profile_id = (select auth.uid())
    )
  )
);

-- New writes go through server-only operations, preventing direct API quota/status bypass.
create policy "submission inserts through server only" on public.submissions as restrictive
for insert to public with check (false);

alter table public.submissions add column client_request_id uuid;
create unique index submissions_request_id_unique on public.submissions(author_id, client_request_id)
where client_request_id is not null;
-- Abort safely if an existing chain has duplicate versions: resolve explicitly, never renumber automatically.
create unique index submissions_chain_version_unique
on public.submissions ((coalesce(parent_submission_id, id)), version);

-- Comments and publication take the same parent-row lock. A comment saved just
-- before publication is included; one arriving afterwards is rejected.
create function private.guard_workshop_feedback() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare target_id uuid; piece_status text;
begin
  if TG_OP = 'UPDATE' and new.submission_id is distinct from old.submission_id then
    raise exception 'Feedback cannot be moved to another submission.' using errcode = '22023';
  end if;
  if TG_OP = 'DELETE' then target_id := old.submission_id;
  else target_id := new.submission_id; end if;
  select status::text into piece_status from public.submissions where id = target_id for update;
  if not found then
    -- Allow an authorised parent deletion to cascade through its comments.
    if TG_OP = 'DELETE' then return old; end if;
    raise exception 'Submission unavailable.' using errcode = '42501';
  end if;
  if piece_status = 'feedback_published' then
    raise exception 'Published feedback is locked. Start a new revision.' using errcode = '22023';
  end if;
  if TG_OP = 'INSERT' and piece_status = 'submitted' then
    update public.submissions set status = 'in_review' where id = target_id;
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.guard_workshop_feedback() from public;
grant execute on function private.guard_workshop_feedback() to authenticated, service_role;
create trigger guard_workshop_feedback before insert or update or delete
on public.feedback_items for each row execute function private.guard_workshop_feedback();

-- Service-role-only SECURITY INVOKER: application authenticates caller and passes its verified ID.
-- Serialise each writer's creates/retries without relying on browser disabling a button.
create function public.submit_workshop_draft(
  p_author_id uuid, p_request_id uuid, p_title text, p_body text,
  p_workshop_id uuid default null, p_source_id uuid default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  source public.submissions%rowtype;
  prior public.submissions%rowtype;
  root_id uuid;
  group_id uuid;
  group_slug text;
  group_title text;
  next_version integer := 1;
  new_id uuid;
begin
  if p_author_id is null or p_request_id is null or p_title is null or btrim(p_title) = ''
    or p_body is null or btrim(p_body) = '' then
    raise exception 'A title, manuscript and request ID are required.' using errcode = '22023';
  end if;
  perform 1 from public.profiles where id = p_author_id and role::text = 'writer' for update;
  if not found then raise exception 'Writer access required.' using errcode = '42501'; end if;
  if p_source_id is not null then
    select * into source from public.submissions where id = p_source_id and author_id = p_author_id;
    if not found then raise exception 'Source is unavailable.' using errcode = '42501'; end if;
    root_id := coalesce(source.parent_submission_id, source.id);
    group_id := source.workshop_id;
  else
    group_id := p_workshop_id;
  end if;
  select * into prior from public.submissions where author_id = p_author_id and client_request_id = p_request_id;
  if found then
    if prior.title is distinct from btrim(p_title) or prior.body is distinct from p_body
      or prior.workshop_id is distinct from group_id or prior.parent_submission_id is distinct from root_id then
      raise exception 'This request was already saved with different content. Start a new draft.' using errcode = '22023';
    end if;
    return jsonb_build_object('id', prior.id, 'version', prior.version, 'created', false);
  end if;
  if not exists (select 1 from public.workshop_members where profile_id = p_author_id and workshop_id = group_id) then
    raise exception 'You can only submit to your assigned groups.' using errcode = '42501';
  end if;
  select slug, title into group_slug, group_title from public.workshops where id = group_id;
  if (group_slug = 'authorised-basic-user' or lower(btrim(group_title)) = 'authorised basic user')
    and (select count(*) from regexp_matches(p_body, '\S+', 'g')) > 2000 then
    raise exception 'Please shorten your manuscript to 2,000 words before submitting.' using errcode = '22023';
  end if;
  if p_source_id is not null then
    perform 1 from public.submissions where id = root_id and author_id = p_author_id for update;
    if not found then raise exception 'Revision history is unavailable.' using errcode = '42501'; end if;
    if source.status::text <> 'feedback_published' then
      raise exception 'Only published feedback can start a revision.' using errcode = '22023';
    end if;
    if exists (select 1 from public.submissions where author_id = p_author_id
      and coalesce(parent_submission_id, id) = root_id and version > source.version) then
      raise exception 'A newer version already exists. Open its latest feedback before submitting another revision.' using errcode = '22023';
    end if;
    select max(version) + 1 into next_version from public.submissions
    where author_id = p_author_id and coalesce(parent_submission_id, id) = root_id;
  end if;
  insert into public.submissions(author_id, workshop_id, parent_submission_id, title, body, status, version, client_request_id)
  values (p_author_id, group_id, root_id, btrim(p_title), p_body, 'submitted', next_version, p_request_id)
  returning id into new_id;
  return jsonb_build_object('id', new_id, 'version', next_version, 'created', true);
end;
$$;
revoke all on function public.submit_workshop_draft(uuid, uuid, text, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.submit_workshop_draft(uuid, uuid, text, text, uuid, uuid) to service_role;

create function public.publish_workshop_feedback(p_teacher_id uuid, p_submission_id uuid, p_summary text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  piece public.submissions%rowtype;
  prior public.feedback_summaries%rowtype;
  summary_text text := coalesce(nullif(btrim(p_summary), ''), 'Feedback published. See inline comments for detail.');
  published_time timestamptz := now();
begin
  if not exists (select 1 from public.profiles where id = p_teacher_id and role::text in ('teacher', 'admin')) then
    raise exception 'Teacher access required.' using errcode = '42501';
  end if;
  select * into piece from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission unavailable.' using errcode = '22023'; end if;
  if not exists (select 1 from public.feedback_items where submission_id = p_submission_id) then
    raise exception 'Add at least one feedback comment before publishing.' using errcode = '22023';
  end if;
  select * into prior from public.feedback_summaries where submission_id = p_submission_id;
  if piece.status::text = 'feedback_published' and prior.published_at is not null and prior.summary = summary_text then
    return jsonb_build_object('publishedAt', prior.published_at, 'changed', false);
  end if;
  if piece.status::text = 'feedback_published' then
    raise exception 'Published feedback is locked. Start a new revision.' using errcode = '22023';
  end if;
  insert into public.feedback_summaries(submission_id, author_id, summary, published_at)
  values (p_submission_id, p_teacher_id, summary_text, published_time)
  on conflict (submission_id) do update set author_id = excluded.author_id, summary = excluded.summary, published_at = excluded.published_at;
  update public.submissions set status = 'feedback_published' where id = p_submission_id;
  return jsonb_build_object('publishedAt', published_time, 'changed', true);
end;
$$;
revoke all on function public.publish_workshop_feedback(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.publish_workshop_feedback(uuid, uuid, text) to service_role;
commit;
