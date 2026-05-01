begin;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teacher_documents'
      and policyname = 'users delete own teacher documents'
  ) then
    create policy "users delete own teacher documents"
    on public.teacher_documents for delete
    using (owner_id = auth.uid());
  end if;
end;
$$;

commit;
