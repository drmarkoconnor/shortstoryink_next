'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { canMove, orderedNodes, type ProjectNode } from '@/lib/projects/model'
import { dropDestination, nodeAncestors, nodePath, type DropPosition } from '@/lib/projects/tree'

export function ManuscriptTree({nodes,selectedId,storageKey,busy,onOpen,onFolder,onMove,onCreate}:{
 nodes:ProjectNode[];selectedId:string|null;storageKey:string;busy:boolean
 onOpen:(node:ProjectNode)=>void;onFolder:(id:string|null)=>void
 onMove:(node:ProjectNode,parentId:string|null,index:number)=>Promise<boolean>
 onCreate:(kind:'folder'|'section',parentId:string|null)=>void
}) {
 const [collapsed,setCollapsed]=useState<Set<string>>(new Set()),[focusId,setFocusId]=useState<string|null>(null)
 const [drop,setDrop]=useState<{id:string|null;position:DropPosition}|null>(null),[destination,setDestination]=useState('')
 const [announcement,setAnnouncement]=useState(''),[restored,setRestored]=useState(false)
 const rows=useRef(new Map<string,HTMLDivElement>()),scroll=useRef<HTMLDivElement>(null)
 const flat=useMemo(()=>orderedNodes(nodes),[nodes])
 const visible=useMemo(()=>flat.filter(n=>!nodeAncestors(nodes,n.id).some(id=>collapsed.has(id))),[flat,nodes,collapsed])
 const chosen=nodes.find(n=>n.id===selectedId)
 const ancestry=selectedId?nodeAncestors(nodes,selectedId).join(','):''
 useEffect(()=>{
  try{const saved=JSON.parse(localStorage.getItem(storageKey)??'null');if(saved&&Array.isArray(saved.collapsed))setCollapsed(new Set(saved.collapsed.filter((x:unknown)=>typeof x==='string')));if(scroll.current&&Number.isFinite(saved?.scroll))scroll.current.scrollTop=saved.scroll}catch{/* UI preferences are optional. */}
  setRestored(true)
 },[storageKey])
 useEffect(()=>{
  if(!restored)return
  setCollapsed(old=>{const next=new Set(old);for(const id of ancestry.split(','))next.delete(id);return next})
 },[selectedId,ancestry,restored])
 useEffect(()=>{if(!restored)return;try{localStorage.setItem(storageKey,JSON.stringify({collapsed:[...collapsed],scroll:scroll.current?.scrollTop??0}))}catch{/* Preference only. */}},[collapsed,restored,storageKey])
 useEffect(()=>{setDestination(chosen?.parentId??'')},[chosen?.id,chosen?.parentId])
 const focus=(id:string)=>{setFocusId(id);rows.current.get(id)?.focus()}
 const expand=(id:string)=>setCollapsed(s=>{const n=new Set(s);n.delete(id);return n})
 const collapse=(id:string)=>setCollapsed(s=>new Set(s).add(id))
 const open=(node:ProjectNode)=>{if(busy)return;if(node.kind==='folder'){expand(node.id);onFolder(node.id)}else onOpen(node)}
 function key(event:KeyboardEvent,node:ProjectNode){
  if(event.target!==event.currentTarget)return
  const at=visible.findIndex(n=>n.id===node.id)
  switch(event.key){
   case 'ArrowDown':event.preventDefault();focus(visible[Math.min(at+1,visible.length-1)].id);break
   case 'ArrowUp':event.preventDefault();focus(visible[Math.max(0,at-1)].id);break
   case 'Home':event.preventDefault();if(visible[0])focus(visible[0].id);break
   case 'End':event.preventDefault();if(visible.length)focus(visible[visible.length-1].id);break
   case 'ArrowRight':event.preventDefault();if(node.kind==='folder'){if(collapsed.has(node.id))expand(node.id);else{const child=visible[at+1];if(child?.parentId===node.id)focus(child.id)}}break
   case 'ArrowLeft':event.preventDefault();if(node.kind==='folder'&&!collapsed.has(node.id))collapse(node.id);else if(node.parentId)focus(node.parentId);break
   case 'Enter':case ' ':event.preventDefault();open(node);break
  }
 }
 function target(event:DragEvent<HTMLDivElement>,node:ProjectNode):DropPosition {
  const bounds=event.currentTarget.getBoundingClientRect(),fraction=(event.clientY-bounds.top)/bounds.height
  return node.kind==='folder'&&fraction>0.28&&fraction<0.72?'inside':fraction<0.5?'before':'after'
 }
 async function accept(event:DragEvent,id:string|null,position:DropPosition){
  event.preventDefault();event.stopPropagation();setDrop(null);if(busy)return
  const movingId=event.dataTransfer.getData('application/x-shortstory-node')||event.dataTransfer.getData('text/plain')
  const where=dropDestination(nodes,movingId,id,position),node=nodes.find(n=>n.id===movingId)
  if(!where||!node){setAnnouncement('That move is not available. Choose a folder in this project.');return}
  if(await onMove(node,where.parentId,where.index)){if(where.parentId)expand(where.parentId);setAnnouncement(node.title+' moved to '+(where.parentId?nodePath(nodes,where.parentId):'Manuscript'))}
 }
 const currentFocus=visible.some(n=>n.id===focusId)?focusId:visible.some(n=>n.id===selectedId)?selectedId:visible[0]?.id
 const createParent=chosen?.kind==='folder'?chosen.id:chosen?.parentId??null
 return <div className="space-y-4">
  <div className="flex items-center justify-between gap-3"><h2 className="studio-eyebrow">Manuscript</h2><button type="button" className="studio-link text-xs" onClick={()=>setCollapsed(new Set())}>Expand all</button></div>
  <button type="button" className={'w-full rounded px-2 py-2 text-left text-sm '+(!selectedId?'bg-studio-tint font-semibold':'studio-link')} onClick={()=>onFolder(null)} disabled={busy}>Whole manuscript</button>
  <div ref={scroll} className="max-h-[60vh] overflow-y-auto overscroll-contain" onScroll={()=>{try{localStorage.setItem(storageKey,JSON.stringify({collapsed:[...collapsed],scroll:scroll.current?.scrollTop??0}))}catch{/* Preference only. */}}}>
   <div role="tree" aria-label="Manuscript structure">
    {visible.map(node=>{
     const depth=nodeAncestors(nodes,node.id).length,siblings=nodes.filter(n=>n.parentId===node.parentId).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id))
     const dropClass=drop?.id===node.id?(drop.position==='inside'?'bg-studio-tint ring-2 ring-studio-muted':drop.position==='before'?'border-t-2 border-t-studio-ink':'border-b-2 border-b-studio-ink'):''
     return <div key={node.id} ref={el=>{if(el)rows.current.set(node.id,el);else rows.current.delete(node.id)}} role="treeitem" aria-label={node.title} aria-level={depth+1} aria-setsize={siblings.length} aria-posinset={siblings.findIndex(n=>n.id===node.id)+1} aria-selected={node.id===selectedId} aria-expanded={node.kind==='folder'?!collapsed.has(node.id):undefined} tabIndex={node.id===currentFocus?0:-1} data-tree-node={node.id} onFocus={()=>setFocusId(node.id)} onKeyDown={e=>key(e,node)} onClick={()=>{focus(node.id);open(node)}} draggable={!busy} onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-shortstory-node',node.id);e.dataTransfer.setData('text/plain',node.id)}} onDragOver={e=>{e.preventDefault();e.stopPropagation();setDrop({id:node.id,position:target(e,node)})}} onDragLeave={()=>setDrop(null)} onDragEnd={()=>setDrop(null)} onDrop={e=>void accept(e,node.id,target(e,node))} style={{paddingLeft:8+depth*14}} title={nodePath(nodes,node.id)} className={'my-0.5 flex min-h-9 cursor-pointer items-center gap-1 rounded border border-transparent pr-2 text-sm outline-offset-1 focus-visible:outline focus-visible:outline-2 '+(node.id===selectedId?'bg-studio-tint font-semibold ':'hover:bg-studio-tint ')+dropClass}>
      {node.kind==='folder'?<button type="button" tabIndex={-1} aria-label={(collapsed.has(node.id)?'Expand ':'Collapse ')+node.title} onClick={e=>{e.stopPropagation();if(collapsed.has(node.id))expand(node.id);else collapse(node.id)}} className="shrink-0 px-1 py-1">{collapsed.has(node.id)?'▸':'▾'}</button>:<span className="w-5 shrink-0 text-center text-studio-muted" aria-hidden="true">·</span>}
      <span className="min-w-0 truncate">{node.title}</span>
      {node.kind==='folder'&&<small className="ml-auto pl-1 font-normal text-studio-muted">{nodes.filter(n=>n.parentId===node.id).length}</small>}
     </div>
    })}
   </div>
   {!nodes.length&&<p className="px-2 py-4 text-sm leading-6 text-studio-muted">Add a section to start writing. Folders can hold chapters, scenes or parts.</p>}
   <div className="mt-3 rounded border border-dashed border-studio-line px-2 py-3 text-xs text-studio-muted" onDragOver={e=>{e.preventDefault();setDrop({id:null,position:'inside'})}} onDragLeave={()=>setDrop(null)} onDrop={e=>void accept(e,null,'inside')}>Drop here to move to the top level</div>
  </div>
  <div className="flex flex-wrap gap-3 text-sm"><button type="button" disabled={busy} className="studio-link" onClick={()=>onCreate('section',createParent)}>+ Section</button><button type="button" disabled={busy} className="studio-link" onClick={()=>onCreate('folder',createParent)}>+ Folder</button></div>
  {chosen&&<div className="space-y-2 border-t border-studio-line pt-3"><p className="break-words text-xs leading-5 text-studio-muted">{nodePath(nodes,chosen.id)}</p><label className="block text-xs">Move selected item to<select aria-label="Move selected item to" className="mt-2 w-full rounded border border-studio-line bg-studio-paper px-2 py-2 text-sm" value={destination} onChange={e=>setDestination(e.target.value)}><option value="">Whole manuscript</option>{flat.filter(n=>n.kind==='folder'&&canMove(nodes,chosen.id,n.id)).map(n=><option key={n.id} value={n.id}>{nodePath(nodes,n.id)}</option>)}</select></label><button type="button" className="studio-link text-xs" disabled={busy} onClick={async()=>{const p=destination||null;if(await onMove(chosen,p,nodes.filter(n=>n.id!==chosen.id&&n.parentId===p).length)){if(p)expand(p);setAnnouncement('Move saved.')}}}>Move selected item</button></div>}
  <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
 </div>
}
