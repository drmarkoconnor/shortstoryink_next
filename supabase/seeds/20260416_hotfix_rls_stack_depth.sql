-- Hotfix for stack depth recursion in RLS.
-- Apply this to an already-running DB if teacher/writer pages throw:
-- "stack depth limit exceeded".

begin;

-- Remove recursive policies that depended on can_access_submission(...)
drop policy if exists "submissions readable to owners, members, teachers" on public.submissions;
drop policy if exists "feedback items readable with submission access" on public.feedback_items;
drop policy if exists "feedback summaries readable with submission access" on public.feedback_summaries;

-- Drop conflicting helper variants if they exist.
do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('can_access_submission')
  loop
    execute format(
      'drop function if exists %I.%I(%s) cascade',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
  end loop;
end;
$$;

-- Recreate non-recursive read policies.
create policy "submissions readable to owners, members, teachers"
on public.submissions for select
using (
  author_id = auth.uid()
  or public.current_user_is_teacher()
  or exists (
    select 1
    from public.workshop_members wm
    where wm.workshop_id = submissions.workshop_id
      and wm.profile_id = auth.uid()
  )
);

create policy "feedback items readable with submission access"
on public.feedback_items for select
using (
  public.current_user_is_teacher()
  or exists (
    select 1
    from public.submissions s
    left join public.workshop_members wm
      on wm.workshop_id = s.workshop_id
      and wm.profile_id = auth.uid()
    where s.id = feedback_items.submission_id
      and (
        s.author_id = auth.uid()
        or wm.profile_id is not null
      )
  )
);

create policy "feedback summaries readable with submission access"
on public.feedback_summaries for select
using (
  public.current_user_is_teacher()
  or exists (
    select 1
    from public.submissions s
    left join public.workshop_members wm
      on wm.workshop_id = s.workshop_id
      and wm.profile_id = auth.uid()
    where s.id = feedback_summaries.submission_id
      and (
        s.author_id = auth.uid()
        or wm.profile_id is not null
      )
  )
);

commit;
