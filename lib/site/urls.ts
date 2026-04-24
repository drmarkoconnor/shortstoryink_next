function stripTrailingSlash(value: string) {
	return value.endsWith('/') ? value.slice(0, -1) : value
}

function firstDefined(...values: Array<string | undefined>) {
	return values.find((value) => value && value.trim())
}

export function getAppBaseUrl() {
	const configuredBaseUrl = firstDefined(
		process.env.NEXT_PUBLIC_APP_URL,
		process.env.NEXT_PUBLIC_SITE_URL,
		process.env.APP_URL,
		process.env.SITE_URL,
		process.env.AUTH_REDIRECT_BASE_URL,
		process.env.NEXT_PUBLIC_AUTH_REDIRECT_BASE_URL,
	)

	if (configuredBaseUrl) {
		return stripTrailingSlash(configuredBaseUrl)
	}

	if (process.env.NODE_ENV === 'production') {
		return 'https://shortstory.ink'
	}

	return 'http://localhost:3000'
}

export function buildAbsoluteUrl(path: string) {
	const baseUrl = getAppBaseUrl()
	const normalizedPath = path.startsWith('/') ? path : `/${path}`
	return `${baseUrl}${normalizedPath}`
}

export function buildAuthCallbackUrl(nextPath: string) {
	return buildAbsoluteUrl(
		`/auth/callback?next=${encodeURIComponent(nextPath)}`,
	)
}
