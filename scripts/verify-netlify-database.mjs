// Real PostgreSQL checks against the isolated migration branch; removes its fixtures.
// node scripts/verify-netlify-database.mjs --execute <connection.json> <snapshot.json>
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { getDatabase } from '@netlify/database'
assert.equal(process.argv[2],'--execute')
const credentials=JSON.parse(await readFile(process.argv[3],'utf8'))
const snapshot=JSON.parse(await readFile(process.argv[4],'utf8')).rows[0].snapshot
const url=new URL(credentials.connection_strings.netlifydb_owner);url.searchParams.set('sslmode','verify-full')
const db=getDatabase({connectionString:url.href})
const teacher=randomUUID(),writer=randomUUID(),peer=randomUUID(),ids=[teacher,writer,peer],checks=[]
const pass=name=>{checks.push(name);console.log('PASS:',name)}
async function as(id,sql,values=[]) {
	const c=await db.pool.connect()
	try{await c.query('begin');await c.query("select set_config('request.jwt.claim.sub',$1,true)",[id??'']);await c.query(id?'set local role studio_authenticated':'set local role studio_anon');const r=await c.query(sql,values);await c.query('commit');return r.rows}
	catch(e){await c.query('rollback');throw e}finally{c.release()}
}
let fixtures=false
try {
	for(const p of snapshot.tables.profiles.filter(p=>p.role==='writer')) {
		assert.equal((await as(p.id,'select id from public.submissions where author_id<>studio_auth.uid()')).length,0)
		await assert.rejects(as(p.id,"update public.profiles set role='admin' where id=$1",[p.id]),/permission denied/)
	}
	assert.equal((await as(null,'select id from public.submissions')).length,0)
	pass('Every migrated writer is isolated; anonymous reads and role escalation are denied')
	const setup=await db.pool.connect()
	try{await setup.query('begin');for(const [id,role] of [[teacher,'teacher'],[writer,'writer'],[peer,'writer']]){
		await setup.query('insert into studio_auth.users(id,email) values($1,$2)',[id,`check-${id}@example.invalid`])
		await setup.query('insert into public.profiles(id,role,display_name) values($1,$2,$3)',[id,role,'Temporary database verification'])
	}await setup.query('commit');fixtures=true}catch(e){await setup.query('rollback');throw e}finally{setup.release()}
	const group=(await db.pool.query("select id from public.workshops where slug='authorised-basic-user'")).rows[0].id
	await db.pool.query('insert into public.workshop_members(workshop_id,profile_id) values($1,$2),($1,$3)',[group,writer,peer])
	const request=randomUUID(),body='First line.\n\n  Whitespace remains exactly as written.'
	const saveArgs=[writer,request,'Database verification',body,group,null]
	const sql='select public.submit_workshop_draft($1,$2,$3,$4,$5,$6) as result'
	const [a,b]=await Promise.all([db.pool.query(sql,saveArgs),db.pool.query(sql,saveArgs)])
	const piece=a.rows[0].result.id;assert.equal(b.rows[0].result.id,piece)
	assert.equal([a,b].filter(r=>r.rows[0].result.created).length,1)
	assert.equal((await as(writer,'select body from public.submissions where id=$1',[piece]))[0].body,body)
	assert.equal((await as(peer,'select id from public.submissions where id=$1',[piece])).length,0)
	await assert.rejects(as(writer,sql,saveArgs),/permission denied/)
	pass('Simultaneous submission retries save one exact manuscript; peers and direct RPC callers are denied')
	const commentClient=await db.pool.connect()
	let pendingPublication
	try {
		await commentClient.query('begin')
		await commentClient.query('insert into public.feedback_items(submission_id,author_id,anchor,comment) values($1,$2,$3,$4)',[piece,teacher,{blockId:'p1',startOffset:0,endOffset:5,quote:'First'},'Temporary comment'])
		let finished=false
		pendingPublication=db.pool.query('select public.publish_workshop_feedback($1,$2,$3) as result',[teacher,piece,'Temporary summary']).finally(()=>{finished=true})
		await new Promise(resolve=>setTimeout(resolve,150))
		assert.equal(finished,false,'Publication must wait for the in-flight comment transaction')
		await commentClient.query('commit')
		assert.equal((await pendingPublication).rows[0].result.changed,true)
	} catch(e){await commentClient.query('rollback');if(pendingPublication)await pendingPublication.catch(()=>{});throw e}
	finally{commentClient.release()}
	assert.equal((await as(writer,'select comment from public.feedback_items where submission_id=$1',[piece])).length,1)
	assert.equal((await as(peer,'select comment from public.feedback_items where submission_id=$1',[piece])).length,0)
	await assert.rejects(as(teacher,'insert into public.feedback_items(submission_id,author_id,anchor,comment) values($1,$2,$3,$4)',[piece,teacher,{},'Too late']),/Published feedback is locked/)
	pass('Publication waits for an in-flight comment, then locks feedback and preserves private access')
	const revisions=await Promise.allSettled([1,2].map(()=>db.pool.query(sql,[writer,randomUUID(),'Revision',body,null,piece])))
	assert.equal(revisions.filter(r=>r.status==='fulfilled').length,1)
	assert.equal(revisions.filter(r=>r.status==='rejected').length,1)
	const versions=(await db.pool.query('select version from public.submissions where author_id=$1 order by version',[writer])).rows.map(r=>r.version)
	assert.deepEqual(versions,[1,2])
	pass('Concurrent revisions cannot create competing successors or duplicate version numbers')
} finally {
	if(fixtures) {
		await db.pool.query('delete from public.submissions where author_id=$1 and parent_submission_id is not null',[writer])
		await db.pool.query('delete from public.submissions where author_id=$1',[writer])
		await db.pool.query('delete from studio_auth.users where id=any($1::uuid[])',[ids])
	}
	for(const [name,expected] of Object.entries(snapshot.fingerprints)) {
		assert.match(name,/^[a-z_]+$/)
		const actual=(await db.pool.query(`select count(*)::integer as count,md5(coalesce(string_agg(to_jsonb(r)::text,E'\n' order by to_jsonb(r)::text),'')) as md5 from public."${name}" r`)).rows[0]
		assert.deepEqual(actual,expected,`Original data changed in ${name}`)
	}
	pass('Temporary fixtures removed; every original application table still matches its backup')
	await writeFile('.local-backups/2026-09-09-netlify-migration/database-checks.private.json',JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2)+'\n',{mode:0o600})
	await db.pool.end()
}
