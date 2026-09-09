import { handleAuthCallback, type CallbackResult } from '@netlify/identity'

let callback: Promise<CallbackResult | null> | undefined
// Strict Mode may mount twice. A one-use email token must only be redeemed once.
export function completeIdentityCallback() {
	callback ??= handleAuthCallback()
	return callback
}
