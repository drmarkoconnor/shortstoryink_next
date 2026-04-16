import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type AppRole = 'writer' | 'teacher' | 'admin'

export async function getCurrentProfile() {
	const user = await getCurrentUser()
	const supabase = await createServerSupabaseClient()

	const { data, error } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.maybeSingle()

	if (error) {
		return { user, role: 'writer' as AppRole, profileFound: false }
	}

	if (!data?.role) {
		const { error: insertError } = await supabase
			.from('profiles')
			.insert({ id: user.id, role: 'writer' })

		if (insertError) {
			return { user, role: 'writer' as AppRole, profileFound: false }
		}

		return { user, role: 'writer' as AppRole, profileFound: true }
	}

	return { user, role: data.role as AppRole, profileFound: true }
}

export async function requireTeacher() {
	const profile = await getCurrentProfile()

	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		redirect('/app/writer?error=Teacher+access+only.')
	}

	return profile
}

export async function requireWriter() {
	const profile = await getCurrentProfile()

	if (profile.role === 'teacher' || profile.role === 'admin') {
		redirect(
			'/app/teacher/review-desk?error=Writer+area+is+for+writer+accounts+only.',
		)
	}

	return profile
}

