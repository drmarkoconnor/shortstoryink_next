import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { getSupabaseEnv } from '@/lib/supabase/env'

export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url)
	const code = requestUrl.searchParams.get('code')
	const next = requestUrl.searchParams.get('next') ?? '/app'
	const { url, anonKey } = getSupabaseEnv()

	let response = NextResponse.redirect(new URL(next, request.url))

	if (!code) {
		return response
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

	await supabase.auth.exchangeCodeForSession(code)

	return response
}
