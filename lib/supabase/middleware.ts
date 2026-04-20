import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { getSupabaseEnv } from '@/lib/supabase/env'

export async function updateSupabaseSession(request: NextRequest) {
	let response = NextResponse.next({ request })
	let env: { url: string; anonKey: string }

	try {
		env = getSupabaseEnv()
	} catch {
		return response
	}

	const { url, anonKey } = env

	const supabase = createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return request.cookies.getAll()
			},
			setAll(
				cookieList: { name: string; value: string; options?: CookieOptions }[],
			) {
				cookieList.forEach(({ name, value }) =>
					request.cookies.set(name, value),
				)
				response = NextResponse.next({ request })
				cookieList.forEach(({ name, value, options }) =>
					response.cookies.set(name, value, options),
				)
			},
		},
	})

	await supabase.auth.getUser()
	return response
}
