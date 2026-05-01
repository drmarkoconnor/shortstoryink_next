begin;

alter table public.snippets
  drop constraint if exists snippets_source_type_check;

alter table public.snippets
  add constraint snippets_source_type_check
  check (source_type in ('submission', 'feedback_item', 'external'));

commit;
