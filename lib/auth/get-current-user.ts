import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
	let supabase

	try {
		supabase = await createServerSupabaseClient()
	} catch {
		redirect('/auth/sign-in?error=config')
	}

	const {
		data: { user },
		error,
	} = await supabase.auth.getUser()

	if (error || !user) {
		redirect('/auth/sign-in')
	}

	return user
}

