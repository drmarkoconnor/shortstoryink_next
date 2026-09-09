import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { safeRedirectPath } from '@/lib/auth/safe-redirect'

export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url)
	const code = requestUrl.searchParams.get('code')
	const next = safeRedirectPath(requestUrl.searchParams.get('next'))
	const { url, anonKey } = getSupabaseEnv()

	let response = NextResponse.redirect(new URL(next, request.url))

	if (!code) {
		return NextResponse.redirect(new URL('/auth/sign-in?error=callback', request.url))
	}

	const supabase = createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return request.cookies.getAll()
			},
			setAll(
				cookieList: { name: string; value: string; options?: CookieOptions }[],
			) {
				response = NextResponse.redirect(new URL(next, request.url))
				cookieList.forEach(({ name, value, options }) =>
					response.cookies.set(name, value, options),
				)
			},
		},
	})

	try {
		const { error } = await supabase.auth.exchangeCodeForSession(code)
		if (error) throw error
	} catch {
		const failure = NextResponse.redirect(new URL('/auth/sign-in?error=callback', request.url))
		for (const cookie of response.cookies.getAll()) failure.cookies.set(cookie)
		return failure
	}

	return response
}
