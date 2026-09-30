-- Writer Projects v1.3. Additive, owner-private, no changes to existing submissions.
-- Netlify owns the migration transaction. Do not edit after it has been applied.
create table public.writer_projects (
 id uuid primary key, owner_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check (length(btrim(title)) between 1 and 300),
 structure_version integer not null default 1, content_version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.writer_project_nodes (
 id uuid primary key, project_id uuid not null references public.writer_projects(id) on delete cascade,
 parent_id uuid, kind text not null check(kind in ('folder','section')), position integer not null default 0,
 current_revision_id uuid, deleted_at timestamptz, unique(project_id,id),
 foreign key(project_id,parent_id) references public.writer_project_nodes(project_id,id) deferrable initially deferred
);
create table public.writer_project_revisions (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.writer_projects(id) on delete cascade,
 node_id uuid not null references public.writer_project_nodes(id) on delete cascade,
 title text not null check(length(btrim(title)) between 1 and 300), body text not null default '' check(length(body)<=1000000),
 synopsis text not null default '' check(length(synopsis)<=2000), status text not null default 'Draft' check(status in ('Draft','Revising','Ready')),
 reason text not null default 'save', created_at timestamptz not null default now(), unique(node_id,id)
);
alter table public.writer_project_nodes add constraint writer_project_current_revision_fk
 foreign key(id,current_revision_id) references public.writer_project_revisions(node_id,id) deferrable initially deferred;
create table public.writer_project_snapshots (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.writer_projects(id) on delete cascade,
 node_id uuid references public.writer_project_nodes(id) on delete cascade, label text not null check(length(label)<=300),
 kind text not null check(kind in ('named','safety','recovery')), manifest jsonb not null, created_at timestamptz not null default now()
);
create table public.writer_project_compiles (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.writer_projects(id) on delete cascade,
 manifest jsonb not null, settings jsonb not null, created_at timestamptz not null default now()
);
create table public.writer_project_requests (
 project_id uuid not null references public.writer_projects(id) on delete cascade, request_id uuid not null,
 signature text not null, result jsonb not null, created_at timestamptz not null default now(), primary key(project_id,request_id)
);
create table public.writer_project_submissions (
 project_id uuid not null references public.writer_projects(id) on delete cascade,
 compile_id uuid not null references public.writer_project_compiles(id), submission_id uuid references public.submissions(id) on delete set null,
 request_id uuid not null, created_at timestamptz not null default now(), primary key(project_id,request_id)
);
create index writer_projects_owner on public.writer_projects(owner_id,updated_at desc);
create index writer_project_nodes_parent on public.writer_project_nodes(project_id,parent_id,position);
create index writer_project_revisions_history on public.writer_project_revisions(project_id,node_id,created_at desc);
create index writer_project_snapshots_history on public.writer_project_snapshots(project_id,created_at desc);

create function private.writer_project_owned(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.writer_projects where id=p_id and owner_id=studio_auth.uid());
$$;
revoke all on function private.writer_project_owned(uuid) from public;
grant execute on function private.writer_project_owned(uuid) to studio_anon,studio_authenticated,netlifydb_owner;
alter table public.writer_projects enable row level security;
create policy writer_projects_owner_read on public.writer_projects for select to studio_authenticated using(owner_id=studio_auth.uid());
grant select on public.writer_projects to studio_authenticated;
do $$ declare t text; begin
 foreach t in array array['writer_project_nodes','writer_project_revisions','writer_project_snapshots','writer_project_compiles','writer_project_requests','writer_project_submissions'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy owner_read on public.%I for select to studio_authenticated using(private.writer_project_owned(project_id))',t);
  execute format('grant select on public.%I to studio_authenticated',t);
 end loop;
end $$;

-- Internal helpers are not callable by application clients. All operations are
-- serialised on the project row, including coherent snapshots and compilation.
create function private.writer_project_manifest(p_id uuid,p_node uuid default null) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('title',p.title,'structureVersion',p.structure_version,'contentVersion',p.content_version,
 'nodes',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'parentId',n.parent_id,'kind',n.kind,'position',n.position,'revisionId',n.current_revision_id) order by n.position,n.id)
 from public.writer_project_nodes n where n.project_id=p_id and n.deleted_at is null and (p_node is null or n.id=p_node)),'[]'::jsonb))
 from public.writer_projects p where p.id=p_id;
$$;
create function private.writer_project_state(p_id uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('project',jsonb_build_object('id',p.id,'title',p.title,'structureVersion',p.structure_version,'contentVersion',p.content_version,'archivedAt',p.archived_at),
 'nodes',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'parentId',n.parent_id,'kind',n.kind,'position',n.position,'revisionId',r.id,'title',r.title,'synopsis',r.synopsis,'status',r.status) order by n.position,n.id)
 from public.writer_project_nodes n join public.writer_project_revisions r on r.id=n.current_revision_id where n.project_id=p_id and n.deleted_at is null),'[]'::jsonb),
 'snapshots',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'nodeId',s.node_id,'label',s.label,'kind',s.kind,'createdAt',s.created_at) order by s.created_at desc,s.id) from public.writer_project_snapshots s where s.project_id=p_id),'[]'::jsonb))
 from public.writer_projects p where p.id=p_id;
$$;
create function private.writer_project_snapshot(p_id uuid,p_node uuid,p_label text,p_kind text) returns uuid language plpgsql set search_path='' as $$
 declare sid uuid; begin
 if p_node is not null and not exists(select 1 from public.writer_project_nodes where id=p_node and project_id=p_id and kind='section' and deleted_at is null) then raise exception 'Choose an active text section.' using errcode='22023'; end if;
 insert into public.writer_project_snapshots(project_id,node_id,label,kind,manifest)
 values(p_id,p_node,left(coalesce(nullif(btrim(p_label),''),'Snapshot '||to_char(clock_timestamp(),'YYYY-MM-DD HH24:MI:SS UTC')),300),p_kind,private.writer_project_manifest(p_id,p_node)) returning id into sid;
 return sid; end;
$$;
create function private.writer_project_material(p_id uuid,p_manifest jsonb) returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',n->>'id','parentId',n->>'parentId','kind',n->>'kind','position',(n->>'position')::integer,'revisionId',r.id,'title',r.title,'body',r.body,'synopsis',r.synopsis,'status',r.status) order by ord),'[]'::jsonb)
 from jsonb_array_elements(p_manifest->'nodes') with ordinality as m(n,ord)
 join public.writer_project_revisions r on r.id=(n->>'revisionId')::uuid and r.project_id=p_id and r.node_id=(n->>'id')::uuid;
$$;

create function public.writer_project_command(p_actor uuid,p_id uuid,p_action text,p_input jsonb default '{}'::jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 p public.writer_projects%rowtype; n public.writer_project_nodes%rowtype; s public.writer_project_snapshots%rowtype; c public.writer_project_compiles%rowtype;
 r public.writer_project_revisions%rowtype; rid uuid; nid uuid; pid uuid; ancestor uuid; sid uuid; req uuid; sig text; previous public.writer_project_requests%rowtype;
 result jsonb; item jsonb; manifest jsonb; body_text text; ids uuid[]; wanted uuid[]; pos integer; depth integer; changed integer; response jsonb;
begin
 if p_actor is null or p_actor is distinct from studio_auth.uid() or not exists(select 1 from public.profiles where id=p_actor and role::text='writer') then
  raise exception 'Writer sign-in is required.' using errcode='42501'; end if;
 if jsonb_typeof(p_input) is distinct from 'object' then raise exception 'Invalid project request.' using errcode='22023'; end if;
 if p_action='list' then return coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'updatedAt',updated_at,'archivedAt',archived_at) order by updated_at desc) from public.writer_projects where owner_id=p_actor),'[]'::jsonb); end if;
 if p_action='create' then
  if p_id is null or length(btrim(coalesce(p_input->>'title',''))) not between 1 and 300 then raise exception 'Enter a project title.' using errcode='22023'; end if;
  insert into public.writer_projects(id,owner_id,title) values(p_id,p_actor,btrim(p_input->>'title')) on conflict(id) do nothing;
 end if;
 select * into p from public.writer_projects where id=p_id and owner_id=p_actor for update;
 if not found then raise exception 'Project unavailable.' using errcode='42501'; end if;
 if p_action in ('create','state') then return private.writer_project_state(p_id); end if;
 if p_action='section' then
  select * into n from public.writer_project_nodes where id=(p_input->>'nodeId')::uuid and project_id=p_id and deleted_at is null;
  if not found then raise exception 'Section unavailable.' using errcode='22023'; end if;
  select * into r from public.writer_project_revisions where id=n.current_revision_id;
  return jsonb_build_object('id',n.id,'revisionId',r.id,'title',r.title,'body',r.body,'synopsis',r.synopsis,'status',r.status,'structureVersion',p.structure_version,'contentVersion',p.content_version);
 end if;
 if p_action='history' then return coalesce((select jsonb_agg(jsonb_build_object('id',id,'title',title,'reason',reason,'createdAt',created_at) order by created_at desc,id) from public.writer_project_revisions where project_id=p_id and node_id=(p_input->>'nodeId')::uuid),'[]'::jsonb); end if;
 if p_action='revision' then
  select * into r from public.writer_project_revisions where id=(p_input->>'revisionId')::uuid and project_id=p_id;
  if not found then raise exception 'Version unavailable.' using errcode='22023'; end if; return to_jsonb(r);
 end if;
 if p_action='snapshot-preview' then
  select * into s from public.writer_project_snapshots where id=(p_input->>'snapshotId')::uuid and project_id=p_id;
  if not found then raise exception 'Snapshot unavailable.' using errcode='22023'; end if;
  return jsonb_build_object('id',s.id,'nodeId',s.node_id,'label',s.label,'title',s.manifest->>'title','nodes',private.writer_project_material(p_id,s.manifest));
 end if;
 if p_action='compiled' then
  select * into c from public.writer_project_compiles where id=(p_input->>'compileId')::uuid and project_id=p_id;
  if not found then raise exception 'Compiled manuscript unavailable.' using errcode='22023'; end if;
  return jsonb_build_object('id',c.id,'settings',c.settings,'nodes',private.writer_project_material(p_id,c.manifest));
 end if;
 if p_action='archive-export' then return jsonb_build_object('format','shortstory-project','version',1,'exportedAt',clock_timestamp(),'project',to_jsonb(p),
  'nodes',coalesce((select jsonb_agg(to_jsonb(x)) from public.writer_project_nodes x where project_id=p_id),'[]'::jsonb),
  'revisions',coalesce((select jsonb_agg(to_jsonb(x)) from public.writer_project_revisions x where project_id=p_id),'[]'::jsonb),
  'snapshots',coalesce((select jsonb_agg(to_jsonb(x)) from public.writer_project_snapshots x where project_id=p_id),'[]'::jsonb),
  'compiles',coalesce((select jsonb_agg(to_jsonb(x)) from public.writer_project_compiles x where project_id=p_id),'[]'::jsonb)); end if;
 if p.archived_at is not null and p_action<>'unarchive' then raise exception 'Restore this archived project before editing.' using errcode='22023'; end if;
 req := (p_input->>'requestId')::uuid;
 if req is null then raise exception 'A request ID is required.' using errcode='22023'; end if;
 sig:=md5(p_action||p_input::text);
 select * into previous from public.writer_project_requests where project_id=p_id and request_id=req;
 if found then
  if previous.signature<>sig then raise exception 'This request ID was already used. Refresh before retrying a changed request.' using errcode='22023'; end if;
  return previous.result;
 end if;
 if p_action in ('add','move','trash','restore','snapshot','compile','restore-revision') and (p_input->>'structureVersion')::integer is distinct from p.structure_version then
  raise exception 'The project arrangement changed on another device. Reload before trying again.' using errcode='40001'; end if;
 if p_action in ('restore','snapshot','compile','restore-revision') and (p_input->>'contentVersion')::integer is distinct from p.content_version then
  raise exception 'Another device saved new writing. Reload before capturing or restoring.' using errcode='40001'; end if;
 if p_action in ('add','save') then
  if jsonb_typeof(p_input->'title') is distinct from 'string' or length(btrim(p_input->>'title')) not between 1 and 300
   or jsonb_typeof(p_input->'body') is distinct from 'string' or length(p_input->>'body')>1000000
   or length(coalesce(p_input->>'synopsis',''))>2000 or coalesce(p_input->>'status','Draft') not in ('Draft','Revising','Ready') then
   raise exception 'Check the title, text length, synopsis and status.' using errcode='22023'; end if;
 end if;
 if p_action='add' then
  nid:=(p_input->>'nodeId')::uuid; pid:=(p_input->>'parentId')::uuid;
  if nid is null or coalesce(p_input->>'kind','') not in ('folder','section') then raise exception 'Choose a section or folder.' using errcode='22023'; end if;
  if (select count(*) from public.writer_project_nodes where project_id=p_id)>=2000 then raise exception 'Project section limit reached. Export or start another project.' using errcode='22023'; end if;
  if pid is not null and not exists(select 1 from public.writer_project_nodes where id=pid and project_id=p_id and kind='folder' and deleted_at is null) then raise exception 'Choose an active folder in this project.' using errcode='22023'; end if;
  insert into public.writer_project_nodes(id,project_id,parent_id,kind,position) select nid,p_id,pid,p_input->>'kind',coalesce(max(position)+1,0) from public.writer_project_nodes where project_id=p_id and parent_id is not distinct from pid and deleted_at is null;
  insert into public.writer_project_revisions(project_id,node_id,title,body,synopsis,status,reason) values(p_id,nid,btrim(p_input->>'title'),case when p_input->>'kind'='folder' then '' else p_input->>'body' end,coalesce(p_input->>'synopsis',''),coalesce(p_input->>'status','Draft'),'created') returning id into rid;
  update public.writer_project_nodes set current_revision_id=rid where id=nid;
  update public.writer_projects set structure_version=structure_version+1,content_version=content_version+1,updated_at=now() where id=p_id;
 elsif p_action='save' then
  select * into n from public.writer_project_nodes where id=(p_input->>'nodeId')::uuid and project_id=p_id and deleted_at is null;
  if not found then raise exception 'Section unavailable; your unsaved copy has not been discarded.' using errcode='22023'; end if;
  insert into public.writer_project_revisions(project_id,node_id,title,body,synopsis,status,reason)
  values(p_id,n.id,btrim(p_input->>'title'),case when n.kind='folder' then '' else p_input->>'body' end,coalesce(p_input->>'synopsis',''),coalesce(p_input->>'status','Draft'),case when (p_input->>'revisionId')::uuid is distinct from n.current_revision_id then 'conflict' else 'save' end) returning id into rid;
  if (p_input->>'revisionId')::uuid is distinct from n.current_revision_id then
   select * into r from public.writer_project_revisions where id=n.current_revision_id;
   result:=jsonb_build_object('conflict',true,'incomingRevisionId',rid,'current',jsonb_build_object('id',n.id,'revisionId',r.id,'title',r.title,'body',r.body,'synopsis',r.synopsis,'status',r.status),'state',private.writer_project_state(p_id));
  else
   update public.writer_project_nodes set current_revision_id=rid where id=n.id;
   update public.writer_projects set content_version=content_version+1,updated_at=now() where id=p_id;
   result:=jsonb_build_object('revisionId',rid,'state',private.writer_project_state(p_id));
  end if;
 elsif p_action='move' then
  select * into n from public.writer_project_nodes where id=(p_input->>'nodeId')::uuid and project_id=p_id and deleted_at is null;
  if not found then raise exception 'Section unavailable.' using errcode='22023'; end if;
  pid:=(p_input->>'parentId')::uuid; ancestor:=pid; depth:=0;
  while ancestor is not null loop
   if ancestor=n.id or depth>50 then raise exception 'A folder cannot be moved inside itself.' using errcode='22023'; end if;
   select parent_id into ancestor from public.writer_project_nodes where id=ancestor and project_id=p_id and kind='folder' and deleted_at is null;
   if not found then raise exception 'Choose a folder in this project.' using errcode='22023'; end if; depth:=depth+1;
  end loop;
  select coalesce(array_agg(id order by position,id),array[]::uuid[]) into ids from public.writer_project_nodes where project_id=p_id and parent_id is not distinct from pid and deleted_at is null and id<>n.id;
  pos:=greatest(0,least(coalesce((p_input->>'index')::integer,cardinality(ids)),cardinality(ids)));
  ids:=coalesce(ids[1:pos],array[]::uuid[])||array[n.id]||coalesce(ids[pos+1:cardinality(ids)],array[]::uuid[]);
  update public.writer_project_nodes set parent_id=pid where id=n.id;
  update public.writer_project_nodes x set position=a.ord-1 from unnest(ids) with ordinality a(id,ord) where x.id=a.id;
  update public.writer_projects set structure_version=structure_version+1,updated_at=now() where id=p_id;
 elsif p_action='trash' then
  select * into n from public.writer_project_nodes where id=(p_input->>'nodeId')::uuid and project_id=p_id and deleted_at is null;
  if not found then raise exception 'Section unavailable.' using errcode='22023'; end if;
  sid:=private.writer_project_snapshot(p_id,null,'Before removing a section or folder','recovery');
  with recursive family as (select id from public.writer_project_nodes where id=n.id union all select x.id from public.writer_project_nodes x join family f on x.parent_id=f.id where x.project_id=p_id)
  update public.writer_project_nodes set deleted_at=now() where id in(select id from family);
  update public.writer_projects set structure_version=structure_version+1,content_version=content_version+1,updated_at=now() where id=p_id;
 elsif p_action='snapshot' then
  sid:=private.writer_project_snapshot(p_id,(p_input->>'nodeId')::uuid,p_input->>'label','named');
 elsif p_action in ('restore','restore-revision') then
  if p_action='restore' then
   select * into s from public.writer_project_snapshots where id=(p_input->>'snapshotId')::uuid and project_id=p_id;
   if not found then raise exception 'Snapshot unavailable.' using errcode='22023'; end if;
   manifest:=s.manifest; nid:=s.node_id;
  else
   select * into r from public.writer_project_revisions where id=(p_input->>'revisionId')::uuid and project_id=p_id;
   if not found then raise exception 'Version unavailable.' using errcode='22023'; end if;
   nid:=r.node_id; select * into n from public.writer_project_nodes where id=nid;
   manifest:=jsonb_build_object('nodes',jsonb_build_array(jsonb_build_object('id',nid,'revisionId',r.id,'kind',n.kind,'parentId',n.parent_id,'position',n.position)));
  end if;
  if nid is not null and exists(select 1 from public.writer_project_nodes child join public.writer_project_nodes parent on parent.id=child.parent_id where child.id=nid and parent.deleted_at is not null) then raise exception 'Restore a whole-project snapshot to recover this section and its deleted folder.' using errcode='22023'; end if;
  sid:=private.writer_project_snapshot(p_id,null,'Safety copy before restore','safety');
  if nid is null then
   update public.writer_project_nodes set deleted_at=now() where project_id=p_id;
   update public.writer_projects set title=manifest->>'title' where id=p_id;
  end if;
  for item in select value from jsonb_array_elements(manifest->'nodes') loop
   select * into r from public.writer_project_revisions where id=(item->>'revisionId')::uuid and project_id=p_id and node_id=(item->>'id')::uuid;
   if not found then raise exception 'Snapshot revision missing; restore cancelled.' using errcode='22023'; end if;
   insert into public.writer_project_revisions(project_id,node_id,title,body,synopsis,status,reason) values(p_id,r.node_id,r.title,r.body,r.synopsis,r.status,'restore') returning id into rid;
   update public.writer_project_nodes set current_revision_id=rid,deleted_at=null,
    parent_id=case when nid is null then (item->>'parentId')::uuid else parent_id end,
    position=case when nid is null then (item->>'position')::integer else position end where id=r.node_id;
  end loop;
  update public.writer_projects set structure_version=structure_version+1,content_version=content_version+1,updated_at=now() where id=p_id;
 elsif p_action='delete-snapshot' then
  if p_input->>'confirmed' is distinct from 'true' then raise exception 'Confirm snapshot deletion.' using errcode='22023'; end if;
  delete from public.writer_project_snapshots where id=(p_input->>'snapshotId')::uuid and project_id=p_id;
 elsif p_action='compile' then
  select array_agg(distinct value::uuid) into wanted from jsonb_array_elements_text(p_input->'sectionIds');
  if coalesce(cardinality(wanted),0)=0 then raise exception 'Choose at least one text section.' using errcode='22023'; end if;
  if exists(select 1 from unnest(wanted) a(id) where not exists(select 1 from public.writer_project_nodes where id=a.id and project_id=p_id and kind='section' and deleted_at is null)) then raise exception 'The selection contains an unavailable section.' using errcode='22023'; end if;
  with recursive outline as (
   select id,parent_id,kind,position,current_revision_id,array[position] as path from public.writer_project_nodes where project_id=p_id and parent_id is null and deleted_at is null
   union all select child.id,child.parent_id,child.kind,child.position,child.current_revision_id,o.path||child.position from public.writer_project_nodes child join outline o on child.parent_id=o.id where child.project_id=p_id and child.deleted_at is null
  ) select jsonb_build_object('title',p.title,'nodes',jsonb_agg(jsonb_build_object('id',id,'parentId',parent_id,'kind',kind,'position',position,'revisionId',current_revision_id) order by path,id)) into manifest from outline where id=any(wanted);
  if jsonb_array_length(manifest->'nodes')<>cardinality(wanted) then raise exception 'The outline is incomplete. Nothing has been compiled.' using errcode='22023'; end if;
  if jsonb_typeof(p_input->'settings') is distinct from 'object' then raise exception 'Compile settings are required.' using errcode='22023'; end if;
  insert into public.writer_project_compiles(project_id,manifest,settings) values(p_id,manifest,p_input->'settings') returning id into sid;
  result:=jsonb_build_object('compileId',sid,'state',private.writer_project_state(p_id));
 elsif p_action='submit' then
  select * into c from public.writer_project_compiles where id=(p_input->>'compileId')::uuid and project_id=p_id;
  if not found then raise exception 'Compile and review the extract first.' using errcode='22023'; end if;
  select string_agg(case when coalesce((c.settings->>'headings')::boolean,false) then (x->>'title')||E'\n\n' else '' end||(x->>'body'),E'\n\n#\n\n' order by ord) into body_text
   from jsonb_array_elements(private.writer_project_material(p_id,c.manifest)) with ordinality a(x,ord);
  select public.submit_workshop_draft(p_actor,req,c.settings->>'title',body_text,(p_input->>'workshopId')::uuid,(p_input->>'sourceSubmissionId')::uuid) into response;
  insert into public.writer_project_submissions(project_id,compile_id,submission_id,request_id) values(p_id,c.id,(response->>'id')::uuid,req);
  result:=jsonb_build_object('submission',response,'state',private.writer_project_state(p_id));
 elsif p_action in ('archive','unarchive') then
  update public.writer_projects set archived_at=case when p_action='archive' then now() else null end,updated_at=now() where id=p_id;
 elsif p_action='rename' then
  if length(btrim(coalesce(p_input->>'title',''))) not between 1 and 300 then raise exception 'Enter a project title.' using errcode='22023'; end if;
  update public.writer_projects set title=btrim(p_input->>'title'),content_version=content_version+1,updated_at=now() where id=p_id;
 else raise exception 'Unknown project operation.' using errcode='22023';
 end if;
 if result is null then result:=jsonb_build_object('snapshotId',sid,'state',private.writer_project_state(p_id)); end if;
 insert into public.writer_project_requests(project_id,request_id,signature,result) values(p_id,req,sig,result);
 return result;
end;
$$;
revoke all on function private.writer_project_manifest(uuid,uuid),private.writer_project_state(uuid),private.writer_project_snapshot(uuid,uuid,text,text),private.writer_project_material(uuid,jsonb),public.writer_project_command(uuid,uuid,text,jsonb) from public,studio_anon,studio_authenticated;
grant execute on function private.writer_project_manifest(uuid,uuid),private.writer_project_state(uuid),private.writer_project_snapshot(uuid,uuid,text,text),private.writer_project_material(uuid,jsonb),public.writer_project_command(uuid,uuid,text,jsonb) to netlifydb_owner;
