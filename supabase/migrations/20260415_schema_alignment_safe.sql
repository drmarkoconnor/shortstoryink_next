-- Safe alignment migration for mixed legacy + Layer 1 environments.
-- This migration only creates missing objects and updates helper functions.

create extension if not exists pgcrypto;

-- Ensure app_role enum exists and supports admin.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
  ) then
    create type public.app_role as enum ('writer', 'teacher', 'admin');
  end if;
exception
  when duplicate_object then
    null;
end;
$$;

do $$
begin
  begin
    alter type public.app_role add value if not exists 'admin';
  exception
    when undefined_object then
      null;
  end;
end;
$$;

-- Ensure submission_status enum exists.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'submission_status'
  ) then
    create type public.submission_status as enum (
      'submitted',
      'in_review',
      'feedback_published'
    );
  end if;
exception
  when duplicate_object then
    null;
end;
$$;

-- Ensure modern workshop + feedback tables exist.
create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.workshop_members (
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (workshop_id, profile_id)
);

create table if not exists public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  anchor jsonb not null,
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_summaries (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  summary text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feedback_summaries_set_updated_at on public.feedback_summaries;
create trigger feedback_summaries_set_updated_at
before update on public.feedback_summaries
for each row
execute function public.set_updated_at();

-- Use a uniquely named helper to avoid collisions with legacy overloads.
create or replace function public.current_user_is_teacher()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text in ('teacher', 'admin')
  );
$$;

alter table public.workshops enable row level security;
alter table public.workshop_members enable row level security;
alter table public.feedback_items enable row level security;
alter table public.feedback_summaries enable row level security;

-- Create policies only if missing.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workshops'
      and policyname = 'teachers can manage workshops'
  ) then
    create policy "teachers can manage workshops"
    on public.workshops for all
    using (public.current_user_is_teacher())
    with check (public.current_user_is_teacher());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workshops'
      and policyname = 'members can read workshops'
  ) then
    create policy "members can read workshops"
    on public.workshops for select
    using (public.current_user_is_teacher());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workshop_members'
      and policyname = 'teachers can manage workshop membership'
  ) then
    create policy "teachers can manage workshop membership"
    on public.workshop_members for all
    using (public.current_user_is_teacher())
    with check (public.current_user_is_teacher());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'workshop_members'
      and policyname = 'members can view own workshop memberships'
  ) then
    create policy "members can view own workshop memberships"
    on public.workshop_members for select
    using (profile_id = auth.uid() or public.current_user_is_teacher());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_items'
      and policyname = 'teachers create feedback items'
  ) then
    create policy "teachers create feedback items"
    on public.feedback_items for insert
    with check (public.current_user_is_teacher());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_items'
      and policyname = 'teachers read feedback items'
  ) then
    create policy "teachers read feedback items"
    on public.feedback_items for select
    using (public.current_user_is_teacher());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_items'
      and policyname = 'teachers update feedback items'
  ) then
    create policy "teachers update feedback items"
    on public.feedback_items for update
    using (public.current_user_is_teacher())
    with check (public.current_user_is_teacher());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_summaries'
      and policyname = 'teachers manage feedback summaries'
  ) then
    create policy "teachers manage feedback summaries"
    on public.feedback_summaries for all
    using (public.current_user_is_teacher())
    with check (public.current_user_is_teacher());
  end if;
end;
$$;
