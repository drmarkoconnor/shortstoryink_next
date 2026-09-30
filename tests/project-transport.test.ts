import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createProjectTransport, forgetProjectDrafts, hasUnsentProjectDraft } from '../lib/projects/transport'
import { handleProjectRequest } from '../lib/projects/http'
class MemoryStorage implements Storage {
 private values=new Map<string,string>()
 get length(){return this.values.size}
 clear(){this.values.clear()}
 getItem(key:string){return this.values.get(key)??null}
 key(index:number){return [...this.values.keys()][index]??null}
 removeItem(key:string){this.values.delete(key)}
 setItem(key:string,value:string){this.values.set(key,value)}
}
test('uncertain structural actions preserve the first request ID and reject changed details',async()=>{
 const original=globalThis.fetch,requests:Array<{input:Record<string,unknown>}>=[];let fail=true
 globalThis.fetch=async(_input,init)=>{requests.push(JSON.parse(String(init?.body)));if(fail){fail=false;throw new TypeError('Lost acknowledgement')}return Response.json({saved:true})}
 try {
  const api=createProjectTransport('/api/test','writer-a')
  await assert.rejects(api('add','project',{requestId:'first',nodeId:'original',title:'Scene',structureVersion:1}),/Lost acknowledgement/)
  await assert.rejects(api('add','project',{requestId:'second',nodeId:'replacement',title:'Different',structureVersion:2}),/previous add request/)
  await api('add','project',{requestId:'third',nodeId:'replacement',title:'Scene',structureVersion:2})
  assert.equal(requests.length,2);assert.equal(requests[1].input.requestId,'first');assert.equal(requests[1].input.nodeId,'original');assert.equal(requests[1].input.structureVersion,1)
 }finally{globalThis.fetch=original}
})
test('definitive validation failure permits a corrected operation; interrupted JSON keeps the request',async()=>{
 const original=globalThis.fetch,requests:Array<{input:Record<string,unknown>}>=[];let count=0
 globalThis.fetch=async(_input,init)=>{requests.push(JSON.parse(String(init?.body)));count++;if(count===1)return Response.json({error:'Invalid title'},{status:400});if(count===2)return new Response('broken json',{status:200});return Response.json({saved:true})}
 try {
  const api=createProjectTransport('/api/test','writer-a')
  await assert.rejects(api('rename','project',{requestId:'bad',title:''}),/Invalid title/)
  await assert.rejects(api('rename','project',{requestId:'good',title:'Novel'}),/interrupted/)
  await api('rename','project',{requestId:'retry',title:'Novel'})
  assert.equal(requests[2].input.requestId,'good')
 }finally{globalThis.fetch=original}
})
test('sign-out removes only this writer’s local drafts and uncertain requests',()=>{
 const storage=new MemoryStorage()
 storage.setItem('shortstory:project:v1:one:project:section','draft');storage.setItem('shortstory:project-request:v1:one:project:add','request');storage.setItem('shortstory:project:v1:two:project:section','other writer');storage.setItem('unrelated','keep')
 assert.equal(hasUnsentProjectDraft(storage,'one'),true);forgetProjectDrafts(storage,'one');assert.equal(hasUnsentProjectDraft(storage,'one'),false);assert.equal(hasUnsentProjectDraft(storage,'two'),true);assert.equal(storage.length,2)
})
test('proxied same-origin requests work while mismatched origins remain denied',async()=>{
 const context={actorId:'writer',role:'writer',enabled:true,execute:async()=>[]}
 const req=(origin:string)=>new Request('http://internal:3000/api/projects',{method:'POST',headers:{Host:'studio.test','x-forwarded-proto':'https',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'list',projectId:null,input:{}})})
 assert.equal((await handleProjectRequest(req('https://studio.test'),context)).status,200);assert.equal((await handleProjectRequest(req('https://different.test'),context)).status,403)
})
