function stripTrailingSlash(value: string) {
	return value.endsWith('/') ? value.slice(0, -1) : value
}

function firstDefined(...values: Array<string | undefined>) {
	return values.find((value) => value && value.trim())
}

export function getClientSiteBaseUrl() {
	const configuredBaseUrl = firstDefined(
		process.env.NEXT_PUBLIC_APP_URL,
		process.env.NEXT_PUBLIC_SITE_URL,
		process.env.NEXT_PUBLIC_AUTH_REDIRECT_BASE_URL,
	)

	if (configuredBaseUrl) {
		return stripTrailingSlash(configuredBaseUrl)
	}

	if (process.env.NODE_ENV === 'production') {
		return 'https://shortstory.ink'
	}

	return window.location.origin
}

export function buildClientAuthCallbackUrl(nextPath: string) {
	const normalizedNextPath = nextPath.startsWith('/') ? nextPath : `/${nextPath}`

	return `${getClientSiteBaseUrl()}/auth/callback?next=${encodeURIComponent(
		normalizedNextPath,
	)}`
}
