-- Documents contain prose; folders group documents. Labels describe a document
-- without changing its identity, hierarchy or plain text. Never edit 001-009.
alter table public.writer_project_revisions add column document_label text
 check (document_label in ('Text','Chapter','Scene','Research','Notes'));

create function private.attach_project_document_label() returns trigger
language plpgsql set search_path='' as $$
declare value text; labels jsonb; node_kind text;
begin
 select kind into node_kind from public.writer_project_nodes
  where id=new.node_id and project_id=new.project_id;
 if node_kind='folder' then new.document_label:=null; return new; end if;
 if new.reason='restore' then
  value:=current_setting('studio.project_restore_labels',true);
  if coalesce(value,'')<>'' then
   labels:=value::jsonb; new.document_label:=coalesce(labels->>new.node_id::text,'Text');
  end if;
 elsif new.reason in ('created','save','conflict') then
  new.document_label:=nullif(current_setting('studio.project_document_label',true),'');
 end if;
 new.document_label:=coalesce(new.document_label,'Text');
 return new;
end;
$$;
create trigger attach_project_document_label before insert on public.writer_project_revisions
 for each row execute function private.attach_project_document_label();

create or replace function private.writer_project_state(p_id uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('project',jsonb_build_object('id',p.id,'title',p.title,'structureVersion',p.structure_version,'contentVersion',p.content_version,'archivedAt',p.archived_at),
 'nodes',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'parentId',n.parent_id,'kind',n.kind,'position',n.position,'revisionId',r.id,'title',r.title,'synopsis',r.synopsis,'status',r.status,'documentLabel',case when n.kind='section' then coalesce(r.document_label,'Text') else null end) order by n.position,n.id)
 from public.writer_project_nodes n join public.writer_project_revisions r on r.id=n.current_revision_id where n.project_id=p_id and n.deleted_at is null),'[]'::jsonb),
 'snapshots',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'nodeId',s.node_id,'label',s.label,'kind',s.kind,'createdAt',s.created_at) order by s.created_at desc,s.id) from public.writer_project_snapshots s where s.project_id=p_id),'[]'::jsonb))
 from public.writer_projects p where p.id=p_id;
$$;

create or replace function private.writer_project_material(p_id uuid,p_manifest jsonb) returns jsonb
language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',n->>'id','parentId',n->>'parentId','kind',n->>'kind','position',(n->>'position')::integer,'revisionId',r.id,'title',r.title,'body',r.body,'document',r.document,'synopsis',r.synopsis,'status',r.status,'documentLabel',case when n->>'kind'='section' then coalesce(r.document_label,'Text') else null end) order by ord),'[]'::jsonb)
 from jsonb_array_elements(p_manifest->'nodes') with ordinality as m(n,ord)
 join public.writer_project_revisions r on r.id=(n->>'revisionId')::uuid and r.project_id=p_id and r.node_id=(n->>'id')::uuid;
$$;


-- Wrap the existing paragraph/snapshot implementation: its auth, version,
-- request-replay and manuscript-submission checks remain authoritative.
alter function public.writer_project_command(uuid,uuid,text,jsonb) rename to writer_project_command_paragraphs;
alter function public.writer_project_command_paragraphs(uuid,uuid,text,jsonb) set schema private;
create function public.writer_project_command(p_actor uuid,p_id uuid,p_action text,p_input jsonb default '{}'::jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare label text; labels jsonb; result jsonb; rid uuid; node_kind text;
 was_existing boolean; chapter_starter boolean:=false;
begin
 if p_actor is null or p_actor is distinct from studio_auth.uid()
  or not exists(select 1 from public.profiles where id=p_actor and role::text='writer') then
  raise exception 'Writer sign-in is required.' using errcode='42501';
 end if;
 if jsonb_typeof(p_input) is distinct from 'object' then
  raise exception 'Invalid project request.' using errcode='22023';
 end if;
 if p_action not in ('list','create') then
  perform 1 from public.writer_projects where id=p_id and owner_id=p_actor for update;
  if not found then raise exception 'Project unavailable.' using errcode='42501'; end if;
 end if;
 perform set_config('studio.project_document_label','',true);
 perform set_config('studio.project_restore_labels','',true);
 if p_action in ('add','save') then
  if p_action='add' then node_kind:=p_input->>'kind';
  else
   select n.kind into node_kind from public.writer_project_nodes n
    where n.id=(p_input->>'nodeId')::uuid and n.project_id=p_id;
  end if;
  if p_input?'documentLabel' and p_input->'documentLabel'<>'null'::jsonb then
   if jsonb_typeof(p_input->'documentLabel') is distinct from 'string'
    or p_input->>'documentLabel' not in ('Text','Chapter','Scene','Research','Notes') then
    raise exception 'Choose Text, Chapter, Scene, Research or Notes.' using errcode='22023';
   end if;
   if node_kind='folder' then
    raise exception 'A folder groups documents; labels belong to text documents.' using errcode='22023';
   end if;
   label:=p_input->>'documentLabel';
  elsif p_action='save' then
   -- Older clients changing only prose must not discard an existing label.
   select coalesce(r.document_label,'Text') into label from public.writer_project_revisions r
    where r.id=(p_input->>'revisionId')::uuid and r.project_id=p_id
    and r.node_id=(p_input->>'nodeId')::uuid;
  end if;
  perform set_config('studio.project_document_label',coalesce(label,'Text'),true);
 elsif p_action='restore' then
  select jsonb_object_agg(r.node_id::text,coalesce(r.document_label,'Text')) into labels
   from public.writer_project_snapshots s cross join lateral jsonb_array_elements(s.manifest->'nodes') n
   join public.writer_project_revisions r on r.id=(n->>'revisionId')::uuid
    and r.node_id=(n->>'id')::uuid and r.project_id=p_id
   where s.project_id=p_id and s.id=(p_input->>'snapshotId')::uuid;
  perform set_config('studio.project_restore_labels',coalesce(labels::text,''),true);
 elsif p_action='restore-revision' then
  select jsonb_build_object(r.node_id::text,coalesce(r.document_label,'Text')) into labels
   from public.writer_project_revisions r where r.project_id=p_id and r.id=(p_input->>'revisionId')::uuid;
  perform set_config('studio.project_restore_labels',coalesce(labels::text,''),true);
 end if;

 -- A chapter is a document, not a compulsory empty folder containing another
 -- document. Existing starter projects/trees are left exactly as they were.
 if p_action='create' and p_input->>'starter'='chaptered' then
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,481));
  select exists(select 1 from public.writer_projects where id=p_id) into was_existing;
  chapter_starter:=not was_existing;
  result:=private.writer_project_command_paragraphs(p_actor,p_id,p_action,p_input||'{"starter":"blank"}'::jsonb);
 else
  result:=private.writer_project_command_paragraphs(p_actor,p_id,p_action,p_input);
 end if;
 if chapter_starter then
  perform public.writer_project_command(p_actor,p_id,'add',jsonb_build_object(
   'nodeId',gen_random_uuid(),'parentId',null,'kind','section','documentLabel','Chapter',
   'title','Chapter 1','body','','document',jsonb_build_object('type','doc','content',
    jsonb_build_array(jsonb_build_object('type','paragraph','attrs',jsonb_build_object('firstLineIndent','auto')))),
   'synopsis','','status','Draft','requestId',gen_random_uuid(),
   'structureVersion',(result->'project'->>'structureVersion')::integer));
  result:=private.writer_project_state(p_id);
 end if;

 if p_action in ('section','revision') then
  rid:=case when p_action='section' then (result->>'revisionId')::uuid else (result->>'id')::uuid end;
  select case when n.kind='section' then coalesce(r.document_label,'Text') else null end into label
   from public.writer_project_revisions r join public.writer_project_nodes n on n.id=r.node_id
   where r.id=rid and r.project_id=p_id;
  result:=result||jsonb_build_object('documentLabel',label);
 elsif p_action='save' and result->>'conflict'='true' then
  rid:=(result->'current'->>'revisionId')::uuid;
  select case when n.kind='section' then coalesce(r.document_label,'Text') else null end into label
   from public.writer_project_revisions r join public.writer_project_nodes n on n.id=r.node_id
   where r.id=rid and r.project_id=p_id;
  result:=jsonb_set(result,'{current}',(result->'current')||jsonb_build_object('documentLabel',label));
 elsif p_action='compile' then
  -- Validate the frozen revision selection (also correct on an idempotent
  -- retry), not today's labels on a possibly newer working copy.
  if exists (
   select 1 from public.writer_project_compiles c
   cross join lateral jsonb_array_elements(c.manifest->'nodes') n
   join public.writer_project_revisions r on r.id=(n->>'revisionId')::uuid
    and r.node_id=(n->>'id')::uuid and r.project_id=p_id
   where c.project_id=p_id and c.id=(result->>'compileId')::uuid
    and r.document_label in ('Research','Notes')
  ) and p_input->'includeSupportingDocuments' is distinct from 'true'::jsonb then
   raise exception 'Confirm inclusion of selected research and notes before compiling.' using errcode='22023';
  end if;
 end if;
 perform set_config('studio.project_document_label','',true);
 perform set_config('studio.project_restore_labels','',true);
 return result;
end;
$$;
revoke all on function private.attach_project_document_label(),private.writer_project_command_paragraphs(uuid,uuid,text,jsonb),
 public.writer_project_command(uuid,uuid,text,jsonb) from public,studio_anon,studio_authenticated;
grant execute on function private.attach_project_document_label(),private.writer_project_command_paragraphs(uuid,uuid,text,jsonb),
 public.writer_project_command(uuid,uuid,text,jsonb) to netlifydb_owner;
