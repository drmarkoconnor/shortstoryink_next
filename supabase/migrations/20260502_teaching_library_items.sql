begin;

create table if not exists public.teaching_library_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null,
  title text not null,
  body text not null default '',
  reference_type text,
  url text,
  category_label text not null default 'Uncategorised',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teaching_library_items_type_check
    check (item_type in ('note', 'reference')),
  constraint teaching_library_items_reference_type_check
    check (
      reference_type is null
      or reference_type in ('book', 'article', 'video')
    ),
  constraint teaching_library_items_title_check
    check (char_length(trim(title)) > 0),
  constraint teaching_library_items_url_check
    check (url is null or char_length(trim(url)) > 0)
);

create index if not exists teaching_library_items_owner_updated_idx
on public.teaching_library_items (owner_id, updated_at desc);

create index if not exists teaching_library_items_owner_type_updated_idx
on public.teaching_library_items (owner_id, item_type, updated_at desc);

drop trigger if exists teaching_library_items_set_updated_at on public.teaching_library_items;
create trigger teaching_library_items_set_updated_at
before update on public.teaching_library_items
for each row
execute function public.set_updated_at();

alter table public.teaching_library_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teaching_library_items'
      and policyname = 'users read own teaching library items'
  ) then
    create policy "users read own teaching library items"
    on public.teaching_library_items for select
    using (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teaching_library_items'
      and policyname = 'users create own teaching library items'
  ) then
    create policy "users create own teaching library items"
    on public.teaching_library_items for insert
    with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teaching_library_items'
      and policyname = 'users update own teaching library items'
  ) then
    create policy "users update own teaching library items"
    on public.teaching_library_items for update
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teaching_library_items'
      and policyname = 'users delete own teaching library items'
  ) then
    create policy "users delete own teaching library items"
    on public.teaching_library_items for delete
    using (owner_id = auth.uid());
  end if;
end;
$$;

commit;
