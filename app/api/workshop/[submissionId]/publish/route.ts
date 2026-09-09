import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { sendFeedbackPublishedNotification } from '@/lib/notifications/email'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ submissionId: string }> },
) {
	const profile = await requireTeacher()
	const { submissionId } = await params
	const supabase = await createServerSupabaseClient()
	const adminSupabase = createAdminSupabaseClient()
	const payload: unknown = await request.json().catch(() => null)
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return NextResponse.json({ error: 'Please send a feedback summary.' }, { status: 400 })
	}
	const value = (payload as { summary?: unknown }).summary
	if (value !== undefined && typeof value !== 'string') {
		return NextResponse.json({ error: 'The summary must be text.' }, { status: 400 })
	}
	const summary = (value ?? '').trim()

	const submissionResult = await supabase
		.from('submissions')
		.select('id, title, author_id')
		.eq('id', submissionId)
		.maybeSingle()

	if (submissionResult.error || !submissionResult.data) {
		return NextResponse.json(
			{ error: 'Publish is only available in the modern submission workspace.' },
			{ status: 400 },
		)
	}

	const { data: publication, error: publishError } = await adminSupabase.rpc('publish_workshop_feedback', {
		p_teacher_id: profile.user.id, p_submission_id: submissionId, p_summary: summary,
	})
	if (publishError || !publication) {
		return NextResponse.json(
			{ error: publishError?.code === '22023' ? publishError.message : 'Unable to publish feedback. Please try again.' },
			{ status: publishError?.code === '22023' ? 400 : 500 },
		)
	}
	const publishedAt = String(publication.publishedAt)

	let notice = 'Feedback published to writer.'
	const email = await adminSupabase.auth.admin
		.getUserById(submissionResult.data.author_id as string)
		.then((result) => result.data.user?.email?.trim().toLowerCase() ?? null)
		.catch(() => null)

	if (email && publication.changed) {
		try {
			await sendFeedbackPublishedNotification({
				email,
				title: (submissionResult.data.title as string | undefined) ?? 'Submission',
				submissionId,
			})
		} catch {
			notice = 'Feedback published. Email notification could not be sent.'
		}
	}

	revalidatePath(`/app/workshop/${submissionId}`)
	revalidatePath('/app/teacher/review-desk')
	revalidatePath('/app/teacher/archive')
	revalidatePath('/app/writer')
	revalidatePath('/app/writer/feedback')

	return NextResponse.json({
		notice,
		publishedAt,
		status: 'feedback_published',
	})
}
