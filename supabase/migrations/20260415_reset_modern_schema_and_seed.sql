-- Destructive reset to modern Layer 1 schema while preserving auth users.
-- Keeps existing profile rows where possible, resets domain tables, and seeds basic data.

create extension if not exists pgcrypto;

-- Drop policy helper functions that may have overloaded signatures.
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
      and p.proname in (
        'is_teacher',
        'current_user_is_teacher',
        'can_access_submission',
        'set_updated_at'
      )
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

-- Drop domain tables (legacy + modern) but keep profiles/auth users.
drop table if exists public.feedback_summaries cascade;
drop table if exists public.feedback_items cascade;
drop table if exists public.submission_paragraphs cascade;
drop table if exists public.submission_versions cascade;
drop table if exists public.comments cascade;
drop table if exists public.workshop_members cascade;
drop table if exists public.workshops cascade;
drop table if exists public.submissions cascade;

-- Ensure role and status enums exist and include required values.
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

-- Ensure profiles exists and aligns with app expectations.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'writer',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text;

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

-- Convert role to enum safely if currently text.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
      and udt_name <> 'app_role'
  ) then
    alter table public.profiles
      alter column role drop default;

    alter table public.profiles
      alter column role type public.app_role
      using (
        case
          when role::text in ('writer', 'teacher', 'admin') then role::text::public.app_role
          else 'writer'::public.app_role
        end
      );

    alter table public.profiles
      alter column role set default 'writer'::public.app_role;
  end if;
end;
$$;

-- Backfill profiles from auth.users when missing.
insert into public.profiles (id, role, display_name)
select
  u.id,
  'writer'::public.app_role,
  coalesce(u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Modern schema.
create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.workshop_members (
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (workshop_id, profile_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  workshop_id uuid not null references public.workshops(id) on delete restrict,
  parent_submission_id uuid references public.submissions(id) on delete set null,
  title text not null,
  body text not null,
  version integer not null default 1 check (version >= 1),
  status public.submission_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  anchor jsonb not null,
  comment text not null,
  created_at timestamptz not null default now(),
  constraint feedback_anchor_shape check (
    anchor ? 'blockId'
    and anchor ? 'startOffset'
    and anchor ? 'endOffset'
    and anchor ? 'quote'
    and jsonb_typeof(anchor->'blockId') = 'string'
    and jsonb_typeof(anchor->'quote') = 'string'
    and jsonb_typeof(anchor->'startOffset') = 'number'
    and jsonb_typeof(anchor->'endOffset') = 'number'
  )
);

create table public.feedback_summaries (
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

create trigger submissions_set_updated_at
before update on public.submissions
for each row
execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger feedback_summaries_set_updated_at
before update on public.feedback_summaries
for each row
execute function public.set_updated_at();

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

alter table public.profiles enable row level security;
alter table public.workshops enable row level security;
alter table public.workshop_members enable row level security;
alter table public.submissions enable row level security;
alter table public.feedback_items enable row level security;
alter table public.feedback_summaries enable row level security;

create policy "profiles are readable by owner or teacher"
on public.profiles for select
using (id = auth.uid() or public.current_user_is_teacher());

create policy "profiles are updatable by owner"
on public.profiles for update
using (id = auth.uid());

create policy "teachers can manage workshops"
on public.workshops for all
using (public.current_user_is_teacher())
with check (public.current_user_is_teacher());

create policy "members can read workshops"
on public.workshops for select
using (
  public.current_user_is_teacher()
  or exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id = id
      and wm.profile_id = auth.uid()
  )
);

create policy "teachers can manage workshop membership"
on public.workshop_members for all
using (public.current_user_is_teacher())
with check (public.current_user_is_teacher());

create policy "members can view own workshop memberships"
on public.workshop_members for select
using (profile_id = auth.uid() or public.current_user_is_teacher());

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

create policy "writers create own submissions"
on public.submissions for insert
with check (
  author_id = auth.uid()
  and (
    public.current_user_is_teacher()
    or exists (
      select 1
      from public.workshop_members wm
      where wm.workshop_id = submissions.workshop_id
        and wm.profile_id = auth.uid()
    )
  )
);

create policy "teachers update submissions"
on public.submissions for update
using (public.current_user_is_teacher())
with check (public.current_user_is_teacher());

create policy "writers delete own submitted submissions"
on public.submissions for delete
using (
  author_id = auth.uid()
  and status = 'submitted'
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

create policy "teachers create feedback items"
on public.feedback_items for insert
with check (public.current_user_is_teacher());

create policy "teachers update feedback items"
on public.feedback_items for update
using (public.current_user_is_teacher())
with check (public.current_user_is_teacher());

create policy "teachers delete feedback items"
on public.feedback_items for delete
using (public.current_user_is_teacher());

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

create policy "teachers create feedback summaries"
on public.feedback_summaries for insert
with check (public.current_user_is_teacher());

create policy "teachers update feedback summaries"
on public.feedback_summaries for update
using (public.current_user_is_teacher())
with check (public.current_user_is_teacher());

-- Seed one workshop and memberships for all writers if a teacher/admin exists.
do $$
declare
  teacher_id uuid;
  sample_workshop_id uuid;
begin
  select p.id
  into teacher_id
  from public.profiles p
  where p.role::text in ('teacher', 'admin')
  order by p.created_at asc
  limit 1;

  if teacher_id is not null then
    insert into public.workshops (title, slug, created_by)
    values ('Core Workshop', 'core-workshop', teacher_id)
    returning id into sample_workshop_id;

    insert into public.workshop_members (workshop_id, profile_id)
    select sample_workshop_id, p.id
    from public.profiles p
    where p.role::text = 'writer'
    on conflict do nothing;
  end if;
end;
$$;
