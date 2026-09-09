import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const writer = id(1), other = id(2), teacher = id(3), outsider = id(4), group = id(10), hidden = id(11)
const piece = id(20), example = id(30)
async function as(role: string, user: string | null, sql: string, params: unknown[] = []) {
	await db.exec(`set role ${role}`)
	try {
		await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ''])
		return await db.query(sql, params)
	} finally { await db.exec('reset role') }
}
async function submit(request: number, source: string | null = null, body = 'A private manuscript.', author = writer) {
	return as('netlifydb_owner', null, 'select public.submit_workshop_draft($1,$2,$3,$4,$5,$6) as result', [author, id(request), 'My story', body, group, source])
}
before(async () => {
	await db.exec('create role netlifydb_owner bypassrls createrole; grant all on schema public to netlifydb_owner; grant create on database postgres to netlifydb_owner; set role netlifydb_owner;')
	await db.exec(await readFile('netlify/database/migrations/001_workshop-baseline/migration.sql', 'utf8'))
	await db.exec('reset role')
	for (const user of [writer, other, teacher, outsider]) {
		await db.query('insert into studio_auth.users(id,email) values ($1,$2)', [user, `${user}@example.invalid`])
		await db.query('insert into public.profiles(id,role) values($1,$2)', [user, user === teacher ? 'teacher' : 'writer'])
	}
	await db.query("insert into public.workshops(id,title,slug) values ($1,'Authorised Basic User','authorised-basic-user'), ($2,'Hidden class','hidden')", [group, hidden])
	await db.query('insert into public.workshop_members values ($1,$2),($1,$3),($4,$2)', [group, writer, other, hidden])
	await db.query("insert into public.submissions(id,author_id,workshop_id,title,body) values ($1,$2,$3,'Private','Secret manuscript')", [piece, writer, group])
	await db.query('insert into public.feedback_items(submission_id,author_id,anchor,comment) values($1,$2,$3,$4)', [piece, teacher, { blockId: 'p-1', startOffset: 0, endOffset: 6, quote: 'Secret' }, 'Unpublished teaching thought'])
	await db.query("insert into public.teaching_examples(id,owner_id,title,body,status) values($1,$2,'Example','Example text','published')", [example, teacher])
	await db.query('insert into public.teaching_example_hidden_groups(example_id,workshop_id) values($1,$2),($1,$3)', [example, group, hidden])
	await db.query('insert into public.teaching_example_annotations(example_id,author_id,anchor,comment) values($1,$2,$3,$4)', [example, teacher, { blockId: 'p-1', startOffset: 0, endOffset: 7, quote: 'Example' }, 'Note'])
})
after(async () => { await db.close() })

test('owner and teacher can read; another group member and anonymous visitor cannot', async () => {
	assert.equal((await as('studio_authenticated', writer, 'select * from public.submissions')).rows.length, 1)
	assert.equal((await as('studio_authenticated', teacher, 'select * from public.submissions')).rows.length, 1)
	assert.equal((await as('studio_authenticated', other, 'select * from public.submissions')).rows.length, 0)
	assert.equal((await as('studio_anon', null, 'select * from public.submissions')).rows.length, 0)
})
test('profile name can change but role, identity and profile creation are protected', async () => {
	await as('studio_authenticated', writer, "update public.profiles set display_name='Writer name' where id=$1", [writer])
	await assert.rejects(as('studio_authenticated', writer, "update public.profiles set role='teacher' where id=$1", [writer]), /permission denied/)
	await assert.rejects(as('studio_authenticated', writer, 'update public.profiles set id=$1 where id=$2', [id(9), writer]), /permission denied/)
	await assert.rejects(as('studio_authenticated', outsider, "insert into public.profiles(id,role) values($1,'teacher')", [outsider]), /permission denied/)
	assert.equal((await as('studio_authenticated', writer, "update public.profiles set display_name='Intruder' where id=$1 returning id", [other])).rows.length, 0)
})
test('teacher draft feedback is invisible to its writer', async () => {
	assert.equal((await db.query<{ status: string }>('select status from public.submissions where id=$1', [piece])).rows[0]?.status, 'in_review')
	assert.equal((await as('studio_authenticated', writer, 'select * from public.feedback_items')).rows.length, 0)
	assert.equal((await as('studio_authenticated', teacher, 'select * from public.feedback_items')).rows.length, 1)
})
test('group-restricted examples and their annotations stay private, including direct queries', async () => {
	for (const who of [writer, other, outsider]) {
		assert.equal((await as('studio_authenticated', who, 'select * from public.teaching_examples')).rows.length, 0)
		assert.equal((await as('studio_authenticated', who, 'select * from public.teaching_example_annotations')).rows.length, 0)
	}
	assert.equal((await as('studio_anon', null, 'select * from public.teaching_examples')).rows.length, 0)
	assert.equal((await as('studio_authenticated', teacher, 'select * from public.teaching_examples')).rows.length, 1)
	await db.query('delete from public.teaching_example_hidden_groups where example_id=$1 and workshop_id=$2', [example, hidden])
	assert.equal((await as('studio_authenticated', writer, 'select * from public.teaching_examples')).rows.length, 1)
	assert.equal((await as('studio_authenticated', writer, 'select * from public.teaching_example_annotations')).rows.length, 1)
	assert.equal((await as('studio_authenticated', other, 'select * from public.teaching_examples')).rows.length, 0)
})
test('transaction operations cannot be invoked directly by writers or anonymous clients', async () => {
	for (const role of ['studio_authenticated', 'studio_anon']) {
		await assert.rejects(as(role, writer, 'select public.publish_workshop_feedback($1,$2,$3)', [teacher, piece, 'Forged']), /permission denied/)
		await assert.rejects(as(role, writer, 'select public.submit_workshop_draft($1,$2,$3,$4,$5,null)', [writer, id(90), 'Title', 'Text', group]), /permission denied/)
	}
	await assert.rejects(as('studio_authenticated', writer, "insert into public.submissions(author_id,workshop_id,title,body,status) values($1,$2,'Title','Text','feedback_published')", [writer, group]), /row-level security/)
})
test('a publication failure rolls back its summary, then a successful publish reveals only to owner', async () => {
	await db.exec(`create function public.reject_publish() returns trigger language plpgsql as $$ begin raise exception 'simulated failure'; end $$;
		create trigger reject_publish before update on public.submissions for each row execute function public.reject_publish();`)
	await assert.rejects(as('netlifydb_owner', null, 'select public.publish_workshop_feedback($1,$2,$3)', [teacher, piece, 'Feedback']), /simulated failure/)
	assert.equal((await db.query('select * from public.feedback_summaries')).rows.length, 0)
	await db.exec('drop trigger reject_publish on public.submissions; drop function public.reject_publish();')
	const first = await as('netlifydb_owner', null, 'select public.publish_workshop_feedback($1,$2,$3) as result', [teacher, piece, 'Feedback'])
	assert.equal((first.rows[0] as { result: { changed: boolean } }).result.changed, true)
	const retry = await as('netlifydb_owner', null, 'select public.publish_workshop_feedback($1,$2,$3) as result', [teacher, piece, 'Feedback'])
	assert.equal((retry.rows[0] as { result: { changed: boolean } }).result.changed, false)
	assert.equal((await as('studio_authenticated', writer, 'select * from public.feedback_items')).rows.length, 1)
	assert.equal((await as('studio_authenticated', writer, 'select * from public.feedback_summaries')).rows.length, 1)
	assert.equal((await as('studio_authenticated', other, 'select * from public.feedback_items')).rows.length, 0)
	assert.equal((await as('studio_authenticated', other, 'select * from public.feedback_summaries')).rows.length, 0)
})
test('published feedback stays locked against edits, deletion, late comments and a changed summary', async () => {
	await assert.rejects(as('studio_authenticated', teacher, "update public.feedback_items set comment='Late change' where submission_id=$1", [piece]), /Published feedback is locked/)
	await assert.rejects(as('studio_authenticated', teacher, 'delete from public.feedback_items where submission_id=$1', [piece]), /Published feedback is locked/)
	await assert.rejects(as('studio_authenticated', teacher, "insert into public.feedback_items(submission_id,author_id,anchor,comment) values($1,$2,'{}','Late comment')", [piece, teacher]), /Published feedback is locked/)
	await assert.rejects(as('netlifydb_owner', null, 'select public.publish_workshop_feedback($1,$2,$3)', [teacher, piece, 'Changed summary']), /Published feedback is locked/)
})
test('submission retries preserve exact whitespace and do not duplicate a manuscript', async () => {
	const body = '\tA line.\r\n\r\n  Another line.  '
	const first = await submit(101, null, body)
	const retry = await submit(101, null, body)
	assert.equal((first.rows[0] as { result: { id: string } }).result.id, (retry.rows[0] as { result: { id: string } }).result.id)
	const saved = await db.query('select body from public.submissions where client_request_id=$1', [id(101)])
	assert.equal((saved.rows[0] as { body: string }).body, body)
	await assert.rejects(submit(101, null, 'Changed content'), /different content/)
})
test('database enforces membership and word limit even if client-side validation is bypassed', async () => {
	await assert.rejects(submit(102, null, 'Text', outsider), /assigned groups/)
	await assert.rejects(submit(103, null, 'word '.repeat(2001)), /2,000 words/)
	await submit(105, null, '\t\n' + 'word '.repeat(2000) + '\r\n\t')
	await assert.rejects(submit(104, null, 'Text', teacher), /Writer access/)
})
test('revisions enforce ownership, one active successor, unique versions and idempotent retry', async () => {
	await assert.rejects(submit(110, piece, 'Revision', other), /Source is unavailable/)
	const result = await submit(111, piece, 'Revision')
	assert.equal((result.rows[0] as { result: { version: number } }).result.version, 2)
	await submit(111, piece, 'Revision')
	await assert.rejects(submit(112, piece, 'Another revision'), /newer version/)
	await assert.rejects(db.query("insert into public.submissions(author_id,workshop_id,parent_submission_id,title,body,version) values($1,$2,$3,'Duplicate','Body',2)", [writer, group, piece]), /duplicate key/)
})
test('a teacher comment atomically starts review and prevents a writer deleting reviewed work', async () => {
	const result = await submit(120)
	const submissionId = (result.rows[0] as { result: { id: string } }).result.id
	await as('studio_authenticated', teacher, "insert into public.feedback_items(submission_id,author_id,anchor,comment) values($1,$2,$3,'First thought')", [submissionId, teacher, { blockId: 'p-1', startOffset: 0, endOffset: 1, quote: 'A' }])
	assert.equal((await db.query<{ status: string }>('select status from public.submissions where id=$1', [submissionId])).rows[0]?.status, 'in_review')
	assert.equal((await as('studio_authenticated', writer, 'delete from public.submissions where id=$1 returning id', [submissionId])).rows.length, 0)
})
