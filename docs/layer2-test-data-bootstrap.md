# Layer 2 Test Data Bootstrap

Use this SQL in Supabase SQL Editor after running the Layer 1 migration.

It creates:

- one teacher profile
- one writer profile
- one workshop
- one membership linking the writer to that workshop

## 1) Find auth user IDs

Run this first and copy IDs for your real accounts:

```sql
select id, email
from auth.users
order by created_at desc;
```

## 2) Replace placeholders and run

Replace:

- `TEACHER_USER_ID`
- `WRITER_USER_ID`

```sql
insert into public.profiles (id, role, display_name)
values
  ('TEACHER_USER_ID', 'teacher', 'Teacher Account'),
  ('WRITER_USER_ID', 'writer', 'Writer Account')
on conflict (id) do update
set role = excluded.role,
    display_name = excluded.display_name;

insert into public.workshops (id, title, slug, created_by)
values
  (gen_random_uuid(), 'Short Story Spring Cohort', 'short-story-spring', 'TEACHER_USER_ID')
on conflict (slug) do update
set title = excluded.title,
    created_by = excluded.created_by
returning id;
```

## 3) Add writer membership

Use the returned workshop ID from step 2:

```sql
insert into public.workshop_members (workshop_id, profile_id)
values ('WORKSHOP_ID_FROM_STEP_2', 'WRITER_USER_ID')
on conflict (workshop_id, profile_id) do nothing;
```

## 4) Optional: verify

```sql
select p.id, p.role, p.display_name
from public.profiles p
where p.id in ('TEACHER_USER_ID', 'WRITER_USER_ID');

select w.id, w.title, wm.profile_id
from public.workshops w
left join public.workshop_members wm on wm.workshop_id = w.id
where w.slug = 'short-story-spring';
```

## Expected behavior after bootstrap

- Writer sees workshop in `/app/writer` dropdown.
- Writer can submit and see status `submitted`.
- Teacher can access `/app/teacher` and review routes.

