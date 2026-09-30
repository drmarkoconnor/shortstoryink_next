-- v1.2: selective group sharing and editor-assigned manuscripts.
-- Additive only. Keep 001_workshop-baseline immutable.

alter table public.submissions drop constraint if exists submissions_source_check;
alter table public.submissions
  add constraint submissions_source_check check (source in ('workshop','editor_import'));

create table public.submission_share_recipients (
  submission_id uuid not null references public.submissions(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  shared_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (submission_id, recipient_id)
);

create table public.reader_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, author_id)
);

create index submission_share_recipients_recipient_idx
  on public.submission_share_recipients(recipient_id, created_at desc);
create index reader_responses_submission_idx
  on public.reader_responses(submission_id, created_at);
create trigger reader_responses_set_updated_at
  before update on public.reader_responses
  for each row execute function public.set_updated_at();

alter table public.submission_share_recipients enable row level security;
alter table public.reader_responses enable row level security;

grant select on public.submission_share_recipients to studio_authenticated;
grant select on public.reader_responses to studio_authenticated;
grant select, insert, update, delete on public.submission_share_recipients to netlifydb_owner;
grant select, insert, update, delete on public.reader_responses to netlifydb_owner;

create policy "share rows visible to participants and editors"
on public.submission_share_recipients
for select to studio_authenticated
using (
  recipient_id = studio_auth.uid()
  or shared_by = studio_auth.uid()
  or exists (
    select 1 from public.submissions s
    where s.id = submission_id and s.author_id = studio_auth.uid()
  )
  or public.current_user_is_teacher()
);

create policy "reader responses visible to writer responder and editor"
on public.reader_responses
for select to studio_authenticated
using (
  author_id = studio_auth.uid()
  or exists (
    select 1 from public.submissions s
    where s.id = submission_id and s.author_id = studio_auth.uid()
  )
  or public.current_user_is_teacher()
);

-- Extend the restrictive manuscript gate: group membership alone is still not enough.
drop policy if exists "private workshop submissions" on public.submissions;
create policy "private workshop submissions" on public.submissions as restrictive
for select to public using (
  studio_auth.uid() is not null
  and (
    author_id = studio_auth.uid()
    or private.workshop_is_teacher()
    or exists (
      select 1
      from public.submission_share_recipients sr
      join public.workshop_members wm
        on wm.profile_id = sr.recipient_id
       and wm.workshop_id = submissions.workshop_id
      join public.workshops w on w.id = submissions.workshop_id
      where sr.submission_id = submissions.id
        and sr.recipient_id = studio_auth.uid()
        and coalesce(w.slug,'') <> 'authorised-basic-user'
        and lower(btrim(w.title)) <> 'authorised basic user'
    )
  )
);

create or replace function private.validate_share_recipient()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  piece public.submissions%rowtype;
  group_slug text;
  group_title text;
begin
  select * into piece from public.submissions where id = new.submission_id;
  if not found then
    raise exception 'Submission unavailable.' using errcode = '42501';
  end if;
  if new.recipient_id = piece.author_id then
    raise exception 'A writer cannot share a piece with themselves.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = new.recipient_id and role::text = 'writer'
  ) then
    raise exception 'Shared recipients must be writers.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.workshop_members
    where workshop_id = piece.workshop_id and profile_id = new.recipient_id
  ) then
    raise exception 'Shared recipients must belong to this writing group.' using errcode = '22023';
  end if;
  select slug, title into group_slug, group_title
  from public.workshops where id = piece.workshop_id;
  if group_slug = 'authorised-basic-user'
     or lower(btrim(group_title)) = 'authorised basic user' then
    raise exception 'Authorised Basic User is not a sharing group.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger validate_share_recipient
before insert or update on public.submission_share_recipients
for each row execute function private.validate_share_recipient();

create or replace function public.set_submission_share_recipients(
  p_actor_id uuid,
  p_submission_id uuid,
  p_recipient_ids uuid[]
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  piece public.submissions%rowtype;
  actor_role text;
  cleaned uuid[];
  recipient uuid;
  before_ids uuid[];
  added_ids uuid[];
begin
  select * into piece from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission unavailable.' using errcode = '22023'; end if;

  select role::text into actor_role from public.profiles where id = p_actor_id;
  if actor_role not in ('teacher','admin') and piece.author_id <> p_actor_id then
    raise exception 'Only the writer or editor can change sharing.' using errcode = '42501';
  end if;

  select array_agg(distinct x) into cleaned
  from unnest(coalesce(p_recipient_ids, array[]::uuid[])) x
  where x is not null;

  if coalesce(array_length(cleaned,1),0) = 0 then
    raise exception 'Choose at least one writer, or stop sharing instead.' using errcode = '22023';
  end if;

  select array_agg(recipient_id order by recipient_id) into before_ids
  from public.submission_share_recipients where submission_id = p_submission_id;

  foreach recipient in array cleaned loop
    perform private.validate_share_recipient_row(p_submission_id, recipient);
  end loop;

  delete from public.submission_share_recipients
  where submission_id = p_submission_id
    and recipient_id <> all(cleaned);

  insert into public.submission_share_recipients(submission_id, recipient_id, shared_by)
  select p_submission_id, x, p_actor_id
  from unnest(cleaned) x
  on conflict (submission_id, recipient_id) do nothing;

  select array_agg(x order by x) into added_ids
  from unnest(cleaned) x
  where not (x = any(coalesce(before_ids,array[]::uuid[])));

  return jsonb_build_object(
    'recipientIds', cleaned,
    'addedRecipientIds', coalesce(added_ids,array[]::uuid[])
  );
end;
$$;

-- Helper callable from the transactional share RPC without depending on trigger NEW.
create or replace function private.validate_share_recipient_row(
  p_submission_id uuid,
  p_recipient_id uuid
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  piece public.submissions%rowtype;
  group_slug text;
  group_title text;
begin
  select * into piece from public.submissions where id = p_submission_id;
  if not found then raise exception 'Submission unavailable.' using errcode = '42501'; end if;
  if p_recipient_id = piece.author_id then
    raise exception 'A writer cannot share a piece with themselves.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id=p_recipient_id and role::text='writer') then
    raise exception 'Shared recipients must be writers.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.workshop_members
    where workshop_id=piece.workshop_id and profile_id=p_recipient_id
  ) then
    raise exception 'Shared recipients must belong to this writing group.' using errcode = '22023';
  end if;
  select slug,title into group_slug,group_title from public.workshops where id=piece.workshop_id;
  if group_slug='authorised-basic-user' or lower(btrim(group_title))='authorised basic user' then
    raise exception 'Authorised Basic User is not a sharing group.' using errcode = '22023';
  end if;
end;
$$;

-- Recreate set_submission_share_recipients now that its helper exists.
create or replace function public.set_submission_share_recipients(
  p_actor_id uuid,
  p_submission_id uuid,
  p_recipient_ids uuid[]
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  piece public.submissions%rowtype;
  actor_role text;
  cleaned uuid[];
  recipient uuid;
  before_ids uuid[];
  added_ids uuid[];
begin
  select * into piece from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission unavailable.' using errcode = '22023'; end if;
  select role::text into actor_role from public.profiles where id = p_actor_id;
  if actor_role not in ('teacher','admin') and piece.author_id <> p_actor_id then
    raise exception 'Only the writer or editor can change sharing.' using errcode = '42501';
  end if;
  select array_agg(distinct x) into cleaned
  from unnest(coalesce(p_recipient_ids,array[]::uuid[])) x where x is not null;
  if coalesce(array_length(cleaned,1),0)=0 then
    raise exception 'Choose at least one writer, or stop sharing instead.' using errcode = '22023';
  end if;
  foreach recipient in array cleaned loop
    perform private.validate_share_recipient_row(p_submission_id, recipient);
  end loop;
  select array_agg(recipient_id order by recipient_id) into before_ids
  from public.submission_share_recipients where submission_id=p_submission_id;
  delete from public.submission_share_recipients
  where submission_id=p_submission_id and not (recipient_id = any(cleaned));
  insert into public.submission_share_recipients(submission_id,recipient_id,shared_by)
  select p_submission_id,x,p_actor_id from unnest(cleaned) x
  on conflict (submission_id,recipient_id) do nothing;
  select array_agg(x order by x) into added_ids
  from unnest(cleaned) x
  where not (x = any(coalesce(before_ids,array[]::uuid[])));
  return jsonb_build_object(
    'recipientIds', cleaned,
    'addedRecipientIds', coalesce(added_ids,array[]::uuid[])
  );
end;
$$;

create or replace function public.stop_submission_sharing(
  p_actor_id uuid,
  p_submission_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  piece public.submissions%rowtype;
  actor_role text;
  removed integer;
begin
  select * into piece from public.submissions where id=p_submission_id for update;
  if not found then raise exception 'Submission unavailable.' using errcode='22023'; end if;
  select role::text into actor_role from public.profiles where id=p_actor_id;
  if actor_role not in ('teacher','admin') and piece.author_id<>p_actor_id then
    raise exception 'Only the writer or editor can stop sharing.' using errcode='42501';
  end if;
  delete from public.submission_share_recipients where submission_id=p_submission_id;
  get diagnostics removed = row_count;
  return jsonb_build_object('removed',removed);
end;
$$;

create or replace function public.save_reader_response(
  p_actor_id uuid,
  p_submission_id uuid,
  p_body text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  response_id uuid;
  created boolean;
begin
  if p_body is null or btrim(p_body)='' then
    raise exception 'Write a response before saving.' using errcode='22023';
  end if;
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
  select id into response_id from public.reader_responses
  where submission_id=p_submission_id and author_id=p_actor_id;
  created := response_id is null;
  insert into public.reader_responses(submission_id,author_id,body)
  values(p_submission_id,p_actor_id,btrim(p_body))
  on conflict(submission_id,author_id)
  do update set body=excluded.body,updated_at=now()
  returning id into response_id;
  return jsonb_build_object('id',response_id,'created',created);
end;
$$;

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
  delete from public.reader_responses
  where submission_id=p_submission_id and author_id=p_actor_id;
  get diagnostics removed=row_count;
  return jsonb_build_object('removed',removed);
end;
$$;

create or replace function public.create_editor_assigned_submission(
  p_editor_id uuid,
  p_author_id uuid,
  p_request_id uuid,
  p_title text,
  p_body text,
  p_workshop_id uuid,
  p_source_id uuid default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  editor_role text;
  prior public.submissions%rowtype;
  source_piece public.submissions%rowtype;
  root_id uuid;
  group_id uuid;
  next_version integer := 1;
  new_id uuid;
begin
  select role::text into editor_role from public.profiles where id=p_editor_id;
  if editor_role not in ('teacher','admin') then
    raise exception 'Editor access required.' using errcode='42501';
  end if;
  if p_author_id is null or p_request_id is null or p_title is null or btrim(p_title)=''
     or p_body is null or btrim(p_body)='' then
    raise exception 'Writer, title, manuscript and request ID are required.' using errcode='22023';
  end if;
  perform 1 from public.profiles where id=p_author_id and role::text='writer' for update;
  if not found then raise exception 'Choose a writer account.' using errcode='42501'; end if;

  group_id := p_workshop_id;
  if p_source_id is not null then
    select * into source_piece from public.submissions
    where id=p_source_id and author_id=p_author_id;
    if not found then raise exception 'Revision source is unavailable.' using errcode='42501'; end if;
    if source_piece.status::text<>'feedback_published' then
      raise exception 'Only published feedback can start a revision.' using errcode='22023';
    end if;
    group_id := source_piece.workshop_id;
    root_id := coalesce(source_piece.parent_submission_id,source_piece.id);
    if exists (
      select 1 from public.submissions
      where author_id=p_author_id and coalesce(parent_submission_id,id)=root_id
        and version>source_piece.version
    ) then
      raise exception 'A newer version already exists.' using errcode='22023';
    end if;
    select max(version)+1 into next_version from public.submissions
    where author_id=p_author_id and coalesce(parent_submission_id,id)=root_id;
  end if;

  if not exists (
    select 1 from public.workshop_members
    where profile_id=p_author_id and workshop_id=group_id
  ) then
    raise exception 'The writer must belong to the selected writing group.' using errcode='42501';
  end if;

  select * into prior from public.submissions
  where author_id=p_author_id and client_request_id=p_request_id;
  if found then
    if prior.title is distinct from btrim(p_title)
      or prior.body is distinct from p_body
      or prior.workshop_id is distinct from group_id
      or prior.parent_submission_id is distinct from root_id
      or prior.source is distinct from 'editor_import' then
      raise exception 'This import request was already used with different content.' using errcode='22023';
    end if;
    return jsonb_build_object('id',prior.id,'version',prior.version,'created',false);
  end if;

  insert into public.submissions(
    author_id,workshop_id,parent_submission_id,title,body,status,version,client_request_id,source
  ) values(
    p_author_id,group_id,root_id,btrim(p_title),p_body,'submitted',next_version,p_request_id,'editor_import'
  ) returning id into new_id;
  return jsonb_build_object('id',new_id,'version',next_version,'created',true);
end;
$$;

-- Editor may correct an imported, still-private untouched manuscript.
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
  if piece.parent_submission_id is not null
     and (p_author_id<>piece.author_id or p_workshop_id<>piece.workshop_id) then
    raise exception 'A revision cannot be reassigned to a different writer or group.' using errcode='22023';
  end if;
  if not exists(
    select 1 from public.profiles where id=p_author_id and role::text='writer'
  ) or not exists(
    select 1 from public.workshop_members where profile_id=p_author_id and workshop_id=p_workshop_id
  ) then
    raise exception 'Choose a valid writer and writing group.' using errcode='42501';
  end if;
  update public.submissions
  set author_id=p_author_id,workshop_id=p_workshop_id,title=btrim(p_title),body=p_body
  where id=p_submission_id;
  return jsonb_build_object('id',p_submission_id);
end;
$$;

-- Membership changes revoke old sharing grants so rejoining never silently restores access.
create or replace function private.revoke_shares_on_membership_delete()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  delete from public.submission_share_recipients sr
  using public.submissions s
  where sr.submission_id=s.id
    and s.workshop_id=old.workshop_id
    and (sr.recipient_id=old.profile_id or s.author_id=old.profile_id);
  return old;
end;
$$;
create trigger revoke_shares_on_membership_delete
before delete on public.workshop_members
for each row execute function private.revoke_shares_on_membership_delete();

create or replace function private.revoke_shares_on_submission_group_change()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if new.workshop_id is distinct from old.workshop_id then
    delete from public.submission_share_recipients where submission_id=new.id;
  end if;
  return new;
end;
$$;
create trigger revoke_shares_on_submission_group_change
after update of workshop_id on public.submissions
for each row execute function private.revoke_shares_on_submission_group_change();

revoke all on function public.set_submission_share_recipients(uuid,uuid,uuid[]) from public,studio_anon,studio_authenticated;
revoke all on function public.stop_submission_sharing(uuid,uuid) from public,studio_anon,studio_authenticated;
revoke all on function public.save_reader_response(uuid,uuid,text) from public,studio_anon,studio_authenticated;
revoke all on function public.delete_reader_response(uuid,uuid) from public,studio_anon,studio_authenticated;
revoke all on function public.create_editor_assigned_submission(uuid,uuid,uuid,text,text,uuid,uuid) from public,studio_anon,studio_authenticated;
revoke all on function public.correct_editor_assigned_submission(uuid,uuid,uuid,uuid,text,text) from public,studio_anon,studio_authenticated;
grant execute on function public.set_submission_share_recipients(uuid,uuid,uuid[]) to netlifydb_owner;
grant execute on function public.stop_submission_sharing(uuid,uuid) to netlifydb_owner;
grant execute on function public.save_reader_response(uuid,uuid,text) to netlifydb_owner;
grant execute on function public.delete_reader_response(uuid,uuid) to netlifydb_owner;
grant execute on function public.create_editor_assigned_submission(uuid,uuid,uuid,text,text,uuid,uuid) to netlifydb_owner;
grant execute on function public.correct_editor_assigned_submission(uuid,uuid,uuid,uuid,text,text) to netlifydb_owner;
