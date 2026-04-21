function stripTrailingSlash(value: string) {
	return value.endsWith('/') ? value.slice(0, -1) : value
}

export function getClientSiteBaseUrl() {
	const configuredBaseUrl = process.env.NEXT_PUBLIC_AUTH_REDIRECT_BASE_URL

	if (configuredBaseUrl) {
		return stripTrailingSlash(configuredBaseUrl)
	}

	return window.location.origin
}

export function buildClientAuthCallbackUrl(nextPath: string) {
	const normalizedNextPath = nextPath.startsWith('/') ? nextPath : `/${nextPath}`

	return `${getClientSiteBaseUrl()}/auth/callback?next=${encodeURIComponent(
		normalizedNextPath,
	)}`
}
