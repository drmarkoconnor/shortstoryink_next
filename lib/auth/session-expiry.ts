// Expiry is only a renewal hint. It never authenticates or authorises a request.
export function needsSessionRefresh(token: string | undefined, now = Date.now()) {
	if (!token) return true
	try {
		const part = token.split('.')[1]
		const claims = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
		return typeof claims.exp !== 'number' || claims.exp * 1000 <= now + 60_000
	} catch { return true }
}
