import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { ensureAbuMembership } from '@/lib/workshop/access-groups'

export type AppRole = 'writer' | 'teacher' | 'admin'

export async function getCurrentProfile() {
	const user = await getCurrentUser()
	const adminSupabase = createAdminSupabaseClient()

	const { data, error } = await adminSupabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.maybeSingle()

	if (error) {
		return { user, role: 'writer' as AppRole, profileFound: false }
	}

	let profileFound = Boolean(data?.role)
	let role: AppRole = (data?.role as AppRole | undefined) ?? 'writer'

	if (!data?.role) {
		const fallbackDisplayName =
			(user.user_metadata?.display_name as string | undefined) ||
			(user.user_metadata?.name as string | undefined) ||
			String(user.email ?? 'Writer').split('@')[0]

		const { error: insertError } = await adminSupabase
			.from('profiles')
			.insert({
				id: user.id,
				role: 'writer',
				display_name: fallbackDisplayName,
			})

		if (insertError) {
			return { user, role: 'writer' as AppRole, profileFound: false }
		}

		profileFound = true
		role = 'writer'
	}

	try {
		await ensureAbuMembership(user.id)
	} catch (membershipError) {
		console.error('[getCurrentProfile] Failed to ensure ABU membership:', {
			userId: user.id,
			membershipError,
		})
	}

	return { user, role, profileFound }
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
