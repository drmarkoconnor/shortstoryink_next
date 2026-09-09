// Prepare a private, digest-locked import payload. No network or deployment.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash, randomBytes } from 'node:crypto'
const directory = '.local-backups/2026-09-09-netlify-migration'
const source = process.argv[2] ?? `${directory}/application-snapshot.json`
const snapshot = JSON.parse(await readFile(source, 'utf8')).rows[0].snapshot
const mappings = JSON.parse(await readFile(`${directory}/identity-mappings.private.json`, 'utf8'))
for (const user of snapshot.auth_identity_mapping.filter(u => u.email_confirmed_at && !u.deleted_at && !(u.banned_until && Date.parse(u.banned_until) > Date.now()))) assert.ok(mappings.some(m => m.applicationId === user.id), 'A newly confirmed source account still needs importing')
const body = JSON.stringify({ snapshot: { tables: snapshot.tables, auth_identity_mapping: snapshot.auth_identity_mapping, fingerprints: snapshot.fingerprints }, mappings })
await writeFile(`${directory}/cutover-payload.private.json`, body, { mode: 0o600 })
const configuration = { token: randomBytes(32).toString('hex'), sha256: createHash('sha256').update(body).digest('hex'), expires: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }
await writeFile(`${directory}/cutover-config.private.json`, JSON.stringify(configuration), { mode: 0o600 })
console.log('Prepared private payload:', Buffer.byteLength(body), 'bytes;', mappings.length, 'verified Identity mappings;', snapshot.auth_identity_mapping.length, 'application accounts')
