import type { ProseDocument } from './paragraphs'
export type NodeStatus = 'Draft' | 'Revising' | 'Ready'
export type ProjectNode = { id: string; parentId: string | null; kind: 'folder' | 'section'; position: number; revisionId: string; title: string; synopsis: string; status: NodeStatus }
export type Section = ProjectNode & { body: string; document?: ProseDocument | null }
export type Snapshot = { id: string; nodeId: string | null; label: string; kind: 'named' | 'safety' | 'recovery'; createdAt: string }
export type ProjectState = { project: { id: string; title: string; structureVersion: number; contentVersion: number; archivedAt: string | null }; nodes: ProjectNode[]; snapshots: Snapshot[] }
export type ProjectListItem = { id: string; title: string; updatedAt: string; archivedAt: string | null }
export type SaveReply = { state: ProjectState; revisionId?: string; conflict?: boolean; incomingRevisionId?: string; current?: Section }
export type CompileSettings = { title: string; author: string; anonymous: boolean; font: 'Times New Roman' | 'Arial'; size: number; spacing: 1 | 1.5 | 2; paper: 'A4' | 'Letter'; margins: number; indent: boolean; titlePage: boolean; headings: boolean; pageBreaks: boolean; wordCount: boolean }
export type Compiled = { id: string; settings: CompileSettings; nodes: Section[] }
export type Transport = <T>(action: string, projectId: string | null, input?: Record<string, unknown>) => Promise<T>
export const defaultCompileSettings: CompileSettings = { title: '', author: '', anonymous: false, font: 'Times New Roman', size: 12, spacing: 2, paper: 'A4', margins: 25.4, indent: true, titlePage: false, headings: false, pageBreaks: false, wordCount: true }
export function validateCompileSettings(value: unknown): CompileSettings {
 if (!value || typeof value !== 'object') throw new Error('Choose manuscript formatting.')
 const x = value as Record<string, unknown>
 if (typeof x.title !== 'string' || !x.title.trim() || x.title.length > 300) throw new Error('Enter a manuscript title.')
 if (!['Times New Roman','Arial'].includes(String(x.font)) || ![10,11,12,13,14,16].includes(Number(x.size)) || ![1,1.5,2].includes(Number(x.spacing)) || !['A4','Letter'].includes(String(x.paper)) || ![20,25.4,30].includes(Number(x.margins))) throw new Error('Unsupported manuscript formatting.')
 const anonymous = x.anonymous === true
 return { title:x.title.trim(), author:anonymous ? '' : String(x.author ?? '').trim().slice(0,200), anonymous, font:x.font as CompileSettings['font'], size:Number(x.size), spacing:Number(x.spacing) as CompileSettings['spacing'], paper:x.paper as CompileSettings['paper'], margins:Number(x.margins), indent:x.indent===true, titlePage:!anonymous && x.titlePage===true, headings:x.headings===true, pageBreaks:x.pageBreaks===true, wordCount:x.wordCount!==false }
}
export function orderedNodes(nodes: ProjectNode[], parentId: string | null = null): ProjectNode[] {
 const result: ProjectNode[] = [], visiting = new Set<string>()
 const walk = (parent: string | null) => {
  for (const node of nodes.filter(n=>n.parentId===parent).sort((a,b)=>a.position-b.position || a.id.localeCompare(b.id))) {
   if (visiting.has(node.id)) throw new Error('Circular outline detected.')
   visiting.add(node.id); result.push(node); walk(node.id)
  }
 }
 walk(parentId)
 if (parentId === null && result.length !== nodes.length) throw new Error('An outline section has no reachable folder.')
 return result
}
export function canMove(nodes: ProjectNode[], nodeId: string, parentId: string | null): boolean {
 const node=nodes.find(n=>n.id===nodeId); if (!node) return false
 const visited=new Set<string>([nodeId]); let parent=parentId
 while(parent) { if(visited.has(parent)) return false; visited.add(parent); const p=nodes.find(n=>n.id===parent); if(!p || p.kind!=='folder') return false; parent=p.parentId }
 return true
}
export function countWords(text: string): number { return text.trim().split(/\s+/u).filter(Boolean).length }
export function compiledText(compiled: Compiled): string { return compiled.nodes.map(n=>(compiled.settings.headings?n.title+'\n\n':'')+n.body).join('\n\n#\n\n') }
export function downloadName(settings: CompileSettings, extension: string): string {
 // Never append an account name, author ID or internal project name.
 const title=settings.title.replace(/[\x00-\x1f<>:"/\\|?*]/g,'').trim().slice(0,150) || 'Manuscript'
 return title+'.'+extension
}
export function escapeMarkup(text: string): string { return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c] as string)) }
export function paragraphs(text: string): string[] { return text.replace(/\r\n?/g,'\n').split(/\n\s*\n/).filter(p=>p.length>0) }
export function validateArchive(value: unknown): boolean {
 if(!value || typeof value!=='object') return false
 const a=value as Record<string,unknown>
 if(a.format!=='shortstory-project' || a.version!==1 || !Array.isArray(a.nodes) || !Array.isArray(a.revisions) || !Array.isArray(a.snapshots) || !Array.isArray(a.compiles)) return false
 const revisions=new Map((a.revisions as Array<{id:string;node_id:string}>).map(r=>[r.id,r.node_id]))
 const nodes=new Set((a.nodes as Array<{id:string}>).map(n=>n.id))
 return (a.nodes as Array<{id:string;parent_id:string|null;current_revision_id:string}>).every(n=>(!n.parent_id || nodes.has(n.parent_id)) && revisions.get(n.current_revision_id)===n.id) &&
 [...a.snapshots,...a.compiles].every((s:{manifest?:{nodes?:Array<{id:string;revisionId:string}>}})=>Array.isArray(s.manifest?.nodes) && s.manifest.nodes.every(n=>revisions.get(n.revisionId)===n.id))
}
