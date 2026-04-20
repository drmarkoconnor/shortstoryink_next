begin;

create extension if not exists pgcrypto;

create table if not exists public.snippets (
  id uuid primary key default gen_random_uuid(),
  saved_by uuid not null references public.profiles(id) on delete cascade,
  captured_by uuid references public.profiles(id) on delete set null,
  source_type text not null default 'submission',
  source_submission_id uuid references public.submissions(id) on delete cascade,
  source_feedback_item_id uuid references public.feedback_items(id) on delete set null,
  source_author_id uuid references public.profiles(id) on delete set null,
  snippet_text text not null,
  anchor jsonb not null,
  note text,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint snippets_source_type_check
    check (source_type in ('submission', 'feedback_item')),
  constraint snippets_visibility_check
    check (visibility in ('private', 'group', 'shared')),
  constraint snippets_anchor_shape_check
    check (
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

create index if not exists snippets_saved_by_created_idx
on public.snippets (saved_by, created_at desc);

create index if not exists snippets_source_submission_created_idx
on public.snippets (source_submission_id, created_at desc);

drop trigger if exists snippets_set_updated_at on public.snippets;
create trigger snippets_set_updated_at
before update on public.snippets
for each row
execute function public.set_updated_at();

alter table public.snippets enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'snippets'
      and policyname = 'users read own snippets'
  ) then
    create policy "users read own snippets"
    on public.snippets for select
    using (saved_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'snippets'
      and policyname = 'users create own snippets'
  ) then
    create policy "users create own snippets"
    on public.snippets for insert
    with check (saved_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'snippets'
      and policyname = 'users update own snippets'
  ) then
    create policy "users update own snippets"
    on public.snippets for update
    using (saved_by = auth.uid())
    with check (saved_by = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'snippets'
      and policyname = 'users delete own snippets'
  ) then
    create policy "users delete own snippets"
    on public.snippets for delete
    using (saved_by = auth.uid());
  end if;
end;
$$;

commit;
