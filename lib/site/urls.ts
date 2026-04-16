function stripTrailingSlash(value: string) {
	return value.endsWith('/') ? value.slice(0, -1) : value
}

export function getSiteBaseUrl() {
	return stripTrailingSlash(
		process.env.AUTH_REDIRECT_BASE_URL || 'http://localhost:3000',
	)
}

export function buildAbsoluteUrl(path: string) {
	const baseUrl = getSiteBaseUrl()
	const normalizedPath = path.startsWith('/') ? path : `/${path}`
	return `${baseUrl}${normalizedPath}`
}

export function buildAuthCallbackUrl(nextPath: string) {
	return buildAbsoluteUrl(
		`/auth/callback?next=${encodeURIComponent(nextPath)}`,
	)
}