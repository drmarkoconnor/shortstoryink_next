export const draftPrefix = 'shortstory:draft:v1:'
const lifetime = 7 * 24 * 60 * 60 * 1000
export type RecoveryDraft = {
	ownerId: string; scope: string; requestId: string; title: string; body: string; workshopId: string; updatedAt: number
}
export type DraftSubmissionResult = { error: string } | { id: string; version: number }
export function draftKey(ownerId: string, scope: string) { return `${draftPrefix}${ownerId}:${scope}` }
export function readDraft(storage: Storage, ownerId: string, scope: string, now = Date.now()): RecoveryDraft | null {
	const key = draftKey(ownerId, scope)
	const raw = storage.getItem(key)
	if (!raw) return null
	try {
		const value = JSON.parse(raw) as RecoveryDraft
		if (value.ownerId !== ownerId || value.scope !== scope || typeof value.requestId !== 'string' ||
			!isRequestId(value.requestId) || typeof value.title !== 'string' || typeof value.body !== 'string' ||
			typeof value.workshopId !== 'string' || !Number.isFinite(value.updatedAt) ||
			value.updatedAt > now + 60_000 || now - value.updatedAt > lifetime) throw new Error('Invalid recovery copy')
		return value
	} catch { storage.removeItem(key); return null }
}
export function isRequestId(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) }
export function forgetDrafts(storage: Storage, ownerId: string) {
	for (let i = storage.length - 1; i >= 0; i--) {
		const key = storage.key(i)
		if (key?.startsWith(`${draftPrefix}${ownerId}:`)) storage.removeItem(key)
	}
}
export function removeSavedDraft(storage: Storage, saved: RecoveryDraft) {
	const current = readDraft(storage, saved.ownerId, saved.scope)
	if (current?.requestId === saved.requestId && current.title === saved.title && current.body === saved.body && current.workshopId === saved.workshopId) {
		storage.removeItem(draftKey(saved.ownerId, saved.scope))
	}
}
