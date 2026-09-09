import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeRedirectPath } from '../lib/auth/safe-redirect'
import { passwordValidationError } from '../lib/auth/password-validation'
import { draftKey, forgetDrafts, readDraft, removeSavedDraft, type RecoveryDraft } from '../lib/drafts/recovery'
function storage(): Storage {
	const data = new Map<string, string>()
	return { get length() { return data.size }, key: i => [...data.keys()][i] ?? null, getItem: key => data.get(key) ?? null,
		setItem: (key, value) => { data.set(key, value) }, removeItem: key => { data.delete(key) }, clear: () => data.clear() }
}
const draft: RecoveryDraft = { ownerId: 'writer-a', scope: 'new', requestId: '00000000-0000-4000-8000-000000000001', title: 'Title', body: '\tExact\r\n  text', workshopId: 'group', updatedAt: Date.now() }
test('auth redirects reject external, encoded, malformed and backslash destinations', () => {
	for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/%5cevil.test', '/%2f%2fevil.test', '/\n/evil.test', '/%00evil', '/%zz', null]) assert.equal(safeRedirectPath(value), '/app')
	assert.equal(safeRedirectPath('/auth/reset-password'), '/auth/reset-password')
	assert.equal(safeRedirectPath('/app/writer?next=feedback#p-1'), '/app/writer?next=feedback#p-1')
})
test('password confirmation preserves significant whitespace and rejects mismatch/short passwords', () => {
	assert.ok(passwordValidationError('short', 'short'))
	assert.ok(passwordValidationError(' long password ', 'long password'))
	assert.equal(passwordValidationError(' long password ', ' long password '), null)
})
test('recovery round-trips exact text, isolates users and revisions, and expires stale copies', () => {
	const store = storage(); store.setItem(draftKey(draft.ownerId, draft.scope), JSON.stringify(draft))
	assert.equal(readDraft(store, draft.ownerId, draft.scope)?.body, draft.body)
	assert.equal(readDraft(store, 'writer-b', draft.scope), null)
	assert.equal(readDraft(store, draft.ownerId, 'revision:one'), null)
	assert.equal(readDraft(store, draft.ownerId, draft.scope, draft.updatedAt + 8 * 86400000), null)
})
test('confirmation cannot clear a newer recovery copy, and logout only clears the current account', () => {
	const store = storage(); const key = draftKey(draft.ownerId, draft.scope)
	store.setItem(key, JSON.stringify({ ...draft, body: 'A later edit' }))
	removeSavedDraft(store, draft)
	assert.equal(readDraft(store, draft.ownerId, draft.scope)?.body, 'A later edit')
	store.setItem(key, JSON.stringify(draft)); removeSavedDraft(store, draft)
	assert.equal(store.getItem(key), null)
	store.setItem(key, JSON.stringify(draft)); store.setItem(draftKey('writer-b', 'new'), 'keep')
	forgetDrafts(store, 'writer-a')
	assert.equal(store.getItem(key), null); assert.equal(store.getItem(draftKey('writer-b', 'new')), 'keep')
})
test('malformed or forged-account recovery data is discarded', () => {
	const store = storage(); const key = draftKey(draft.ownerId, draft.scope)
	for (const bad of ['{bad', JSON.stringify({ ...draft, ownerId: 'writer-b' }), JSON.stringify({ ...draft, requestId: '<script>' })]) {
		store.setItem(key, bad); assert.equal(readDraft(store, draft.ownerId, draft.scope), null)
	}
})
