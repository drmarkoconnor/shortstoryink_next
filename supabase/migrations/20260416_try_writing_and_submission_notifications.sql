begin;

alter table public.submissions
add column if not exists source text not null default 'workshop';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'submissions_source_check'
  ) then
    alter table public.submissions
    add constraint submissions_source_check
    check (source in ('workshop', 'try_writing'));
  end if;
end;
$$;

create index if not exists submissions_source_status_created_idx
on public.submissions (source, status, created_at desc);

create table if not exists public.pending_try_submissions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  title text not null,
  body text not null,
  status text not null default 'pending_confirmation',
  claimed_by uuid references public.profiles(id) on delete set null,
  converted_submission_id uuid references public.submissions(id) on delete set null,
  confirmed_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint pending_try_submissions_status_check
    check (status in ('pending_confirmation', 'consumed'))
);

create index if not exists pending_try_submissions_email_status_idx
on public.pending_try_submissions (lower(email), status, created_at desc);

alter table public.pending_try_submissions enable row level security;

commit;