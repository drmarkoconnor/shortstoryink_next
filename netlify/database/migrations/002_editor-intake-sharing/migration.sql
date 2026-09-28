-- v1.2: editor intake, selective workshop sharing, and reader responses.
-- Additive migration. Netlify owns the surrounding transaction; do not BEGIN or COMMIT here.
set local search_path = public;

-- Editor-imported manuscripts use the existing submissions table so ownership,
-- version history, editorial feedback and revision remain one coherent flow.
alter table public.submissions drop constraint if exists submissions_source_check;
alter table public.submissions
  add constraint submissions_source_check
  check (source in ('workshop','editor_import'));
alter table public.submissions
  add column if not exists sharing_started_at timestamptz;

create table public.submission_share_recipients (
  submission_id uuid not null references public.submissions(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  shared_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (submission_id, recipient_id)
);

create table public.reader_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reader_responses_body_check check (char_length(btrim(body)) > 0),
  constraint reader_responses_one_per_reader unique (submission_id, author_id)
);

create index submission_share_recipient_idx
  on public.submission_share_recipients(recipient_id, created_at desc);
create index reader_responses_submission_created_idx
  on public.reader_responses(submission_id, created_at);
create index reader_responses_author_created_idx
  on public.reader_responses(author_id, created_at desc);

create trigger reader_responses_set_updated_at
before update on public.reader_responses
for each row execute function public.set_updated_at();

alter table public.submission_share_recipients enable row level security;
alter table public.reader_responses enable row level security;

grant select on public.submission_share_recipients to studio_authenticated, netlifydb_owner;
grant select on public.reader_responses to studio_authenticated, netlifydb_owner;
grant insert, update, delete on public.submission_share_recipients to netlifydb_owner;
grant insert, update, delete on public.reader_responses to netlifydb_owner;

-- These definer helpers deliberately answer only narrow access questions. They
-- avoid RLS recursion when the submissions policy checks explicit recipients.
create or replace function private.submission_is_owned_by(p_submission_id uuid, p_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_profile_id is not null and exists (
    select 1 from public.submissions s
    where s.id = p_submission_id and s.author_id = p_profile_id
  );
$$;

create or replace function private.can_read_shared_submission(p_submission_id uuid, p_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_profile_id is not null and exists (
    select 1
    from public.submissions s
    join public.workshops w on w.id = s.workshop_id
    join public.submission_share_recipients r
      on r.submission_id = s.id and r.recipient_id = p_profile_id
    join public.workshop_members m
      on m.workshop_id = s.workshop_id and m.profile_id = p_profile_id
    join public.profiles p
      on p.id = p_profile_id and p.role::text = 'writer'
    where s.id = p_submission_id
      and s.author_id <> p_profile_id
      and coalesce(w.slug,'') <> 'authorised-basic-user'
      and lower(btrim(w.title)) <> 'authorised basic user'
  );
$$;

revoke all on function private.submission_is_owned_by(uuid,uuid) from public;
revoke all on function private.can_read_shared_submission(uuid,uuid) from public;
grant execute on function private.submission_is_owned_by(uuid,uuid) to studio_authenticated, netlifydb_owner;
grant execute on function private.can_read_shared_submission(uuid,uuid) to studio_authenticated, netlifydb_owner;

drop policy if exists "private workshop submissions" on public.submissions;
create policy "private workshop submissions" on public.submissions as restrictive
for select to public using (
  (select studio_auth.uid()) is not null and (
    author_id = (select studio_auth.uid())
    or (select private.workshop_is_teacher())
    or private.can_read_shared_submission(id, (select studio_auth.uid()))
  )
);

create policy "share recipients visible only to participants" on public.submission_share_recipients
as restrictive for select to public using (
  (select studio_auth.uid()) is not null and (
    (select private.workshop_is_teacher())
    or recipient_id = (select studio_auth.uid())
    or private.submission_is_owned_by(submission_id, (select studio_auth.uid()))
  )
);

create policy "reader responses visible only to author responder or editor" on public.reader_responses
as restrictive for select to public using (
  (select studio_auth.uid()) is not null and (
    (select private.workshop_is_teacher())
    or private.submission_is_owned_by(submission_id, (select studio_auth.uid()))
    or (
      author_id = (select studio_auth.uid())
      and private.can_read_shared_submission(submission_id, (select studio_auth.uid()))
    )
  )
);

-- Sharing is replaced atomically with an explicit recipient snapshot. "Everyone"
-- therefore means everyone eligible at the moment the writer chooses to share.
create or replace function public.set_submission_sharing(
  p_actor_id uuid,
  p_submission_id uuid,
  p_recipient_ids uuid[]
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  piece public.submissions%rowtype;
  recipients uuid[];
  old_ids uuid[];
  added_ids uuid[];
  removed_ids uuid[];
  eligible_count integer;
begin
  select * into piece from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission unavailable.' using errcode = '42501'; end if;

  if p_actor_id <> piece.author_id and not exists (
    select 1 from public.profiles where id = p_actor_id and role::text in ('teacher','admin')
  ) then
    raise exception 'Only the writer or editor can change sharing.' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.workshops w where w.id = piece.workshop_id
      and (coalesce(w.slug,'') = 'authorised-basic-user'
        or lower(btrim(w.title)) = 'authorised basic user')
  ) then
    raise exception 'Authorised Basic User is not a sharing group.' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct x order by x), '{}'::uuid[])
    into recipients from unnest(coalesce(p_recipient_ids,'{}'::uuid[])) x;

  if cardinality(recipients) < 1 then
    raise exception 'Choose at least one writer, or stop sharing instead.' using errcode = '22023';
  end if;
  if piece.author_id = any(recipients) then
    raise exception 'A writer cannot share a piece with themselves.' using errcode = '22023';
  end if;

  select count(*) into eligible_count
  from unnest(recipients) selected(id)
  join public.workshop_members m
    on m.workshop_id = piece.workshop_id and m.profile_id = selected.id
  join public.profiles p on p.id = selected.id and p.role::text = 'writer';

  if eligible_count <> cardinality(recipients) then
    raise exception 'Every selected reader must be a current writer in this group.' using errcode = '42501';
  end if;

  select coalesce(array_agg(recipient_id order by recipient_id), '{}'::uuid[])
    into old_ids
  from public.submission_share_recipients where submission_id = piece.id;

  select coalesce(array_agg(x order by x), '{}'::uuid[]) into added_ids
  from unnest(recipients) x where not (x = any(old_ids));
  select coalesce(array_agg(x order by x), '{}'::uuid[]) into removed_ids
  from unnest(old_ids) x where not (x = any(recipients));

  delete from public.submission_share_recipients
    where submission_id = piece.id and not (recipient_id = any(recipients));

  insert into public.submission_share_recipients(submission_id,recipient_id,shared_by)
  select piece.id, x, p_actor_id from unnest(recipients) x
  on conflict (submission_id,recipient_id) do nothing;

  update public.submissions
    set sharing_started_at = coalesce(sharing_started_at, now())
    where id = piece.id;

  return jsonb_build_object(
    'submissionId', piece.id,
    'recipientIds', to_jsonb(recipients),
    'addedRecipientIds', to_jsonb(added_ids),
    'removedRecipientIds', to_jsonb(removed_ids)
  );
end;
$$;

create or replace function public.stop_submission_sharing(
  p_actor_id uuid,
  p_submission_id uuid
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  piece public.submissions%rowtype;
  removed_ids uuid[];
begin
  select * into piece from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission unavailable.' using errcode = '42501'; end if;
  if p_actor_id <> piece.author_id and not exists (
    select 1 from public.profiles where id = p_actor_id and role::text in ('teacher','admin')
  ) then
    raise exception 'Only the writer or editor can stop sharing.' using errcode = '42501';
  end if;
  select coalesce(array_agg(recipient_id order by recipient_id), '{}'::uuid[])
    into removed_ids from public.submission_share_recipients where submission_id = piece.id;
  delete from public.submission_share_recipients where submission_id = piece.id;
  return jsonb_build_object('submissionId',piece.id,'removedRecipientIds',to_jsonb(removed_ids));
end;
$$;

create or replace function public.save_reader_response(
  p_actor_id uuid,
  p_submission_id uuid,
  p_body text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  response_id uuid;
  was_created boolean;
begin
  if p_body is null or btrim(p_body) = '' then
    raise exception 'Write a response before saving.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_actor_id and role::text = 'writer'
  ) or not private.can_read_shared_submission(p_submission_id,p_actor_id) then
    raise exception 'This piece is not currently shared with you.' using errcode = '42501';
  end if;

  was_created := not exists (
    select 1 from public.reader_responses
    where submission_id = p_submission_id and author_id = p_actor_id
  );

  insert into public.reader_responses(submission_id,author_id,body)
  values(p_submission_id,p_actor_id,btrim(p_body))
  on conflict(submission_id,author_id)
  do update set body=excluded.body, updated_at=now()
  returning id into response_id;

  return jsonb_build_object('id',response_id,'created',was_created);
end;
$$;

create or replace function public.remove_reader_response(
  p_actor_id uuid,
  p_submission_id uuid
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare removed_id uuid;
begin
  if not private.can_read_shared_submission(p_submission_id,p_actor_id) then
    raise exception 'This piece is not currently shared with you.' using errcode = '42501';
  end if;
  delete from public.reader_responses
  where submission_id=p_submission_id and author_id=p_actor_id
  returning id into removed_id;
  return jsonb_build_object('id',removed_id);
end;
$$;

create or replace function public.moderate_reader_response(
  p_teacher_id uuid,
  p_response_id uuid
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare removed_submission_id uuid;
begin
  if not exists (
    select 1 from public.profiles where id=p_teacher_id and role::text in ('teacher','admin')
  ) then
    raise exception 'Editor access required.' using errcode = '42501';
  end if;
  delete from public.reader_responses where id=p_response_id
  returning submission_id into removed_submission_id;
  return jsonb_build_object('submissionId',removed_submission_id);
end;
$$;

-- Editor intake deliberately creates a normal submission owned by the nominated
-- writer. From that point the existing feedback and revision flow is reused.
create or replace function public.create_editor_assigned_submission(
  p_teacher_id uuid,
  p_author_id uuid,
  p_request_id uuid,
  p_title text,
  p_body text,
  p_workshop_id uuid default null,
  p_source_id uuid default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  source_piece public.submissions%rowtype;
  prior public.submissions%rowtype;
  root_id uuid;
  group_id uuid;
  group_slug text;
  group_title text;
  next_version integer := 1;
  new_id uuid;
begin
  if not exists (
    select 1 from public.profiles where id=p_teacher_id and role::text in ('teacher','admin')
  ) then raise exception 'Editor access required.' using errcode='42501'; end if;
  if p_author_id is null or p_request_id is null or p_title is null or btrim(p_title)=''
     or p_body is null or btrim(p_body)='' then
    raise exception 'Writer, title, manuscript and request ID are required.' using errcode='22023';
  end if;

  perform 1 from public.profiles where id=p_author_id and role::text='writer' for update;
  if not found then raise exception 'Choose a writer account.' using errcode='42501'; end if;

  if p_source_id is not null then
    select * into source_piece from public.submissions
      where id=p_source_id and author_id=p_author_id for update;
    if not found then raise exception 'Revision source is unavailable.' using errcode='42501'; end if;
    if source_piece.status::text <> 'feedback_published' then
      raise exception 'Only published feedback can start a revision.' using errcode='22023';
    end if;
    root_id := coalesce(source_piece.parent_submission_id,source_piece.id);
    group_id := source_piece.workshop_id;
  else
    group_id := p_workshop_id;
  end if;

  if not exists (
    select 1 from public.workshop_members where profile_id=p_author_id and workshop_id=group_id
  ) then raise exception 'The writer must belong to the selected group.' using errcode='42501'; end if;

  select slug,title into group_slug,group_title from public.workshops where id=group_id;
  if not found then raise exception 'Writing group unavailable.' using errcode='42501'; end if;
  if (group_slug='authorised-basic-user' or lower(btrim(group_title))='authorised basic user')
     and (select count(*) from regexp_matches(p_body,'\S+','g')) > 2000 then
    raise exception 'Please shorten this manuscript to 2,000 words before adding it.' using errcode='22023';
  end if;

  select * into prior from public.submissions
    where author_id=p_author_id and client_request_id=p_request_id;
  if found then
    if prior.title is distinct from btrim(p_title) or prior.body is distinct from p_body
      or prior.workshop_id is distinct from group_id
      or prior.parent_submission_id is distinct from root_id
      or prior.source is distinct from 'editor_import' then
      raise exception 'This intake request was already saved with different content.' using errcode='22023';
    end if;
    return jsonb_build_object('id',prior.id,'version',prior.version,'created',false);
  end if;

  if p_source_id is not null then
    if exists (
      select 1 from public.submissions
      where author_id=p_author_id
        and coalesce(parent_submission_id,id)=root_id
        and version>source_piece.version
    ) then raise exception 'A newer version already exists.' using errcode='22023'; end if;
    select max(version)+1 into next_version from public.submissions
      where author_id=p_author_id and coalesce(parent_submission_id,id)=root_id;
  end if;

  insert into public.submissions(
    author_id,workshop_id,parent_submission_id,title,body,status,version,client_request_id,source
  ) values (
    p_author_id,group_id,root_id,btrim(p_title),p_body,'submitted',next_version,p_request_id,'editor_import'
  ) returning id into new_id;

  return jsonb_build_object('id',new_id,'version',next_version,'created',true);
end;
$$;

create or replace function public.correct_editor_assigned_submission(
  p_teacher_id uuid,
  p_submission_id uuid,
  p_author_id uuid,
  p_workshop_id uuid,
  p_title text,
  p_body text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  piece public.submissions%rowtype;
  group_slug text;
  group_title text;
begin
  if not exists (
    select 1 from public.profiles where id=p_teacher_id and role::text in ('teacher','admin')
  ) then raise exception 'Editor access required.' using errcode='42501'; end if;

  select * into piece from public.submissions where id=p_submission_id for update;
  if not found or piece.source <> 'editor_import' then
    raise exception 'Only editor-added pieces can be corrected here.' using errcode='42501';
  end if;
  if piece.status::text <> 'submitted' or piece.sharing_started_at is not null
     or exists(select 1 from public.feedback_items where submission_id=piece.id)
     or exists(select 1 from public.submission_share_recipients where submission_id=piece.id)
     or exists(select 1 from public.reader_responses where submission_id=piece.id) then
    raise exception 'This manuscript is already in use and can no longer be altered.' using errcode='22023';
  end if;
  if p_title is null or btrim(p_title)='' or p_body is null or btrim(p_body)='' then
    raise exception 'Title and manuscript are required.' using errcode='22023';
  end if;
  if piece.parent_submission_id is not null
     and (p_author_id is distinct from piece.author_id or p_workshop_id is distinct from piece.workshop_id) then
    raise exception 'A revision must remain with the same writer and group.' using errcode='22023';
  end if;
  if not exists(select 1 from public.profiles where id=p_author_id and role::text='writer') then
    raise exception 'Choose a writer account.' using errcode='42501';
  end if;
  if not exists(
    select 1 from public.workshop_members where profile_id=p_author_id and workshop_id=p_workshop_id
  ) then raise exception 'The writer must belong to the selected group.' using errcode='42501'; end if;

  select slug,title into group_slug,group_title from public.workshops where id=p_workshop_id;
  if (group_slug='authorised-basic-user' or lower(btrim(group_title))='authorised basic user')
     and (select count(*) from regexp_matches(p_body,'\S+','g')) > 2000 then
    raise exception 'Please shorten this manuscript to 2,000 words.' using errcode='22023';
  end if;

  update public.submissions
    set author_id=p_author_id, workshop_id=p_workshop_id, title=btrim(p_title), body=p_body
    where id=piece.id;

  return jsonb_build_object('id',piece.id);
end;
$$;

-- Once an imported manuscript has entered review or has ever been shared, its
-- identity/text is immutable. A group deletion may still move it safely to ABU.
create or replace function private.guard_editor_import_mutation()
returns trigger language plpgsql security invoker set search_path='' as $$
declare new_is_abu boolean := false;
begin
  if old.source <> 'editor_import' then return new; end if;
  if new.author_id is not distinct from old.author_id
     and new.workshop_id is not distinct from old.workshop_id
     and new.title is not distinct from old.title
     and new.body is not distinct from old.body then
    return new;
  end if;

  if new.workshop_id is distinct from old.workshop_id
     and new.author_id is not distinct from old.author_id
     and new.title is not distinct from old.title
     and new.body is not distinct from old.body then
    select exists(
      select 1 from public.workshops w where w.id=new.workshop_id
      and (coalesce(w.slug,'')='authorised-basic-user'
        or lower(btrim(w.title))='authorised basic user')
    ) into new_is_abu;
    if new_is_abu then return new; end if;
  end if;

  if old.status::text <> 'submitted' or old.sharing_started_at is not null
     or exists(select 1 from public.feedback_items where submission_id=old.id)
     or exists(select 1 from public.submission_share_recipients where submission_id=old.id)
     or exists(select 1 from public.reader_responses where submission_id=old.id) then
    raise exception 'This imported manuscript is already in use and is locked.' using errcode='22023';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_editor_import_mutation() from public;
grant execute on function private.guard_editor_import_mutation() to studio_authenticated, netlifydb_owner;
create trigger guard_editor_import_mutation
before update of author_id,workshop_id,title,body on public.submissions
for each row execute function private.guard_editor_import_mutation();

create or replace function private.clear_sharing_after_group_change()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.workshop_id is distinct from old.workshop_id then
    delete from public.submission_share_recipients where submission_id=new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.clear_sharing_after_group_change() from public;
grant execute on function private.clear_sharing_after_group_change() to studio_authenticated, netlifydb_owner;
create trigger clear_sharing_after_group_change
after update of workshop_id on public.submissions
for each row execute function private.clear_sharing_after_group_change();

create or replace function private.revoke_shares_on_membership_removal()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  delete from public.submission_share_recipients r
  using public.submissions s
  where r.submission_id=s.id
    and s.workshop_id=old.workshop_id
    and (
      r.recipient_id=old.profile_id
      or s.author_id=old.profile_id
    );
  return old;
end;
$$;
revoke all on function private.revoke_shares_on_membership_removal() from public;
grant execute on function private.revoke_shares_on_membership_removal() to studio_authenticated, netlifydb_owner;
create trigger revoke_shares_on_membership_removal
after delete on public.workshop_members
for each row execute function private.revoke_shares_on_membership_removal();

revoke all on function public.set_submission_sharing(uuid,uuid,uuid[]) from public,studio_anon,studio_authenticated;
revoke all on function public.stop_submission_sharing(uuid,uuid) from public,studio_anon,studio_authenticated;
revoke all on function public.save_reader_response(uuid,uuid,text) from public,studio_anon,studio_authenticated;
revoke all on function public.remove_reader_response(uuid,uuid) from public,studio_anon,studio_authenticated;
revoke all on function public.moderate_reader_response(uuid,uuid) from public,studio_anon,studio_authenticated;
revoke all on function public.create_editor_assigned_submission(uuid,uuid,uuid,text,text,uuid,uuid) from public,studio_anon,studio_authenticated;
revoke all on function public.correct_editor_assigned_submission(uuid,uuid,uuid,uuid,text,text) from public,studio_anon,studio_authenticated;

grant execute on function public.set_submission_sharing(uuid,uuid,uuid[]) to netlifydb_owner;
grant execute on function public.stop_submission_sharing(uuid,uuid) to netlifydb_owner;
grant execute on function public.save_reader_response(uuid,uuid,text) to netlifydb_owner;
grant execute on function public.remove_reader_response(uuid,uuid) to netlifydb_owner;
grant execute on function public.moderate_reader_response(uuid,uuid) to netlifydb_owner;
grant execute on function public.create_editor_assigned_submission(uuid,uuid,uuid,text,text,uuid,uuid) to netlifydb_owner;
grant execute on function public.correct_editor_assigned_submission(uuid,uuid,uuid,uuid,text,text) to netlifydb_owner;
