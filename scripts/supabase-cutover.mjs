// Explicit source freeze/export/rollback actions. Never run as a schema migration.
import assert from 'node:assert/strict'
import { readFile, writeFile, open } from 'node:fs/promises'
import { spawn } from 'node:child_process'
assert.equal(process.argv[2], '--execute')
const action = process.argv[3]
assert.ok(['freeze','export','unfreeze'].includes(action))
const directory = '.local-backups/2026-09-09-netlify-migration'
const previous = JSON.parse(await readFile(`${directory}/application-snapshot.json`, 'utf8')).rows[0].snapshot
// This private inventory was checked against the linked source before cutover.
// Avoid depending on .env.local, which is deliberately parked during builds.
const project = previous.project
assert.match(project, /^[a-z]{20}$/, 'Invalid source project in the verified backup')
const tables = Object.keys(previous.tables).map(name => { assert.match(name, /^[a-z_]+$/); return `public."${name}"` }).concat('auth.users')
let sqlPath = `${directory}/export.sql`
if (action !== 'export') {
	const sql = action === 'freeze'
		? `begin;\ncreate function public.studio_cutover_freeze() returns trigger language plpgsql as $$ begin raise exception 'The writing studio is moving. Please return shortly.' using errcode='55000'; end $$;\n${tables.map(name => `create trigger studio_cutover_freeze before insert or update or delete or truncate on ${name} for each statement execute function public.studio_cutover_freeze();`).join('\n')}\ncommit;`
		: `begin;\n${tables.map(name => `drop trigger if exists studio_cutover_freeze on ${name};`).join('\n')}\ndrop function if exists public.studio_cutover_freeze();\ncommit;`
	sqlPath = `${directory}/${action}.sql`
	await writeFile(sqlPath, sql, { mode: 0o600 })
}
const outputPath = `${directory}/${action === 'export' ? 'final-application-snapshot.json' : `${action}-report.private.json`}`
const output = await open(outputPath, 'w', 0o600)
const error = await open(`${directory}/${action}-error.private.log`, 'w', 0o600)
try {
	const child = spawn('npx', ['--no-install','supabase','db','query','--linked','--project-ref',project,'--file',sqlPath,'--output','json'], { stdio: ['ignore',output.fd,error.fd] })
	const code = await new Promise((resolve,reject) => { child.on('error',reject); child.on('exit',resolve) })
	assert.equal(code, 0, `Source ${action} failed; inspect its private error log`)
	console.log(`Source ${action} completed; result saved privately`)
} finally { await output.close(); await error.close() }
