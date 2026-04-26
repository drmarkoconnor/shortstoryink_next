begin;

alter table public.feedback_summaries
  add column if not exists personal_note text,
  add column if not exists next_steps text[] not null default '{}',
  add column if not exists reading_suggestions text[] not null default '{}';

commit;
