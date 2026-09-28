-- v1.2 trigger privilege hardening.
-- Workshop membership changes may legitimately be made by an authenticated editor.
-- Share revocation must therefore run with the migration owner's privileges rather
-- than inheriting the editor role (which intentionally has no direct DELETE grant
-- on sharing tables).

create or replace function private.revoke_shares_on_membership_removal()
returns trigger language plpgsql security definer set search_path='' as $$
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

create or replace function private.clear_sharing_after_group_change()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.workshop_id is distinct from old.workshop_id then
    delete from public.submission_share_recipients where submission_id=new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.revoke_shares_on_membership_removal() from public;
revoke all on function private.clear_sharing_after_group_change() from public;
