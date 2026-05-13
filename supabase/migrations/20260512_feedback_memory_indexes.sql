begin;

create index if not exists feedback_items_author_created_idx
on public.feedback_items (author_id, created_at desc);

create index if not exists feedback_items_submission_created_idx
on public.feedback_items (submission_id, created_at desc);

create index if not exists feedback_items_comment_fts_idx
on public.feedback_items
using gin (to_tsvector('english', coalesce(comment, '')));

create index if not exists snippets_saved_by_updated_idx
on public.snippets (saved_by, updated_at desc);

create index if not exists snippets_anchor_category_idx
on public.snippets ((anchor->>'categoryLabel'));

create index if not exists snippets_anchor_status_idx
on public.snippets ((anchor->>'snippetStatus'));

create index if not exists snippets_text_fts_idx
on public.snippets
using gin (to_tsvector('english', coalesce(snippet_text, '')));

commit;
