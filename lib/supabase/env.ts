export function getSupabaseEnv() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
	const anonKey =
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

	if (!url || !anonKey) {
		throw new Error(
			'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL + SUPABASE_ANON_KEY).',
		)
	}

	return { url, anonKey }
}

export function getSupabaseAdminEnv() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

	if (!url || !serviceRoleKey) {
		throw new Error(
			'Missing Supabase admin environment variables. Set SUPABASE_SERVICE_ROLE_KEY and a Supabase URL.',
		)
	}

	return { url, serviceRoleKey }
}

