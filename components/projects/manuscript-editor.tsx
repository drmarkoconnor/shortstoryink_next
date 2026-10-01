'use client'

import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { proseFromLegacy, proseText, validateProseDocument, type ProseDocument } from '@/lib/projects/paragraphs'

/** A paragraph schema, not a HTML textarea with intercepted whitespace. */
const ProseIndent = Extension.create({
 name: 'proseIndent',
 addGlobalAttributes() {
  return [{ types: ['paragraph'], attributes: { firstLineIndent: {
   default: 'auto',
   parseHTML: element => ['auto','indent','none'].includes(element.getAttribute('data-first-line')??'') ? element.getAttribute('data-first-line') : 'auto',
   renderHTML: attributes => ({ 'data-first-line': attributes.firstLineIndent }),
  } } }]
 },
 addKeyboardShortcuts() {
  return {
   Tab: () => this.editor.commands.updateAttributes('paragraph', { firstLineIndent:'indent' }),
   'Shift-Tab': () => this.editor.commands.updateAttributes('paragraph', { firstLineIndent:'none' }),
  }
 },
})

export function ManuscriptEditor({sectionId,body,document,disabled,onChange}:{
 sectionId:string;body:string;document?:ProseDocument|null;disabled:boolean
 onChange:(value:{body:string;document:ProseDocument})=>void
}) {
 const toolbar=useRef<HTMLButtonElement>(null),change=useRef(onChange),[ready,setReady]=useState(false)
 change.current=onChange
 const editor=useEditor({
  immediatelyRender:false,
  extensions:[StarterKit.configure({
   blockquote:false,bold:false,bulletList:false,code:false,codeBlock:false,
   heading:false,horizontalRule:false,italic:false,link:false,listItem:false,
   listKeymap:false,orderedList:false,strike:false,underline:false,trailingNode:false,
  }),ProseIndent],
  content:document??proseFromLegacy(body),
  editable:!disabled,
  editorProps:{
   attributes:{role:'textbox','aria-label':'Manuscript','aria-multiline':'true','aria-describedby':'manuscript-keyboard-help',class:'prose-manuscript writing-manuscript min-h-[28rem] outline-none p-5 sm:p-7'},
   handleKeyDown:(_view,event)=>{
    if(event.key==='Escape'&&!event.isComposing){event.preventDefault();toolbar.current?.focus();return true}
    return false
   },
  },
  onCreate:()=>setReady(true),
  onUpdate:({editor:current})=>{
   // Keep overlong pasted writing locally too; the server may reject its save,
   // but a validation warning must never erase the writer's unsent words.
   const doc=validateProseDocument(current.getJSON(),false)
   change.current({body:proseText(doc),document:doc})
  },
 })
 // No setContent on every acknowledged autosave: it resets cursor/history.
 // The parent keys this component by section/explicit restore, not revision ID.
 useEffect(()=>{editor?.setEditable(!disabled,false)},[editor,disabled])
 return <div data-section-editor={sectionId} className="space-y-3">
  <div role="toolbar" aria-label="Paragraph formatting" className="flex flex-wrap items-center gap-3 text-sm">
   <button ref={toolbar} type="button" disabled={!editor||disabled} className="studio-secondary" onClick={()=>editor?.chain().focus().updateAttributes('paragraph',{firstLineIndent:'indent'}).run()}>Indent paragraph</button>
   <button type="button" disabled={!editor||disabled} className="studio-secondary" onClick={()=>editor?.chain().focus().updateAttributes('paragraph',{firstLineIndent:'none'}).run()}>Remove indent</button>
   <button type="button" disabled={!editor||disabled} className="studio-link" onClick={()=>editor?.chain().focus().updateAttributes('paragraph',{firstLineIndent:'auto'}).run()}>Automatic indents</button>
   <button type="button" disabled={!editor||disabled} className="studio-link" onClick={()=>editor?.chain().focus().undo().run()}>Undo</button>
   <button type="button" disabled={!editor||disabled} className="studio-link" onClick={()=>editor?.chain().focus().redo().run()}>Redo</button>
  </div>
  <p id="manuscript-keyboard-help" className="text-xs leading-6 text-studio-muted">Enter: new paragraph · Shift+Enter: line break · Tab / Shift+Tab: indent / remove indent · Escape: leave the manuscript for these controls.</p>
  {!ready&&<p role="status">Opening the paragraph editor…</p>}
  <EditorContent editor={editor} className="writing-surface rounded border border-studio-line" />
  <style>{`.prose-manuscript p{margin:0;min-height:1.65em;text-indent:1.27cm;white-space:pre-wrap}.prose-manuscript p:first-child,.prose-manuscript p[data-first-line="none"]{text-indent:0}.prose-manuscript p[data-first-line="indent"]{text-indent:1.27cm}`}</style>
 </div>
}
