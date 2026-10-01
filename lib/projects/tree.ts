import { canMove, type ProjectNode } from './model'
export type DropPosition = 'before' | 'after' | 'inside'
export function nodePath(nodes:ProjectNode[],id:string):string {
 const names:string[]=[],seen=new Set<string>();let current=nodes.find(n=>n.id===id)
 while(current&&!seen.has(current.id)){seen.add(current.id);names.unshift(current.title);current=nodes.find(n=>n.id===current?.parentId)}
 return names.join(' / ')
}
export function nodeAncestors(nodes:ProjectNode[],id:string):string[] {
 const result:string[]=[],seen=new Set<string>([id]);let parent=nodes.find(n=>n.id===id)?.parentId
 while(parent&&!seen.has(parent)){seen.add(parent);result.unshift(parent);parent=nodes.find(n=>n.id===parent)?.parentId}
 return result
}
/** Index is measured after removing the dragged node, matching the database. */
export function dropDestination(nodes:ProjectNode[],movingId:string,targetId:string|null,position:DropPosition):{parentId:string|null;index:number}|null {
 const moving=nodes.find(n=>n.id===movingId),target=nodes.find(n=>n.id===targetId)
 if(!moving || targetId===movingId || (targetId&&!target))return null
 const parentId=target?(position==='inside'?target.id:target.parentId):null
 if(position==='inside'&&target&&target.kind!=='folder')return null
 if(!canMove(nodes,movingId,parentId))return null
 const siblings=nodes.filter(n=>n.id!==movingId&&n.parentId===parentId).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id))
 const index=!target||position==='inside'?siblings.length:siblings.findIndex(n=>n.id===targetId)+(position==='after'?1:0)
 return index<0?null:{parentId,index}
}
