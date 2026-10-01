import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { executeProjectCommand, type SqlClient } from '../lib/projects/store'
import { handleProjectRequest } from '../lib/projects/http'
import { compileDocx, compileHtml } from '../lib/projects/compile'
import { orderedNodes, canMove, compiledText, defaultCompileSettings, validateArchive, validateCompileSettings, downloadName, type ProjectState, type Section, type Compiled, type SaveReply } from '../lib/projects/model'

const db=new PGlite(),author:string=randomUUID(),peer:string=randomUUID(),editor:string=randomUUID(),group:string=randomUUID(),project:string=randomUUID()
const migrations=['001_workshop-baseline','002_editor-intake-sharing','003_require-current-author-membership','004_keep-anonymous-submission-denial-clean','005_harden-sharing-triggers','006_serialize-sharing-lifecycle','007_writer-projects','008_writer-projects-history','009_project-paragraph-documents']
const sql:SqlClient={query:async(text,values=[])=>{const r=await db.query<Record<string,unknown>>(text,values);return {rows:r.rows}}}
async function command<T>(action:string,input:Record<string,unknown>={},pid:string=project,actor:string=author):Promise<T>{await db.exec('set role netlifydb_owner');try{return await executeProjectCommand(sql,actor,pid,action,input) as T}finally{await db.exec('reset role')}}
async function mutate<T>(action:string,input:Record<string,unknown>={},pid:string=project){const s=await command<ProjectState>('state',{},pid);return command<T>(action,{requestId:randomUUID(),structureVersion:s.project.structureVersion,contentVersion:s.project.contentVersion,...input},pid)}
async function add(title:string,body='',kind='section',parentId:string|null=null,pid:string=project){const nodeId=randomUUID();await mutate('add',{nodeId,parentId,kind,title,body,synopsis:'private synopsis',status:'Draft'},pid);return nodeId}
async function scoped(actor:string,query:string,values:unknown[]=[]){await db.exec('set role studio_authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[actor]);return await db.query(query,values)}finally{await db.exec('reset role')}}
async function section(nodeId:string,pid:string=project){const s=await command<ProjectState>('state',{},pid);return {...s.nodes.find(n=>n.id===nodeId)!,...await command<Section>('section',{nodeId},pid)}}
async function save(nodeId:string,body:string,pid:string=project,revisionId?:string){const n=await section(nodeId,pid);return command<SaveReply>('save',{requestId:randomUUID(),nodeId,revisionId:revisionId??n.revisionId,title:n.title,body,synopsis:n.synopsis,status:n.status},pid)}
function entries(zip:Buffer){const result:Record<string,string>={};let p=0;while(zip.readUInt32LE(p)===0x04034b50){const size=zip.readUInt32LE(p+18),len=zip.readUInt16LE(p+26),extra=zip.readUInt16LE(p+28),name=zip.subarray(p+30,p+30+len).toString();result[name]=zip.subarray(p+30+len+extra,p+30+len+extra+size).toString();p+=30+len+extra+size}return result}
let first:string,second:string,folder:string
before(async()=>{
 await db.exec('create role netlifydb_owner bypassrls createrole; grant all on schema public to netlifydb_owner; grant create on database postgres to netlifydb_owner; set role netlifydb_owner;')
 for(const name of migrations){const text=await readFile('netlify/database/migrations/'+name+'/migration.sql','utf8');assert.doesNotMatch(text,/^\s*(begin|commit|rollback);\s*$/im);await db.exec('begin');await db.exec(text);await db.exec('commit')}
 await db.exec('reset role')
 for(const [id,role] of [[author,'writer'],[peer,'writer'],[editor,'teacher']]){await db.query('insert into studio_auth.users(id,email) values($1,$2)',[id,id+'@example.invalid']);await db.query('insert into public.profiles(id,role,display_name) values($1,$2,$3)',[id,role,'Synthetic '+role])}
 await db.query("insert into public.workshops(id,title,slug) values($1,'Project rehearsal','project-rehearsal')",[group]);await db.query('insert into public.workshop_members(workshop_id,profile_id) values($1,$2),($1,$3)',[group,author,peer])
 await command('create',{title:'A private novel'})
 folder=await add('Part One','','folder');first=await add('The station','First paragraph.\n\n  Whitespace, café, “quotes”, and 🐈 remain.','section',folder);second=await add('The river','Second scene.')
})
after(()=>db.close())

test('working projects, history and snapshots are invisible to peers and editors',async()=>{
 for(const who of [peer,editor])for(const table of ['writer_projects','writer_project_nodes','writer_project_revisions','writer_project_snapshots','writer_project_compiles'])assert.equal((await scoped(who,'select * from public.'+table)).rows.length,0)
 assert.equal((await scoped(author,'select * from public.writer_projects')).rows.length,1)
 await assert.rejects(command('state',{},project,peer),/unavailable/)
 await assert.rejects(command('state',{},project,editor),/Writer sign-in/)
 await assert.rejects(scoped(author,"select public.writer_project_command($1,$2,'state','{}')",[author,project]),/permission denied/)
})
test('cloud save is exact and retries acknowledge the same revision without duplicates',async()=>{
 const n=await section(first),body='A revised café.\r\n\r\n  Keep \t whitespace and “quotes”.'
 const input={requestId:randomUUID(),nodeId:first,revisionId:n.revisionId,title:n.title,body,synopsis:n.synopsis,status:n.status}
 const a=await command<SaveReply>('save',input),b=await command<SaveReply>('save',input)
 assert.equal(a.revisionId,b.revisionId);assert.equal((await section(first)).body,body);assert.ok(b.state)
 const row=(await db.query<{result:Record<string,unknown>}>('select result from public.writer_project_requests where project_id=$1 and request_id=$2',[project,input.requestId])).rows[0];assert.equal('state' in row.result,false)
})
test('a stale device preserves both versions and cannot silently overwrite current text',async()=>{
 const old=await section(first);await save(first,'Saved on laptop')
 const result=await save(first,'Still on iPad',project,old.revisionId)
 assert.equal(result.conflict,true);assert.equal((await section(first)).body,'Saved on laptop')
 const conflict=await command<{body:string}>('revision',{revisionId:result.incomingRevisionId});assert.equal(conflict.body,'Still on iPad')
})
test('section snapshots restore text as a new working revision with a safety snapshot',async()=>{
 const old=await section(first);const taken=await mutate<{snapshotId:string}>('snapshot',{nodeId:first,label:'Before viewpoint change'})
 await save(first,'A different viewpoint');await mutate('restore',{snapshotId:taken.snapshotId})
 const restored=await section(first);assert.equal(restored.body,old.body);assert.notEqual(restored.revisionId,old.revisionId)
 const state=await command<ProjectState>('state');assert.ok(state.snapshots.some(s=>s.kind==='safety'));assert.ok(state.snapshots.some(s=>s.id===taken.snapshotId))
})
test('whole-project restore recovers hierarchy, names, deleted sections and text',async()=>{
 const before=await command<ProjectState>('state');const snap=await mutate<{snapshotId:string}>('snapshot',{label:'Before rearranging'})
 await mutate('move',{nodeId:first,parentId:null,index:0});await mutate('trash',{nodeId:folder});await save(second,'Changed river');const extra=await add('Later experiment','Not in old snapshot')
 await mutate('restore',{snapshotId:snap.snapshotId});const after=await command<ProjectState>('state')
 assert.deepEqual(orderedNodes(after.nodes).map(n=>[n.id,n.parentId,n.position,n.title]),orderedNodes(before.nodes).map(n=>[n.id,n.parentId,n.position,n.title]))
 assert.ok(!after.nodes.some(n=>n.id===extra));assert.equal((await section(second)).body,'Second scene.')
})
test('snapshot capture refuses stale content or structure and makes no misleading snapshot',async()=>{
 const before=await command<ProjectState>('state');await save(first,'Changed elsewhere')
 await assert.rejects(command('snapshot',{requestId:randomUUID(),label:'Must not exist',contentVersion:before.project.contentVersion,structureVersion:before.project.structureVersion}),/Another device/)
 assert.ok(!(await command<ProjectState>('state')).snapshots.some(s=>s.label==='Must not exist'))
})
test('card moves, folder moves, cycles and cross-project destinations are guarded',async()=>{
 const nested=await add('Nested folder','','folder',folder)
 assert.equal(canMove((await command<ProjectState>('state')).nodes,folder,nested),false)
 await assert.rejects(mutate('move',{nodeId:folder,parentId:nested,index:0}),/inside itself/)
 const other=randomUUID();await command('create',{title:'Other project'},other);const external=await add('Other folder','','folder',null,other)
 await assert.rejects(mutate('move',{nodeId:first,parentId:external,index:0}),/in this project/)
 await mutate('move',{nodeId:folder,parentId:null,index:1});const state=await command<ProjectState>('state');assert.equal(state.nodes.find(n=>n.id===first)?.parentId,folder)
 const stale=state.project.structureVersion;await mutate('move',{nodeId:second,parentId:null,index:1})
 await assert.rejects(command('move',{requestId:randomUUID(),nodeId:second,parentId:null,index:0,structureVersion:stale}),/arrangement changed/)
})
test('compilation includes only selected sections in saved outline order and remains frozen',async()=>{
 const s=await command<ProjectState>('state'),settings={...defaultCompileSettings,title:'Submission copy',anonymous:true,author:'MUST NOT EXPORT',titlePage:true}
 const chosen=[first,second],r=await mutate<{compileId:string}>('compile',{sectionIds:chosen.slice().reverse(),settings:validateCompileSettings(settings)})
 const before=await command<Compiled>('compiled',{compileId:r.compileId});assert.deepEqual(before.nodes.map(n=>n.id),orderedNodes(s.nodes).filter(n=>chosen.includes(n.id)).map(n=>n.id))
 await save(first,'Private edits after compiling');await mutate('move',{nodeId:second,parentId:folder,index:0})
 const after=await command<Compiled>('compiled',{compileId:r.compileId});assert.equal(compiledText(after),compiledText(before));assert.ok(!compiledText(after).includes('private synopsis'))
 await assert.rejects(command('compiled',{compileId:r.compileId},project,peer),/unavailable/)
})
test('Word export specifies Times New Roman 12, double spacing, margins and page-number fields',async()=>{
 const c:Compiled={id:randomUUID(),settings:{...defaultCompileSettings,title:'A title',author:'Example Author'},nodes:[{...await section(first),body:'Opening paragraph.\n\nSecond paragraph.'}]}
 const doc=compileDocx(c),parts=entries(doc)
 assert.match(parts['word/document.xml'],/Times New Roman/);assert.match(parts['word/document.xml'],/w:sz w:val="24"/);assert.match(parts['word/document.xml'],/w:line="480"/);assert.match(parts['word/document.xml'],/w:top="1440"/);assert.match(parts['word/document.xml'],/w:firstLine="720"/);assert.match(parts['word/footer.xml'],/PAGE/)
 await mkdir('artifacts/projects',{recursive:true});await writeFile('artifacts/projects/manuscript-example.docx',doc);await writeFile('artifacts/projects/manuscript-example.html',compileHtml(c))
})
test('anonymous exports remove identity metadata, author headers and title pages; source is not rewritten',async()=>{
 const c:Compiled={id:randomUUID(),settings:validateCompileSettings({...defaultCompileSettings,title:'Anonymous story',author:'SECRET AUTHOR',anonymous:true,titlePage:true}),nodes:[{...await section(first),body:'Safe text <script>alert(1)</script>'}]}
 const parts=entries(compileDocx(c)),all=Object.values(parts).join('\n'),html=compileHtml(c)
 assert.doesNotMatch(all,/SECRET AUTHOR|lastModifiedBy|dc:creator/);assert.doesNotMatch(all,/w:titlePg/);assert.doesNotMatch(html,/<script>alert/);assert.match(html,/&lt;script&gt;/);assert.equal(downloadName(c.settings,'docx'),'Anonymous story.docx')
 assert.equal(c.nodes[0].body,'Safe text <script>alert(1)</script>')
})
test('formatting is configurable, not a false universal submission rule',()=>{
 const settings=validateCompileSettings({...defaultCompileSettings,title:'Title',font:'Arial',spacing:1.5,paper:'Letter'})
 const parts=entries(compileDocx({id:'x',settings,nodes:[]}));assert.match(parts['word/document.xml'],/w:line="360"/);assert.match(parts['word/document.xml'],/w:w="12240"/)
 assert.throws(()=>validateCompileSettings({...settings,font:'untrusted; css'}),/Unsupported/)
})
test('compiled extraction reuses ordinary submissions without exposing the working project',async()=>{
 const c=await mutate<{compileId:string}>('compile',{sectionIds:[second],settings:{...defaultCompileSettings,title:'Review this scene'}})
 const input={requestId:randomUUID(),compileId:c.compileId,workshopId:group,sourceSubmissionId:null}
 const a=await command<{submission:{id:string};replayed:boolean}>('submit',input),b=await command<{submission:{id:string};replayed:boolean}>('submit',input)
 assert.equal(a.submission.id,b.submission.id);assert.equal(a.replayed,false);assert.equal(b.replayed,true)
 const before=(await db.query<{body:string}>('select body from public.submissions where id=$1',[a.submission.id])).rows[0].body
 await save(second,'This is still private project writing')
 assert.equal((await db.query<{body:string}>('select body from public.submissions where id=$1',[a.submission.id])).rows[0].body,before)
 await db.exec('set role netlifydb_owner');await db.query('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,a.submission.id,[peer]]);await db.exec('reset role')
 assert.equal((await scoped(peer,'select body from public.submissions where id=$1',[a.submission.id])).rows.length,1)
 assert.equal((await scoped(peer,'select * from public.writer_project_nodes')).rows.length,0)
 assert.equal((await scoped(editor,'select * from public.writer_project_snapshots')).rows.length,0)
})
test('archive export contains a round-trippable graph of exact revisions and snapshot references',async()=>{
 const archive=await command<Record<string,unknown>>('archive-export'),roundTrip=JSON.parse(JSON.stringify(archive));assert.equal(validateArchive(roundTrip),true)
 const current=await section(first);assert.ok((roundTrip.revisions as Section[]).some(r=>r.body===current.body))
 const broken={...roundTrip,revisions:[]};assert.equal(validateArchive(broken),false)
})
test('ordinary clients cannot edit immutable history and named snapshots survive retention pruning',async()=>{
 const n=await section(first);await assert.rejects(db.query("update public.writer_project_revisions set body='Mutated' where id=$1",[n.revisionId]),/immutable/)
 const snap=await mutate<{snapshotId:string}>('snapshot',{nodeId:first,label:'Keep permanently'})
 await db.query("update public.writer_project_snapshots set created_at=now()-interval '100 days' where id=$1",[snap.snapshotId]);await db.query('update public.writer_projects set history_pruned_at=null where id=$1',[project]);await command('state')
 assert.ok((await command<ProjectState>('state')).snapshots.some(s=>s.id===snap.snapshotId))
})
test('HTTP routes deny impersonation, editor browsing, cross-origin writes and private exports',async()=>{
 const request=(actor:string|null,role:string,body:unknown,origin='https://studio.test')=>handleProjectRequest(new Request('https://studio.test/api/writer/projects',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),{actorId:actor,role,enabled:true,execute:(a,p,op,input)=>command(op,input,p??project,a)})
 assert.equal((await request(null,'writer',{action:'state',projectId:project,input:{}})).status,401)
 assert.equal((await request(editor,'teacher',{action:'state',projectId:project,input:{}})).status,403)
 assert.equal((await request(peer,'writer',{action:'state',projectId:project,input:{actorId:author,ownerId:author}})).status,403)
 assert.equal((await request(author,'writer',{action:'state',projectId:project,input:{}},'https://evil.test')).status,403)
 const privateExport=await handleProjectRequest(new Request('https://studio.test/api/writer/projects?projectId='+project+'&format=archive'),{actorId:peer,role:'writer',enabled:true,execute:(a,p,op,input)=>command(op,input,p??project,a)})
 assert.equal(privateExport.status,403);assert.match(privateExport.headers.get('cache-control')??'',/no-store/)
})
test('100,000 words across 200 sections load as metadata until reading or compiling',async()=>{
 const big=randomUUID();await command('create',{title:'Synthetic long manuscript'},big)
 const text=Array(500).fill('word').join(' ')
 await db.exec('begin')
 for(let i=0;i<200;i++){const node=randomUUID(),revision=randomUUID();await db.query("insert into public.writer_project_nodes(id,project_id,kind,position) values($1,$2,'section',$3)",[node,big,i]);await db.query('insert into public.writer_project_revisions(id,project_id,node_id,title,body) values($1,$2,$3,$4,$5)',[revision,big,node,'Section '+i,text]);await db.query('update public.writer_project_nodes set current_revision_id=$1 where id=$2',[revision,node])}
 await db.exec('commit')
 const state=await command<ProjectState>('state',{},big);assert.equal(state.nodes.length,200);assert.ok(state.nodes.every(n=>!('body' in n)))
 const read=await command<Section[]>('read',{},big);assert.equal(read.reduce((sum,n)=>sum+n.body.split(' ').length,0),100000)
 const snap=await mutate<{snapshotId:string}>('snapshot',{label:'Entire long manuscript'},big);const preview=await command<{nodes:Section[]}>('snapshot-preview',{snapshotId:snap.snapshotId},big);assert.equal(preview.nodes.length,200)
})

// v1.4: new paragraph-aware revisions keep old history immutable.
test('new paragraph structure, indentation and soft breaks survive save, snapshots, restore and compile',async()=>{
 const pid=randomUUID();await command('create',{title:'Paragraph roundtrip',starter:'short'},pid)
 const initial=await command<ProjectState>('state',{},pid),nid=initial.nodes[0].id
 const before=await section(nid,pid)
 const document={type:'doc',content:[{type:'paragraph',attrs:{firstLineIndent:'none'},content:[{type:'text',text:'“Wait.”'}]},{type:'paragraph',attrs:{firstLineIndent:'indent'},content:[{type:'text',text:'She turned.'},{type:'hardBreak'},{type:'text',text:'“Why?”'}]}]}
 const body='“Wait.”\n\nShe turned.\n“Why?”'
 const input={requestId:randomUUID(),nodeId:nid,revisionId:before.revisionId,title:before.title,body,document,synopsis:'',status:'Draft'}
 const saved=await command<SaveReply>('save',input,pid),replayed=await command<SaveReply>('save',input,pid)
 assert.equal(saved.revisionId,replayed.revisionId);assert.deepEqual((await section(nid,pid)).document,document)
 const snap=await mutate<{snapshotId:string}>('snapshot',{label:'Before unindenting'},pid)
 const current=await section(nid,pid),edited=structuredClone(document);edited.content[1].attrs.firstLineIndent='none'
 await command('save',{...input,requestId:randomUUID(),revisionId:current.revisionId,document:edited},pid)
 const conflict=await command<SaveReply>('save',{...input,requestId:randomUUID(),revisionId:current.revisionId},pid)
 assert.equal(conflict.conflict,true);assert.deepEqual(conflict.current?.document,edited)
 const conflictRevision=await command<Section>('revision',{revisionId:conflict.incomingRevisionId},pid);assert.deepEqual(conflictRevision.document,document)
 await mutate('restore',{snapshotId:snap.snapshotId},pid)
 assert.deepEqual((await section(nid,pid)).document,document)
 const compile=await mutate<{compileId:string}>('compile',{sectionIds:[nid],settings:{...defaultCompileSettings,title:'Dialogue format',anonymous:true}},pid)
 const compiled=await command<Compiled>('compiled',{compileId:compile.compileId},pid)
 assert.deepEqual(compiled.nodes[0].document,document)
 const xml=entries(compileDocx(compiled))['word/document.xml'];assert.match(xml,/<w:ind w:firstLine="720"/);assert.match(xml,/<w:br\/>/)
 assert.ok(xml.includes('She turned.'));assert.ok(xml.includes('Wait.'))
})

test('paragraph document validation is atomic and an older editor cannot discard formatting',async()=>{
 const pid=randomUUID();await command('create',{title:'Paragraph guards',starter:'short'},pid)
 const n=(await command<ProjectState>('state',{},pid)).nodes[0],s=await section(n.id,pid)
 const body='A paragraph.',document={type:'doc',content:[{type:'paragraph',attrs:{firstLineIndent:'indent'},content:[{type:'text',text:body}]}]}
 const payload={requestId:randomUUID(),nodeId:n.id,revisionId:s.revisionId,title:s.title,body,document,status:'Draft',synopsis:''}
 await assert.rejects(command('save',{...payload,body:'Mismatch'},pid),/does not match/)
 assert.equal((await section(n.id,pid)).body,'')
 await command('save',payload,pid)
 const saved=await section(n.id,pid)
 await assert.rejects(command('save',{...payload,document:null,revisionId:saved.revisionId,requestId:randomUUID(),body:'Old editor overwrote'},pid),/Refresh the paragraph editor/)
 await command('save',{...payload,document:null,revisionId:saved.revisionId,requestId:randomUUID(),title:'Metadata only'},pid)
 assert.deepEqual((await section(n.id,pid)).document,document)
 const archive=await command<{revisions:Array<{document:unknown}>}>('archive-export',{},pid);assert.deepEqual(archive.revisions.find(r=>r.document&&JSON.stringify(r.document).includes('A paragraph.'))?.document,document)
})

test('starter arrangements are optional, atomic and never duplicated on a creation retry',async()=>{
 const pid=randomUUID()
 await command('create',{title:'Chaptered',starter:'chaptered'},pid)
 const first=await command<ProjectState>('state',{},pid)
 assert.equal(first.nodes.length,2);const folder=first.nodes.find(n=>n.kind==='folder')!,opening=first.nodes.find(n=>n.kind==='section')!
 assert.equal(opening.parentId,folder.id);assert.equal((await section(opening.id,pid)).document?.type,'doc')
 await command('create',{title:'Chaptered',starter:'chaptered'},pid)
 assert.equal((await command<ProjectState>('state',{},pid)).nodes.length,2)
 const invalid=randomUUID();await assert.rejects(command('create',{title:'Invalid',starter:'invented'},invalid),/starting arrangement/)
 assert.equal((await db.query('select id from public.writer_projects where id=$1',[invalid])).rows.length,0)
})
