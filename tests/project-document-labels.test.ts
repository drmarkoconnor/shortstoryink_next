import assert from 'node:assert/strict'
import test from 'node:test'
import { documentLabel, isSupportingDocument, manuscriptDocuments, type ProjectNode } from '../lib/projects/model'
const node=(id:string,kind:ProjectNode['kind'],label?:ProjectNode['documentLabel'],position=0,parentId:string|null=null):ProjectNode=>({id,kind,documentLabel:label,parentId,position,revisionId:id,title:id,synopsis:'',status:'Draft'})
test('labels describe documents and never turn chapters into folders',()=>{
 assert.equal(documentLabel(node('legacy','section')),'Text')
 assert.equal(documentLabel(node('chapter','section','Chapter')),'Chapter')
 assert.equal(documentLabel(node('part','folder')),'Folder')
 assert.equal(isSupportingDocument(node('research','section','Research')),true)
 assert.equal(isSupportingDocument(node('notes','section','Notes')),true)
 assert.equal(isSupportingDocument(node('scene','section','Scene')),false)
})
test('default manuscript selection respects hierarchy and excludes research and notes even in ordinary folders',()=>{
 const nodes=[node('Part One','folder',null,0),node('Scene 2','section','Scene',1,'Part One'),node('Research','section','Research',0,'Part One'),node('Chapter 1','section','Chapter',1),node('Notebook','section','Notes',2),node('Scene 1','section','Scene',0)]
 assert.deepEqual(manuscriptDocuments(nodes).map(n=>n.id),['Scene 2','Scene 1','Chapter 1'])
})
