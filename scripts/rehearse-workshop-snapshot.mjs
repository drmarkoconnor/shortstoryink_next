// Read-only with respect to Supabase: restores a private snapshot into local PGlite.
// Run: node scripts/rehearse-workshop-snapshot.mjs <snapshot-directory>
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, join } from 'node:path'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'

const directory = resolve(process.argv[2] ?? '.local-backups/2026-09-08-pre-stabilisation')
const raw = await readFile(join(directory, 'application-snapshot.json'), 'utf8')
const { snapshot } = JSON.parse(raw).rows[0]
const { inventory, preflight } = JSON.parse(await readFile(join(directory, 'catalog.json'), 'utf8'))
const db = new PGlite()
const quote = (value) => '"' + value.replaceAll('"', '""') + '"'
const literal = (value) => "'" + value.replaceAll("'", "''") + "'"
const checks = []
const record = (name) => { checks.push(name); console.log('PASS:', name) }
const migrationPath = 'supabase/migrations/20260909064353_workshop_stabilisation.sql'
const migration = await readFile(migrationPath, 'utf8')

try {
	assert.equal(snapshot.project, 'gvzvyckrcnvnnelsrlub')
	assert.equal(snapshot.sequences.length, 0, 'Extend restoration for sequences before using a different snapshot')
	assert.equal(snapshot.views.length, 0, 'Extend restoration for views before using a different snapshot')
	await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
		create schema auth; create table auth.users(id uuid primary key);
		create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
		grant usage on schema public, auth to anon, authenticated, service_role;
		set timezone='UTC'; set search_path=public;`)
	for (const type of preflight.enums) {
		await db.exec(`create type public.${quote(type.typname)} as enum (${type.labels.map(literal).join(',')});`)
	}
	for (const ddl of snapshot.create_tables) await db.exec(ddl)
	for (const fn of inventory.functions) await db.exec(fn.definition)
	for (const user of snapshot.auth_identity_mapping) await db.query('insert into auth.users(id) values($1)', [user.id])
	for (const [name, rows] of Object.entries(snapshot.tables)) {
		await db.query(`insert into public.${quote(name)} select * from jsonb_populate_recordset(null::public.${quote(name)},$1::jsonb)`, [JSON.stringify(rows)])
	}
	for (const constraint of [...snapshot.constraints].sort((a,b) => Number(a.kind === 'f') - Number(b.kind === 'f'))) await db.exec(constraint.ddl)
	for (const ddl of snapshot.indexes) await db.exec(ddl)
	for (const trigger of inventory.triggers) await db.exec(trigger.definition)
	for (const table of inventory.tables) if (table.rls) await db.exec(`alter table public.${quote(table.name)} enable row level security`)
	for (const policy of inventory.policies) {
		await db.exec(`create policy ${quote(policy.policyname)} on public.${quote(policy.tablename)} as ${policy.permissive} for ${policy.cmd}
			to ${policy.roles.map(r => r === 'public' ? 'PUBLIC' : quote(r)).join(',')}
			${policy.qual ? 'using (' + policy.qual + ')' : ''} ${policy.with_check ? 'with check (' + policy.with_check + ')' : ''}`)
	}
	for (const grant of inventory.grants) {
		await db.exec(`grant ${grant.privilege_type} on public.${quote(grant.table_name)} to ${grant.grantee === 'PUBLIC' ? 'PUBLIC' : quote(grant.grantee)}`)
	}
	async function verifyFingerprints() {
		for (const [name, expected] of Object.entries(snapshot.fingerprints)) {
			const { rows } = await db.query(`select count(*)::integer as count, md5(coalesce(string_agg(to_jsonb(r)::text,E'\n' order by to_jsonb(r)::text),'')) as md5 from public.${quote(name)} r`)
			assert.deepEqual(rows[0], expected, `Snapshot mismatch: ${name}`)
		}
	}
	await verifyFingerprints()
	record('Restored all application tables; row counts and PostgreSQL text hashes match the export')
	async function as(user, sql, params = []) {
		await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? ''])
		await db.exec(`set role ${user ? 'authenticated' : 'anon'}`)
		try { return await db.query(sql, params) } finally { await db.exec('reset role') }
	}
	const writers = snapshot.tables.profiles.filter(p => p.role === 'writer')
	const teachers = snapshot.tables.profiles.filter(p => ['teacher','admin'].includes(p.role))
	assert.ok(writers.length > 1 && teachers.length > 0)
	const before = await as(writers[0].id, 'select count(*)::integer as count from public.submissions where author_id <> auth.uid()')
	record(`Reproduced current peer visibility: ${before.rows[0].count} other-writer submissions accessible`)
	await db.exec(migration)
	record('Applied the exact prepared migration to the restored live schema and data')
	// client_request_id is the only added data field, with NULL on existing rows.
	for (const [name, expected] of Object.entries(snapshot.fingerprints)) {
		const row = name === 'submissions' ? "to_jsonb(r) - 'client_request_id'" : 'to_jsonb(r)'
		const { rows } = await db.query(`select count(*)::integer as count, md5(coalesce(string_agg((${row})::text,E'\n' order by (${row})::text),'')) as md5 from public.${quote(name)} r`)
		assert.deepEqual(rows[0], expected, `Migration changed existing data: ${name}`)
	}
	record('Migration preserves every existing application row and field')
	for (const writer of writers) {
		const visible = await as(writer.id, 'select id,author_id from public.submissions')
		assert.equal(visible.rows.length, snapshot.tables.submissions.filter(s => s.author_id === writer.id).length)
		assert.ok(visible.rows.every(s => s.author_id === writer.id))
		const comments = await as(writer.id, 'select f.id from public.feedback_items f join public.submissions s on s.id=f.submission_id where s.status <> \'feedback_published\' or s.author_id <> auth.uid()')
		assert.equal(comments.rows.length, 0)
		await assert.rejects(as(writer.id, "update public.profiles set role='teacher' where id=$1", [writer.id]), /permission denied/)
	}
	record('Every existing writer is isolated from peers and cannot change their role')
	assert.equal((await as(null, 'select id from public.submissions')).rows.length, 0)
	assert.equal((await as(null, 'select id from public.teaching_examples')).rows.length, 0)
	assert.equal((await as(teachers[0].id, 'select id from public.submissions')).rows.length, snapshot.tables.submissions.length)
	record('Anonymous reads are blocked and teacher access is preserved')
	await db.exec('begin')
	await as(writers[0].id, "update public.profiles set display_name='Rehearsal only' where id=$1", [writers[0].id])
	await db.exec('rollback')
	record('A writer can still update their display name')
	const report = {
		project: snapshot.project, verifiedAt: new Date().toISOString(), snapshotCapturedAt: snapshot.captured_at,
		snapshotSha256: createHash('sha256').update(raw).digest('hex'),
		migrationPath, migrationSha256: createHash('sha256').update(migration).digest('hex'),
		counts: Object.fromEntries(Object.entries(snapshot.fingerprints).map(([name,v]) => [name,v.count])),
		checks, liveDatabaseChanged: false,
		limits: ['Local PGlite; no concurrent-session test', 'Auth fixture contains IDs only; auth passwords, sessions and platform configuration were not backed up or restored', 'Application schema metadata excludes platform event-trigger registrations and full role/default ACL state'],
	}
	await writeFile(join(directory, 'verification.json'), JSON.stringify(report,null,2)+'\n', { mode: 0o600 })
	console.log('Verification report written; no live database changes.')
} catch (error) {
	// Database error objects can include manuscript parameters: keep them private.
	console.error('Rehearsal failed:', error.message)
	process.exitCode = 1
} finally { await db.close() }
