-- v1.2 follow-up hardening: a manuscript can only be shared while its author
-- remains a current member of that manuscript's genuine writing group.
-- Additive so Deploy Preview branches that already applied migration 002 receive
-- the same invariant as a fresh production deploy.

create or replace function private.can_read_shared_submission(p_submission_id uuid, p_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_profile_id is not null and exists (
    select 1
    from public.submissions s
    join public.workshops w on w.id = s.workshop_id
    join public.workshop_members author_membership
      on author_membership.workshop_id = s.workshop_id
      and author_membership.profile_id = s.author_id
    join public.submission_share_recipients r
      on r.submission_id = s.id and r.recipient_id = p_profile_id
    join public.workshop_members recipient_membership
      on recipient_membership.workshop_id = s.workshop_id
      and recipient_membership.profile_id = p_profile_id
    join public.profiles p
      on p.id = p_profile_id and p.role::text = 'writer'
    where s.id = p_submission_id
      and s.author_id <> p_profile_id
      and coalesce(w.slug,'') <> 'authorised-basic-user'
      and lower(btrim(w.title)) <> 'authorised basic user'
  );
$$;

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

  if not exists (
    select 1 from public.workshop_members
    where workshop_id = piece.workshop_id and profile_id = piece.author_id
  ) then
    raise exception 'This manuscript is no longer attached to a current member of this writing group.' using errcode = '42501';
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

revoke all on function private.can_read_shared_submission(uuid,uuid) from public;
grant execute on function private.can_read_shared_submission(uuid,uuid)
  to studio_authenticated, netlifydb_owner;

revoke all on function public.set_submission_sharing(uuid,uuid,uuid[])
  from public,studio_anon,studio_authenticated;
grant execute on function public.set_submission_sharing(uuid,uuid,uuid[])
  to netlifydb_owner;
