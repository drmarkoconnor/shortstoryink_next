begin;

create table if not exists public.snippet_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint snippet_categories_name_check check (char_length(trim(name)) > 0),
  constraint snippet_categories_slug_check check (char_length(trim(slug)) > 0)
);

create unique index if not exists snippet_categories_owner_name_idx
on public.snippet_categories (owner_id, lower(name));

create unique index if not exists snippet_categories_owner_slug_idx
on public.snippet_categories (owner_id, slug);

create index if not exists snippet_categories_owner_created_idx
on public.snippet_categories (owner_id, created_at desc);

drop trigger if exists snippet_categories_set_updated_at on public.snippet_categories;
create trigger snippet_categories_set_updated_at
before update on public.snippet_categories
for each row
execute function public.set_updated_at();

alter table public.snippet_categories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'snippet_categories'
      and policyname = 'users read own snippet categories'
  ) then
    create policy "users read own snippet categories"
    on public.snippet_categories for select
    using (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'snippet_categories'
      and policyname = 'users create own snippet categories'
  ) then
    create policy "users create own snippet categories"
    on public.snippet_categories for insert
    with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'snippet_categories'
      and policyname = 'users update own snippet categories'
  ) then
    create policy "users update own snippet categories"
    on public.snippet_categories for update
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'snippet_categories'
      and policyname = 'users delete own snippet categories'
  ) then
    create policy "users delete own snippet categories"
    on public.snippet_categories for delete
    using (owner_id = auth.uid());
  end if;
end;
$$;

alter table public.snippets
add column if not exists snippet_category_id uuid references public.snippet_categories(id) on delete set null;

create index if not exists snippets_category_created_idx
on public.snippets (snippet_category_id, created_at desc);

commit;
