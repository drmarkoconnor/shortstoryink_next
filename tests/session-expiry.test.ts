import test from 'node:test'
import assert from 'node:assert/strict'
import { needsSessionRefresh } from '../lib/auth/session-expiry'
test('Expired, missing and malformed sessions renew; valid sessions avoid extra network calls', () => {
	const now = 1_800_000_000_000
	const token = (seconds: number) => 'header.' + Buffer.from(JSON.stringify({ exp: now / 1000 + seconds })).toString('base64url') + '.signature'
	assert.equal(needsSessionRefresh(undefined, now), true)
	assert.equal(needsSessionRefresh('broken', now), true)
	assert.equal(needsSessionRefresh(token(-1), now), true)
	assert.equal(needsSessionRefresh(token(60), now), true)
	assert.equal(needsSessionRefresh(token(3600), now), false)
})
