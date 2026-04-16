-- Hotfix: writer workshop loading fails due to recursive RLS checks.
-- Makes teacher-check helper SECURITY DEFINER so it doesn't recurse through profiles policies.

begin;

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

-- Ensure authenticated users can execute the helper.
grant execute on function public.current_user_is_teacher() to authenticated;
grant execute on function public.current_user_is_teacher() to anon;

commit;
