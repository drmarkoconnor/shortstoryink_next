'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProjectState, SaveReply, Section, Transport } from '@/lib/projects/model'

type Pending = { requestId: string; input: Record<string, unknown>; sent: Section }
export function useProjectDraft(ownerId: string, projectId: string, api: Transport, onState: (s: ProjectState)=>void) {
 const [editorEpoch,setEditorEpoch]=useState(0)
 const [draft,setDraft]=useState<Section|null>(null), [status,setStatus]=useState('Choose a document'),[problem,setProblem]=useState(''),[conflict,setConflict]=useState<SaveReply|null>(null)
 const ref=useRef<Section|null>(null),dirty=useRef(false),pending=useRef<Pending|null>(null),flight=useRef<Promise<boolean>|null>(null),blocked=useRef(false),stateCallback=useRef(onState)
 stateCallback.current=onState
 const key=useCallback((id:string)=>'shortstory:project:v1:'+ownerId+':'+projectId+':'+id,[ownerId,projectId])
 const persist=useCallback(()=>{if(!ref.current)return;try{localStorage.setItem(key(ref.current.id),JSON.stringify({draft:ref.current,pending:pending.current}))}catch{setProblem('Local recovery is unavailable in this browser. Keep a downloaded copy while cloud saving is unavailable.')}},[key])
 const clear=useCallback((id:string)=>{try{localStorage.removeItem(key(id))}catch{/* Recovery may be unavailable. */}},[key])
 const load=useCallback((section:Section)=>{
  if(dirty.current || flight.current) throw new Error('Save the current section before changing it.')
  let next=section; pending.current=null; blocked.current=false;setConflict(null);setProblem('');dirty.current=false
  try {const raw=localStorage.getItem(key(section.id));if(raw){const saved=JSON.parse(raw);if(saved.draft?.id===section.id && typeof saved.draft.body==='string' && typeof saved.draft.revisionId==='string') {next={...section,...saved.draft};pending.current=saved.pending??null;dirty.current=true;setProblem('Recovered unsent writing from this device. It will be reconciled with the saved version, never silently overwritten.')}}}catch{setProblem('The local recovery copy could not be read. Cloud writing is still available.')}
  ref.current=next;setDraft(next);setEditorEpoch(x=>x+1);setStatus(dirty.current?'Recovered changes — not yet saved':'Saved to your account')
 },[key])
 const edit=useCallback((change:Partial<Section>)=>{
  if(!ref.current || blocked.current)return
  ref.current={...ref.current,...change};dirty.current=true;setDraft(ref.current);setStatus('Unsaved changes');persist()
 },[persist])
 const saveOnce=useCallback(async():Promise<boolean>=>{
  if(flight.current)return flight.current
  if(blocked.current)return false
  if(!ref.current || !dirty.current)return true
  if(!navigator.onLine){setStatus('Waiting for connection — not cloud-saved');persist();return false}
  const save=async()=>{
   const sent=pending.current?.sent ?? {...ref.current!}
   const input=pending.current?.input ?? {nodeId:sent.id,revisionId:sent.revisionId,title:sent.title,body:sent.body,document:sent.document??null,synopsis:sent.synopsis,status:sent.status,documentLabel:sent.documentLabel??null}
   const requestId=pending.current?.requestId ?? crypto.randomUUID()
   pending.current={sent,input,requestId};persist();setStatus('Saving…')
   try {
    const result=await api<SaveReply>('save',projectId,{...input,requestId})
    stateCallback.current(result.state)
    if(result.conflict){blocked.current=true;setConflict(result);setStatus('Two versions preserved — choose how to continue');persist();return false}
    if(!result.revisionId)throw new Error('Save not confirmed')
    const current=ref.current!
    const changed=['title','body','synopsis','status','documentLabel'].some(k=>current[k as keyof Section]!==sent[k as keyof Section]) || JSON.stringify(current.document??null)!==JSON.stringify(sent.document??null)
    ref.current={...current,revisionId:result.revisionId};setDraft(ref.current);pending.current=null;dirty.current=changed
    if(changed){persist();setStatus('Unsaved changes')}else{clear(sent.id);setStatus('Saved to your account');setProblem('')}
    return !changed
   } catch(error){
    const code=(error as {status?:number}).status
    if(code===400||code===409)pending.current=null // A rejected transaction may be corrected and retried with a new payload.
    setStatus('Not saved — retry or download your copy');setProblem(error instanceof Error?error.message:'Unable to save.');persist();return false
   }
  }
  flight.current=save()
  try{return await flight.current}finally{flight.current=null}
 },[api,projectId,persist,clear])
 const flush=useCallback(async()=>{
  if(flight.current)await flight.current
  for(let i=0;i<3 && dirty.current && !blocked.current;i++){const ok=await saveOnce();if(!ok && pending.current)return false}
  return !dirty.current && !blocked.current
 },[saveOnce])
 useEffect(()=>{if(!draft || !dirty.current)return;const timer=setTimeout(()=>{void saveOnce()},1200);return()=>clearTimeout(timer)},[draft,saveOnce])
 useEffect(()=>{
  const timer=setInterval(()=>{if(dirty.current && !pending.current)void saveOnce()},10000)
  const online=()=>{void saveOnce()}; const unload=(event:BeforeUnloadEvent)=>{if(dirty.current || flight.current){event.preventDefault();event.returnValue=''}}
  window.addEventListener('online',online);window.addEventListener('beforeunload',unload)
  return()=>{clearInterval(timer);window.removeEventListener('online',online);window.removeEventListener('beforeunload',unload)}
 },[saveOnce])
 const resolve=async(useLocal:boolean)=>{
  if(!ref.current || !conflict?.current)return
  if(useLocal){ref.current={...ref.current,revisionId:conflict.current.revisionId};pending.current=null;blocked.current=false;setConflict(null);setDraft(ref.current);dirty.current=true;persist();await saveOnce()}
  else {
   // Preserve the very latest local text as a conflict revision, including edits
   // typed while the earlier request was in flight, before adopting the remote copy.
   try {const local=ref.current;const result=await api<SaveReply>('save',projectId,{requestId:crypto.randomUUID(),nodeId:local.id,revisionId:local.revisionId,title:local.title,body:local.body,document:local.document??null,synopsis:local.synopsis,status:local.status,documentLabel:local.documentLabel??null})
    if(!result.current){setProblem('The saved version changed again. Reload before resolving.');return}
    const remote={...local,...result.current};ref.current=remote;setDraft(remote);setEditorEpoch(x=>x+1);dirty.current=false;pending.current=null;blocked.current=false;setConflict(null);clear(local.id);setStatus('Saved to your account');stateCallback.current(result.state)
   }catch(e){setProblem(e instanceof Error?e.message:'Both versions remain available; try again.')}
  }
 }
 const discardSelection=()=>{if(dirty.current || flight.current)throw new Error('Unsaved changes');ref.current=null;setDraft(null);setConflict(null);setStatus('Choose a document')}
 const download=()=>{if(!ref.current)return;const a=document.createElement('a'),url=URL.createObjectURL(new Blob([ref.current.body],{type:'text/plain;charset=utf-8'}));a.href=url;a.download=(ref.current.title||'Unsaved writing')+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return {draft,editorEpoch,status,problem,conflict,load,edit,save:flush,resolve,discardSelection,download,hasUnsaved:()=>dirty.current}
}
