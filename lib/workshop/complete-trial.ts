import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getOrCreateTryWritingWorkshopId } from '@/lib/workshop/try-writing'

type PendingTrySubmission = {
	id: string
	email: string
	title: string
	body: string
	status: string
	converted_submission_id: string | null
}

async function loadPendingSubmission(
	adminSupabase: ReturnType<typeof createAdminSupabaseClient>,
	currentEmail: string,
	pendingId?: string,
) {
	if (pendingId) {
		const { data, error } = await adminSupabase
			.from('pending_try_submissions')
			.select('id, email, title, body, status, converted_submission_id')
			.eq('id', pendingId)
			.maybeSingle()

		if (error || !data) {
			return null
		}

		return data as PendingTrySubmission
	}

	const { data, error } = await adminSupabase
		.from('pending_try_submissions')
		.select('id, email, title, body, status, converted_submission_id')
		.eq('email', currentEmail)
		.eq('status', 'pending_confirmation')
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle()

	if (error || !data) {
		return null
	}

	return data as PendingTrySubmission
}

export async function completeTrialSubmission(pendingId?: string) {
	const profile = await getCurrentProfile()
	const currentEmail = (profile.user.email ?? '').trim().toLowerCase()
	const adminSupabase = createAdminSupabaseClient()

	const pending = await loadPendingSubmission(
		adminSupabase,
		currentEmail,
		pendingId,
	)

	if (!pending) {
		redirect('/try-writing?error=That+trial+submission+could+not+be+found.')
	}

	if (pending.email.trim().toLowerCase() !== currentEmail) {
		redirect('/try-writing?error=This+magic+link+belongs+to+a+different+email.')
	}

	if (pending.converted_submission_id) {
		redirect('/app/writer?notice=Your+trial+draft+is+already+in+the+workshop.')
	}

	const workshopId = await getOrCreateTryWritingWorkshopId()
	const { data: submission, error: submissionError } = await adminSupabase
		.from('submissions')
		.insert({
			author_id: profile.user.id,
			workshop_id: workshopId,
			title: pending.title,
			body: pending.body,
			version: 1,
			status: 'submitted',
			source: 'try_writing',
		})
		.select('id')
		.single()

	if (submissionError || !submission?.id) {
		redirect('/try-writing?error=Unable+to+move+your+draft+into+the+workshop.')
	}

	await adminSupabase
		.from('pending_try_submissions')
		.update({
			status: 'consumed',
			confirmed_at: new Date().toISOString(),
			consumed_at: new Date().toISOString(),
			claimed_by: profile.user.id,
			converted_submission_id: submission.id,
		})
		.eq('id', pending.id)

	revalidatePath('/app/writer')
	revalidatePath('/app/teacher')
	revalidatePath('/app/teacher/review-desk')
	redirect('/app/writer?notice=Your+trial+draft+has+been+submitted+for+feedback.')
}