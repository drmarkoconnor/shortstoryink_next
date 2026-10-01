export type SqlClient = { query: (sql:string, values?:unknown[])=>Promise<{rows:Record<string,unknown>[]}> }
const changes=new Set(['add','save','move','trash','snapshot','restore','restore-revision','delete-snapshot','compile','submit','rename','archive','unarchive'])
// Shared by production and the isolated HTTP/browser rehearsal. Authentication
// is supplied by the caller, never read from a manuscript's submitted payload.
export async function executeProjectCommand(client:SqlClient,actor:string,projectId:string|null,action:string,input:Record<string,unknown>):Promise<unknown> {
 await client.query('begin')
 try {
  // Keep these separate: prepared-statement drivers do not permit multi-commands.
  await client.query('set local search_path=public')
  await client.query("set local timezone='UTC'")
  await client.query("set local statement_timeout='30s'")
  await client.query("select set_config('request.jwt.claim.sub',$1,true)",[actor])
  if(projectId) await client.query('select id from public.writer_projects where id=$1 and owner_id=$2 for update',[projectId,actor])
  let replayed=false
  if(projectId && input.requestId){const prior=await client.query('select 1 from public.writer_project_requests where project_id=$1 and request_id=$2',[projectId,input.requestId]);replayed=prior.rows.length>0}
  if(projectId && action==='state')await client.query('select public.writer_project_prune($1,$2)',[actor,projectId])
  const result=action==='read'
   ? await client.query('select public.writer_project_read($1,$2) as result',[actor,projectId])
   : await client.query('select public.writer_project_command($1,$2,$3,$4::jsonb) as result',[actor,projectId,action,JSON.stringify(input)])
  let value=result.rows[0]?.result
  if(changes.has(action)){
   const current=await client.query('select private.writer_project_state($1) as state',[projectId])
   value={...(value as Record<string,unknown>),state:current.rows[0].state,...(action==='submit'?{replayed}:{})}
  }
  await client.query('commit')
  return JSON.parse(JSON.stringify(value))
 }catch(error){await client.query('rollback');throw error}
}
