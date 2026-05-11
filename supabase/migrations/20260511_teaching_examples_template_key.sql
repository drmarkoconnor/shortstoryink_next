begin;

alter table public.teaching_examples
  add column if not exists template_key text;

create unique index if not exists teaching_examples_owner_template_key_idx
on public.teaching_examples (owner_id, template_key)
where template_key is not null;

update public.teaching_examples
set template_key = 'stone-cold-memories'
where template_key is null
  and lower(trim(title)) = 'stone cold memories'
  and lower(trim(author_name)) = 'mark o''connor';

commit;
