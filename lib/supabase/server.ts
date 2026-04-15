import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { getSupabaseEnv } from '@/lib/supabase/env'

export async function createServerSupabaseClient() {
	const cookieStore = await cookies()
	const { url, anonKey } = getSupabaseEnv()

	return createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll()
			},
			setAll(
				cookieList: { name: string; value: string; options?: CookieOptions }[],
			) {
				cookieList.forEach(({ name, value, options }) => {
					cookieStore.set(name, value, options)
				})
			},
		},
	})
}

