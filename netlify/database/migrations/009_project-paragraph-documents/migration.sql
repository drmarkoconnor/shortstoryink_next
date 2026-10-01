-- Add paragraph formatting to NEW immutable revisions only. Never rewrite old
-- text, snapshot manifests or submitted manuscripts. Netlify owns transactions.
alter table public.writer_project_revisions add column document jsonb;

create function private.validate_project_document(p_document jsonb,p_body text) returns void
language plpgsql set search_path='' as $$
declare paragraph jsonb; inline jsonb; indent text; flattened text:=''; first boolean:=true;
begin
 if p_document is null or p_document='null'::jsonb then return; end if;
 if jsonb_typeof(p_document) is distinct from 'object' or p_document->>'type' is distinct from 'doc'
  or jsonb_typeof(p_document->'content') is distinct from 'array'
  or jsonb_array_length(p_document->'content') not between 1 and 20000
  or octet_length(p_document::text)>3000000 then
  raise exception 'Invalid paragraph document.' using errcode='22023';
 end if;
 for paragraph in select value from jsonb_array_elements(p_document->'content') loop
  indent:=coalesce(paragraph->'attrs'->>'firstLineIndent','auto');
  if paragraph->>'type' is distinct from 'paragraph' or indent not in ('auto','indent','none')
   or (paragraph?'content' and jsonb_typeof(paragraph->'content') is distinct from 'array') then
   raise exception 'Unsupported paragraph formatting.' using errcode='22023';
  end if;
  if not first then flattened:=flattened||E'\n\n'; end if;
  first:=false;
  for inline in select value from jsonb_array_elements(coalesce(paragraph->'content','[]'::jsonb)) loop
   if inline->>'type'='hardBreak' then flattened:=flattened||E'\n';
   elsif inline->>'type'='text' and jsonb_typeof(inline->'text')='string' and not (inline?'marks') then flattened:=flattened||(inline->>'text');
   else raise exception 'Unsupported paragraph text.' using errcode='22023';
   end if;
  end loop;
 end loop;
 if flattened is distinct from p_body then
  raise exception 'Paragraph content does not match the manuscript. Retain your local copy and retry.' using errcode='22023';
 end if;
end;
$$;

-- A transaction-local input supplies the immutable document at INSERT time.
-- Existing revision rows are never updated (their immutability trigger stays).
create function private.attach_project_document() returns trigger
language plpgsql set search_path='' as $$
declare value text; documents jsonb;
begin
 if new.reason='restore' then
  value:=current_setting('studio.project_restore_documents',true);
  if coalesce(value,'')<>'' then documents:=value::jsonb;new.document:=nullif(documents->new.node_id::text,'null'::jsonb);end if;
 elsif new.reason in ('created','save','conflict') then
  value:=current_setting('studio.project_document',true);
  if coalesce(value,'')<>'' then new.document:=nullif(value::jsonb,'null'::jsonb);end if;
 end if;
 perform private.validate_project_document(new.document,new.body);
 return new;
end;
$$;
create trigger attach_project_document before insert on public.writer_project_revisions
 for each row execute function private.attach_project_document();

create or replace function private.writer_project_material(p_id uuid,p_manifest jsonb) returns jsonb
language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',n->>'id','parentId',n->>'parentId','kind',n->>'kind','position',(n->>'position')::integer,'revisionId',r.id,'title',r.title,'body',r.body,'document',r.document,'synopsis',r.synopsis,'status',r.status) order by ord),'[]'::jsonb)
 from jsonb_array_elements(p_manifest->'nodes') with ordinality as m(n,ord)
 join public.writer_project_revisions r on r.id=(n->>'revisionId')::uuid and r.project_id=p_id and r.node_id=(n->>'id')::uuid;
$$;

-- Retain the audited v1.3 lifecycle and wrap it, rather than duplicating its
-- ownership, snapshot, request-replay, conflict and submission machinery.
alter function public.writer_project_command(uuid,uuid,text,jsonb) rename to writer_project_command_v13;
alter function public.writer_project_command_v13(uuid,uuid,text,jsonb) set schema private;
create function public.writer_project_command(p_actor uuid,p_id uuid,p_action text,p_input jsonb default '{}'::jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare document jsonb; previous_document jsonb; old_body text; documents jsonb; result jsonb; revision_id uuid; was_existing boolean; starter text; folder_id uuid;
begin
 if p_actor is null or p_actor is distinct from studio_auth.uid() or not exists(select 1 from public.profiles where id=p_actor and role::text='writer') then
  raise exception 'Writer sign-in is required.' using errcode='42501';
 end if;
 if p_action='create' then
  starter:=coalesce(p_input->>'starter','blank');
  if starter not in ('blank','short','chaptered') then raise exception 'Choose a starting arrangement.' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,481));
  select exists(select 1 from public.writer_projects where id=p_id) into was_existing;
 end if;
 if p_action not in ('list','create') then
  perform 1 from public.writer_projects where id=p_id and owner_id=p_actor for update;
  if not found then raise exception 'Project unavailable.' using errcode='42501';end if;
 end if;
 perform set_config('studio.project_document','',true);
 perform set_config('studio.project_restore_documents','',true);
 if p_action in ('add','save') then
  document:=nullif(p_input->'document','null'::jsonb);
  if p_action='save' and document is null then
   select r.document,r.body into previous_document,old_body from public.writer_project_revisions r
    where r.id=(p_input->>'revisionId')::uuid and r.project_id=p_id and r.node_id=(p_input->>'nodeId')::uuid;
   if previous_document is not null then
    if old_body is distinct from p_input->>'body' then
     raise exception 'Refresh the paragraph editor before editing this section. Keep your unsaved copy.' using errcode='22023';
    end if;
    document:=previous_document;
   end if;
  end if;
  perform private.validate_project_document(document,p_input->>'body');
  perform set_config('studio.project_document',coalesce(document::text,''),true);
 elsif p_action='restore' then
  select jsonb_object_agg(r.node_id::text,coalesce(r.document,'null'::jsonb)) into documents
   from public.writer_project_snapshots s cross join lateral jsonb_array_elements(s.manifest->'nodes') n
   join public.writer_project_revisions r on r.id=(n->>'revisionId')::uuid and r.node_id=(n->>'id')::uuid and r.project_id=p_id
   where s.project_id=p_id and s.id=(p_input->>'snapshotId')::uuid;
  perform set_config('studio.project_restore_documents',coalesce(documents::text,''),true);
 elsif p_action='restore-revision' then
  select jsonb_build_object(r.node_id::text,coalesce(r.document,'null'::jsonb)) into documents
   from public.writer_project_revisions r where r.project_id=p_id and r.id=(p_input->>'revisionId')::uuid;
  perform set_config('studio.project_restore_documents',coalesce(documents::text,''),true);
 end if;
 result:=private.writer_project_command_v13(p_actor,p_id,p_action,p_input);
 if p_action='create' and not was_existing and starter<>'blank' then
  folder_id:=null;
  if starter='chaptered' then
   folder_id:=gen_random_uuid();
   perform private.writer_project_command_v13(p_actor,p_id,'add',jsonb_build_object('nodeId',folder_id,'parentId',null,'kind','folder','title','Chapter 1','body','','synopsis','','status','Draft','requestId',gen_random_uuid(),'structureVersion',1));
  end if;
  perform set_config('studio.project_document','{"type":"doc","content":[{"type":"paragraph","attrs":{"firstLineIndent":"auto"}}]}',true);
  perform private.writer_project_command_v13(p_actor,p_id,'add',jsonb_build_object('nodeId',gen_random_uuid(),'parentId',folder_id,'kind','section','title','Opening','body','','synopsis','','status','Draft','requestId',gen_random_uuid(),'structureVersion',case when starter='chaptered' then 2 else 1 end));
  result:=private.writer_project_state(p_id);
 end if;

 if p_action='section' then
  revision_id:=(result->>'revisionId')::uuid;
  select r.document into document from public.writer_project_revisions r where r.id=revision_id and r.project_id=p_id;
  result:=result||jsonb_build_object('document',document);
 elsif p_action='save' and result->>'conflict'='true' then
  revision_id:=(result->'current'->>'revisionId')::uuid;
  select r.document into document from public.writer_project_revisions r where r.id=revision_id and r.project_id=p_id;
  result:=jsonb_set(result,'{current}',(result->'current')||jsonb_build_object('document',document));
 end if;
 perform set_config('studio.project_document','',true);
 perform set_config('studio.project_restore_documents','',true);
 return result;
end;
$$;
revoke all on function private.validate_project_document(jsonb,text),private.attach_project_document(),private.writer_project_command_v13(uuid,uuid,text,jsonb),public.writer_project_command(uuid,uuid,text,jsonb) from public,studio_anon,studio_authenticated;
grant execute on function private.validate_project_document(jsonb,text),private.attach_project_document(),private.writer_project_command_v13(uuid,uuid,text,jsonb),public.writer_project_command(uuid,uuid,text,jsonb) to netlifydb_owner;
