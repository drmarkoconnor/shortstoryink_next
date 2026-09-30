-- Coherent reading and bounded automatic recovery. Named snapshots and compiled
-- copies pin their exact immutable revisions; these are never history-pruned.
alter table public.writer_projects add column history_pruned_at timestamptz;
create function public.writer_project_read(p_actor uuid,p_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
 begin
 if p_actor is distinct from studio_auth.uid() or not exists(select 1 from public.profiles where id=p_actor and role::text='writer') then raise exception 'Writer sign-in required.' using errcode='42501'; end if;
 perform 1 from public.writer_projects where id=p_id and owner_id=p_actor for share;
 if not found then raise exception 'Project unavailable.' using errcode='42501'; end if;
 return private.writer_project_material(p_id,private.writer_project_manifest(p_id,null));
 end;
$$;
create function private.compact_project_request() returns trigger language plpgsql set search_path='' as $$
 begin new.result:=new.result-'state'; return new; end;
$$;
create trigger compact_project_request before insert on public.writer_project_requests for each row execute function private.compact_project_request();
create function private.immutable_project_revision() returns trigger language plpgsql set search_path='' as $$
 begin raise exception 'Project revisions are immutable. Save a new revision.' using errcode='22023'; end;
$$;
create trigger immutable_project_revision before update on public.writer_project_revisions for each row execute function private.immutable_project_revision();
create function public.writer_project_prune(p_actor uuid,p_id uuid) returns integer language plpgsql security invoker set search_path='' as $$
 declare p public.writer_projects%rowtype; removed integer;
 begin
 if p_actor is distinct from studio_auth.uid() or not exists(select 1 from public.profiles where id=p_actor and role::text='writer') then raise exception 'Writer sign-in required.' using errcode='42501'; end if;
 select * into p from public.writer_projects where id=p_id and owner_id=p_actor for update;
 if not found then raise exception 'Project unavailable.' using errcode='42501'; end if;
 if p.history_pruned_at>now()-interval '1 day' then return 0; end if;
 delete from public.writer_project_requests where project_id=p_id and created_at<now()-interval '30 days';
 delete from public.writer_project_snapshots where project_id=p_id and kind='recovery' and created_at<now()-interval '30 days';
 with ranked as (
  select id,created_at,reason,row_number() over(partition by node_id,date_bin(interval '5 minutes',created_at,timestamptz '2026-01-01') order by created_at desc,id) as rn
  from public.writer_project_revisions where project_id=p_id
 ), candidates as (
  select id from ranked where created_at<now()-interval '30 days' or (created_at<now()-interval '1 day' and rn>1 and reason='save')
 ) delete from public.writer_project_revisions r where r.project_id=p_id and r.id in(select id from candidates)
 and not exists(select 1 from public.writer_project_nodes n where n.current_revision_id=r.id)
 and not exists(select 1 from public.writer_project_snapshots s, jsonb_array_elements(s.manifest->'nodes') x where s.project_id=p_id and x->>'revisionId'=r.id::text)
 and not exists(select 1 from public.writer_project_compiles c, jsonb_array_elements(c.manifest->'nodes') x where c.project_id=p_id and x->>'revisionId'=r.id::text);
 get diagnostics removed=row_count;
 update public.writer_projects set history_pruned_at=now() where id=p_id;
 return removed;
 end;
$$;
revoke all on function public.writer_project_read(uuid,uuid), public.writer_project_prune(uuid,uuid), private.compact_project_request(), private.immutable_project_revision() from public,studio_anon,studio_authenticated;
grant execute on function public.writer_project_read(uuid,uuid), public.writer_project_prune(uuid,uuid), private.compact_project_request(), private.immutable_project_revision() to netlifydb_owner;
