import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { getGlobalConfigStore } from '/Users/moc/.npm/_npx/b3ca12a867cd0704/node_modules/netlify-cli/node_modules/@netlify/dev-utils/dist/main.js'
assert.equal(process.argv[2], '--execute')
const directory = '.local-backups/2026-09-09-netlify-migration'
const config = JSON.parse(await readFile(`${directory}/cutover-config.private.json`, 'utf8'))
const store = await getGlobalConfigStore(), token = store.get(`users.${store.get('userId')}.auth.token`)
const base = 'https://api.netlify.com/api/v1/accounts/604dff94a9112e607f4fa007/env'
const suffix = '?site_id=d8bc3715-124c-43a2-846d-009b995bb694'
for (const [key, value] of Object.entries({ STUDIO_CUTOVER_TOKEN: config.token, STUDIO_CUTOVER_SHA256: config.sha256, STUDIO_CUTOVER_EXPIRES: config.expires, STUDIO_CUTOVER_ENABLED: '1' })) {
	const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
	const existing = await fetch(`${base}/${key}${suffix}`, { headers })
	assert.ok([200,404].includes(existing.status), 'Could not check cutover configuration')
	const body = { key, values: ['production','deploy-preview','branch-deploy'].map(context => ({ context, value })) }
	const result = await fetch(existing.ok ? `${base}/${key}${suffix}` : `${base}${suffix}`, { method: existing.ok ? 'PUT' : 'POST', headers, body: JSON.stringify(existing.ok ? body : [body]) })
	await writeFile(`${directory}/env-${key}.private.json`, await result.text(), { mode: 0o600 })
	assert.ok(result.ok, `Cutover configuration failed: ${key} HTTP ${result.status}`)
	console.log('Configured', key)
}
