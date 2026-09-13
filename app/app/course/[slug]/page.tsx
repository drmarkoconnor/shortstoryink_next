import { companionDocuments } from '@/lib/course/companion-documents'
import { notFound, redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { lessons } from '@/lib/course/content'
import { LessonPage } from '@/components/course/lesson-page'
import { WorkshopGuidance } from '@/components/course/workshop-guidance'
import { saveCommonplace } from '@/app/app/writer/commonplace/actions'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	const profile = await getCurrentProfile()

	if (profile.role === 'writer') {
		redirect('/app/writer')
	}

	if (slug === 'returning' || slug === 'reading-together') {
		return <WorkshopGuidance returning={slug === 'returning'} />
	}

	if (!Object.hasOwn(lessons, slug)) notFound()

	return (
		<LessonPage
			slug={slug}
			teacher
			companions={await companionDocuments(lessons[slug].companionTitles)}
			onSave={saveCommonplace}
		/>
	)
}
