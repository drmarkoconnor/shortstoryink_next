-- Studio baseline: schema only, preserving the verified workshop invariants.
-- Application rows and identity mappings are imported privately after rehearsal.
begin;
set local search_path = public;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='studio_anon') then create role studio_anon nologin; end if;
 if not exists(select 1 from pg_roles where rolname='studio_authenticated') then create role studio_authenticated nologin; end if;
end $$;
grant studio_anon, studio_authenticated to current_user;
create schema studio_auth;
revoke all on schema studio_auth from public;
create table studio_auth.users (
 id uuid primary key,
 identity_id uuid unique,
 email text not null,
 email_confirmed_at timestamptz,
 blocked boolean not null default false,
 created_at timestamptz not null default now()
);
create unique index studio_users_email_unique on studio_auth.users(lower(email));
create function studio_auth.uid() returns uuid language sql stable set search_path='' as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
revoke all on function studio_auth.uid() from public;
grant usage on schema studio_auth to studio_anon,studio_authenticated;
grant execute on function studio_auth.uid() to studio_anon,studio_authenticated;

create type public."app_role" as enum ('writer','teacher','admin');

create type public."ss_comment_status" as enum ('open','resolved','note');

create type public."ss_comment_visibility" as enum ('private','writer');

create type public."ss_role" as enum ('writer','teacher','admin');

create type public."ss_submission_status" as enum ('submitted','in_review','feedback_ready','archived');

create type public."submission_status" as enum ('submitted','in_review','feedback_published');

CREATE TABLE public.feedback_categories (id uuid DEFAULT gen_random_uuid() NOT NULL, owner_id uuid NOT NULL, name text NOT NULL, slug text NOT NULL, tone text DEFAULT 'craft'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.feedback_export_events (id uuid DEFAULT gen_random_uuid() NOT NULL, submission_id uuid NOT NULL, summary_id uuid NOT NULL, exported_by uuid NOT NULL, packet_template text DEFAULT 'feedback_packet_v1'::text NOT NULL, export_copy_version integer NOT NULL, note text, created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.feedback_items (id uuid DEFAULT gen_random_uuid() NOT NULL, submission_id uuid NOT NULL, author_id uuid NOT NULL, anchor jsonb NOT NULL, comment text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.feedback_summaries (id uuid DEFAULT gen_random_uuid() NOT NULL, submission_id uuid NOT NULL, author_id uuid NOT NULL, summary text NOT NULL, published_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, personal_note text, next_steps text[] DEFAULT '{}'::text[] NOT NULL, reading_suggestions text[] DEFAULT '{}'::text[] NOT NULL, export_copy_version integer DEFAULT 1 NOT NULL, export_copy_updated_at timestamp with time zone, last_exported_at timestamp with time zone, last_exported_copy_version integer);

CREATE TABLE public.profiles (id uuid NOT NULL, role app_role DEFAULT 'writer'::app_role NOT NULL, display_name text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, email text);

CREATE TABLE public.review_summaries (id uuid DEFAULT gen_random_uuid() NOT NULL, submission_id uuid NOT NULL, submission_version_id uuid NOT NULL, author_id uuid, body text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.snippet_categories (id uuid DEFAULT gen_random_uuid() NOT NULL, owner_id uuid NOT NULL, name text NOT NULL, slug text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.snippets (id uuid DEFAULT gen_random_uuid() NOT NULL, saved_by uuid NOT NULL, captured_by uuid, source_type text DEFAULT 'submission'::text NOT NULL, source_submission_id uuid, source_feedback_item_id uuid, source_author_id uuid, snippet_text text NOT NULL, anchor jsonb NOT NULL, note text, visibility text DEFAULT 'private'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, snippet_category_id uuid);

CREATE TABLE public.submissions (id uuid DEFAULT gen_random_uuid() NOT NULL, author_id uuid NOT NULL, workshop_id uuid NOT NULL, parent_submission_id uuid, title text NOT NULL, body text NOT NULL, version integer DEFAULT 1 NOT NULL, status submission_status DEFAULT 'submitted'::submission_status NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, source text DEFAULT 'workshop'::text NOT NULL);

CREATE TABLE public.teacher_documents (id uuid DEFAULT gen_random_uuid() NOT NULL, owner_id uuid NOT NULL, title text NOT NULL, body jsonb DEFAULT '{"sections": []}'::jsonb NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.teaching_example_annotations (id uuid DEFAULT gen_random_uuid() NOT NULL, example_id uuid NOT NULL, author_id uuid, anchor jsonb NOT NULL, comment text NOT NULL, category_label text DEFAULT 'Uncategorised'::text NOT NULL, category_slug text DEFAULT 'uncategorised'::text NOT NULL, tags text[] DEFAULT '{}'::text[] NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.teaching_example_hidden_groups (example_id uuid NOT NULL, workshop_id uuid NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.teaching_examples (id uuid DEFAULT gen_random_uuid() NOT NULL, owner_id uuid NOT NULL, title text NOT NULL, author_name text DEFAULT ''::text NOT NULL, source_label text DEFAULT ''::text NOT NULL, source_url text, copyright_status text DEFAULT 'teacher-owned'::text NOT NULL, editorial_note text DEFAULT ''::text NOT NULL, content_note text DEFAULT ''::text NOT NULL, body text DEFAULT ''::text NOT NULL, craft_tags text[] DEFAULT '{}'::text[] NOT NULL, status text DEFAULT 'draft'::text NOT NULL, visible_to_all_groups boolean DEFAULT true NOT NULL, published_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, template_key text);

CREATE TABLE public.teaching_library_items (id uuid DEFAULT gen_random_uuid() NOT NULL, owner_id uuid NOT NULL, item_type text NOT NULL, title text NOT NULL, body text DEFAULT ''::text NOT NULL, reference_type text, url text, category_label text DEFAULT 'Uncategorised'::text NOT NULL, tags text[] DEFAULT '{}'::text[] NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.workshop_members (workshop_id uuid NOT NULL, profile_id uuid NOT NULL);

CREATE TABLE public.workshops (id uuid DEFAULT gen_random_uuid() NOT NULL, title text NOT NULL, slug text, created_by uuid, created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_is_teacher()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = studio_auth.uid()
      and p.role::text in ('teacher', 'admin')
  );
$function$
;

ALTER TABLE public.feedback_items ADD CONSTRAINT feedback_anchor_shape CHECK (((anchor ? 'blockId'::text) AND (anchor ? 'startOffset'::text) AND (anchor ? 'endOffset'::text) AND (anchor ? 'quote'::text) AND (jsonb_typeof((anchor -> 'blockId'::text)) = 'string'::text) AND (jsonb_typeof((anchor -> 'quote'::text)) = 'string'::text) AND (jsonb_typeof((anchor -> 'startOffset'::text)) = 'number'::text) AND (jsonb_typeof((anchor -> 'endOffset'::text)) = 'number'::text)));

ALTER TABLE public.feedback_categories ADD CONSTRAINT feedback_categories_name_check CHECK ((char_length(TRIM(BOTH FROM name)) > 0));

ALTER TABLE public.feedback_categories ADD CONSTRAINT feedback_categories_slug_check CHECK ((char_length(TRIM(BOTH FROM slug)) > 0));

ALTER TABLE public.feedback_categories ADD CONSTRAINT feedback_categories_tone_check CHECK ((tone = ANY (ARRAY['typo'::text, 'craft'::text, 'pacing'::text, 'structure'::text])));

ALTER TABLE public.feedback_export_events ADD CONSTRAINT feedback_export_events_copy_version_check CHECK ((export_copy_version >= 1));

ALTER TABLE public.feedback_export_events ADD CONSTRAINT feedback_export_events_template_check CHECK ((char_length(TRIM(BOTH FROM packet_template)) > 0));

ALTER TABLE public.feedback_summaries ADD CONSTRAINT feedback_summaries_export_copy_version_check CHECK ((export_copy_version >= 1));

ALTER TABLE public.feedback_summaries ADD CONSTRAINT feedback_summaries_last_exported_copy_version_check CHECK (((last_exported_copy_version IS NULL) OR (last_exported_copy_version >= 1)));

ALTER TABLE public.snippet_categories ADD CONSTRAINT snippet_categories_name_check CHECK ((char_length(TRIM(BOTH FROM name)) > 0));

ALTER TABLE public.snippet_categories ADD CONSTRAINT snippet_categories_slug_check CHECK ((char_length(TRIM(BOTH FROM slug)) > 0));

ALTER TABLE public.snippets ADD CONSTRAINT snippets_anchor_shape_check CHECK (((anchor ? 'blockId'::text) AND (anchor ? 'startOffset'::text) AND (anchor ? 'endOffset'::text) AND (anchor ? 'quote'::text) AND (jsonb_typeof((anchor -> 'blockId'::text)) = 'string'::text) AND (jsonb_typeof((anchor -> 'quote'::text)) = 'string'::text) AND (jsonb_typeof((anchor -> 'startOffset'::text)) = 'number'::text) AND (jsonb_typeof((anchor -> 'endOffset'::text)) = 'number'::text)));

ALTER TABLE public.snippets ADD CONSTRAINT snippets_source_type_check CHECK ((source_type = ANY (ARRAY['submission'::text, 'feedback_item'::text, 'external'::text])));

ALTER TABLE public.snippets ADD CONSTRAINT snippets_visibility_check CHECK ((visibility = ANY (ARRAY['private'::text, 'group'::text, 'shared'::text])));

ALTER TABLE public.submissions ADD CONSTRAINT submissions_source_check CHECK ((source = 'workshop'::text));

ALTER TABLE public.submissions ADD CONSTRAINT submissions_version_check CHECK ((version >= 1));

ALTER TABLE public.teacher_documents ADD CONSTRAINT teacher_documents_body_shape_check CHECK ((jsonb_typeof(body) = 'object'::text));

ALTER TABLE public.teacher_documents ADD CONSTRAINT teacher_documents_title_check CHECK ((char_length(TRIM(BOTH FROM title)) > 0));

ALTER TABLE public.teaching_example_annotations ADD CONSTRAINT teaching_example_annotations_anchor_shape CHECK (((anchor ? 'blockId'::text) AND (anchor ? 'startOffset'::text) AND (anchor ? 'endOffset'::text) AND (anchor ? 'quote'::text) AND (jsonb_typeof((anchor -> 'blockId'::text)) = 'string'::text) AND (jsonb_typeof((anchor -> 'quote'::text)) = 'string'::text) AND (jsonb_typeof((anchor -> 'startOffset'::text)) = 'number'::text) AND (jsonb_typeof((anchor -> 'endOffset'::text)) = 'number'::text)));

ALTER TABLE public.teaching_example_annotations ADD CONSTRAINT teaching_example_annotations_comment_check CHECK ((char_length(TRIM(BOTH FROM comment)) > 0));

ALTER TABLE public.teaching_examples ADD CONSTRAINT teaching_examples_body_check CHECK ((char_length(TRIM(BOTH FROM body)) > 0));

ALTER TABLE public.teaching_examples ADD CONSTRAINT teaching_examples_copyright_status_check CHECK ((copyright_status = ANY (ARRAY['teacher-owned'::text, 'public-domain'::text, 'licensed'::text, 'permission-needed'::text])));

ALTER TABLE public.teaching_examples ADD CONSTRAINT teaching_examples_source_url_check CHECK (((source_url IS NULL) OR (char_length(TRIM(BOTH FROM source_url)) > 0)));

ALTER TABLE public.teaching_examples ADD CONSTRAINT teaching_examples_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])));

ALTER TABLE public.teaching_examples ADD CONSTRAINT teaching_examples_title_check CHECK ((char_length(TRIM(BOTH FROM title)) > 0));

ALTER TABLE public.teaching_library_items ADD CONSTRAINT teaching_library_items_reference_type_check CHECK (((reference_type IS NULL) OR (reference_type = ANY (ARRAY['book'::text, 'article'::text, 'video'::text]))));

ALTER TABLE public.teaching_library_items ADD CONSTRAINT teaching_library_items_title_check CHECK ((char_length(TRIM(BOTH FROM title)) > 0));

ALTER TABLE public.teaching_library_items ADD CONSTRAINT teaching_library_items_type_check CHECK ((item_type = ANY (ARRAY['note'::text, 'reference'::text])));

ALTER TABLE public.teaching_library_items ADD CONSTRAINT teaching_library_items_url_check CHECK (((url IS NULL) OR (char_length(TRIM(BOTH FROM url)) > 0)));

ALTER TABLE public.feedback_categories ADD CONSTRAINT feedback_categories_pkey PRIMARY KEY (id);

ALTER TABLE public.feedback_export_events ADD CONSTRAINT feedback_export_events_pkey PRIMARY KEY (id);

ALTER TABLE public.feedback_items ADD CONSTRAINT feedback_items_pkey PRIMARY KEY (id);

ALTER TABLE public.feedback_summaries ADD CONSTRAINT feedback_summaries_pkey PRIMARY KEY (id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.review_summaries ADD CONSTRAINT review_summaries_pkey PRIMARY KEY (id);

ALTER TABLE public.snippet_categories ADD CONSTRAINT snippet_categories_pkey PRIMARY KEY (id);

ALTER TABLE public.snippets ADD CONSTRAINT snippets_pkey PRIMARY KEY (id);

ALTER TABLE public.submissions ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);

ALTER TABLE public.teacher_documents ADD CONSTRAINT teacher_documents_pkey PRIMARY KEY (id);

ALTER TABLE public.teaching_example_annotations ADD CONSTRAINT teaching_example_annotations_pkey PRIMARY KEY (id);

ALTER TABLE public.teaching_example_hidden_groups ADD CONSTRAINT teaching_example_hidden_groups_pkey PRIMARY KEY (example_id, workshop_id);

ALTER TABLE public.teaching_examples ADD CONSTRAINT teaching_examples_pkey PRIMARY KEY (id);

ALTER TABLE public.teaching_library_items ADD CONSTRAINT teaching_library_items_pkey PRIMARY KEY (id);

ALTER TABLE public.workshop_members ADD CONSTRAINT workshop_members_pkey PRIMARY KEY (workshop_id, profile_id);

ALTER TABLE public.workshops ADD CONSTRAINT workshops_pkey PRIMARY KEY (id);

ALTER TABLE public.feedback_summaries ADD CONSTRAINT feedback_summaries_submission_id_key UNIQUE (submission_id);

ALTER TABLE public.review_summaries ADD CONSTRAINT review_summaries_one_per_version UNIQUE (submission_version_id);

ALTER TABLE public.workshops ADD CONSTRAINT workshops_slug_key UNIQUE (slug);

ALTER TABLE public.feedback_categories ADD CONSTRAINT feedback_categories_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.feedback_export_events ADD CONSTRAINT feedback_export_events_exported_by_fkey FOREIGN KEY (exported_by) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.feedback_export_events ADD CONSTRAINT feedback_export_events_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE;

ALTER TABLE public.feedback_export_events ADD CONSTRAINT feedback_export_events_summary_id_fkey FOREIGN KEY (summary_id) REFERENCES feedback_summaries(id) ON DELETE CASCADE;

ALTER TABLE public.feedback_items ADD CONSTRAINT feedback_items_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.feedback_items ADD CONSTRAINT feedback_items_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE;

ALTER TABLE public.feedback_summaries ADD CONSTRAINT feedback_summaries_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.feedback_summaries ADD CONSTRAINT feedback_summaries_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES studio_auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.review_summaries ADD CONSTRAINT review_summaries_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.snippet_categories ADD CONSTRAINT snippet_categories_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.snippets ADD CONSTRAINT snippets_captured_by_fkey FOREIGN KEY (captured_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.snippets ADD CONSTRAINT snippets_saved_by_fkey FOREIGN KEY (saved_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.snippets ADD CONSTRAINT snippets_snippet_category_id_fkey FOREIGN KEY (snippet_category_id) REFERENCES snippet_categories(id) ON DELETE SET NULL;

ALTER TABLE public.snippets ADD CONSTRAINT snippets_source_author_id_fkey FOREIGN KEY (source_author_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.snippets ADD CONSTRAINT snippets_source_feedback_item_id_fkey FOREIGN KEY (source_feedback_item_id) REFERENCES feedback_items(id) ON DELETE SET NULL;

ALTER TABLE public.snippets ADD CONSTRAINT snippets_source_submission_id_fkey FOREIGN KEY (source_submission_id) REFERENCES submissions(id) ON DELETE CASCADE;

ALTER TABLE public.submissions ADD CONSTRAINT submissions_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.submissions ADD CONSTRAINT submissions_parent_submission_id_fkey FOREIGN KEY (parent_submission_id) REFERENCES submissions(id) ON DELETE SET NULL;

ALTER TABLE public.submissions ADD CONSTRAINT submissions_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE RESTRICT;

ALTER TABLE public.teacher_documents ADD CONSTRAINT teacher_documents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.teaching_example_annotations ADD CONSTRAINT teaching_example_annotations_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.teaching_example_annotations ADD CONSTRAINT teaching_example_annotations_example_id_fkey FOREIGN KEY (example_id) REFERENCES teaching_examples(id) ON DELETE CASCADE;

ALTER TABLE public.teaching_example_hidden_groups ADD CONSTRAINT teaching_example_hidden_groups_example_id_fkey FOREIGN KEY (example_id) REFERENCES teaching_examples(id) ON DELETE CASCADE;

ALTER TABLE public.teaching_example_hidden_groups ADD CONSTRAINT teaching_example_hidden_groups_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE;

ALTER TABLE public.teaching_examples ADD CONSTRAINT teaching_examples_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.teaching_library_items ADD CONSTRAINT teaching_library_items_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.workshop_members ADD CONSTRAINT workshop_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.workshop_members ADD CONSTRAINT workshop_members_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE;

ALTER TABLE public.workshops ADD CONSTRAINT workshops_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX feedback_categories_owner_created_idx ON public.feedback_categories USING btree (owner_id, created_at DESC);

CREATE UNIQUE INDEX feedback_categories_owner_name_idx ON public.feedback_categories USING btree (owner_id, lower(name));

CREATE UNIQUE INDEX feedback_categories_owner_slug_idx ON public.feedback_categories USING btree (owner_id, slug);

CREATE INDEX feedback_export_events_submission_created_idx ON public.feedback_export_events USING btree (submission_id, created_at DESC);

CREATE INDEX feedback_export_events_summary_created_idx ON public.feedback_export_events USING btree (summary_id, created_at DESC);

CREATE INDEX feedback_items_author_created_idx ON public.feedback_items USING btree (author_id, created_at DESC);

CREATE INDEX feedback_items_comment_fts_idx ON public.feedback_items USING gin (to_tsvector('english'::regconfig, COALESCE(comment, ''::text)));

CREATE INDEX feedback_items_submission_created_idx ON public.feedback_items USING btree (submission_id, created_at DESC);

CREATE INDEX review_summaries_submission_version_idx ON public.review_summaries USING btree (submission_id, submission_version_id);

CREATE INDEX snippet_categories_owner_created_idx ON public.snippet_categories USING btree (owner_id, created_at DESC);

CREATE UNIQUE INDEX snippet_categories_owner_name_idx ON public.snippet_categories USING btree (owner_id, lower(name));

CREATE UNIQUE INDEX snippet_categories_owner_slug_idx ON public.snippet_categories USING btree (owner_id, slug);

CREATE INDEX snippets_anchor_category_idx ON public.snippets USING btree (((anchor ->> 'categoryLabel'::text)));

CREATE INDEX snippets_anchor_status_idx ON public.snippets USING btree (((anchor ->> 'snippetStatus'::text)));

CREATE INDEX snippets_category_created_idx ON public.snippets USING btree (snippet_category_id, created_at DESC);

CREATE INDEX snippets_saved_by_created_idx ON public.snippets USING btree (saved_by, created_at DESC);

CREATE INDEX snippets_saved_by_updated_idx ON public.snippets USING btree (saved_by, updated_at DESC);

CREATE INDEX snippets_source_submission_created_idx ON public.snippets USING btree (source_submission_id, created_at DESC);

CREATE INDEX snippets_text_fts_idx ON public.snippets USING gin (to_tsvector('english'::regconfig, COALESCE(snippet_text, ''::text)));

CREATE INDEX submissions_source_status_created_idx ON public.submissions USING btree (source, status, created_at DESC);

CREATE INDEX teacher_documents_owner_updated_idx ON public.teacher_documents USING btree (owner_id, updated_at DESC);

CREATE INDEX teaching_example_annotations_example_created_idx ON public.teaching_example_annotations USING btree (example_id, created_at);

CREATE INDEX teaching_example_hidden_groups_workshop_idx ON public.teaching_example_hidden_groups USING btree (workshop_id);

CREATE UNIQUE INDEX teaching_examples_owner_template_key_idx ON public.teaching_examples USING btree (owner_id, template_key) WHERE (template_key IS NOT NULL);

CREATE INDEX teaching_examples_owner_updated_idx ON public.teaching_examples USING btree (owner_id, updated_at DESC);

CREATE INDEX teaching_examples_status_updated_idx ON public.teaching_examples USING btree (status, updated_at DESC);

CREATE INDEX teaching_library_items_owner_type_updated_idx ON public.teaching_library_items USING btree (owner_id, item_type, updated_at DESC);

CREATE INDEX teaching_library_items_owner_updated_idx ON public.teaching_library_items USING btree (owner_id, updated_at DESC);

CREATE TRIGGER snippet_categories_set_updated_at BEFORE UPDATE ON public.snippet_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER teaching_library_items_set_updated_at BEFORE UPDATE ON public.teaching_library_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER submissions_set_updated_at BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER feedback_summaries_set_updated_at BEFORE UPDATE ON public.feedback_summaries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER feedback_categories_set_updated_at BEFORE UPDATE ON public.feedback_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER snippets_set_updated_at BEFORE UPDATE ON public.snippets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER teacher_documents_set_updated_at BEFORE UPDATE ON public.teacher_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER teaching_examples_set_updated_at BEFORE UPDATE ON public.teaching_examples FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER teaching_example_annotations_set_updated_at BEFORE UPDATE ON public.teaching_example_annotations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

alter table public."teaching_library_items" enable row level security;

alter table public."snippets" enable row level security;

alter table public."profiles" enable row level security;

alter table public."teaching_examples" enable row level security;

alter table public."snippet_categories" enable row level security;

alter table public."review_summaries" enable row level security;

alter table public."teaching_example_hidden_groups" enable row level security;

alter table public."submissions" enable row level security;

alter table public."workshops" enable row level security;

alter table public."workshop_members" enable row level security;

alter table public."feedback_items" enable row level security;

alter table public."feedback_summaries" enable row level security;

alter table public."teaching_example_annotations" enable row level security;

alter table public."feedback_categories" enable row level security;

alter table public."feedback_export_events" enable row level security;

alter table public."teacher_documents" enable row level security;

create policy "profiles are readable by owner or teacher" on public."profiles" as PERMISSIVE for SELECT to PUBLIC using (((id = studio_auth.uid()) OR current_user_is_teacher())) ;

create policy "profiles are updatable by owner" on public."profiles" as PERMISSIVE for UPDATE to PUBLIC using ((id = studio_auth.uid())) ;

create policy "teachers can manage workshops" on public."workshops" as PERMISSIVE for ALL to PUBLIC using (current_user_is_teacher()) with check (current_user_is_teacher());

create policy "members can read workshops" on public."workshops" as PERMISSIVE for SELECT to PUBLIC using ((current_user_is_teacher() OR (EXISTS ( SELECT 1
   FROM workshop_members wm
  WHERE ((wm.workshop_id = workshops.id) AND (wm.profile_id = studio_auth.uid())))))) ;

create policy "teachers can manage workshop membership" on public."workshop_members" as PERMISSIVE for ALL to PUBLIC using (current_user_is_teacher()) with check (current_user_is_teacher());

create policy "members can view own workshop memberships" on public."workshop_members" as PERMISSIVE for SELECT to PUBLIC using (((profile_id = studio_auth.uid()) OR current_user_is_teacher())) ;

create policy "users read own feedback categories" on public."feedback_categories" as PERMISSIVE for SELECT to PUBLIC using ((owner_id = studio_auth.uid())) ;

create policy "users create own feedback categories" on public."feedback_categories" as PERMISSIVE for INSERT to PUBLIC  with check ((owner_id = studio_auth.uid()));

create policy "users update own feedback categories" on public."feedback_categories" as PERMISSIVE for UPDATE to PUBLIC using ((owner_id = studio_auth.uid())) with check ((owner_id = studio_auth.uid()));

create policy "users delete own feedback categories" on public."feedback_categories" as PERMISSIVE for DELETE to PUBLIC using ((owner_id = studio_auth.uid())) ;

create policy "users read own teacher documents" on public."teacher_documents" as PERMISSIVE for SELECT to PUBLIC using ((owner_id = studio_auth.uid())) ;

create policy "users create own teacher documents" on public."teacher_documents" as PERMISSIVE for INSERT to PUBLIC  with check ((owner_id = studio_auth.uid()));

create policy "writers create own submissions" on public."submissions" as PERMISSIVE for INSERT to PUBLIC  with check (((author_id = studio_auth.uid()) AND (current_user_is_teacher() OR (EXISTS ( SELECT 1
   FROM workshop_members wm
  WHERE ((wm.workshop_id = submissions.workshop_id) AND (wm.profile_id = studio_auth.uid())))))));

create policy "teachers update submissions" on public."submissions" as PERMISSIVE for UPDATE to PUBLIC using (current_user_is_teacher()) with check (current_user_is_teacher());

create policy "teachers create feedback items" on public."feedback_items" as PERMISSIVE for INSERT to PUBLIC  with check (current_user_is_teacher());

create policy "teachers update feedback items" on public."feedback_items" as PERMISSIVE for UPDATE to PUBLIC using (current_user_is_teacher()) with check (current_user_is_teacher());

create policy "teachers delete feedback items" on public."feedback_items" as PERMISSIVE for DELETE to PUBLIC using (current_user_is_teacher()) ;

create policy "teachers create feedback summaries" on public."feedback_summaries" as PERMISSIVE for INSERT to PUBLIC  with check (current_user_is_teacher());

create policy "teachers update feedback summaries" on public."feedback_summaries" as PERMISSIVE for UPDATE to PUBLIC using (current_user_is_teacher()) with check (current_user_is_teacher());

create policy "submissions readable to owners, members, teachers" on public."submissions" as PERMISSIVE for SELECT to PUBLIC using (((author_id = studio_auth.uid()) OR current_user_is_teacher() OR (EXISTS ( SELECT 1
   FROM workshop_members wm
  WHERE ((wm.workshop_id = submissions.workshop_id) AND (wm.profile_id = studio_auth.uid())))))) ;

create policy "feedback items readable with submission access" on public."feedback_items" as PERMISSIVE for SELECT to PUBLIC using ((current_user_is_teacher() OR (EXISTS ( SELECT 1
   FROM (submissions s
     LEFT JOIN workshop_members wm ON (((wm.workshop_id = s.workshop_id) AND (wm.profile_id = studio_auth.uid()))))
  WHERE ((s.id = feedback_items.submission_id) AND ((s.author_id = studio_auth.uid()) OR (wm.profile_id IS NOT NULL))))))) ;

create policy "teachers read feedback export events" on public."feedback_export_events" as PERMISSIVE for SELECT to PUBLIC using (current_user_is_teacher()) ;

create policy "teachers create feedback export events" on public."feedback_export_events" as PERMISSIVE for INSERT to PUBLIC  with check (current_user_is_teacher());

create policy "feedback summaries readable with submission access" on public."feedback_summaries" as PERMISSIVE for SELECT to PUBLIC using ((current_user_is_teacher() OR (EXISTS ( SELECT 1
   FROM (submissions s
     LEFT JOIN workshop_members wm ON (((wm.workshop_id = s.workshop_id) AND (wm.profile_id = studio_auth.uid()))))
  WHERE ((s.id = feedback_summaries.submission_id) AND ((s.author_id = studio_auth.uid()) OR (wm.profile_id IS NOT NULL))))))) ;

create policy "writers delete own submitted submissions" on public."submissions" as PERMISSIVE for DELETE to PUBLIC using (((author_id = studio_auth.uid()) AND (status = 'submitted'::submission_status))) ;

create policy "users read own snippets" on public."snippets" as PERMISSIVE for SELECT to PUBLIC using ((saved_by = studio_auth.uid())) ;

create policy "users create own snippets" on public."snippets" as PERMISSIVE for INSERT to PUBLIC  with check ((saved_by = studio_auth.uid()));

create policy "users update own snippets" on public."snippets" as PERMISSIVE for UPDATE to PUBLIC using ((saved_by = studio_auth.uid())) with check ((saved_by = studio_auth.uid()));

create policy "users delete own snippets" on public."snippets" as PERMISSIVE for DELETE to PUBLIC using ((saved_by = studio_auth.uid())) ;

create policy "users read own snippet categories" on public."snippet_categories" as PERMISSIVE for SELECT to PUBLIC using ((owner_id = studio_auth.uid())) ;

create policy "users create own snippet categories" on public."snippet_categories" as PERMISSIVE for INSERT to PUBLIC  with check ((owner_id = studio_auth.uid()));

create policy "users update own snippet categories" on public."snippet_categories" as PERMISSIVE for UPDATE to PUBLIC using ((owner_id = studio_auth.uid())) with check ((owner_id = studio_auth.uid()));

create policy "users delete own snippet categories" on public."snippet_categories" as PERMISSIVE for DELETE to PUBLIC using ((owner_id = studio_auth.uid())) ;

create policy "users update own teacher documents" on public."teacher_documents" as PERMISSIVE for UPDATE to PUBLIC using ((owner_id = studio_auth.uid())) with check ((owner_id = studio_auth.uid()));

create policy "users delete own teacher documents" on public."teacher_documents" as PERMISSIVE for DELETE to PUBLIC using ((owner_id = studio_auth.uid())) ;

create policy "users read own teaching library items" on public."teaching_library_items" as PERMISSIVE for SELECT to PUBLIC using ((owner_id = studio_auth.uid())) ;

create policy "users create own teaching library items" on public."teaching_library_items" as PERMISSIVE for INSERT to PUBLIC  with check ((owner_id = studio_auth.uid()));

create policy "users update own teaching library items" on public."teaching_library_items" as PERMISSIVE for UPDATE to PUBLIC using ((owner_id = studio_auth.uid())) with check ((owner_id = studio_auth.uid()));

create policy "users delete own teaching library items" on public."teaching_library_items" as PERMISSIVE for DELETE to PUBLIC using ((owner_id = studio_auth.uid())) ;

create policy "teachers manage teaching examples" on public."teaching_examples" as PERMISSIVE for ALL to PUBLIC using (current_user_is_teacher()) with check (current_user_is_teacher());

create policy "writers read published teaching examples" on public."teaching_examples" as PERMISSIVE for SELECT to PUBLIC using ((status = 'published'::text)) ;

create policy "teachers manage teaching example annotations" on public."teaching_example_annotations" as PERMISSIVE for ALL to PUBLIC using (current_user_is_teacher()) with check (current_user_is_teacher());

create policy "writers read published teaching example annotations" on public."teaching_example_annotations" as PERMISSIVE for SELECT to PUBLIC using ((EXISTS ( SELECT 1
   FROM teaching_examples e
  WHERE ((e.id = teaching_example_annotations.example_id) AND (e.status = 'published'::text))))) ;

create policy "teachers manage teaching example hidden groups" on public."teaching_example_hidden_groups" as PERMISSIVE for ALL to PUBLIC using (current_user_is_teacher()) with check (current_user_is_teacher());

create policy "writers read teaching example hidden groups" on public."teaching_example_hidden_groups" as PERMISSIVE for SELECT to PUBLIC using (true) ;

grant INSERT on public."teaching_library_items" to "studio_anon";

grant SELECT on public."teaching_library_items" to "studio_anon";

grant UPDATE on public."teaching_library_items" to "studio_anon";

grant DELETE on public."teaching_library_items" to "studio_anon";

grant TRUNCATE on public."teaching_library_items" to "studio_anon";

grant REFERENCES on public."teaching_library_items" to "studio_anon";

grant TRIGGER on public."teaching_library_items" to "studio_anon";

grant INSERT on public."teaching_library_items" to "studio_authenticated";

grant SELECT on public."teaching_library_items" to "studio_authenticated";

grant UPDATE on public."teaching_library_items" to "studio_authenticated";

grant DELETE on public."teaching_library_items" to "studio_authenticated";

grant TRUNCATE on public."teaching_library_items" to "studio_authenticated";

grant REFERENCES on public."teaching_library_items" to "studio_authenticated";

grant TRIGGER on public."teaching_library_items" to "studio_authenticated";

grant INSERT on public."teaching_library_items" to "netlifydb_owner";

grant SELECT on public."teaching_library_items" to "netlifydb_owner";

grant UPDATE on public."teaching_library_items" to "netlifydb_owner";

grant DELETE on public."teaching_library_items" to "netlifydb_owner";

grant TRUNCATE on public."teaching_library_items" to "netlifydb_owner";

grant REFERENCES on public."teaching_library_items" to "netlifydb_owner";

grant TRIGGER on public."teaching_library_items" to "netlifydb_owner";

grant INSERT on public."snippets" to "studio_anon";

grant SELECT on public."snippets" to "studio_anon";

grant UPDATE on public."snippets" to "studio_anon";

grant DELETE on public."snippets" to "studio_anon";

grant TRUNCATE on public."snippets" to "studio_anon";

grant REFERENCES on public."snippets" to "studio_anon";

grant TRIGGER on public."snippets" to "studio_anon";

grant INSERT on public."snippets" to "studio_authenticated";

grant SELECT on public."snippets" to "studio_authenticated";

grant UPDATE on public."snippets" to "studio_authenticated";

grant DELETE on public."snippets" to "studio_authenticated";

grant TRUNCATE on public."snippets" to "studio_authenticated";

grant REFERENCES on public."snippets" to "studio_authenticated";

grant TRIGGER on public."snippets" to "studio_authenticated";

grant INSERT on public."snippets" to "netlifydb_owner";

grant SELECT on public."snippets" to "netlifydb_owner";

grant UPDATE on public."snippets" to "netlifydb_owner";

grant DELETE on public."snippets" to "netlifydb_owner";

grant TRUNCATE on public."snippets" to "netlifydb_owner";

grant REFERENCES on public."snippets" to "netlifydb_owner";

grant TRIGGER on public."snippets" to "netlifydb_owner";

grant INSERT on public."profiles" to "studio_anon";

grant SELECT on public."profiles" to "studio_anon";

grant UPDATE on public."profiles" to "studio_anon";

grant DELETE on public."profiles" to "studio_anon";

grant TRUNCATE on public."profiles" to "studio_anon";

grant REFERENCES on public."profiles" to "studio_anon";

grant TRIGGER on public."profiles" to "studio_anon";

grant INSERT on public."profiles" to "studio_authenticated";

grant SELECT on public."profiles" to "studio_authenticated";

grant UPDATE on public."profiles" to "studio_authenticated";

grant DELETE on public."profiles" to "studio_authenticated";

grant TRUNCATE on public."profiles" to "studio_authenticated";

grant REFERENCES on public."profiles" to "studio_authenticated";

grant TRIGGER on public."profiles" to "studio_authenticated";

grant INSERT on public."profiles" to "netlifydb_owner";

grant SELECT on public."profiles" to "netlifydb_owner";

grant UPDATE on public."profiles" to "netlifydb_owner";

grant DELETE on public."profiles" to "netlifydb_owner";

grant TRUNCATE on public."profiles" to "netlifydb_owner";

grant REFERENCES on public."profiles" to "netlifydb_owner";

grant TRIGGER on public."profiles" to "netlifydb_owner";

grant INSERT on public."teaching_examples" to "studio_anon";

grant SELECT on public."teaching_examples" to "studio_anon";

grant UPDATE on public."teaching_examples" to "studio_anon";

grant DELETE on public."teaching_examples" to "studio_anon";

grant TRUNCATE on public."teaching_examples" to "studio_anon";

grant REFERENCES on public."teaching_examples" to "studio_anon";

grant TRIGGER on public."teaching_examples" to "studio_anon";

grant INSERT on public."teaching_examples" to "studio_authenticated";

grant SELECT on public."teaching_examples" to "studio_authenticated";

grant UPDATE on public."teaching_examples" to "studio_authenticated";

grant DELETE on public."teaching_examples" to "studio_authenticated";

grant TRUNCATE on public."teaching_examples" to "studio_authenticated";

grant REFERENCES on public."teaching_examples" to "studio_authenticated";

grant TRIGGER on public."teaching_examples" to "studio_authenticated";

grant INSERT on public."teaching_examples" to "netlifydb_owner";

grant SELECT on public."teaching_examples" to "netlifydb_owner";

grant UPDATE on public."teaching_examples" to "netlifydb_owner";

grant DELETE on public."teaching_examples" to "netlifydb_owner";

grant TRUNCATE on public."teaching_examples" to "netlifydb_owner";

grant REFERENCES on public."teaching_examples" to "netlifydb_owner";

grant TRIGGER on public."teaching_examples" to "netlifydb_owner";

grant INSERT on public."snippet_categories" to "studio_anon";

grant SELECT on public."snippet_categories" to "studio_anon";

grant UPDATE on public."snippet_categories" to "studio_anon";

grant DELETE on public."snippet_categories" to "studio_anon";

grant TRUNCATE on public."snippet_categories" to "studio_anon";

grant REFERENCES on public."snippet_categories" to "studio_anon";

grant TRIGGER on public."snippet_categories" to "studio_anon";

grant INSERT on public."snippet_categories" to "studio_authenticated";

grant SELECT on public."snippet_categories" to "studio_authenticated";

grant UPDATE on public."snippet_categories" to "studio_authenticated";

grant DELETE on public."snippet_categories" to "studio_authenticated";

grant TRUNCATE on public."snippet_categories" to "studio_authenticated";

grant REFERENCES on public."snippet_categories" to "studio_authenticated";

grant TRIGGER on public."snippet_categories" to "studio_authenticated";

grant INSERT on public."snippet_categories" to "netlifydb_owner";

grant SELECT on public."snippet_categories" to "netlifydb_owner";

grant UPDATE on public."snippet_categories" to "netlifydb_owner";

grant DELETE on public."snippet_categories" to "netlifydb_owner";

grant TRUNCATE on public."snippet_categories" to "netlifydb_owner";

grant REFERENCES on public."snippet_categories" to "netlifydb_owner";

grant TRIGGER on public."snippet_categories" to "netlifydb_owner";

grant INSERT on public."review_summaries" to "studio_anon";

grant SELECT on public."review_summaries" to "studio_anon";

grant UPDATE on public."review_summaries" to "studio_anon";

grant DELETE on public."review_summaries" to "studio_anon";

grant TRUNCATE on public."review_summaries" to "studio_anon";

grant REFERENCES on public."review_summaries" to "studio_anon";

grant TRIGGER on public."review_summaries" to "studio_anon";

grant INSERT on public."review_summaries" to "studio_authenticated";

grant SELECT on public."review_summaries" to "studio_authenticated";

grant UPDATE on public."review_summaries" to "studio_authenticated";

grant DELETE on public."review_summaries" to "studio_authenticated";

grant TRUNCATE on public."review_summaries" to "studio_authenticated";

grant REFERENCES on public."review_summaries" to "studio_authenticated";

grant TRIGGER on public."review_summaries" to "studio_authenticated";

grant INSERT on public."review_summaries" to "netlifydb_owner";

grant SELECT on public."review_summaries" to "netlifydb_owner";

grant UPDATE on public."review_summaries" to "netlifydb_owner";

grant DELETE on public."review_summaries" to "netlifydb_owner";

grant TRUNCATE on public."review_summaries" to "netlifydb_owner";

grant REFERENCES on public."review_summaries" to "netlifydb_owner";

grant TRIGGER on public."review_summaries" to "netlifydb_owner";

grant INSERT on public."teaching_example_hidden_groups" to "studio_anon";

grant SELECT on public."teaching_example_hidden_groups" to "studio_anon";

grant UPDATE on public."teaching_example_hidden_groups" to "studio_anon";

grant DELETE on public."teaching_example_hidden_groups" to "studio_anon";

grant TRUNCATE on public."teaching_example_hidden_groups" to "studio_anon";

grant REFERENCES on public."teaching_example_hidden_groups" to "studio_anon";

grant TRIGGER on public."teaching_example_hidden_groups" to "studio_anon";

grant INSERT on public."teaching_example_hidden_groups" to "studio_authenticated";

grant SELECT on public."teaching_example_hidden_groups" to "studio_authenticated";

grant UPDATE on public."teaching_example_hidden_groups" to "studio_authenticated";

grant DELETE on public."teaching_example_hidden_groups" to "studio_authenticated";

grant TRUNCATE on public."teaching_example_hidden_groups" to "studio_authenticated";

grant REFERENCES on public."teaching_example_hidden_groups" to "studio_authenticated";

grant TRIGGER on public."teaching_example_hidden_groups" to "studio_authenticated";

grant INSERT on public."teaching_example_hidden_groups" to "netlifydb_owner";

grant SELECT on public."teaching_example_hidden_groups" to "netlifydb_owner";

grant UPDATE on public."teaching_example_hidden_groups" to "netlifydb_owner";

grant DELETE on public."teaching_example_hidden_groups" to "netlifydb_owner";

grant TRUNCATE on public."teaching_example_hidden_groups" to "netlifydb_owner";

grant REFERENCES on public."teaching_example_hidden_groups" to "netlifydb_owner";

grant TRIGGER on public."teaching_example_hidden_groups" to "netlifydb_owner";

grant INSERT on public."submissions" to "studio_anon";

grant SELECT on public."submissions" to "studio_anon";

grant UPDATE on public."submissions" to "studio_anon";

grant DELETE on public."submissions" to "studio_anon";

grant TRUNCATE on public."submissions" to "studio_anon";

grant REFERENCES on public."submissions" to "studio_anon";

grant TRIGGER on public."submissions" to "studio_anon";

grant INSERT on public."submissions" to "studio_authenticated";

grant SELECT on public."submissions" to "studio_authenticated";

grant UPDATE on public."submissions" to "studio_authenticated";

grant DELETE on public."submissions" to "studio_authenticated";

grant TRUNCATE on public."submissions" to "studio_authenticated";

grant REFERENCES on public."submissions" to "studio_authenticated";

grant TRIGGER on public."submissions" to "studio_authenticated";

grant INSERT on public."submissions" to "netlifydb_owner";

grant SELECT on public."submissions" to "netlifydb_owner";

grant UPDATE on public."submissions" to "netlifydb_owner";

grant DELETE on public."submissions" to "netlifydb_owner";

grant TRUNCATE on public."submissions" to "netlifydb_owner";

grant REFERENCES on public."submissions" to "netlifydb_owner";

grant TRIGGER on public."submissions" to "netlifydb_owner";

grant INSERT on public."workshops" to "studio_anon";

grant SELECT on public."workshops" to "studio_anon";

grant UPDATE on public."workshops" to "studio_anon";

grant DELETE on public."workshops" to "studio_anon";

grant TRUNCATE on public."workshops" to "studio_anon";

grant REFERENCES on public."workshops" to "studio_anon";

grant TRIGGER on public."workshops" to "studio_anon";

grant INSERT on public."workshops" to "studio_authenticated";

grant SELECT on public."workshops" to "studio_authenticated";

grant UPDATE on public."workshops" to "studio_authenticated";

grant DELETE on public."workshops" to "studio_authenticated";

grant TRUNCATE on public."workshops" to "studio_authenticated";

grant REFERENCES on public."workshops" to "studio_authenticated";

grant TRIGGER on public."workshops" to "studio_authenticated";

grant INSERT on public."workshops" to "netlifydb_owner";

grant SELECT on public."workshops" to "netlifydb_owner";

grant UPDATE on public."workshops" to "netlifydb_owner";

grant DELETE on public."workshops" to "netlifydb_owner";

grant TRUNCATE on public."workshops" to "netlifydb_owner";

grant REFERENCES on public."workshops" to "netlifydb_owner";

grant TRIGGER on public."workshops" to "netlifydb_owner";

grant INSERT on public."workshop_members" to "studio_anon";

grant SELECT on public."workshop_members" to "studio_anon";

grant UPDATE on public."workshop_members" to "studio_anon";

grant DELETE on public."workshop_members" to "studio_anon";

grant TRUNCATE on public."workshop_members" to "studio_anon";

grant REFERENCES on public."workshop_members" to "studio_anon";

grant TRIGGER on public."workshop_members" to "studio_anon";

grant INSERT on public."workshop_members" to "studio_authenticated";

grant SELECT on public."workshop_members" to "studio_authenticated";

grant UPDATE on public."workshop_members" to "studio_authenticated";

grant DELETE on public."workshop_members" to "studio_authenticated";

grant TRUNCATE on public."workshop_members" to "studio_authenticated";

grant REFERENCES on public."workshop_members" to "studio_authenticated";

grant TRIGGER on public."workshop_members" to "studio_authenticated";

grant INSERT on public."workshop_members" to "netlifydb_owner";

grant SELECT on public."workshop_members" to "netlifydb_owner";

grant UPDATE on public."workshop_members" to "netlifydb_owner";

grant DELETE on public."workshop_members" to "netlifydb_owner";

grant TRUNCATE on public."workshop_members" to "netlifydb_owner";

grant REFERENCES on public."workshop_members" to "netlifydb_owner";

grant TRIGGER on public."workshop_members" to "netlifydb_owner";

grant INSERT on public."feedback_items" to "studio_anon";

grant SELECT on public."feedback_items" to "studio_anon";

grant UPDATE on public."feedback_items" to "studio_anon";

grant DELETE on public."feedback_items" to "studio_anon";

grant TRUNCATE on public."feedback_items" to "studio_anon";

grant REFERENCES on public."feedback_items" to "studio_anon";

grant TRIGGER on public."feedback_items" to "studio_anon";

grant INSERT on public."feedback_items" to "studio_authenticated";

grant SELECT on public."feedback_items" to "studio_authenticated";

grant UPDATE on public."feedback_items" to "studio_authenticated";

grant DELETE on public."feedback_items" to "studio_authenticated";

grant TRUNCATE on public."feedback_items" to "studio_authenticated";

grant REFERENCES on public."feedback_items" to "studio_authenticated";

grant TRIGGER on public."feedback_items" to "studio_authenticated";

grant INSERT on public."feedback_items" to "netlifydb_owner";

grant SELECT on public."feedback_items" to "netlifydb_owner";

grant UPDATE on public."feedback_items" to "netlifydb_owner";

grant DELETE on public."feedback_items" to "netlifydb_owner";

grant TRUNCATE on public."feedback_items" to "netlifydb_owner";

grant REFERENCES on public."feedback_items" to "netlifydb_owner";

grant TRIGGER on public."feedback_items" to "netlifydb_owner";

grant INSERT on public."feedback_summaries" to "studio_anon";

grant SELECT on public."feedback_summaries" to "studio_anon";

grant UPDATE on public."feedback_summaries" to "studio_anon";

grant DELETE on public."feedback_summaries" to "studio_anon";

grant TRUNCATE on public."feedback_summaries" to "studio_anon";

grant REFERENCES on public."feedback_summaries" to "studio_anon";

grant TRIGGER on public."feedback_summaries" to "studio_anon";

grant INSERT on public."feedback_summaries" to "studio_authenticated";

grant SELECT on public."feedback_summaries" to "studio_authenticated";

grant UPDATE on public."feedback_summaries" to "studio_authenticated";

grant DELETE on public."feedback_summaries" to "studio_authenticated";

grant TRUNCATE on public."feedback_summaries" to "studio_authenticated";

grant REFERENCES on public."feedback_summaries" to "studio_authenticated";

grant TRIGGER on public."feedback_summaries" to "studio_authenticated";

grant INSERT on public."feedback_summaries" to "netlifydb_owner";

grant SELECT on public."feedback_summaries" to "netlifydb_owner";

grant UPDATE on public."feedback_summaries" to "netlifydb_owner";

grant DELETE on public."feedback_summaries" to "netlifydb_owner";

grant TRUNCATE on public."feedback_summaries" to "netlifydb_owner";

grant REFERENCES on public."feedback_summaries" to "netlifydb_owner";

grant TRIGGER on public."feedback_summaries" to "netlifydb_owner";

grant INSERT on public."teaching_example_annotations" to "studio_anon";

grant SELECT on public."teaching_example_annotations" to "studio_anon";

grant UPDATE on public."teaching_example_annotations" to "studio_anon";

grant DELETE on public."teaching_example_annotations" to "studio_anon";

grant TRUNCATE on public."teaching_example_annotations" to "studio_anon";

grant REFERENCES on public."teaching_example_annotations" to "studio_anon";

grant TRIGGER on public."teaching_example_annotations" to "studio_anon";

grant INSERT on public."teaching_example_annotations" to "studio_authenticated";

grant SELECT on public."teaching_example_annotations" to "studio_authenticated";

grant UPDATE on public."teaching_example_annotations" to "studio_authenticated";

grant DELETE on public."teaching_example_annotations" to "studio_authenticated";

grant TRUNCATE on public."teaching_example_annotations" to "studio_authenticated";

grant REFERENCES on public."teaching_example_annotations" to "studio_authenticated";

grant TRIGGER on public."teaching_example_annotations" to "studio_authenticated";

grant INSERT on public."teaching_example_annotations" to "netlifydb_owner";

grant SELECT on public."teaching_example_annotations" to "netlifydb_owner";

grant UPDATE on public."teaching_example_annotations" to "netlifydb_owner";

grant DELETE on public."teaching_example_annotations" to "netlifydb_owner";

grant TRUNCATE on public."teaching_example_annotations" to "netlifydb_owner";

grant REFERENCES on public."teaching_example_annotations" to "netlifydb_owner";

grant TRIGGER on public."teaching_example_annotations" to "netlifydb_owner";

grant INSERT on public."feedback_categories" to "studio_anon";

grant SELECT on public."feedback_categories" to "studio_anon";

grant UPDATE on public."feedback_categories" to "studio_anon";

grant DELETE on public."feedback_categories" to "studio_anon";

grant TRUNCATE on public."feedback_categories" to "studio_anon";

grant REFERENCES on public."feedback_categories" to "studio_anon";

grant TRIGGER on public."feedback_categories" to "studio_anon";

grant INSERT on public."feedback_categories" to "studio_authenticated";

grant SELECT on public."feedback_categories" to "studio_authenticated";

grant UPDATE on public."feedback_categories" to "studio_authenticated";

grant DELETE on public."feedback_categories" to "studio_authenticated";

grant TRUNCATE on public."feedback_categories" to "studio_authenticated";

grant REFERENCES on public."feedback_categories" to "studio_authenticated";

grant TRIGGER on public."feedback_categories" to "studio_authenticated";

grant INSERT on public."feedback_categories" to "netlifydb_owner";

grant SELECT on public."feedback_categories" to "netlifydb_owner";

grant UPDATE on public."feedback_categories" to "netlifydb_owner";

grant DELETE on public."feedback_categories" to "netlifydb_owner";

grant TRUNCATE on public."feedback_categories" to "netlifydb_owner";

grant REFERENCES on public."feedback_categories" to "netlifydb_owner";

grant TRIGGER on public."feedback_categories" to "netlifydb_owner";

grant INSERT on public."feedback_export_events" to "studio_anon";

grant SELECT on public."feedback_export_events" to "studio_anon";

grant UPDATE on public."feedback_export_events" to "studio_anon";

grant DELETE on public."feedback_export_events" to "studio_anon";

grant TRUNCATE on public."feedback_export_events" to "studio_anon";

grant REFERENCES on public."feedback_export_events" to "studio_anon";

grant TRIGGER on public."feedback_export_events" to "studio_anon";

grant INSERT on public."feedback_export_events" to "studio_authenticated";

grant SELECT on public."feedback_export_events" to "studio_authenticated";

grant UPDATE on public."feedback_export_events" to "studio_authenticated";

grant DELETE on public."feedback_export_events" to "studio_authenticated";

grant TRUNCATE on public."feedback_export_events" to "studio_authenticated";

grant REFERENCES on public."feedback_export_events" to "studio_authenticated";

grant TRIGGER on public."feedback_export_events" to "studio_authenticated";

grant INSERT on public."feedback_export_events" to "netlifydb_owner";

grant SELECT on public."feedback_export_events" to "netlifydb_owner";

grant UPDATE on public."feedback_export_events" to "netlifydb_owner";

grant DELETE on public."feedback_export_events" to "netlifydb_owner";

grant TRUNCATE on public."feedback_export_events" to "netlifydb_owner";

grant REFERENCES on public."feedback_export_events" to "netlifydb_owner";

grant TRIGGER on public."feedback_export_events" to "netlifydb_owner";

grant INSERT on public."teacher_documents" to "studio_anon";

grant SELECT on public."teacher_documents" to "studio_anon";

grant UPDATE on public."teacher_documents" to "studio_anon";

grant DELETE on public."teacher_documents" to "studio_anon";

grant TRUNCATE on public."teacher_documents" to "studio_anon";

grant REFERENCES on public."teacher_documents" to "studio_anon";

grant TRIGGER on public."teacher_documents" to "studio_anon";

grant INSERT on public."teacher_documents" to "studio_authenticated";

grant SELECT on public."teacher_documents" to "studio_authenticated";

grant UPDATE on public."teacher_documents" to "studio_authenticated";

grant DELETE on public."teacher_documents" to "studio_authenticated";

grant TRUNCATE on public."teacher_documents" to "studio_authenticated";

grant REFERENCES on public."teacher_documents" to "studio_authenticated";

grant TRIGGER on public."teacher_documents" to "studio_authenticated";

grant INSERT on public."teacher_documents" to "netlifydb_owner";

grant SELECT on public."teacher_documents" to "netlifydb_owner";

grant UPDATE on public."teacher_documents" to "netlifydb_owner";

grant DELETE on public."teacher_documents" to "netlifydb_owner";

grant TRUNCATE on public."teacher_documents" to "netlifydb_owner";

grant REFERENCES on public."teacher_documents" to "netlifydb_owner";

grant TRIGGER on public."teacher_documents" to "netlifydb_owner";

-- Additive stabilisation of the modern workshop. Apply once, after taking a backup.
-- Do NOT replay the historical reset/seed migrations into an existing project.

-- Harden the existing timestamp helper and Supabase's optional DDL trigger.
alter function public.set_updated_at() set search_path = '';
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public, studio_anon, studio_authenticated;
  end if;
end $$;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to studio_anon, studio_authenticated, netlifydb_owner;

-- The definer is restricted to a boolean lookup for the verified request user.
-- Keeping it outside exposed schemas avoids the profiles-policy recursion.
create or replace function private.workshop_is_teacher()
returns boolean language sql stable security definer set search_path = '' as $$
  select studio_auth.uid() is not null and exists (
    select 1 from public.profiles where id = studio_auth.uid() and role::text in ('teacher', 'admin')
  );
$$;
revoke all on function private.workshop_is_teacher() from public;
grant execute on function private.workshop_is_teacher() to studio_anon, studio_authenticated, netlifydb_owner;

-- Preserve both historical policy helper names without exposed definer functions.
create or replace function public.current_user_is_teacher()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.workshop_is_teacher();
$$;
create or replace function public.is_teacher()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.workshop_is_teacher();
$$;
revoke all on function public.current_user_is_teacher(), public.is_teacher() from public;
grant execute on function public.current_user_is_teacher(), public.is_teacher() to studio_anon, studio_authenticated, netlifydb_owner;

-- Remove table AND pre-existing column grants. RLS alone cannot protect role.
revoke insert, update, delete on public.profiles from public, studio_anon, studio_authenticated;
do $$ declare col record; begin
  for col in select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
  loop
    execute format('revoke insert (%I), update (%I) on public.profiles from public, studio_anon, studio_authenticated', col.column_name, col.column_name);
  end loop;
end $$;
grant update (display_name) on public.profiles to studio_authenticated;
create policy "profile update stays with owner" on public.profiles as restrictive
for update to public using (id = (select studio_auth.uid())) with check (id = (select studio_auth.uid()));

-- Restrictive gates constrain ALL historical permissive policies, including unknown hotfixes.
create policy "private workshop submissions" on public.submissions as restrictive
for select to public using (
  (select studio_auth.uid()) is not null and
  (author_id = (select studio_auth.uid()) or (select private.workshop_is_teacher()))
);
create policy "private published feedback items" on public.feedback_items as restrictive
for select to public using (
  (select studio_auth.uid()) is not null and (
    (select private.workshop_is_teacher()) or exists (
      select 1 from public.submissions s where s.id = submission_id
      and s.author_id = (select studio_auth.uid()) and s.status::text = 'feedback_published'
    )
  )
);
create policy "private published feedback summaries" on public.feedback_summaries as restrictive
for select to public using (
  (select studio_auth.uid()) is not null and (
    (select private.workshop_is_teacher()) or (published_at is not null and exists (
      select 1 from public.submissions s where s.id = submission_id
      and s.author_id = (select studio_auth.uid()) and s.status::text = 'feedback_published'
    ))
  )
);

create policy "examples respect enabled groups" on public.teaching_examples as restrictive
for select to public using (
  (select studio_auth.uid()) is not null and (
    (select private.workshop_is_teacher()) or (status = 'published' and exists (
      select 1 from public.workshop_members m
      where m.profile_id = (select studio_auth.uid()) and not exists (
        select 1 from public.teaching_example_hidden_groups h
        where h.example_id = teaching_examples.id and h.workshop_id = m.workshop_id
      )
    ))
  )
);
create policy "annotation follows example visibility" on public.teaching_example_annotations as restrictive
for select to public using (
  (select studio_auth.uid()) is not null and (
    (select private.workshop_is_teacher()) or exists (
      select 1 from public.teaching_examples e where e.id = example_id and e.status = 'published'
    )
  )
);
create policy "hidden groups visible to relevant members" on public.teaching_example_hidden_groups as restrictive
for select to public using (
  (select studio_auth.uid()) is not null and (
    (select private.workshop_is_teacher()) or exists (
      select 1 from public.workshop_members m
      where m.workshop_id = teaching_example_hidden_groups.workshop_id and m.profile_id = (select studio_auth.uid())
    )
  )
);

-- New writes go through server-only operations, preventing direct API quota/status bypass.
create policy "submission inserts through server only" on public.submissions as restrictive
for insert to public with check (false);

alter table public.submissions add column client_request_id uuid;
create unique index submissions_request_id_unique on public.submissions(author_id, client_request_id)
where client_request_id is not null;
-- Abort safely if an existing chain has duplicate versions: resolve explicitly, never renumber automatically.
create unique index submissions_chain_version_unique
on public.submissions ((coalesce(parent_submission_id, id)), version);

-- Comments and publication take the same parent-row lock. A comment saved just
-- before publication is included; one arriving afterwards is rejected.
create function private.guard_workshop_feedback() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare target_id uuid; piece_status text;
begin
  if TG_OP = 'UPDATE' and new.submission_id is distinct from old.submission_id then
    raise exception 'Feedback cannot be moved to another submission.' using errcode = '22023';
  end if;
  if TG_OP = 'DELETE' then target_id := old.submission_id;
  else target_id := new.submission_id; end if;
  select status::text into piece_status from public.submissions where id = target_id for update;
  if not found then
    -- Allow an authorised parent deletion to cascade through its comments.
    if TG_OP = 'DELETE' then return old; end if;
    raise exception 'Submission unavailable.' using errcode = '42501';
  end if;
  if piece_status = 'feedback_published' then
    raise exception 'Published feedback is locked. Start a new revision.' using errcode = '22023';
  end if;
  if TG_OP = 'INSERT' and piece_status = 'submitted' then
    update public.submissions set status = 'in_review' where id = target_id;
  end if;
  if TG_OP = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.guard_workshop_feedback() from public;
grant execute on function private.guard_workshop_feedback() to studio_authenticated, netlifydb_owner;
create trigger guard_workshop_feedback before insert or update or delete
on public.feedback_items for each row execute function private.guard_workshop_feedback();

-- Service-role-only SECURITY INVOKER: application authenticates caller and passes its verified ID.
-- Serialise each writer's creates/retries without relying on browser disabling a button.
create function public.submit_workshop_draft(
  p_author_id uuid, p_request_id uuid, p_title text, p_body text,
  p_workshop_id uuid default null, p_source_id uuid default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  source public.submissions%rowtype;
  prior public.submissions%rowtype;
  root_id uuid;
  group_id uuid;
  group_slug text;
  group_title text;
  next_version integer := 1;
  new_id uuid;
begin
  if p_author_id is null or p_request_id is null or p_title is null or btrim(p_title) = ''
    or p_body is null or btrim(p_body) = '' then
    raise exception 'A title, manuscript and request ID are required.' using errcode = '22023';
  end if;
  perform 1 from public.profiles where id = p_author_id and role::text = 'writer' for update;
  if not found then raise exception 'Writer access required.' using errcode = '42501'; end if;
  if p_source_id is not null then
    select * into source from public.submissions where id = p_source_id and author_id = p_author_id;
    if not found then raise exception 'Source is unavailable.' using errcode = '42501'; end if;
    root_id := coalesce(source.parent_submission_id, source.id);
    group_id := source.workshop_id;
  else
    group_id := p_workshop_id;
  end if;
  select * into prior from public.submissions where author_id = p_author_id and client_request_id = p_request_id;
  if found then
    if prior.title is distinct from btrim(p_title) or prior.body is distinct from p_body
      or prior.workshop_id is distinct from group_id or prior.parent_submission_id is distinct from root_id then
      raise exception 'This request was already saved with different content. Start a new draft.' using errcode = '22023';
    end if;
    return jsonb_build_object('id', prior.id, 'version', prior.version, 'created', false);
  end if;
  if not exists (select 1 from public.workshop_members where profile_id = p_author_id and workshop_id = group_id) then
    raise exception 'You can only submit to your assigned groups.' using errcode = '42501';
  end if;
  select slug, title into group_slug, group_title from public.workshops where id = group_id;
  if (group_slug = 'authorised-basic-user' or lower(btrim(group_title)) = 'authorised basic user')
    and (select count(*) from regexp_matches(p_body, '\S+', 'g')) > 2000 then
    raise exception 'Please shorten your manuscript to 2,000 words before submitting.' using errcode = '22023';
  end if;
  if p_source_id is not null then
    perform 1 from public.submissions where id = root_id and author_id = p_author_id for update;
    if not found then raise exception 'Revision history is unavailable.' using errcode = '42501'; end if;
    if source.status::text <> 'feedback_published' then
      raise exception 'Only published feedback can start a revision.' using errcode = '22023';
    end if;
    if exists (select 1 from public.submissions where author_id = p_author_id
      and coalesce(parent_submission_id, id) = root_id and version > source.version) then
      raise exception 'A newer version already exists. Open its latest feedback before submitting another revision.' using errcode = '22023';
    end if;
    select max(version) + 1 into next_version from public.submissions
    where author_id = p_author_id and coalesce(parent_submission_id, id) = root_id;
  end if;
  insert into public.submissions(author_id, workshop_id, parent_submission_id, title, body, status, version, client_request_id)
  values (p_author_id, group_id, root_id, btrim(p_title), p_body, 'submitted', next_version, p_request_id)
  returning id into new_id;
  return jsonb_build_object('id', new_id, 'version', next_version, 'created', true);
end;
$$;
revoke all on function public.submit_workshop_draft(uuid, uuid, text, text, uuid, uuid) from public, studio_anon, studio_authenticated;
grant execute on function public.submit_workshop_draft(uuid, uuid, text, text, uuid, uuid) to netlifydb_owner;

create function public.publish_workshop_feedback(p_teacher_id uuid, p_submission_id uuid, p_summary text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  piece public.submissions%rowtype;
  prior public.feedback_summaries%rowtype;
  summary_text text := coalesce(nullif(btrim(p_summary), ''), 'Feedback published. See inline comments for detail.');
  published_time timestamptz := now();
begin
  if not exists (select 1 from public.profiles where id = p_teacher_id and role::text in ('teacher', 'admin')) then
    raise exception 'Teacher access required.' using errcode = '42501';
  end if;
  select * into piece from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission unavailable.' using errcode = '22023'; end if;
  if not exists (select 1 from public.feedback_items where submission_id = p_submission_id) then
    raise exception 'Add at least one feedback comment before publishing.' using errcode = '22023';
  end if;
  select * into prior from public.feedback_summaries where submission_id = p_submission_id;
  if piece.status::text = 'feedback_published' and prior.published_at is not null and prior.summary = summary_text then
    return jsonb_build_object('publishedAt', prior.published_at, 'changed', false);
  end if;
  if piece.status::text = 'feedback_published' then
    raise exception 'Published feedback is locked. Start a new revision.' using errcode = '22023';
  end if;
  insert into public.feedback_summaries(submission_id, author_id, summary, published_at)
  values (p_submission_id, p_teacher_id, summary_text, published_time)
  on conflict (submission_id) do update set author_id = excluded.author_id, summary = excluded.summary, published_at = excluded.published_at;
  update public.submissions set status = 'feedback_published' where id = p_submission_id;
  return jsonb_build_object('publishedAt', published_time, 'changed', true);
end;
$$;
revoke all on function public.publish_workshop_feedback(uuid, uuid, text) from public, studio_anon, studio_authenticated;
grant execute on function public.publish_workshop_feedback(uuid, uuid, text) to netlifydb_owner;


commit;
