// Import only confirmed source accounts through the guarded preview operation.
// Creates random, unknown passwords; no invitations or reset messages are sent.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
assert.equal(process.argv[2], '--execute')
const directory = '.local-backups/2026-09-09-netlify-migration'
const { value } = JSON.parse(await readFile(`${directory}/migration-token.private.json`, 'utf8'))
const snapshot = JSON.parse(await readFile(`${directory}/application-snapshot.json`, 'utf8')).rows[0].snapshot
const users = snapshot.auth_identity_mapping
assert.ok(Array.isArray(users), 'Source account inventory is missing')
const mappings = []
for (const user of users) {
	if (!user.email_confirmed_at || user.deleted_at || (user.banned_until && Date.parse(user.banned_until) > Date.now())) continue
	const response = await fetch('https://migration-rehearsal--storyink.netlify.app/api/migration-check', {
		method: 'POST', headers: { 'Content-Type': 'application/json', 'x-migration-token': value },
		body: JSON.stringify({ operation: 'import-account', applicationId: user.id, metadata: user.user_metadata }), signal: AbortSignal.timeout(60000),
	})
	const result = await response.json()
	assert.equal(response.status, 200, result.error ?? 'Identity import failed')
	assert.equal(result.applicationId, user.id)
	assert.equal(result.confirmed, true)
	mappings.push(result)
	await writeFile(`${directory}/identity-mappings.private.json`, JSON.stringify(mappings, null, 2), { mode: 0o600 })
	console.log(`Mapped ${mappings.length} confirmed accounts`)
}
console.log(`Complete: ${mappings.length} confirmed accounts imported; ${users.length - mappings.length} unconfirmed/inactive accounts retained in the application mapping without activating them.`)
