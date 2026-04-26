begin;

alter table public.feedback_summaries
  add column if not exists export_copy_version integer not null default 1,
  add column if not exists export_copy_updated_at timestamptz,
  add column if not exists last_exported_at timestamptz,
  add column if not exists last_exported_copy_version integer;

alter table public.feedback_summaries
  drop constraint if exists feedback_summaries_export_copy_version_check;

alter table public.feedback_summaries
  add constraint feedback_summaries_export_copy_version_check
  check (export_copy_version >= 1);

alter table public.feedback_summaries
  drop constraint if exists feedback_summaries_last_exported_copy_version_check;

alter table public.feedback_summaries
  add constraint feedback_summaries_last_exported_copy_version_check
  check (
    last_exported_copy_version is null
    or last_exported_copy_version >= 1
  );

update public.feedback_summaries
set export_copy_updated_at = coalesce(export_copy_updated_at, updated_at)
where export_copy_updated_at is null;

commit;
