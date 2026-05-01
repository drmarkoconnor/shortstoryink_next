begin;

create table if not exists public.teacher_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body jsonb not null default '{"sections":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_documents_title_check check (char_length(trim(title)) > 0),
  constraint teacher_documents_body_shape_check check (jsonb_typeof(body) = 'object')
);

create index if not exists teacher_documents_owner_updated_idx
on public.teacher_documents (owner_id, updated_at desc);

drop trigger if exists teacher_documents_set_updated_at on public.teacher_documents;
create trigger teacher_documents_set_updated_at
before update on public.teacher_documents
for each row
execute function public.set_updated_at();

alter table public.teacher_documents enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teacher_documents'
      and policyname = 'users read own teacher documents'
  ) then
    create policy "users read own teacher documents"
    on public.teacher_documents for select
    using (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teacher_documents'
      and policyname = 'users create own teacher documents'
  ) then
    create policy "users create own teacher documents"
    on public.teacher_documents for insert
    with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teacher_documents'
      and policyname = 'users update own teacher documents'
  ) then
    create policy "users update own teacher documents"
    on public.teacher_documents for update
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());
  end if;
end;
$$;

commit;
