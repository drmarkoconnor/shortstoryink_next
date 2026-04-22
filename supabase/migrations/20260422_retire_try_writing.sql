begin;

update public.submissions
set source = 'workshop'
where source = 'try_writing';

alter table public.submissions
drop constraint if exists submissions_source_check;

alter table public.submissions
add constraint submissions_source_check
check (source = 'workshop');

drop table if exists public.pending_try_submissions;

commit;
