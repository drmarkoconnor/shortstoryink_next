import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseEnv } from '@/lib/supabase/env'

export async function createServerSupabaseClient() {
	const cookieStore = await cookies()
	const { url, anonKey } = getSupabaseEnv()

	return createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll()
			},
			setAll() {
				// No-op: Cookie writes are only allowed in Server Actions or Route Handlers
				// This prevents runtime errors in layouts/pages
			},
		},
	})
}
