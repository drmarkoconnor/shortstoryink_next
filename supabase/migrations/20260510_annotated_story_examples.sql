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

grant execute on function public.current_user_is_teacher() to authenticated;
grant execute on function public.current_user_is_teacher() to anon;

create table if not exists public.teaching_examples (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  author_name text not null default '',
  source_label text not null default '',
  source_url text,
  template_key text,
  copyright_status text not null default 'teacher-owned',
  editorial_note text not null default '',
  content_note text not null default '',
  body text not null default '',
  craft_tags text[] not null default '{}',
  status text not null default 'draft',
  visible_to_all_groups boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teaching_examples_title_check check (char_length(trim(title)) > 0),
  constraint teaching_examples_body_check check (char_length(trim(body)) > 0),
  constraint teaching_examples_status_check check (status in ('draft', 'published')),
  constraint teaching_examples_copyright_status_check
    check (copyright_status in ('teacher-owned', 'public-domain', 'licensed', 'permission-needed')),
  constraint teaching_examples_source_url_check
    check (source_url is null or char_length(trim(source_url)) > 0)
);

create index if not exists teaching_examples_owner_updated_idx
on public.teaching_examples (owner_id, updated_at desc);

create index if not exists teaching_examples_status_updated_idx
on public.teaching_examples (status, updated_at desc);

create unique index if not exists teaching_examples_owner_template_key_idx
on public.teaching_examples (owner_id, template_key)
where template_key is not null;

drop trigger if exists teaching_examples_set_updated_at on public.teaching_examples;
create trigger teaching_examples_set_updated_at
before update on public.teaching_examples
for each row
execute function public.set_updated_at();

create table if not exists public.teaching_example_annotations (
  id uuid primary key default gen_random_uuid(),
  example_id uuid not null references public.teaching_examples(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  anchor jsonb not null,
  comment text not null,
  category_label text not null default 'Uncategorised',
  category_slug text not null default 'uncategorised',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teaching_example_annotations_comment_check check (char_length(trim(comment)) > 0),
  constraint teaching_example_annotations_anchor_shape check (
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

create index if not exists teaching_example_annotations_example_created_idx
on public.teaching_example_annotations (example_id, created_at);

drop trigger if exists teaching_example_annotations_set_updated_at on public.teaching_example_annotations;
create trigger teaching_example_annotations_set_updated_at
before update on public.teaching_example_annotations
for each row
execute function public.set_updated_at();

create table if not exists public.teaching_example_hidden_groups (
  example_id uuid not null references public.teaching_examples(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (example_id, workshop_id)
);

create index if not exists teaching_example_hidden_groups_workshop_idx
on public.teaching_example_hidden_groups (workshop_id);

alter table public.teaching_examples enable row level security;
alter table public.teaching_example_annotations enable row level security;
alter table public.teaching_example_hidden_groups enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teaching_examples'
      and policyname = 'teachers manage teaching examples'
  ) then
    create policy "teachers manage teaching examples"
    on public.teaching_examples for all
    using (public.current_user_is_teacher())
    with check (public.current_user_is_teacher());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teaching_examples'
      and policyname = 'writers read published teaching examples'
  ) then
    create policy "writers read published teaching examples"
    on public.teaching_examples for select
    using (status = 'published');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teaching_example_annotations'
      and policyname = 'teachers manage teaching example annotations'
  ) then
    create policy "teachers manage teaching example annotations"
    on public.teaching_example_annotations for all
    using (public.current_user_is_teacher())
    with check (public.current_user_is_teacher());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teaching_example_annotations'
      and policyname = 'writers read published teaching example annotations'
  ) then
    create policy "writers read published teaching example annotations"
    on public.teaching_example_annotations for select
    using (
      exists (
        select 1
        from public.teaching_examples e
        where e.id = teaching_example_annotations.example_id
          and e.status = 'published'
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teaching_example_hidden_groups'
      and policyname = 'teachers manage teaching example hidden groups'
  ) then
    create policy "teachers manage teaching example hidden groups"
    on public.teaching_example_hidden_groups for all
    using (public.current_user_is_teacher())
    with check (public.current_user_is_teacher());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teaching_example_hidden_groups'
      and policyname = 'writers read teaching example hidden groups'
  ) then
    create policy "writers read teaching example hidden groups"
    on public.teaching_example_hidden_groups for select
    using (true);
  end if;
end;
$$;

commit;
