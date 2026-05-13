import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const getCurrentUser = cache(async function getCurrentUser() {
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
})
