// Private, synthetic-account checks; never prints credentials or user content.
import { readFile, writeFile } from 'node:fs/promises'
const directory = '.local-backups/2026-09-09-netlify-migration'
const base = 'https://migration-rehearsal--storyink.netlify.app'
const { value } = JSON.parse(await readFile(`${directory}/migration-token.private.json`, 'utf8'))
const fixturePath = `${directory}/identity-test.private.json`
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'))
const operation = process.argv[2] ?? 'check'
if (!['check', 'confirm-test', 'login', 'pages'].includes(operation)) throw new Error('Unknown preview check')
if (operation === 'login') {
	const response = await fetch(`${base}/.netlify/identity/token`, {
		method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ grant_type: 'password', username: fixture.credential.email, password: fixture.credential.password }),
	})
	fixture.auth = await response.json()
	await writeFile(fixturePath, JSON.stringify(fixture), { mode: 0o600 })
	console.log('Synthetic login', response.status, 'authenticated', Boolean(fixture.auth.access_token), fixture.auth.error_description ?? '')
} else if (operation === 'pages') {
	if (!fixture.auth?.access_token) throw new Error('No synthetic session')
	for (const path of ['/app', '/app/writer', '/app/writer/feedback', '/app/teacher/review-desk', '/account']) {
		const r = await fetch(base + path, { redirect: 'manual', headers: { Cookie: `nf_jwt=${fixture.auth.access_token}; nf_refresh=${fixture.auth.refresh_token}` } })
		const body = await r.text()
		await writeFile(`${directory}/preview-${path.replaceAll('/', '-')}.private.html`, body, { mode: 0o600 })
		console.log(path, r.status, r.headers.get('location') ?? '', 'serverError', body.includes('Application error:'))
	}
} else {
	const headers = { 'Content-Type': 'application/json', 'x-migration-token': value }
	if (fixture.auth?.access_token) headers.Cookie = `nf_jwt=${fixture.auth.access_token}; nf_refresh=${fixture.auth.refresh_token}`
	const response = await fetch(`${base}/api/migration-check`, {
		method: 'POST', headers, body: JSON.stringify({ operation, id: fixture.response.id }),
	})
	const text = await response.text()
	await writeFile(`${directory}/preview-check.private.json`, text, { mode: 0o600 })
	console.log('Preview', operation, response.status)
	if (response.headers.get('content-type')?.includes('json')) console.log(text)
}
