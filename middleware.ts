import { NextResponse, type NextRequest } from 'next/server'
import { needsSessionRefresh } from '@/lib/auth/session-expiry'

export async function middleware(request: NextRequest) {
	if (process.env.STUDIO_CUTOVER_ENABLED === '1' && request.nextUrl.pathname !== '/api/studio-import') {
		return new NextResponse('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>shortstory.ink</title><body style="margin:0;background:#111927;color:#eee5d5;font:20px Georgia,serif;display:grid;min-height:100vh;place-items:center"><main style="max-width:32em;padding:2rem"><h1>shortstory.ink</h1><p>We’re moving the writing studio to its new home.</p><p>Your writing is safe. Please return shortly.</p></main></body></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '300' } })
	}
	// Renew before SSR so a returning writer is not redirected before the browser
	// has a chance to hydrate its session. Identity still verifies every user.
	const refresh = request.cookies.get('nf_refresh')?.value
	let tokens: { access_token: string; refresh_token: string } | undefined
	if (refresh && needsSessionRefresh(request.cookies.get('nf_jwt')?.value)) {
		try {
			// Use configured site origin, never a request-supplied Host for credentials.
			const endpoint = new URL('/.netlify/identity/token', process.env.URL ?? 'https://shortstory.ink')
			const renewed = await fetch(endpoint, {
				method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
				cache: 'no-store', signal: AbortSignal.timeout(8000),
			})
			if (renewed.ok) {
				const result = await renewed.json()
				if (typeof result.access_token === 'string' && typeof result.refresh_token === 'string') {
					tokens = result
					request.cookies.set('nf_jwt', result.access_token)
					request.cookies.set('nf_refresh', result.refresh_token)
				}
			}
		} catch { /* Verification fails closed downstream; transient renewal can retry. */ }
	}
	const response = NextResponse.next({ request: { headers: request.headers } })
	if (tokens) {
		for (const [name, value] of [['nf_jwt', tokens.access_token], ['nf_refresh', tokens.refresh_token]]) {
			response.cookies.set(name, value, { path: '/', secure: true, sameSite: 'lax', httpOnly: false })
		}
	}
	response.headers.set('Cache-Control', 'private, no-store')
	return response
}

export const config = {
	matcher: [
		'/app/:path*',
		'/writer/:path*',
		'/teacher/:path*',
		'/teacher-studio/:path*',
		'/account/:path*',
		'/auth/callback',
		'/api/:path*',
		'/',
		'/auth/:path*',
	],
}
