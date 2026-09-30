import { compileDocx, compileHtml } from './compile'
import { compiledText, downloadName, validateCompileSettings, type Compiled } from './model'
export type ProjectContext = {
 actorId:string|null;role:string|null;enabled:boolean
 execute:(actor:string,projectId:string|null,action:string,input:Record<string,unknown>)=>Promise<unknown>
 afterSubmit?:(result:Record<string,unknown>,input:Record<string,unknown>)=>Promise<void>
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}
const operations=new Set(['list','create','state','read','section','history','revision','snapshot-preview','compiled','archive-export','add','save','move','trash','snapshot','restore','restore-revision','delete-snapshot','compile','submit','rename','archive','unarchive'])
export async function handleProjectRequest(request:Request,context:ProjectContext):Promise<Response> {
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers})
 if(!context.enabled)return json({error:'Writer projects are not enabled.'},404)
 if(!context.actorId)return json({error:'Sign in again; your local unsaved copy is still on this device.'},401)
 if(context.role!=='writer')return json({error:'Working projects are private to their writers.'},403)
 try {
  const url=new URL(request.url)
  if(request.method==='GET') {
   const id=url.searchParams.get('projectId');if(!id || !uuid.test(id))return json({error:'Choose a project.'},400)
   const format=url.searchParams.get('format')
   if(format==='archive') {
    const archive=await context.execute(context.actorId,id,'archive-export',{})
    return new Response(JSON.stringify(archive,null,2),{headers:{...headers,'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="writing-project-archive.json"'}})
   }
   const compileId=url.searchParams.get('compileId');if(!compileId || !uuid.test(compileId))return json({error:'Compile a manuscript first.'},400)
   const compiled=await context.execute(context.actorId,id,'compiled',{compileId}) as Compiled
   compiled.settings=validateCompileSettings(compiled.settings)
   const name=(ext:string)=>"attachment; filename*=UTF-8''"+encodeURIComponent(downloadName(compiled.settings,ext))
   if(format==='docx')return new Response(new Uint8Array(compileDocx(compiled)),{headers:{...headers,'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':name('docx')}})
   if(format==='print')return new Response(compileHtml(compiled),{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}})
   if(format==='md'||format==='txt')return new Response(compiledText(compiled),{headers:{...headers,'Content-Type':'text/plain; charset=utf-8','Content-Disposition':name(format)}})
   return json({error:'Choose Word, print/PDF, text or archive.'},400)
  }
  if(request.method!=='POST')return json({error:'Method not allowed.'},405)
  // Next may use an internal URL hostname. Host remains the browser-facing
  // authority; a proxy-supplied protocol accounts for TLS termination.
  const forwarded=request.headers.get('x-forwarded-proto')
  const protocol=forwarded==='https'||forwarded==='http'?forwarded+':':url.protocol
  const expectedOrigin=protocol+'//'+(request.headers.get('host')??url.host)
  if(request.headers.get('origin')!==expectedOrigin || !request.headers.get('content-type')?.includes('application/json'))return json({error:'Invalid request origin or content type.'},403)
  if(Number(request.headers.get('content-length')??0)>3000000)return json({error:'This request is too large.'},413)
  const text=await request.text();if(text.length>3000000)return json({error:'This request is too large.'},413)
  const value=JSON.parse(text) as {action?:unknown;projectId?:unknown;input?:unknown}
  const action=String(value.action??'');if(!operations.has(action))return json({error:'Unknown project operation.'},400)
  const id=typeof value.projectId==='string'?value.projectId:null
  if(action!=='list' && (!id||!uuid.test(id)))return json({error:'Choose a valid project.'},400)
  if(!value.input || typeof value.input!=='object'||Array.isArray(value.input))return json({error:'Invalid project input.'},400)
  const input={...value.input} as Record<string,unknown>
  for(const key of ['nodeId','parentId','requestId','revisionId','snapshotId','compileId','workshopId','sourceSubmissionId'])if(input[key]!==undefined&&input[key]!==null&&(typeof input[key]!=='string'||!uuid.test(input[key] as string)))return json({error:'Invalid '+key+'.'},400)
  if(action==='compile'){try{input.settings=validateCompileSettings(input.settings)}catch(e){return json({error:e instanceof Error?e.message:'Invalid formatting.'},400)}}
  // Ignore supplied actor/owner fields. The verified session is authoritative.
  const result=await context.execute(context.actorId,id,action,input)
  if(action==='submit'&&context.afterSubmit){try{await context.afterSubmit(result as Record<string,unknown>,input)}catch{/* A saved submission survives a mail outage. */}}
  return json(result)
 }catch(error){
  const e=error as {code?:string;message?:string}
  const status=e.code==='42501'?403:e.code==='40001'?409:['22023','22P02','23514','23505'].includes(e.code??'')?400:error instanceof SyntaxError?400:500
  return json({error:status===500?'Unable to confirm this operation. Retain any unsaved text and retry; only a successful save acknowledgement confirms cloud storage.':e.message??'Invalid request.'},status)
 }
}
