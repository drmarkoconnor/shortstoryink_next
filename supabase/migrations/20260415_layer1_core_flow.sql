-- Layer 1 baseline schema for submit -> review -> feedback
-- Applies minimal domain entities and role-based RLS policies.

create extension if not exists pgcrypto;

create type public.app_role as enum ('writer', 'teacher');
create type public.submission_status as enum (
  'submitted',
  'in_review',
  'feedback_published'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'writer',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create or replace function public.is_teacher()
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
      and p.role = 'teacher'
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
using (id = auth.uid() or public.is_teacher());

create policy "profiles are updatable by owner"
on public.profiles for update
using (id = auth.uid());

create policy "teachers can manage workshops"
on public.workshops for all
using (public.is_teacher())
with check (public.is_teacher());

create policy "members can read workshops"
on public.workshops for select
using (
  public.is_teacher()
  or exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id = id
      and wm.profile_id = auth.uid()
  )
);

create policy "teachers can manage workshop membership"
on public.workshop_members for all
using (public.is_teacher())
with check (public.is_teacher());

create policy "members can view own workshop memberships"
on public.workshop_members for select
using (profile_id = auth.uid() or public.is_teacher());

create policy "submissions readable to owners, members, teachers"
on public.submissions for select
using (
  author_id = auth.uid()
  or public.is_teacher()
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
    public.is_teacher()
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
using (public.is_teacher())
with check (public.is_teacher());

create policy "writers delete own submitted submissions"
on public.submissions for delete
using (
  author_id = auth.uid()
  and status = 'submitted'
);

create policy "feedback items readable with submission access"
on public.feedback_items for select
using (
  public.is_teacher()
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
with check (public.is_teacher());

create policy "teachers update feedback items"
on public.feedback_items for update
using (public.is_teacher())
with check (public.is_teacher());

create policy "teachers delete feedback items"
on public.feedback_items for delete
using (public.is_teacher());

create policy "feedback summaries readable with submission access"
on public.feedback_summaries for select
using (
  public.is_teacher()
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
with check (public.is_teacher());

create policy "teachers update feedback summaries"
on public.feedback_summaries for update
using (public.is_teacher())
with check (public.is_teacher());
