begin;

alter table public.feedback_categories
drop constraint if exists feedback_categories_tone_check;

alter table public.feedback_categories
drop column if exists tone;

commit;
