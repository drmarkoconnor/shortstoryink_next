begin;

create table if not exists public.feedback_export_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  summary_id uuid not null references public.feedback_summaries(id) on delete cascade,
  exported_by uuid not null references public.profiles(id) on delete restrict,
  packet_template text not null default 'feedback_packet_v1',
  export_copy_version integer not null,
  note text,
  created_at timestamptz not null default now(),
  constraint feedback_export_events_copy_version_check check (export_copy_version >= 1),
  constraint feedback_export_events_template_check check (char_length(trim(packet_template)) > 0)
);

create index if not exists feedback_export_events_submission_created_idx
on public.feedback_export_events (submission_id, created_at desc);

create index if not exists feedback_export_events_summary_created_idx
on public.feedback_export_events (summary_id, created_at desc);

alter table public.feedback_export_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_export_events'
      and policyname = 'teachers read feedback export events'
  ) then
    create policy "teachers read feedback export events"
    on public.feedback_export_events for select
    using (public.current_user_is_teacher());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_export_events'
      and policyname = 'teachers create feedback export events'
  ) then
    create policy "teachers create feedback export events"
    on public.feedback_export_events for insert
    with check (public.current_user_is_teacher());
  end if;
end;
$$;

commit;
