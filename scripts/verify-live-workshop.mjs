// Explicitly authorised release check. Creates isolated temporary accounts/data,
// checks the live HTTP/API behaviour, then removes only those fixtures.
// No recovery/notification emails are sent. Never print credentials or cookies.
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

if (process.argv[2] !== '--execute') throw new Error('Pass --execute only for an authorised release verification')
process.loadEnvFile('.env.local')
const base = process.argv[3] ?? 'https://shortstory.ink'
if (!/^https:\/\/([a-z0-9-]+--storyink\.netlify\.app|shortstory\.ink)$/.test(base)) throw new Error('Unexpected deployment target')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
assert.ok(process.env.SUPABASE_PROJECT_ID, 'Set SUPABASE_PROJECT_ID to the confirmed project ref')
assert.equal(new URL(url).hostname, `${process.env.SUPABASE_PROJECT_ID}.supabase.co`)
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const run = randomUUID()
const fixtures = [], submissions = [], checks = []
const journal = `.local-backups/2026-09-09-pre-deploy/live-check-${run}.json`
const saveJournal = () => writeFile(journal, JSON.stringify({ run, base, fixtureIds: fixtures.map(f=>f.id), submissionIds: submissions, checks },null,2), { mode: 0o600 })
const good = (result) => { if (result.error) throw new Error(result.error.message); return result.data }
const pass = async (name) => { checks.push(name); console.log('PASS:',name); await saveJournal() }
async function account(label,role) {
	const email = `release-${run}-${label}@example.invalid`
	const password = randomBytes(24).toString('base64url')
	const { user } = good(await admin.auth.admin.createUser({ email, password, email_confirm:true, app_metadata:{ deployment_check:run } }))
	const jar = new Map()
	const client = createServerClient(url,key,{ cookies:{ getAll:()=>[...jar].map(([name,value])=>({ name,value })),setAll:(cookies)=>cookies.forEach(c=>jar.set(c.name,c.value)) } })
	const fixture = { id:user.id, email, password, client, cookie:()=>[...jar].map(([n,v])=>`${n}=${v}`).join('; ') }
	fixtures.push(fixture); await saveJournal()
	good(await admin.from('profiles').upsert({ id:user.id, role, display_name:'Temporary deployment check' }))
	good(await client.auth.signInWithPassword({ email,password }))
	return fixture
}
async function request(path, actor, data) {
	return fetch(base+path,{ method:data?'POST':'GET',redirect:'manual', headers:{ ...(actor?{ Cookie:actor.cookie() }:{}),...(data?{ 'Content-Type':'application/json',Origin:base }:{}) },...(data?{ body:JSON.stringify(data) }:{}),signal:AbortSignal.timeout(60000) })
}
try {
	const signIn = await request('/auth/sign-in')
	assert.equal(signIn.status,200); assert.match(await signIn.text(),/Sign in to shortstory/)
	const callback = await request('/auth/callback?next=https%3A%2F%2Fexample.com')
	assert.ok([302,303,307,308].includes(callback.status)); assert.ok(callback.headers.get('location')?.includes('/auth/sign-in?error=callback'))
	await pass('Public sign-in works and invalid callback redirects safely')
	const teacher=await account('teacher','teacher'), writer=await account('writer','writer'), peer=await account('peer','writer')
	const groups=good(await admin.from('workshops').select('id,slug').eq('slug','authorised-basic-user').single())
	good(await admin.from('workshop_members').upsert([{workshop_id:groups.id,profile_id:writer.id},{workshop_id:groups.id,profile_id:peer.id}]))
	const accountPage=await request('/app/account',writer)
	assert.equal(accountPage.status,200); assert.match(await accountPage.text(),/Your account/)
	const resetPage=await request('/auth/reset-password',writer)
	assert.equal(resetPage.status,200); assert.match(await resetPage.text(),/Choose a new password/)
	good(await writer.client.from('profiles').update({display_name:'Updated deployment check'}).eq('id',writer.id).select('id').single())
	assert.ok((await writer.client.from('profiles').update({role:'admin'}).eq('id',writer.id)).error)
	const newPassword=randomBytes(24).toString('base64url')
	good(await writer.client.auth.updateUser({password:newPassword}))
	good(await writer.client.auth.signInWithPassword({email:writer.email,password:newPassword}))
	await pass('Authenticated account/reset pages, display-name save, role protection and password change work')
	const args={ p_author_id:writer.id,p_request_id:randomUUID(),p_title:'Temporary release verification',p_body:'A rehearsal sentence.\n\n  Spacing stays intact.',p_workshop_id:groups.id,p_source_id:null }
	const piece=good(await admin.rpc('submit_workshop_draft',args)); submissions.push(piece.id); await saveJournal()
	const retry=good(await admin.rpc('submit_workshop_draft',args)); assert.equal(retry.id,piece.id); assert.equal(retry.created,false)
	assert.equal(good(await peer.client.from('submissions').select('id').eq('id',piece.id)).length,0)
	assert.ok((await writer.client.rpc('submit_workshop_draft',args)).error)
	const draftPage=await request('/app/writer',writer); assert.equal(draftPage.status,200)
	await pass('Submission is saved once, visible to its owner and isolated from a peer')
	const comment={type:'comment',blockId:'p-1',startOffset:0,endOffset:1,quote:'A',comment:'Temporary release verification comment'}
	const annotation=await request(`/api/workshop/${piece.id}/annotations`,teacher,comment)
	assert.equal(annotation.status,200,`Annotation HTTP ${annotation.status}`)
	assert.equal(good(await writer.client.from('feedback_items').select('id').eq('submission_id',piece.id)).length,0)
	const blockedPublish=await request(`/api/workshop/${piece.id}/publish`,writer,{summary:'Unauthorised'})
	assert.ok([302,303,307,308,401,403].includes(blockedPublish.status))
	const summary='Temporary release verification summary'
	good(await admin.rpc('publish_workshop_feedback',{p_teacher_id:teacher.id,p_submission_id:piece.id,p_summary:summary}))
	// Already-published identical retry: exercises the HTTP handler without email.
	const published=await request(`/api/workshop/${piece.id}/publish`,teacher,{summary})
	assert.equal(published.status,200); assert.equal((await published.json()).status,'feedback_published')
	const feedback=await request(`/app/writer/feedback/${piece.id}`,writer)
	assert.equal(feedback.status,200); assert.match(await feedback.text(),/Temporary release verification comment/)
	assert.equal(good(await peer.client.from('feedback_items').select('id').eq('submission_id',piece.id)).length,0)
	const late=await request(`/api/workshop/${piece.id}/annotations`,teacher,comment); assert.equal(late.status,409)
	const exported=await request(`/app/workshop/${piece.id}/export`,teacher); assert.equal(exported.status,200)
	await pass('Teacher annotations, draft privacy, publication retry, feedback reading, published lock and export work')
	const revisionArgs={...args,p_request_id:randomUUID(),p_source_id:piece.id,p_body:'A revised rehearsal sentence.'}
	const revision=good(await admin.rpc('submit_workshop_draft',revisionArgs)); submissions.push(revision.id); await saveJournal()
	assert.equal(revision.version,2); assert.equal(good(await admin.rpc('submit_workshop_draft',revisionArgs)).id,revision.id)
	await pass('Revision numbering and retry deduplication work on the live database')
} catch(error) {
	console.error('Live check failed:',error.message)
	process.exitCode=1
} finally {
	// Fixtures are only accounts created by this run. Delete child data before users.
	let clean=true
	for(const id of [...submissions].reverse()) {
		const result=await admin.from('submissions').delete().eq('id',id)
		if(result.error) {clean=false;console.error('Fixture submission cleanup failed:',result.error.message)}
	}
	for(const fixture of fixtures) {
		await fixture.client.auth.signOut().catch(()=>{})
		const result=await admin.auth.admin.deleteUser(fixture.id)
		if(result.error) {clean=false;console.error('Fixture account cleanup failed:',result.error.message)}
	}
	if(clean) await pass('Temporary accounts, sessions, submissions and comments removed')
	else process.exitCode=1
	await saveJournal()
}
