import type { Transport } from './model'
type Pending = { action: string; projectId: string; input: Record<string, unknown>; signature: string }
const replayable = new Set(['add','move','trash','snapshot','restore','restore-revision','delete-snapshot','compile','submit','rename','archive','unarchive'])
function canonical(value: unknown): string {
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']'
 if(value && typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}'
 return JSON.stringify(value)
}
export function hasUnsentProjectDraft(storage: Storage, ownerId: string) {
 for(let i=0;i<storage.length;i++)if(storage.key(i)?.startsWith('shortstory:project:v1:'+ownerId+':'))return true
 return false
}
export function forgetProjectDrafts(storage: Storage, ownerId: string) {
 const prefixes=['shortstory:project:v1:'+ownerId+':','shortstory:project-request:v1:'+ownerId+':']
 for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key&&prefixes.some(p=>key.startsWith(p)))storage.removeItem(key)}
}
export function createProjectTransport(base='/api/writer/projects', ownerId=''): Transport {
 const memory=new Map<string,Pending>()
 const read=(key:string)=>{if(memory.has(key))return memory.get(key);try{const raw=typeof window!=='undefined'?window.sessionStorage.getItem(key):null;return raw?JSON.parse(raw) as Pending:undefined}catch{return undefined}}
 const remember=(key:string,value:Pending)=>{memory.set(key,value);try{if(typeof window!=='undefined')window.sessionStorage.setItem(key,JSON.stringify(value))}catch{/* Memory still protects retries in this tab. */}}
 const forget=(key:string)=>{memory.delete(key);try{if(typeof window!=='undefined')window.sessionStorage.removeItem(key)}catch{/* Storage may be disabled. */}}
 return async<T,>(action:string,projectId:string|null,input:Record<string,unknown>={}):Promise<T>=>{
  const guarded=Boolean(ownerId&&projectId&&replayable.has(action))
  const key='shortstory:project-request:v1:'+ownerId+':'+projectId+':'+action
  const semantic={...input};delete semantic.requestId;delete semantic.structureVersion;delete semantic.contentVersion;if(action==='add')delete semantic.nodeId
  const signature=canonical(semantic),prior=guarded?read(key):undefined
  if(prior&&prior.signature!==signature)throw new Error('The previous '+action+' request was not confirmed. Retry that same operation before changing its details.')
  const payload=prior?.input??input
  if(guarded)remember(key,{action,projectId:projectId!,input:payload,signature})
  const response=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({action,projectId,input:payload}),signal:AbortSignal.timeout(45000)})
  let result:unknown
  try{result=await response.json()}catch{throw new Error('The server response was interrupted. Retry the same operation; its request ID has been kept.')}
  if(!response.ok){if(guarded&&response.status<500)forget(key);const error=new Error((result as {error?:string}).error??'Unable to complete the request.') as Error & {status:number};error.status=response.status;throw error}
  if(guarded)forget(key)
  return result as T
 }
}
