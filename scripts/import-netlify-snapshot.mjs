// Explicit, transactional import into an EMPTY, schema-prepared Netlify database.
// Usage: node scripts/import-netlify-snapshot.mjs --execute <private-connection.json> <snapshot.json>
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { getDatabase } from '@netlify/database'

assert.equal(process.argv[2],'--execute','Explicit --execute is required')
const credentials=JSON.parse(await readFile(process.argv[3],'utf8'))
const snapshot=JSON.parse(await readFile(process.argv[4],'utf8')).rows[0].snapshot
assert.ok(credentials.connection_strings?.netlifydb_owner,'An owner connection is required for importing')
const connection=new URL(credentials.connection_strings.netlifydb_owner)
connection.searchParams.set('sslmode','verify-full')
const db=getDatabase({connectionString:connection.href})
const client=await db.pool.connect()
const quote=s=>{assert.match(s,/^[a-z_][a-z0-9_]*$/);return '"'+s+'"'}
try {
	await client.query('begin')
	await client.query("set local timezone='UTC'; set local search_path=public; set local statement_timeout='60s'")
	await client.query("select pg_advisory_xact_lock(hashtextextended('studio-snapshot-import',0))")
	for(const name of Object.keys(snapshot.tables)) {
		assert.equal(Number((await client.query(`select count(*) as count from public.${quote(name)}`)).rows[0].count),0,`Refusing import into populated ${name}`)
	}
	assert.equal(Number((await client.query('select count(*) as count from studio_auth.users')).rows[0].count),0,'Refusing to overwrite existing account mappings')
	for(const user of snapshot.auth_identity_mapping) {
		assert.ok(user.email,'An account has no email; inspect before migrating')
		await client.query('insert into studio_auth.users(id,email,email_confirmed_at,created_at,blocked) values($1,$2,$3,$4,$5)',
			[user.id,user.email,user.email_confirmed_at,user.created_at,Boolean(user.deleted_at)||(user.banned_until ? new Date(user.banned_until)>new Date() : false)])
	}
	const dependencies=(await client.query(`select c.relname as child,p.relname as parent from pg_constraint f join pg_class c on c.oid=f.conrelid join pg_namespace cn on cn.oid=c.relnamespace join pg_class p on p.oid=f.confrelid join pg_namespace pn on pn.oid=p.relnamespace where f.contype='f' and cn.nspname='public' and pn.nspname='public' and c.oid<>p.oid`)).rows
	const pending=new Set(Object.keys(snapshot.tables)), done=new Set()
	while(pending.size) {
		const ready=[...pending].filter(name=>dependencies.filter(d=>d.child===name).every(d=>done.has(d.parent)))
		assert.ok(ready.length,'Circular table dependencies need an explicit import order')
		for(const name of ready) {
			// Suppress only user-defined timestamp/status triggers during restoration.
			// Constraints stay active; no session_replication_role or FK bypass.
			await client.query(`alter table public.${quote(name)} disable trigger user`)
			await client.query(`insert into public.${quote(name)} select * from jsonb_populate_recordset(null::public.${quote(name)},$1::jsonb)`,[JSON.stringify(snapshot.tables[name])])
			await client.query(`alter table public.${quote(name)} enable trigger user`)
			pending.delete(name);done.add(name)
		}
	}
	const fingerprints={}
	for(const [name,expected] of Object.entries(snapshot.fingerprints)) {
		const actual=(await client.query(`select count(*)::integer as count,md5(coalesce(string_agg(to_jsonb(r)::text,E'\n' order by to_jsonb(r)::text),'')) as md5 from public.${quote(name)} r`)).rows[0]
		assert.deepEqual(actual,expected,`Content mismatch in ${name}`);fingerprints[name]=actual
	}
	await client.query('commit')
	await writeFile('.local-backups/2026-09-09-netlify-migration/import-report.private.json',JSON.stringify({verifiedAt:new Date().toISOString(),snapshotCapturedAt:snapshot.captured_at,authAccounts:snapshot.auth_identity_mapping.length,fingerprints},null,2)+'\n',{mode:0o600})
	console.log(`Imported ${Object.keys(fingerprints).length} application tables and ${snapshot.auth_identity_mapping.length} account mappings. All row counts and content hashes match.`)
} catch(error) {
	await client.query('rollback');console.error('Import rolled back:',error.message);process.exitCode=1
} finally {client.release();await db.pool.end()}
