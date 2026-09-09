import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createAdminDataClient } from '@/lib/data/client'
import { ensureAbuMembership } from '@/lib/workshop/access-groups'

export type AppRole = 'writer' | 'teacher' | 'admin'

export const getCurrentProfile = cache(async function getCurrentProfile() {
	const user = await getCurrentUser()
	const adminData = createAdminDataClient()

	const { data, error } = await adminData
		.from('profiles')
		.select('role, display_name')
		.eq('id', user.id)
		.maybeSingle()

	if (error) {
		throw new Error('Your profile could not be loaded. Please try again shortly.')
	}

	let profileFound = Boolean(data?.role)
	let role: AppRole = (data?.role as AppRole | undefined) ?? 'writer'
	let displayName = (data?.display_name as string | null | undefined) ?? null

	if (!data?.role) {
		const fallbackDisplayName =
			(user.user_metadata?.display_name as string | undefined) ||
			(user.user_metadata?.name as string | undefined) ||
			String(user.email ?? 'Writer').split('@')[0]

		const { error: insertError } = await adminData
			.from('profiles')
			.insert({
				id: user.id,
				role: 'writer',
				display_name: fallbackDisplayName,
			})

		if (insertError) {
			throw new Error('Your profile could not be prepared. Please try again shortly.')
		}

		profileFound = true
		role = 'writer'
		displayName = fallbackDisplayName
	}

	if (role === 'writer') {
		try {
			await ensureAbuMembership(user.id)
		} catch (membershipError) {
			console.error('[getCurrentProfile] Failed to ensure ABU membership:', {
				userId: user.id,
				membershipError,
			})
		}
	}

	return { user, role, profileFound, displayName }
})

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
