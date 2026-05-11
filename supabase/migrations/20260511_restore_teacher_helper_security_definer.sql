begin;

-- RLS policies call this helper from several tables. It must bypass those
-- policies while checking profiles, otherwise workshop/submission reads can
-- recurse until Postgres reports "stack depth limit exceeded".
create or replace function public.current_user_is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text in ('teacher', 'admin')
  );
$$;

grant execute on function public.current_user_is_teacher() to authenticated;
grant execute on function public.current_user_is_teacher() to anon;

commit;
