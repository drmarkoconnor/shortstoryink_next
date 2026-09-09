// Retire only this migration's temporary deploys/databases after live verification.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { getGlobalConfigStore } from '/Users/moc/.npm/_npx/b3ca12a867cd0704/node_modules/netlify-cli/node_modules/@netlify/dev-utils/dist/main.js'
assert.equal(process.argv[2], '--execute')
const directory = '.local-backups/2026-09-09-netlify-migration'
const cleanup = JSON.parse(await readFile(`${directory}/cleanup-report.private.json`, 'utf8'))
assert.ok(cleanup.completedAt)
const config = await getGlobalConfigStore(), token = config.get(`users.${config.get('userId')}.auth.token`)
const headers = { Authorization: `Bearer ${token}` }
const base = 'https://api.netlify.com/api/v1/sites/d8bc3715-124c-43a2-846d-009b995bb694'
const siteResponse = await fetch(base, { headers }); assert.ok(siteResponse.ok)
const site = await siteResponse.json(), published = site.published_deploy?.id
assert.ok(published)
const listResponse = await fetch(base + '/deploys?per_page=100', { headers }); assert.ok(listResponse.ok)
const deploys = await listResponse.json()
const targets = deploys.filter(d => d.id !== published && (d.title?.startsWith('Netlify backend migration') || d.id === '6aa179d084ddfd00087e026c'))
const report = { published, deploys: [], branches: [] }
for (const deploy of targets) {
	const result = await fetch(`${base}/deploys/${deploy.id}`, { method: 'DELETE', headers })
	report.deploys.push({ id: deploy.id, status: result.status })
	console.log('Retire temporary deploy', deploy.id, result.status)
}
for (const branch of ['migrate/netlify-database-identity','migration-rehearsal','migration-cutover-rehearsal','migration-cutover-v2']) {
	const result = await fetch(`${base}/database/branch/${encodeURIComponent(branch)}`, { method: 'DELETE', headers })
	report.branches.push({ branch, status: result.status })
	console.log('Retire rehearsal database', branch, result.status)
}
await writeFile(`${directory}/retirement-report.private.json`, JSON.stringify(report, null, 2), { mode: 0o600 })
if ([...report.deploys, ...report.branches].some(r => ![200,204,404].includes(r.status))) process.exitCode = 1
