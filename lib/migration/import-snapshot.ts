// Temporary cutover implementation. Runs only behind the digest-locked import route.
import 'server-only'
import assert from 'node:assert/strict'
import { studioDatabase } from '@/lib/data/connection'
type Account = { id: string; email: string; email_confirmed_at: string | null; created_at: string; deleted_at?: string | null; banned_until?: string | null }
type Fingerprint = { count: number; md5: string }
export type ImportPayload = {
	snapshot: { tables: Record<string, Record<string, unknown>[]>; auth_identity_mapping: Account[]; fingerprints: Record<string, Fingerprint> },
	mappings: { applicationId: string; identityId: string; confirmed: boolean }[],
}
const tables = ['feedback_categories','feedback_export_events','feedback_items','feedback_summaries','profiles','review_summaries','snippet_categories','snippets','submissions','teacher_documents','teaching_example_annotations','teaching_example_hidden_groups','teaching_examples','teaching_library_items','workshop_members','workshops']
export async function importSnapshot({ snapshot, mappings }: ImportPayload) {
	assert.deepEqual(Object.keys(snapshot.tables).sort(), [...tables].sort())
	assert.deepEqual(Object.keys(snapshot.fingerprints).sort(), [...tables].sort())
	const client = await studioDatabase().pool.connect()
	try {
		await client.query('begin')
		await client.query("set local timezone='UTC'; set local search_path=public; set local statement_timeout='45s'")
		await client.query("select pg_advisory_xact_lock(hashtextextended('studio-snapshot-import',0))")
		for (const name of tables) assert.equal(Number((await client.query(`select count(*) as n from public."${name}"`)).rows[0].n), 0, 'Destination must be empty')
		assert.equal(Number((await client.query('select count(*) as n from studio_auth.users')).rows[0].n), 0, 'Destination account map must be empty')
		for (const user of snapshot.auth_identity_mapping) {
			const mapping = mappings.find(m => m.applicationId === user.id)
			const blocked = Boolean(user.deleted_at) || Boolean(user.banned_until && Date.parse(user.banned_until) > Date.now())
			if (user.email_confirmed_at && !blocked) assert.ok(mapping?.confirmed, 'A confirmed account has not been migrated')
			if (mapping) assert.ok(user.email_confirmed_at && !blocked, 'Unconfirmed account must remain unconfirmed')
			await client.query('insert into studio_auth.users(id,identity_id,email,email_confirmed_at,created_at,blocked) values($1,$2,$3,$4,$5,$6)', [user.id, mapping?.identityId ?? null, user.email, user.email_confirmed_at, user.created_at, blocked])
		}
		const dependencies = (await client.query(`select c.relname as child,p.relname as parent from pg_constraint f join pg_class c on c.oid=f.conrelid join pg_namespace cn on cn.oid=c.relnamespace join pg_class p on p.oid=f.confrelid join pg_namespace pn on pn.oid=p.relnamespace where f.contype='f' and cn.nspname='public' and pn.nspname='public' and c.oid<>p.oid`)).rows as { child: string; parent: string }[]
		const pending = new Set(tables), done = new Set<string>()
		while (pending.size) {
			const ready = [...pending].filter(name => dependencies.filter(d => d.child === name).every(d => done.has(d.parent)))
			assert.ok(ready.length, 'Circular dependencies')
			for (const name of ready) {
				await client.query(`alter table public."${name}" disable trigger user`)
				await client.query(`insert into public."${name}" select * from jsonb_populate_recordset(null::public."${name}",$1::jsonb)`, [JSON.stringify(snapshot.tables[name])])
				await client.query(`alter table public."${name}" enable trigger user`)
				pending.delete(name); done.add(name)
			}
		}
		const fingerprints: Record<string, Fingerprint> = {}
		for (const name of tables) {
			const actual = (await client.query(`select count(*)::integer as count,md5(coalesce(string_agg(to_jsonb(r)::text,E'\n' order by to_jsonb(r)::text),'')) as md5 from public."${name}" r`)).rows[0]
			assert.deepEqual(actual, snapshot.fingerprints[name], `Content mismatch in ${name}`)
			fingerprints[name] = actual
		}
		await client.query('commit')
		return { imported: true, accounts: snapshot.auth_identity_mapping.length, identities: mappings.length, fingerprints }
	} catch (error) { await client.query('rollback'); throw error } finally { client.release() }
}
