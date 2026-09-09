// Read-only production release checks. No accounts or messages are created.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
const base = 'https://shortstory.ink', checks = []
let signIn = ''
for (const path of ['/', '/auth/sign-in', '/auth/sign-up', '/auth/reset-password']) {
	const response = await fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(30000) })
	const html = await response.text()
	assert.equal(response.status, 200, `Public page unavailable: ${path}`)
	assert.ok(!html.includes('Application error:'))
	if (path === '/auth/sign-in') signIn = html
	checks.push({ path, status: response.status })
}
assert.ok(signIn.includes('Forgot password?') || signIn.includes('Forgot password'))
for (const path of ['/app/writer', '/app/teacher/review-desk', '/api/teacher/library']) {
	const r = await fetch(base + path, { redirect: 'manual', ...(path.startsWith('/api/') ? { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: '{}' } : {}) })
	assert.ok([302,303,307,308,401,403].includes(r.status), `Unauthenticated access was not denied: ${path}`)
	checks.push({ path, status: r.status })
}
for (const path of ['/api/studio-import', '/api/migration-check']) {
	const r = await fetch(base + path, { method: 'POST' })
	assert.equal(r.status, 404, 'Temporary migration endpoint remains reachable')
	checks.push({ path, status: r.status })
}
const scripts = [...new Set([...signIn.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]).filter(p => p.startsWith('/_next/')))]
for (const path of scripts) {
	const r = await fetch(base + path); assert.equal(r.status, 200)
	assert.doesNotMatch(await r.text(), /https?:\/\/[^\s"']*\.supabase\.co|@supabase\/(?:ssr|supabase-js)/i)
}
await writeFile('.local-backups/2026-09-09-netlify-migration/live-release-checks.private.json', JSON.stringify({ checkedAt: new Date().toISOString(), checks, browserBundlesChecked: scripts.length }, null, 2), { mode: 0o600 })
console.log('PASS: Public pages, protected routes, removed migration endpoints and', scripts.length, 'browser bundles verified')
