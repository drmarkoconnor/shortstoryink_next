begin;

create table if not exists public.feedback_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  tone text not null default 'craft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_categories_name_check check (char_length(trim(name)) > 0),
  constraint feedback_categories_slug_check check (char_length(trim(slug)) > 0),
  constraint feedback_categories_tone_check check (tone in ('typo', 'craft', 'pacing', 'structure'))
);

create unique index if not exists feedback_categories_owner_name_idx
on public.feedback_categories (owner_id, lower(name));

create unique index if not exists feedback_categories_owner_slug_idx
on public.feedback_categories (owner_id, slug);

create index if not exists feedback_categories_owner_created_idx
on public.feedback_categories (owner_id, created_at desc);

drop trigger if exists feedback_categories_set_updated_at on public.feedback_categories;
create trigger feedback_categories_set_updated_at
before update on public.feedback_categories
for each row
execute function public.set_updated_at();

alter table public.feedback_categories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_categories'
      and policyname = 'users read own feedback categories'
  ) then
    create policy "users read own feedback categories"
    on public.feedback_categories for select
    using (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_categories'
      and policyname = 'users create own feedback categories'
  ) then
    create policy "users create own feedback categories"
    on public.feedback_categories for insert
    with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_categories'
      and policyname = 'users update own feedback categories'
  ) then
    create policy "users update own feedback categories"
    on public.feedback_categories for update
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_categories'
      and policyname = 'users delete own feedback categories'
  ) then
    create policy "users delete own feedback categories"
    on public.feedback_categories for delete
    using (owner_id = auth.uid());
  end if;
end;
$$;

commit;
