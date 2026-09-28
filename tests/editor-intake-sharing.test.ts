import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const teacher=id(1), author=id(2), selected=id(3), unselected=id(4), outsider=id(5), late=id(6), membershipTarget=id(7)
const abu=id(20), group=id(21), otherGroup=id(22)

async function as(role: string, user: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`set role ${role}`)
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ''])
    return await db.query(sql, params)
  } finally { await db.exec('reset role') }
}
async function owner(sql: string, params: unknown[] = []) {
  return as('netlifydb_owner', null, sql, params)
}
async function importPiece(request: number, target=author, workshop=group, source: string | null=null, body='Imported manuscript.') {
  return owner(
    'select public.create_editor_assigned_submission($1,$2,$3,$4,$5,$6,$7) as result',
    [teacher,target,id(request),'Imported story',body,workshop,source]
  )
}

before(async () => {
  await db.exec('create role netlifydb_owner bypassrls createrole; grant all on schema public to netlifydb_owner; grant create on database postgres to netlifydb_owner; set role netlifydb_owner;')
  for (const path of [
    'netlify/database/migrations/001_workshop-baseline/migration.sql',
    'netlify/database/migrations/002_editor-intake-sharing/migration.sql',
    'netlify/database/migrations/003_require-current-author-membership/migration.sql',
    'netlify/database/migrations/004_keep-anonymous-submission-denial-clean/migration.sql',
    'netlify/database/migrations/005_harden-sharing-triggers/migration.sql',
  ]) {
    const sql=await readFile(path,'utf8')
    assert.doesNotMatch(sql,/^\s*(?:begin|commit|rollback);\s*$/im)
    await db.exec('begin'); await db.exec(sql); await db.exec('commit')
  }
  await db.exec('reset role')
  for (const [user,role] of [[teacher,'teacher'],[author,'writer'],[selected,'writer'],[unselected,'writer'],[outsider,'writer'],[late,'writer'],[membershipTarget,'writer']] as const) {
    await db.query('insert into studio_auth.users(id,email) values($1,$2)',[user,`${user}@example.invalid`])
    await db.query('insert into public.profiles(id,role,display_name) values($1,$2,$3)',[user,role,`User ${user.slice(-2)}`])
  }
  await db.query("insert into public.workshops(id,title,slug) values($1,'Authorised Basic User','authorised-basic-user'),($2,'Flax Bourton Writers','flax-bourton-writers'),($3,'Other group','other-group')",[abu,group,otherGroup])
  await db.query('insert into public.workshop_members(workshop_id,profile_id) values($1,$2),($1,$3),($1,$4),($5,$6)',[group,author,selected,unselected,otherGroup,outsider])
})

after(async()=>db.close())

test('anonymous submission reads remain a clean empty result under sharing RLS', async () => {
  assert.equal((await as('studio_anon',null,'select id from public.submissions')).rows.length,0)
})

test('editor intake creates a normal manuscript owned by the nominated writer', async () => {
  const r=await importPiece(101)
  const created=(r.rows[0] as {result:{id:string;version:number;created:boolean}}).result
  assert.equal(created.version,1); assert.equal(created.created,true)
  const row=(await db.query('select author_id,workshop_id,status,source,body from public.submissions where id=$1',[created.id])).rows[0] as Record<string,unknown>
  assert.equal(row.author_id,author); assert.equal(row.workshop_id,group); assert.equal(row.status,'submitted'); assert.equal(row.source,'editor_import')
  assert.equal((await as('studio_authenticated',author,'select id from public.submissions where id=$1',[created.id])).rows.length,1)
  assert.equal((await as('studio_authenticated',selected,'select id from public.submissions where id=$1',[created.id])).rows.length,0)
})

test('only explicit current group recipients can read a shared manuscript', async () => {
  const r=await importPiece(102)
  const piece=(r.rows[0] as {result:{id:string}}).result.id
  await owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,piece,[selected]])
  assert.equal((await as('studio_authenticated',selected,'select id from public.submissions where id=$1',[piece])).rows.length,1)
  assert.equal((await as('studio_authenticated',unselected,'select id from public.submissions where id=$1',[piece])).rows.length,0)
  assert.equal((await as('studio_authenticated',outsider,'select id from public.submissions where id=$1',[piece])).rows.length,0)
  const grants=await as('studio_authenticated',selected,'select recipient_id from public.submission_share_recipients where submission_id=$1',[piece])
  assert.equal(grants.rows.length,1)
  assert.equal((await as('studio_authenticated',unselected,'select recipient_id from public.submission_share_recipients where submission_id=$1',[piece])).rows.length,0)
})

test('sharing validates group membership, excludes self and excludes ABU', async () => {
  const r=await importPiece(103), piece=(r.rows[0] as {result:{id:string}}).result.id
  await assert.rejects(owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,piece,[]]),/Choose at least one/)
  await assert.rejects(owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,piece,[author]]),/themselves/)
  await assert.rejects(owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,piece,[outsider]]),/current writer/)
  await db.query('insert into public.workshop_members(workshop_id,profile_id) values($1,$2),($1,$3)',[abu,author,selected])
  const abuPiece=(await importPiece(104,author,abu).then(r=>(r.rows[0] as {result:{id:string}}).result.id))
  await assert.rejects(owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,abuPiece,[selected]]),/not a sharing group/)
})

test('everyone is an explicit snapshot; later members are not silently added', async () => {
  const r=await importPiece(105), piece=(r.rows[0] as {result:{id:string}}).result.id
  await owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,piece,[selected,unselected]])
  await db.query('insert into public.workshop_members(workshop_id,profile_id) values($1,$2)',[group,late])
  assert.equal((await as('studio_authenticated',late,'select id from public.submissions where id=$1',[piece])).rows.length,0)
  const recipients=(await db.query('select recipient_id from public.submission_share_recipients where submission_id=$1 order by recipient_id',[piece])).rows
  assert.equal(recipients.length,2)
})

test('reader responses stay separate from editorial feedback and private between parties', async () => {
  const r=await importPiece(106), piece=(r.rows[0] as {result:{id:string}}).result.id
  await owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,piece,[selected,unselected]])
  await owner('insert into public.feedback_items(submission_id,author_id,anchor,comment) values($1,$2,$3,$4)',[piece,teacher,{blockId:'p-1',startOffset:0,endOffset:8,quote:'Imported'},'Editorial note'])
  assert.equal((await as('studio_authenticated',selected,'select * from public.feedback_items where submission_id=$1',[piece])).rows.length,0)
  const response=await owner('select public.save_reader_response($1,$2,$3) as result',[selected,piece,'This stayed with me.'])
  assert.equal((response.rows[0] as {result:{created:boolean}}).result.created,true)
  assert.equal((await as('studio_authenticated',selected,'select body from public.reader_responses where submission_id=$1',[piece])).rows.length,1)
  assert.equal((await as('studio_authenticated',unselected,'select body from public.reader_responses where submission_id=$1',[piece])).rows.length,0)
  assert.equal((await as('studio_authenticated',author,'select body from public.reader_responses where submission_id=$1',[piece])).rows.length,1)
  assert.equal((await as('studio_authenticated',teacher,'select body from public.reader_responses where submission_id=$1',[piece])).rows.length,1)
})

test('stopping sharing revokes manuscript access but preserves received response for its author', async () => {
  const r=await importPiece(107), piece=(r.rows[0] as {result:{id:string}}).result.id
  await owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,piece,[selected]])
  await owner('select public.save_reader_response($1,$2,$3)',[selected,piece,'Reader response'])
  await owner('select public.stop_submission_sharing($1,$2)',[author,piece])
  assert.equal((await as('studio_authenticated',selected,'select id from public.submissions where id=$1',[piece])).rows.length,0)
  assert.equal((await as('studio_authenticated',selected,'select id from public.reader_responses where submission_id=$1',[piece])).rows.length,0)
  assert.equal((await as('studio_authenticated',author,'select body from public.reader_responses where submission_id=$1',[piece])).rows.length,1)
})

test('leaving and rejoining a group does not resurrect an old grant', async () => {
  const r=await importPiece(108), piece=(r.rows[0] as {result:{id:string}}).result.id
  await owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,piece,[selected]])
  await db.query('delete from public.workshop_members where workshop_id=$1 and profile_id=$2',[group,selected])
  assert.equal((await db.query('select * from public.submission_share_recipients where submission_id=$1 and recipient_id=$2',[piece,selected])).rows.length,0)
  await db.query('insert into public.workshop_members(workshop_id,profile_id) values($1,$2)',[group,selected])
  assert.equal((await as('studio_authenticated',selected,'select id from public.submissions where id=$1',[piece])).rows.length,0)
})

test('editor-import corrections work only before review or sharing starts', async () => {
  const r=await importPiece(109), piece=(r.rows[0] as {result:{id:string}}).result.id
  await owner('select public.correct_editor_assigned_submission($1,$2,$3,$4,$5,$6)',[teacher,piece,author,group,'Corrected title','Corrected manuscript'])
  assert.equal(((await db.query<{title:string}>('select title from public.submissions where id=$1',[piece])).rows[0]?.title),'Corrected title')
  await owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,piece,[selected]])
  await owner('select public.stop_submission_sharing($1,$2)',[author,piece])
  await assert.rejects(owner('select public.correct_editor_assigned_submission($1,$2,$3,$4,$5,$6)',[teacher,piece,author,group,'Too late','Changed']),/already in use/)
})

test('editor intake supports a guarded revision while keeping writer ownership', async () => {
  const first=await importPiece(110), piece=(first.rows[0] as {result:{id:string}}).result.id
  await owner('insert into public.feedback_items(submission_id,author_id,anchor,comment) values($1,$2,$3,$4)',[piece,teacher,{blockId:'p-1',startOffset:0,endOffset:8,quote:'Imported'},'Note'])
  await owner('select public.publish_workshop_feedback($1,$2,$3)',[teacher,piece,'Summary'])
  const second=await importPiece(111,author,group,piece,'A revised imported manuscript.')
  const revision=(second.rows[0] as {result:{id:string;version:number}}).result
  assert.equal(revision.version,2)
  const row=(await db.query('select author_id,parent_submission_id,source from public.submissions where id=$1',[revision.id])).rows[0] as Record<string,unknown>
  assert.equal(row.author_id,author); assert.equal(row.parent_submission_id,piece); assert.equal(row.source,'editor_import')
})

test('unselected writers cannot respond; selected writers update one response and editors can moderate it', async () => {
  const r=await importPiece(113), piece=(r.rows[0] as {result:{id:string}}).result.id
  await owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,piece,[selected]])
  await assert.rejects(owner('select public.save_reader_response($1,$2,$3)',[unselected,piece,'Not invited']),/not currently shared/)
  const first=await owner('select public.save_reader_response($1,$2,$3) as result',[selected,piece,'First response'])
  assert.equal((first.rows[0] as {result:{created:boolean}}).result.created,true)
  const second=await owner('select public.save_reader_response($1,$2,$3) as result',[selected,piece,'Revised response'])
  assert.equal((second.rows[0] as {result:{created:boolean}}).result.created,false)
  const rows=(await db.query('select id,body from public.reader_responses where submission_id=$1',[piece])).rows as Array<{id:string;body:string}>
  assert.equal(rows.length,1); assert.equal(rows[0].body,'Revised response')
  await owner('select public.moderate_reader_response($1,$2)',[teacher,rows[0].id])
  assert.equal((await db.query('select id from public.reader_responses where submission_id=$1',[piece])).rows.length,0)
})

test('the first editorial comment also locks an editor-imported manuscript', async () => {
  const r=await importPiece(114), piece=(r.rows[0] as {result:{id:string}}).result.id
  await owner('insert into public.feedback_items(submission_id,author_id,anchor,comment) values($1,$2,$3,$4)',[piece,teacher,{blockId:'p-1',startOffset:0,endOffset:8,quote:'Imported'},'Started'])
  await assert.rejects(owner('select public.correct_editor_assigned_submission($1,$2,$3,$4,$5,$6)',[teacher,piece,author,group,'Too late','Changed']),/already in use/)
})

test('moving a shared manuscript to ABU clears grants, and removing its author from the group clears all sharing', async () => {
  const moved=await importPiece(115), movedId=(moved.rows[0] as {result:{id:string}}).result.id
  await owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,movedId,[selected]])
  await db.query('update public.submissions set workshop_id=$1 where id=$2',[abu,movedId])
  assert.equal((await db.query('select * from public.submission_share_recipients where submission_id=$1',[movedId])).rows.length,0)

  const authored=await importPiece(116), authoredId=(authored.rows[0] as {result:{id:string}}).result.id
  await owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,authoredId,[selected,unselected]])
  await db.query('delete from public.workshop_members where workshop_id=$1 and profile_id=$2',[group,author])
  assert.equal((await db.query('select * from public.submission_share_recipients where submission_id=$1',[authoredId])).rows.length,0)
  await assert.rejects(
    owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,authoredId,[selected]]),
    /no longer attached to a current member/
  )
  await db.query('insert into public.workshop_members(workshop_id,profile_id) values($1,$2)',[group,author])
})

test('an authenticated editor can remove membership and sharing is revoked without a privilege failure', async () => {
  await db.query('insert into public.workshop_members(workshop_id,profile_id) values($1,$2)',[group,membershipTarget])
  const r=await importPiece(120), piece=(r.rows[0] as {result:{id:string}}).result.id
  await owner('select public.set_submission_sharing($1,$2,$3::uuid[])',[author,piece,[membershipTarget]])
  const removed=await as(
    'studio_authenticated',
    teacher,
    'delete from public.workshop_members where workshop_id=$1 and profile_id=$2 returning profile_id',
    [group,membershipTarget]
  )
  assert.equal(removed.rows.length,1)
  assert.equal((await db.query('select * from public.submission_share_recipients where submission_id=$1',[piece])).rows.length,0)
})

test('a pristine root import can correct writer and group assignment, but a revision cannot', async () => {
  await db.query('insert into public.workshop_members(workshop_id,profile_id) values($1,$2)',[otherGroup,unselected])
  const root=await importPiece(117), rootId=(root.rows[0] as {result:{id:string}}).result.id
  await owner('select public.correct_editor_assigned_submission($1,$2,$3,$4,$5,$6)',[
    teacher,rootId,unselected,otherGroup,'Reassigned story','Reassigned manuscript'
  ])
  const corrected=(await db.query('select author_id,workshop_id,title from public.submissions where id=$1',[rootId])).rows[0] as {author_id:string;workshop_id:string;title:string}
  assert.equal(corrected.author_id,unselected); assert.equal(corrected.workshop_id,otherGroup); assert.equal(corrected.title,'Reassigned story')

  const first=await importPiece(118), piece=(first.rows[0] as {result:{id:string}}).result.id
  await owner('insert into public.feedback_items(submission_id,author_id,anchor,comment) values($1,$2,$3,$4)',[piece,teacher,{blockId:'p-1',startOffset:0,endOffset:8,quote:'Imported'},'Note'])
  await owner('select public.publish_workshop_feedback($1,$2,$3)',[teacher,piece,'Summary'])
  const rev=await importPiece(119,author,group,piece,'Revision text'), revisionId=(rev.rows[0] as {result:{id:string}}).result.id
  await assert.rejects(
    owner('select public.correct_editor_assigned_submission($1,$2,$3,$4,$5,$6)',[
      teacher,revisionId,unselected,otherGroup,'Wrong chain','Changed'
    ]),
    /same writer and group/
  )
})

test('new privileged operations cannot be called directly by writer sessions', async () => {
  const r=await importPiece(112), piece=(r.rows[0] as {result:{id:string}}).result.id
  await assert.rejects(as('studio_authenticated',author,'select public.set_submission_sharing($1,$2,$3::uuid[])',[author,piece,[selected]]),/permission denied/)
  await assert.rejects(as('studio_authenticated',selected,'select public.save_reader_response($1,$2,$3)',[selected,piece,'Forged']),/permission denied/)
  await assert.rejects(as('studio_authenticated',author,'select public.create_editor_assigned_submission($1,$2,$3,$4,$5,$6,$7)',[teacher,author,id(999),'Fake','Fake',group,null]),/permission denied/)
})
