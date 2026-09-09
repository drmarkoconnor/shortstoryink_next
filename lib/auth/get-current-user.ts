import { redirect } from 'next/navigation'
import { cache } from 'react'
import { getStudioUser } from '@/lib/auth/studio-user'

export const getCurrentUser = cache(async function getCurrentUser() {
	const user = await getStudioUser()
	if (!user) {
		redirect('/auth/sign-in')
	}

	return user
})
