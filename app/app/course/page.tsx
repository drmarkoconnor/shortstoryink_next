import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { CourseOverview } from '@/components/course/course-overview'

export default async function Page() {
	const profile = await getCurrentProfile()

	if (profile.role === 'writer') {
		redirect('/app/writer')
	}

	return <CourseOverview teacher />
}
