// Run only after the clean Netlify application is verified in production.
// Removes this site's obsolete credentials and temporary migration access.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { getGlobalConfigStore } from '/Users/moc/.npm/_npx/b3ca12a867cd0704/node_modules/netlify-cli/node_modules/@netlify/dev-utils/dist/main.js'
assert.equal(process.argv[2], '--execute')
const directory = '.local-backups/2026-09-09-netlify-migration'
const report = JSON.parse(await readFile(`${directory}/production-cutover-report.private.json`, 'utf8'))
assert.equal(report.imported, true)
const live = await fetch('https://shortstory.ink/auth/sign-in')
assert.equal(live.status, 200, 'The clean application must be live first')
for (const path of ['/api/studio-import','/api/migration-check']) assert.equal((await fetch('https://shortstory.ink' + path, { method: 'POST' })).status, 404, 'Temporary endpoints must be removed first')
const config = await getGlobalConfigStore(), token = config.get(`users.${config.get('userId')}.auth.token`)
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const site = 'd8bc3715-124c-43a2-846d-009b995bb694', instance = '6aa129dd145522096fa7e192'
const base = `https://api.netlify.com/api/v1/sites/${site}`
const identity = await fetch(`${base}/identity/${instance}`, { method: 'PUT', headers, body: JSON.stringify({ disable_signup: false }) })
assert.ok(identity.ok, 'Could not reopen registration')
const settings = await (await fetch('https://shortstory.ink/.netlify/identity/settings')).json()
assert.equal(settings.disable_signup, false)
assert.equal(settings.autoconfirm, false, 'Email confirmation must remain required')
console.log('Registration reopened; email confirmation remains required')
const fixture = JSON.parse(await readFile(`${directory}/identity-test.private.json`, 'utf8'))
assert.ok(fixture.credential.email.endsWith('@example.invalid'))
const removed = await fetch(`${base}/identity/${instance}/users/${fixture.response.id}`, { method: 'DELETE', headers })
assert.ok([200,204,404].includes(removed.status), 'Could not remove diagnostic Identity account')
console.log('Diagnostic Identity account removed')
const results = []
for (const key of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_PROJECT_ID','STUDIO_CUTOVER_TOKEN','STUDIO_CUTOVER_SHA256','STUDIO_CUTOVER_EXPIRES','STUDIO_CUTOVER_ENABLED','STUDIO_MIGRATION_TOKEN']) {
	const r = await fetch(`https://api.netlify.com/api/v1/accounts/604dff94a9112e607f4fa007/env/${key}?site_id=${site}`, { method: 'DELETE', headers })
	assert.ok([200,204,404].includes(r.status), `Could not remove site variable ${key}`)
	results.push({ key, status: r.status }); console.log('Removed obsolete site variable', key)
}
await writeFile(`${directory}/cleanup-report.private.json`, JSON.stringify({ completedAt: new Date().toISOString(), registration: settings, results }, null, 2), { mode: 0o600 })
