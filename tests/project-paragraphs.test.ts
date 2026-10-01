import assert from 'node:assert/strict'
import test from 'node:test'
import { proseFromLegacy, proseText, validateProseDocument, firstLineIndented, sectionParagraphs, type ProseDocument } from '../lib/projects/paragraphs'
import { dropDestination, nodePath, nodeAncestors } from '../lib/projects/tree'
import type { ProjectNode } from '../lib/projects/model'

const doc:ProseDocument={type:'doc',content:[
 {type:'paragraph',attrs:{firstLineIndent:'none'},content:[{type:'text',text:'“Are you coming?”'}]},
 {type:'paragraph',attrs:{firstLineIndent:'indent'},content:[{type:'text',text:'She stood up.'},{type:'hardBreak'},{type:'text',text:'“Not yet.”'}]},
]}
test('paragraphs and soft breaks are explicit and first-line indentation is one style, not text padding',()=>{
 assert.equal(proseText(doc),'“Are you coming?”\n\nShe stood up.\n“Not yet.”')
 assert.deepEqual(validateProseDocument(doc),doc)
 assert.equal(firstLineIndented('auto',0),false);assert.equal(firstLineIndented('auto',1),true)
 assert.equal(firstLineIndented('none',1),false);assert.equal(firstLineIndented('indent',0),true)
 assert.equal(firstLineIndented('indent',0,false),false)
})
test('legacy display preserves single line breaks and spaces without rewriting the old export meaning',()=>{
 const text='  First\tline\nsecond line\n\nThe next paragraph.\n'
 assert.equal(proseText(proseFromLegacy(text)),text)
 assert.equal(sectionParagraphs({body:text})[0].text,'  First\tline\nsecond line')
 assert.equal(sectionParagraphs({body:proseText(doc),document:doc})[1].indent,'indent')
})
test('unsupported paragraph blocks, marks and malformed documents are rejected',()=>{
 const invalid:unknown[]=[
  null,{},[],{type:'doc',content:[]},
  {type:'doc',content:[{type:'heading'}]},
  {type:'doc',content:[{type:'paragraph',content:[{type:'image',src:'https://example.invalid'}]}]},
  {type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'x',marks:[{type:'bold'}]}]}]},
 ]
 for(const value of invalid)assert.throws(()=>validateProseDocument(value))
})

function n(id:string,parentId:string|null,kind:'folder'|'section',position:number):ProjectNode{return{id,parentId,kind,position,revisionId:id,title:id,synopsis:'',status:'Draft'}}
const nodes=[n('Part',null,'folder',0),n('A','Part','section',0),n('B','Part','section',1),n('C','Part','section',2),n('Nested','Part','folder',3),n('D','Nested','section',0),n('Last',null,'section',1)]
test('tree paths and ancestors preserve a full visible hierarchy',()=>{
 assert.equal(nodePath(nodes,'D'),'Part / Nested / D');assert.deepEqual(nodeAncestors(nodes,'D'),['Part','Nested'])
})
test('drag insertion uses post-removal positions with before, after and inside destinations',()=>{
 assert.deepEqual(dropDestination(nodes,'A','B','after'),{parentId:'Part',index:1})
 assert.deepEqual(dropDestination(nodes,'C','A','before'),{parentId:'Part',index:0})
 assert.deepEqual(dropDestination(nodes,'Last','Nested','inside'),{parentId:'Nested',index:1})
 assert.deepEqual(dropDestination(nodes,'A',null,'inside'),{parentId:null,index:2})
 assert.equal(dropDestination(nodes,'Part','Nested','inside'),null)
 assert.equal(dropDestination(nodes,'Part','D','after'),null)
 assert.equal(dropDestination(nodes,'A','B','inside'),null)
 assert.equal(dropDestination(nodes,'A','A','before'),null)
 assert.equal(dropDestination(nodes,'A','missing','inside'),null)
})
