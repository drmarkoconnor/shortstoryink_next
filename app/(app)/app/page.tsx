import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'

export default async function AppOverviewPage() {
	const profile = await getCurrentProfile()

	if (profile.role === 'teacher' || profile.role === 'admin') {
		redirect('/app/teacher')
	}

	redirect('/app/writer')
}

