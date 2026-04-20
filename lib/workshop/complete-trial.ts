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
	created_at: string
}

function normalizeEmailForComparison(value: string | null | undefined) {
	const raw = (value ?? '').trim().toLowerCase()
	if (!raw || !raw.includes('@')) {
		return raw
	}

	const [localPart, domainPart] = raw.split('@')
	if (!localPart || !domainPart) {
		return raw
	}

	if (domainPart === 'gmail.com' || domainPart === 'googlemail.com') {
		const canonicalLocal = localPart.split('+')[0].replace(/\./g, '')
		return `${canonicalLocal}@gmail.com`
	}

	return raw
}

async function loadPendingSubmission(
	adminSupabase: ReturnType<typeof createAdminSupabaseClient>,
	currentEmail: string,
	pendingId?: string,
) {
	if (pendingId) {
		const { data, error } = await adminSupabase
			.from('pending_try_submissions')
			.select('id, email, title, body, status, converted_submission_id, created_at')
			.eq('id', pendingId)
			.maybeSingle()

		if (error || !data) {
			return null
		}

		return data as PendingTrySubmission
	}

	const { data, error } = await adminSupabase
		.from('pending_try_submissions')
		.select('id, email, title, body, status, converted_submission_id, created_at')
		.eq('status', 'pending_confirmation')
		.order('created_at', { ascending: false })
		.limit(20)

	if (error || !data || data.length === 0) {
		return null
	}

	const normalizedCurrent = normalizeEmailForComparison(currentEmail)
	const match = (data as PendingTrySubmission[]).find(
		(item) =>
			normalizeEmailForComparison(item.email) === normalizedCurrent,
	)

	return match ?? null
}

export async function completeTrialSubmission(pendingId?: string) {
	const profile = await getCurrentProfile()
	const currentEmail = (profile.user.email ?? '').trim().toLowerCase()
	const adminSupabase = createAdminSupabaseClient()

	// Ensure a profile row exists for this user (best practice, anti-abuse: only after verified sign-in)
	const { data: existingProfile, error: profileLookupError } = await adminSupabase
		.from('profiles')
		.select('id')
		.eq('id', profile.user.id)
		.single()

	if (profileLookupError || !existingProfile) {
		// Only create if not found; minimal info, can be expanded later
		const { error: createProfileError } = await adminSupabase
			.from('profiles')
			.insert({
				id: profile.user.id,
				email: currentEmail,
			})
		if (createProfileError) {
			console.error('[completeTrialSubmission] Failed to create profile row:', {
				userId: profile.user.id,
				email: currentEmail,
				createProfileError,
			})
			redirect('/try-writing?error=Unable+to+create+your+profile.')
		}
	}

	const pending = await loadPendingSubmission(
		adminSupabase,
		currentEmail,
		pendingId,
	)

	if (!pending) {
		redirect('/try-writing?error=That+trial+submission+could+not+be+found.')
	}

	if (
		normalizeEmailForComparison(pending.email) !==
		normalizeEmailForComparison(currentEmail)
	) {
		redirect('/try-writing?error=This+magic+link+belongs+to+a+different+email.')
	}

	if (pending.converted_submission_id) {
		redirect('/app/writer?notice=Your+trial+draft+is+already+in+the+workshop.')
	}

	const workshopId = await getOrCreateTryWritingWorkshopId()
	const insertData = {
		author_id: profile.user.id,
		workshop_id: workshopId,
		title: pending.title,
		body: pending.body,
		version: 1,
		status: 'submitted',
		source: 'try_writing',
	}
	const { data: submission, error: submissionError } = await adminSupabase
		.from('submissions')
		.insert(insertData)
		.select('id')
		.single()

	if (submissionError || !submission?.id) {
		console.error('[completeTrialSubmission] Insert failed:', {
			insertData,
			submissionError,
			submission,
			profileUserId: profile.user.id,
			workshopId,
			pendingId,
			currentEmail,
			pendingEmail: pending.email,
		})
		redirect('/try-writing?error=Unable+to+move+your+draft+into+the+workshop.')
	}

	await adminSupabase
		.from('pending_try_submissions')
		.update({
			status: 'converted',
			converted_submission_id: submission.id,
		})
		.eq('id', pending.id)

	// TODO: The following revalidatePath calls were used to force ISR revalidation of workshop and teacher dashboards after a new submission.
	// They cannot be called during a server action or page render in Next.js 15+.
	// If/when you implement server actions or API routes for submission, move these calls there:
	// import { revalidatePath } from 'next/cache'
	// revalidatePath('/app/writer')
	// revalidatePath('/app/teacher')
	// revalidatePath('/app/teacher/review-desk')

	redirect('/app/writer?notice=Your+trial+draft+has+been+submitted+for+feedback.')
	revalidatePath('/app/teacher')
	revalidatePath('/app/teacher/review-desk')
	redirect('/app/writer?notice=Your+trial+draft+has+been+submitted+for+feedback.')
}