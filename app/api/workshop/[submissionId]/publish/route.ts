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
	const payload = (await request.json()) as { summary?: string }
	const summary = String(payload.summary ?? '').trim()

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

	const { count, error: countError } = await supabase
		.from('feedback_items')
		.select('id', { count: 'exact', head: true })
		.eq('submission_id', submissionId)

	if (countError) {
		return NextResponse.json(
			{ error: 'Unable to validate feedback items before publish.' },
			{ status: 500 },
		)
	}

	if (!count || count < 1) {
		return NextResponse.json(
			{ error: 'Add at least one feedback comment before publish.' },
			{ status: 400 },
		)
	}

	const publishedAt = new Date().toISOString()
	const { error: upsertError } = await supabase
		.from('feedback_summaries')
		.upsert(
			{
				submission_id: submissionId,
				author_id: profile.user.id,
				summary:
					summary || 'Feedback published. See inline comments for detail.',
				published_at: publishedAt,
			},
			{ onConflict: 'submission_id' },
		)

	if (upsertError) {
		return NextResponse.json(
			{ error: 'Unable to save feedback summary.' },
			{ status: 500 },
		)
	}

	const { error: statusError } = await supabase
		.from('submissions')
		.update({ status: 'feedback_published' })
		.eq('id', submissionId)

	if (statusError) {
		return NextResponse.json(
			{ error: 'Unable to update submission status to published.' },
			{ status: 500 },
		)
	}

	let notice = 'Feedback published to writer.'
	const email = await adminSupabase.auth.admin
		.getUserById(submissionResult.data.author_id as string)
		.then((result) => result.data.user?.email?.trim().toLowerCase() ?? null)
		.catch(() => null)

	if (email) {
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
