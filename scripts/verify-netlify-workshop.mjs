// Full preview HTTP rehearsal with synthetic accounts. Never sends email.
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { getDatabase } from '@netlify/database'
import { getGlobalConfigStore } from '/Users/moc/.npm/_npx/b3ca12a867cd0704/node_modules/netlify-cli/node_modules/@netlify/dev-utils/dist/main.js'
assert.equal(process.argv[2], '--execute')
const directory = '.local-backups/2026-09-09-netlify-migration'
const base = 'https://migration-rehearsal--storyink.netlify.app'
const control = 'https://api.netlify.com/api/v1/sites/d8bc3715-124c-43a2-846d-009b995bb694/identity/6aa129dd145522096fa7e192/users'
const config = await getGlobalConfigStore()
const platformToken = config.get(`users.${config.get('userId')}.auth.token`)
const { value: migrationToken } = JSON.parse(await readFile(`${directory}/migration-token.private.json`, 'utf8'))
const credentials = JSON.parse(await readFile(`${directory}/preview-database.private.json`, 'utf8'))
const url = new URL(credentials.connection_strings.netlifydb_owner); url.searchParams.set('sslmode', 'verify-full')
const db = getDatabase({ connectionString: url.href })
const fixtures = [], pieces = [], checks = [], run = randomUUID()
const journal = `${directory}/http-rehearsal-${run}.private.json`
const record = () => writeFile(journal, JSON.stringify({ run, fixtures, pieces, checks }, null, 2), { mode: 0o600 })
const pass = async name => { checks.push(name); console.log('PASS:', name); await record() }
const require = createRequire(import.meta.url)
const { encodeReply } = require('next/dist/compiled/react-server-dom-webpack/client.node')
async function page(path, actor, options = {}) {
	return fetch(base + path, { redirect: 'manual', ...options, headers: {
		...(actor ? { Cookie: `nf_jwt=${actor.session.access_token}; nf_refresh=${actor.session.refresh_token}` } : {}),
		...options.headers,
	}, signal: AbortSignal.timeout(60000) })
}
async function account(label, role) {
	const f = { email: `rehearsal-${run}-${label}@example.invalid`, password: randomBytes(36).toString('base64url') }
	const created = await fetch(control, { method: 'POST', headers: { Authorization: `Bearer ${platformToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.email, password: f.password }) })
	assert.equal(created.status, 201)
	f.identityId = (await created.json()).id; fixtures.push(f); await record()
	const confirmed = await page('/api/migration-check', null, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-migration-token': migrationToken }, body: JSON.stringify({ operation: 'confirm-test', id: f.identityId }) })
	assert.equal(confirmed.status, 200); assert.equal((await confirmed.json()).confirmed, true)
	const login = await page('/.netlify/identity/token', null, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'password', username: f.email, password: f.password }) })
	assert.equal(login.status, 200); f.session = await login.json(); await record()
	const provision = await page('/app/writer', f); const html = await provision.text()
	assert.equal(provision.status, 200); assert.ok(!html.includes('NEXT_REDIRECT;replace;/auth/sign-in'))
	const row = (await db.pool.query('select id from studio_auth.users where identity_id=$1', [f.identityId])).rows[0]
	assert.ok(row, 'Verified identity was not mapped'); f.id = row.id; await record()
	await db.pool.query('update public.profiles set role=$1,display_name=$2 where id=$3', [role, 'Temporary HTTP rehearsal', f.id])
	return f
}
async function api(path, actor, body) {
	return page(path, actor, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify(body) })
}
async function action(path, actor, actionId, args) {
	const response = await page(path, actor, { method: 'POST', headers: { 'Next-Action': actionId, Origin: base, Accept: 'text/x-component' }, body: await encodeReply(args) })
	const body = await response.text()
	await writeFile(`${directory}/action-${randomUUID()}.private.txt`, body, { mode: 0o600 })
	assert.equal(response.status, 200, 'Server action failed')
	assert.ok(!body.includes('NEXT_REDIRECT;replace;/auth/sign-in'), 'Action lost its session')
	return body
}
function flightRows(html) {
	const data = [...html.matchAll(/self\.__next_f\.push\((\[1,"(?:[^"\\]|\\.)*"\])\)/g)].map(m => JSON.parse(m[1])[1]).join('')
	return new Map(data.split('\n').map(line => { const colon = line.indexOf(':'); return [line.slice(0, colon), line.slice(colon + 1)] }))
}
try {
	const writer = await account('writer', 'writer'), teacher = await account('teacher', 'teacher'), peer = await account('peer', 'writer')
	const denied = await page('/app/teacher/review-desk', writer)
	assert.ok((await denied.text()).includes('Teacher+access+only'))
	assert.equal((await page('/account', writer)).status, 200)
	assert.equal((await page('/auth/reset-password')).status, 200)
	await pass('Verified sign-in provisions writers; student accounts cannot enter teacher pages')
	const expired = { ...writer, session: { ...writer.session, access_token: 'expired.invalid.session' } }
	const renewed = await page('/app/writer', expired)
	assert.ok(!(await renewed.text()).includes('NEXT_REDIRECT;replace;/auth/sign-in'))
	assert.ok(renewed.headers.getSetCookie().some(c => c.startsWith('nf_jwt=')), 'SSR did not renew an expired session')
	const relogin = await page('/.netlify/identity/token', null, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'password', username: writer.email, password: writer.password }) })
	writer.session = await relogin.json()
	await pass('Expired sessions renew before server rendering without asking for a password')
	const group = (await db.pool.query("select id from public.workshops where slug='authorised-basic-user'")).rows[0].id
	const manifest = JSON.parse(await readFile('.next/server/server-reference-manifest.json', 'utf8')).node
	const createId = Object.entries(manifest).find(([, v]) => v.workers['app/app/writer/page'] && v.exportedName === '$$RSC_SERVER_ACTION_0')?.[0]
	assert.ok(createId)
	const form = new FormData(), requestId = randomUUID(), body = 'A rehearsal sentence.\n\n  Spacing stays intact.'
	for (const [k, v] of Object.entries({ requestId, title: 'Temporary HTTP rehearsal', body, workshopId: group })) form.set(k, v)
	await action('/app/writer', writer, createId, [form])
	let piece = (await db.pool.query('select * from public.submissions where author_id=$1 and client_request_id=$2', [writer.id, requestId])).rows[0]
	// Multipart FormData uses CRLF on the wire, as it did before migration.
	assert.ok(piece, 'Submission action did not save'); pieces.push(piece.id); await record(); assert.equal(piece.body, body.replaceAll('\n', '\r\n'))
	await action('/app/writer', writer, createId, [form])
	assert.equal((await db.pool.query('select count(*)::int as n from public.submissions where author_id=$1', [writer.id])).rows[0].n, 1)
	await pass('The real submission action preserves manuscript text and deduplicates retries')
	const comment = { type: 'comment', blockId: 'p-1', startOffset: 0, endOffset: 1, quote: 'A', comment: 'Temporary HTTP rehearsal comment' }
	assert.equal((await api(`/api/workshop/${piece.id}/annotations`, teacher, comment)).status, 200)
	const draftFeedback = await page(`/app/writer/feedback/${piece.id}`, writer)
	assert.ok(!(await draftFeedback.text()).includes(comment.comment))
	const forged = await api(`/api/workshop/${piece.id}/publish`, writer, { summary: 'Forbidden' })
	assert.ok([302,303,307,308,401,403].includes(forged.status) || (await forged.text()).includes('Teacher+access+only'))
	const publication = await api(`/api/workshop/${piece.id}/publish`, teacher, { summary: 'Temporary HTTP rehearsal summary' })
	assert.equal(publication.status, 200); assert.equal((await publication.json()).status, 'feedback_published')
	const feedback = await page(`/app/writer/feedback/${piece.id}`, writer)
	assert.match(await feedback.text(), /Temporary HTTP rehearsal comment/)
	const peerRead = await page(`/app/writer/feedback/${piece.id}`, peer)
	assert.ok(!(await peerRead.text()).includes(comment.comment))
	assert.equal((await api(`/api/workshop/${piece.id}/annotations`, teacher, comment)).status, 409)
	const exported = await page(`/app/workshop/${piece.id}/export`, teacher)
	assert.equal(exported.status, 200); assert.match(await exported.text(), /Temporary HTTP rehearsal/)
	await pass('Teacher annotations, draft privacy, publication, peer isolation, published lock and feedback export work over HTTP')
	const revisionPath = `/app/writer/revise/${piece.id}`
	const revisionPage = await page(revisionPath, writer), rows = flightRows(await revisionPage.text())
	const revisionId = Object.entries(manifest).find(([, v]) => v.workers['app/app/writer/revise/[submissionId]/page'])?.[0]
	const reference = [...rows.values()].map(s => { try { return JSON.parse(s) } catch { return null } }).find(r => r?.id === revisionId)
	assert.ok(reference?.bound?.startsWith('$@'), 'Bound revision action not found')
	function resolveBound(value) {
		if (Array.isArray(value)) return value.map(resolveBound)
		if (typeof value === 'string' && /^\$@[a-z0-9]+$/.test(value)) return resolveBound(JSON.parse(rows.get(value.slice(2))))
		return value
	}
	const bound = resolveBound(JSON.parse(rows.get(reference.bound.slice(2))))
	const revisionForm = new FormData(), revisionRequest = randomUUID()
	for (const [k, v] of Object.entries({ requestId: revisionRequest, title: 'Revised rehearsal', body: 'A revised rehearsal sentence.' })) revisionForm.set(k, v)
	await action(revisionPath, writer, revisionId, [...bound, revisionForm])
	const revision = (await db.pool.query('select id,version from public.submissions where author_id=$1 and client_request_id=$2', [writer.id, revisionRequest])).rows[0]
	assert.ok(revision); pieces.push(revision.id); await record(); assert.equal(revision.version, 2)
	await pass('The real revision action creates version two through its bound server action')
} finally {
	for (const f of fixtures) {
		if (f.id) {
			await db.pool.query('delete from public.submissions where author_id=$1 and parent_submission_id is not null', [f.id])
			await db.pool.query('delete from public.submissions where author_id=$1', [f.id])
			await db.pool.query('delete from studio_auth.users where id=$1', [f.id])
		}
		const removed = await fetch(`${control}/${f.identityId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${platformToken}` } })
		assert.ok([200,204,404].includes(removed.status), 'Synthetic Identity cleanup failed')
	}
	await db.pool.end()
	await pass('All accounts and writing created by this HTTP rehearsal were removed')
}
