import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act, useState } from 'react'
import { JSDOM } from 'jsdom'
import type { Editor } from '@tiptap/core'
import type { ProseDocument } from '../lib/projects/paragraphs'

// Actual editor component and keymap. Real browser/HTTP coverage remains a
// separate gate; this does not pretend JSDOM implements native caret movement.
test('paragraph keys change formatting without inserting whitespace and survive a save acknowledgement', async () => {
 const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url:'https://example.test',pretendToBeVisual:true })
 const replacements: Record<string,unknown> = {
  window:dom.window,self:dom.window,document:dom.window.document,navigator:dom.window.navigator,
  HTMLElement:dom.window.HTMLElement,Element:dom.window.Element,Node:dom.window.Node,
  DOMParser:dom.window.DOMParser,MutationObserver:dom.window.MutationObserver,
  getComputedStyle:dom.window.getComputedStyle,React,IS_REACT_ACT_ENVIRONMENT:true,
  requestAnimationFrame:(callback:()=>void)=>setTimeout(callback,0),cancelAnimationFrame:clearTimeout,
 }
 const originals=new Map(Object.keys(replacements).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
 for(const [key,value] of Object.entries(replacements))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true})
 dom.window.scrollBy=()=>{}
 dom.window.HTMLElement.prototype.scrollIntoView=()=>{}
 const rect={top:0,bottom:20,left:0,right:100,width:100,height:20,x:0,y:0,toJSON(){return {}}}
 dom.window.Range.prototype.getBoundingClientRect=()=>rect
 dom.window.Range.prototype.getClientRects=()=>[rect] as unknown as DOMRectList
 let current:{body:string;document?:ProseDocument|null}={body:'A beginning.\n\nA reply.'}
 let acknowledge:()=>void=()=>{}
 const {ManuscriptEditor}=await import('../components/projects/manuscript-editor')
 const {createRoot}=await import('react-dom/client')
 function Wrapper(){
  const [value,setValue]=useState(current),[revision,setRevision]=useState(1)
  acknowledge=()=>setRevision(n=>n+1)
  return React.createElement('div',{'data-revision':revision},React.createElement(ManuscriptEditor,{
   sectionId:'synthetic',body:value.body,document:value.document,disabled:false,
   onChange:(v:{body:string;document:ProseDocument})=>{current=v;setValue(v)},
  }))
 }
 const root=createRoot(dom.window.document.getElementById('root')!)
 try {
  await act(async()=>{root.render(React.createElement(Wrapper));await new Promise(resolve=>setTimeout(resolve,25))})
  const field=dom.window.document.querySelector('[role="textbox"][aria-label="Manuscript"]') as HTMLElement & {editor:Editor}
  assert.ok(field?.editor)
  const editor=field.editor
  const key=async(name:string,shift=false)=>act(async()=>{field.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true,shiftKey:shift}))})
  await act(async()=>{editor.commands.setTextSelection(editor.state.doc.content.size-1);field.focus()})
  await key('Tab')
  assert.equal(current.document!.content[1].attrs.firstLineIndent,'indent')
  assert.equal(current.body,'A beginning.\n\nA reply.')
  const position=editor.state.selection.from
  await key('Tab')
  assert.equal(current.document!.content[1].attrs.firstLineIndent,'indent')
  assert.equal(editor.state.selection.from,position)
  await act(async()=>acknowledge())
  assert.equal(field.editor,editor)
  assert.equal(editor.state.selection.from,position)
  await key('Enter')
  await act(async()=>{editor.commands.insertContent('A second reply.')})
  assert.equal(current.document!.content[2].attrs.firstLineIndent,'indent')
  await key('Enter',true)
  await act(async()=>{editor.commands.insertContent('A soft continuation.')})
  assert.equal(current.document!.content.length,3)
  assert.ok(current.document!.content[2].content?.some(n=>n.type==='hardBreak'))
  await key('Tab',true)
  assert.equal(current.document!.content[2].attrs.firstLineIndent,'none')
  await key('Escape')
  assert.equal(dom.window.document.activeElement?.textContent,'Indent paragraph')
 } finally {
  await act(async()=>{root.unmount();await new Promise(resolve=>setTimeout(resolve,25))})
  dom.window.close()
  for(const [key,value] of originals){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key)}
 }
})
