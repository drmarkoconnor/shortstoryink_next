import { FeedbackSubmissionSelector } from '@/components/writer/feedback-submission-selector'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type FeedbackSubmission = {
	id: string
	title: string
	status: string
	created_at: string
	version: number
}

function getAnchorField(anchor: unknown, field: 'quote' | 'categoryLabel') {
	if (!anchor || typeof anchor !== 'object' || !(field in anchor)) {
		return ''
	}

	const value = (anchor as Record<string, unknown>)[field]
	return typeof value === 'string' ? value : ''
}

export default async function WriterFeedbackPage() {
	await requireWriter()
	const user = await getCurrentUser()
	const supabase = await createServerSupabaseClient()

	let submissions: FeedbackSubmission[] = []
	let loadError: string | null = null

	const submissionsResult = await supabase
		.from('submissions')
		.select('id, title, status, created_at, version')
		.eq('author_id', user.id)
		.eq('status', 'feedback_published')
		.order('created_at', { ascending: false })

	if (submissionsResult.error) {
		loadError = submissionsResult.error.message
	} else {
		submissions = (submissionsResult.data ?? []) as FeedbackSubmission[]
	}

	const submissionIds = submissions.map((item) => item.id)
	let summariesBySubmission: Record<string, string> = {}
	let feedbackCountBySubmission: Record<string, number> = {}
	let feedbackCommentsBySubmission: Record<
		string,
		Array<{
			id: string
			comment: string
			quote: string
			categoryLabel?: string
		}>
	> = {}

	if (!loadError && submissionIds.length > 0) {
		const summariesResult = await supabase
			.from('feedback_summaries')
			.select('submission_id, summary')
			.in('submission_id', submissionIds)

		summariesBySubmission = Object.fromEntries(
			(summariesResult.data ?? []).map((entry) => [
				entry.submission_id as string,
				(entry.summary as string | null) ?? '',
			]),
		)

		const feedbackItemsResult = await supabase
			.from('feedback_items')
			.select('id, submission_id, comment, anchor')
			.in('submission_id', submissionIds)

		feedbackCountBySubmission = (feedbackItemsResult.data ?? []).reduce(
			(acc, row) => {
				const key = row.submission_id as string
				acc[key] = (acc[key] ?? 0) + 1
				return acc
			},
			{} as Record<string, number>,
		)

		feedbackCommentsBySubmission = (feedbackItemsResult.data ?? []).reduce(
			(acc, row) => {
				const key = row.submission_id as string
				if (!acc[key]) {
					acc[key] = []
				}
				acc[key].push({
					id: row.id as string,
					comment: (row.comment as string | null) ?? '',
					quote: getAnchorField(row.anchor, 'quote'),
					categoryLabel: getAnchorField(row.anchor, 'categoryLabel'),
				})
				return acc
			},
			{} as Record<
				string,
				Array<{
					id: string
					comment: string
					quote: string
					categoryLabel?: string
				}>
			>,
		)
	}

	const feedbackSubmissions = submissions.map((submission) => ({
		id: submission.id,
		title: submission.title,
		createdAt: submission.created_at,
		version: submission.version,
		summary: summariesBySubmission[submission.id] ?? '',
		commentCount: feedbackCountBySubmission[submission.id] ?? 0,
		comments: feedbackCommentsBySubmission[submission.id] ?? [],
	}))

	return (
		<section className="space-y-5">
			<div className="surface p-5 lg:p-6">
				<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
					Feedback
				</p>
				<h1 className="literary-title mt-2 text-3xl text-parchment-100">
					Published feedback
				</h1>
				<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
					Feedback appears here after a teacher publishes review notes.
				</p>
			</div>

			<div className="surface p-5 lg:p-6">
				{loadError ? (
					<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						Unable to load published feedback: {loadError}
					</p>
				) : (
					<FeedbackSubmissionSelector submissions={feedbackSubmissions} />
				)}
			</div>
		</section>
	)
}
