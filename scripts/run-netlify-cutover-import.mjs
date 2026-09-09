import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
assert.equal(process.argv[2], '--execute')
const target = process.argv[3]
assert.ok(['https://migration-cutover-rehearsal--storyink.netlify.app','https://shortstory.ink'].includes(target))
const directory = '.local-backups/2026-09-09-netlify-migration'
const { token } = JSON.parse(await readFile(`${directory}/cutover-config.private.json`, 'utf8'))
const gate = await fetch(target + '/app/writer', { redirect: 'manual' })
assert.equal(gate.status, 503, 'Maintenance gate must be active before importing')
const response = await fetch(target + '/api/studio-import', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cutover-token': token }, body: await readFile(`${directory}/cutover-payload.private.json`, 'utf8'), signal: AbortSignal.timeout(90000) })
const result = await response.json()
await writeFile(`${directory}/${target.includes('rehearsal') ? 'rehearsal' : 'production'}-cutover-report.private.json`, JSON.stringify({ target, checkedAt: new Date().toISOString(), status: response.status, ...result }, null, 2), { mode: 0o600 })
assert.equal(response.status, 200, result.error ?? 'Cutover import failed')
assert.equal(result.imported, true)
console.log('Verified import:', result.accounts, 'accounts;', result.identities, 'Identity mappings;', Object.keys(result.fingerprints).length, 'table fingerprints matched')
