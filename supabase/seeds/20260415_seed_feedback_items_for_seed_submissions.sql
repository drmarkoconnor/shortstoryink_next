-- Seed teacher feedback for the four [SEED] submissions.
-- Run after: supabase/seeds/20260415_seed_two_writers_four_submissions.sql
-- Safe to rerun: deletes previous [SEED-FEEDBACK] rows before insert.

begin;

-- Require at least one teacher/admin profile for feedback authoring.
do $$
declare
  reviewer_count integer;
begin
  select count(*) into reviewer_count
  from public.profiles
  where role::text in ('teacher', 'admin');

  if reviewer_count < 1 then
    raise exception 'Need at least 1 teacher/admin profile before seeding feedback.';
  end if;
end;
$$;

with reviewer as (
  select id
  from public.profiles
  where role::text in ('teacher', 'admin')
  order by created_at asc, id asc
  limit 1
),
seed_submissions as (
  select id
  from public.submissions
  where title like '[SEED] %'
)
delete from public.feedback_items fi
using reviewer r, seed_submissions ss
where fi.author_id = r.id
  and fi.submission_id = ss.id
  and fi.comment like '[SEED-FEEDBACK] %';

with reviewer as (
  select id
  from public.profiles
  where role::text in ('teacher', 'admin')
  order by created_at asc, id asc
  limit 1
),
stories as (
  select id, title
  from public.submissions
  where title like '[SEED] %'
),
feedback_rows as (
  select
    s.id as submission_id,
    r.id as author_id,
    f.anchor,
    f.comment
  from stories s
  cross join reviewer r
  join lateral (
    values
      (
        jsonb_build_object(
          'blockId', 'p-1',
          'startOffset', 12,
          'endOffset', 66,
          'quote', 'found the lantern still burning at the end of Grimsby Pier',
          'prefix', 'At ten past midnight, Mara ',
          'suffix', ', though the keeper had been dead'
        ),
        '[SEED-FEEDBACK] Strong opening image and immediate tension. Keep this as your scene anchor.'
      ),
      (
        jsonb_build_object(
          'blockId', 'p-6',
          'startOffset', 53,
          'endOffset', 107,
          'quote', 'If they wanted her to read, they wanted to know what she would do next',
          'prefix', 'left the ledger open to the last page. ',
          'suffix', '. Consider adding one physical beat after this.'
        ),
        '[SEED-FEEDBACK] Nice causal logic. Consider a short physical beat after this line to deepen suspense pacing.'
      )
  ) as f(anchor, comment)
  on s.title = '[SEED] Mystery - The Last Lantern on Grimsby Pier'

  union all

  select
    s.id as submission_id,
    r.id as author_id,
    f.anchor,
    f.comment
  from stories s
  cross join reviewer r
  join lateral (
    values
      (
        jsonb_build_object(
          'blockId', 'p-1',
          'startOffset', 72,
          'endOffset', 136,
          'quote', 'The station was a wheel of old promises circling Mars',
          'prefix', 'his dead basil seedlings. ',
          'suffix', ', and every promise had started leaking'
        ),
        '[SEED-FEEDBACK] Excellent metaphor. It gives tone and worldbuilding in one movement.'
      ),
      (
        jsonb_build_object(
          'blockId', 'p-11',
          'startOffset', 0,
          'endOffset', 42,
          'quote', 'The music did, Nia said',
          'prefix', '',
          'suffix', '. This lands well as an emotional hinge.'
        ),
        '[SEED-FEEDBACK] Concise emotional turn. This line lands strongly as the chapter pivot.'
      )
  ) as f(anchor, comment)
  on s.title = '[SEED] Science Fiction - A Low Orbit for Broken Things'

  union all

  select
    s.id as submission_id,
    r.id as author_id,
    f.anchor,
    f.comment
  from stories s
  cross join reviewer r
  join lateral (
    values
      (
        jsonb_build_object(
          'blockId', 'p-1',
          'startOffset', 22,
          'endOffset', 74,
          'quote', 'the remembering rain fell, Alma was shelving peaches',
          'prefix', 'On the first day ',
          'suffix', ' in aisle three when every customer'
        ),
        '[SEED-FEEDBACK] Immediate voice and premise clarity. Great first-line scene placement.'
      ),
      (
        jsonb_build_object(
          'blockId', 'p-10',
          'startOffset', 137,
          'endOffset', 190,
          'quote', 'pronouncing each name like weather worth listening to',
          'prefix', 'handed them their change with both hands, ',
          'suffix', '.'
        ),
        '[SEED-FEEDBACK] Beautiful close. Strong thematic echo of naming and attention.'
      )
  ) as f(anchor, comment)
  on s.title = '[SEED] Magical Realism - The Rain That Remembered Names'

  union all

  select
    s.id as submission_id,
    r.id as author_id,
    f.anchor,
    f.comment
  from stories s
  cross join reviewer r
  join lateral (
    values
      (
        jsonb_build_object(
          'blockId', 'p-1',
          'startOffset', 40,
          'endOffset', 105,
          'quote', 'Elsie Finch could taste coal in every breath by the time she reached Number Nine Dyer''s Court',
          'prefix', 'like wet wool, and ',
          'suffix', '. The workshop windows were already sweating blue'
        ),
        '[SEED-FEEDBACK] Period atmosphere is vivid here. Excellent sensory grounding for the era.'
      ),
      (
        jsonb_build_object(
          'blockId', 'p-13',
          'startOffset', 101,
          'endOffset', 152,
          'quote', 'a blue that remembered violet and smoke and wanted a future',
          'prefix', 'but something livelier, ',
          'suffix', '. She smiled into the steam'
        ),
        '[SEED-FEEDBACK] Strong final image. The color motif resolves character ambition very effectively.'
      )
  ) as f(anchor, comment)
  on s.title = '[SEED] Historical Fiction - Ash and Indigo at Number Nine'
)
insert into public.feedback_items (submission_id, author_id, anchor, comment)
select submission_id, author_id, anchor, comment
from feedback_rows;

-- Set seeded submissions with comments to in_review.
update public.submissions s
set status = 'in_review'::public.submission_status,
    updated_at = now()
where s.title like '[SEED] %'
  and exists (
    select 1
    from public.feedback_items fi
    where fi.submission_id = s.id
      and fi.comment like '[SEED-FEEDBACK] %'
  );

commit;
