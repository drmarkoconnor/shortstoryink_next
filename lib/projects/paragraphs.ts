/** A small, explicit prose format. No HTML or executable content is stored. */
export type FirstLineIndent = 'auto' | 'indent' | 'none'
export type ProseInline = { type: 'text'; text: string } | { type: 'hardBreak' }
export type ProseParagraph = { type: 'paragraph'; attrs: { firstLineIndent: FirstLineIndent }; content?: ProseInline[] }
export type ProseDocument = { type: 'doc'; content: ProseParagraph[] }

export function validateProseDocument(value: unknown, enforceLimit = true): ProseDocument {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid paragraph document.')
 const root=value as Record<string,unknown>
 if (root.type!=='doc' || !Array.isArray(root.content) || !root.content.length || (enforceLimit && root.content.length>20000)) throw new Error('Invalid paragraph document.')
 let length=0
 const content=root.content.map((item:unknown):ProseParagraph=>{
  if(!item || typeof item!=='object' || Array.isArray(item)) throw new Error('Invalid paragraph.')
  const p=item as Record<string,unknown>,attrs=p.attrs as Record<string,unknown>|undefined
  const indent=attrs?.firstLineIndent ?? 'auto'
  if(p.type!=='paragraph' || !['auto','indent','none'].includes(String(indent)) || (p.content!==undefined&&!Array.isArray(p.content))) throw new Error('Unsupported paragraph formatting.')
  const inline=((p.content??[]) as unknown[]).map((part:unknown):ProseInline=>{
   if(!part || typeof part!=='object' || Array.isArray(part)) throw new Error('Invalid paragraph text.')
   const n=part as Record<string,unknown>
   if(n.type==='hardBreak') {length++;return {type:'hardBreak'}}
   if(n.type!=='text'||typeof n.text!=='string'||!n.text.length||n.marks!==undefined) throw new Error('Unsupported paragraph text.')
   length+=n.text.length
   return {type:'text',text:n.text}
  })
  return {type:'paragraph',attrs:{firstLineIndent:indent as FirstLineIndent},...(inline.length?{content:inline}:{})}
 })
 if(enforceLimit && length+(content.length-1)*2>1000000) throw new Error('This section is too long.')
 return {type:'doc',content}
}
export function paragraphText(p:ProseParagraph):string {return (p.content??[]).map(n=>n.type==='text'?n.text:'\n').join('')}
export function proseText(doc:ProseDocument):string {return doc.content.map(paragraphText).join('\n\n')}

/** Display old writing without reinterpreting its single-newline soft breaks.
 * No legacy text is written back simply by opening it. The original revision
 * remains unchanged if a writer subsequently edits in the paragraph editor.
 */
export function proseFromLegacy(body:string):ProseDocument {
 const content=body.replace(/\r\n?/g,'\n').split('\n\n').map((text):ProseParagraph=>{
  const inline:ProseInline[]=[]
  text.split('\n').forEach((line,index)=>{if(index)inline.push({type:'hardBreak'});if(line)inline.push({type:'text',text:line})})
  return {type:'paragraph',attrs:{firstLineIndent:'auto'},...(inline.length?{content:inline}:{})}
 })
 return {type:'doc',content}
}
export function firstLineIndented(indent:FirstLineIndent,index:number,enabled=true):boolean {
 return enabled && (indent==='indent'||(indent==='auto'&&index>0))
}
export function sectionParagraphs(section:{body:string;document?:ProseDocument|null}):Array<{text:string;indent:FirstLineIndent}> {
 if(section.document)return validateProseDocument(section.document).content.map(p=>({text:paragraphText(p),indent:p.attrs.firstLineIndent}))
 // Keep the original export interpretation for old compiled/snapshot copies.
 return section.body.replace(/\r\n?/g,'\n').split(/\n\s*\n/).filter(p=>p.length>0).map(text=>({text,indent:'auto'}))
}
