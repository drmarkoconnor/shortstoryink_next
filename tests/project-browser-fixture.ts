// Used only by temporary routes generated for isolated browser verification.
import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir } from 'node:fs/promises'
import { executeProjectCommand, type SqlClient } from '../lib/projects/store'
import { handleProjectRequest } from '../lib/projects/http'
export const fixtureOwner='40000000-0000-4000-8000-000000000001'
export const fixturePeer='40000000-0000-4000-8000-000000000002'
export const fixtureEditor='40000000-0000-4000-8000-000000000003'
export const fixtureGroup='40000000-0000-4000-8000-000000000010'
type Fixture={db:PGlite;tail:Promise<unknown>;notifications:{submissionId:string}[]}
const globalFixture=globalThis as typeof globalThis & {__writerProjectFixture?:Promise<Fixture>}
function guard(){if(process.env.PROJECT_BROWSER_FIXTURE!=='true'||process.env.CONTEXT==='production')throw new Error('Synthetic fixture disabled')}
async function initialise():Promise<Fixture>{
 guard()
 const distribution='node_modules/@electric-sql/pglite/dist/'
 const db=new PGlite({
  pgliteWasmModule:await WebAssembly.compile(new Uint8Array(await readFile(distribution+'pglite.wasm'))),
  initdbWasmModule:await WebAssembly.compile(new Uint8Array(await readFile(distribution+'initdb.wasm'))),
  fsBundle:new Blob([new Uint8Array(await readFile(distribution+'pglite.data'))]),
 })
 await db.exec('create role netlifydb_owner bypassrls createrole; grant all on schema public to netlifydb_owner; grant create on database postgres to netlifydb_owner; set role netlifydb_owner;')
 const base='netlify/database/migrations'
 for(const name of (await readdir(base)).sort()){
  if(!/^\d+_/.test(name))continue
  await db.exec('begin');await db.exec(await readFile(base+'/'+name+'/migration.sql','utf8'));await db.exec('commit')
 }
 await db.exec('reset role')
 for(const [id,role] of [[fixtureOwner,'writer'],[fixturePeer,'writer'],[fixtureEditor,'teacher']]){
  await db.query('insert into studio_auth.users(id,email) values($1,$2)',[id,id+'@example.invalid'])
  await db.query('insert into public.profiles(id,role,display_name) values($1,$2,$3)',[id,role,'Synthetic browser '+role])
 }
 await db.query("insert into public.workshops(id,title,slug) values($1,'Browser test writers','browser-test-writers')",[fixtureGroup])
 await db.query('insert into public.workshop_members(workshop_id,profile_id) values($1,$2),($1,$3)',[fixtureGroup,fixtureOwner,fixturePeer])
 return {db,tail:Promise.resolve(),notifications:[]}
}
export async function fixtureRequest(request:Request):Promise<Response>{
 guard();globalFixture.__writerProjectFixture??=initialise().catch(error=>{delete globalFixture.__writerProjectFixture;throw error});const fixture=await globalFixture.__writerProjectFixture
 const role=request.headers.get('cookie')?.match(/(?:^|;\s*)project_fixture_role=([^;]+)/)?.[1]
 const actor=role==='writer'?fixtureOwner:role==='peer'?fixturePeer:role==='editor'?fixtureEditor:null
 return handleProjectRequest(request,{
  actorId:actor,role:role==='editor'?'teacher':'writer',enabled:true,
  execute:async(who,id,action,input)=>{
   const run=fixture.tail.then(async()=>{
    await fixture.db.exec('set role netlifydb_owner')
    const client:SqlClient={query:async(sql,values=[])=>{const result=await fixture.db.query<Record<string,unknown>>(sql,values);return {rows:result.rows}}}
    try{return await executeProjectCommand(client,who,id,action,input)}finally{await fixture.db.exec('reset role')}
   })
   fixture.tail=run.catch(()=>undefined);return run
  },
  afterSubmit:async(result)=>{
   const submission=result.submission as {id:string;created:boolean}|undefined
   if(submission?.created&&!result.replayed)fixture.notifications.push({submissionId:submission.id})
  },
 })
}
