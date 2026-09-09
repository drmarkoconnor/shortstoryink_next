/** Accept only an ordinary same-origin application path, including query/hash. */
export function safeRedirectPath(value: unknown, fallback = '/app') {
	if (typeof value !== 'string' || !value.startsWith('/')) return fallback
	try {
		const decoded = decodeURIComponent(value)
		if (decoded.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(decoded)) return fallback
		const url = new URL(value, 'https://internal.invalid')
		if (url.origin !== 'https://internal.invalid') return fallback
		return `${url.pathname}${url.search}${url.hash}`
	} catch {
		return fallback
	}
}
