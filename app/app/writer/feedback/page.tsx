import { FeedbackSubmissionSelector } from '@/components/writer/feedback-submission-selector'
import Link from 'next/link'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

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
	const adminSupabase = createAdminSupabaseClient()

	let submissions: FeedbackSubmission[] = []
	let loadError: string | null = null

	const submissionsResult = await adminSupabase
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
		const summariesResult = await adminSupabase
			.from('feedback_summaries')
			.select('submission_id, summary')
			.in('submission_id', submissionIds)

		summariesBySubmission = Object.fromEntries(
			(summariesResult.data ?? []).map((entry) => [
				entry.submission_id as string,
				(entry.summary as string | null) ?? '',
			]),
		)

		const feedbackItemsResult = await adminSupabase
			.from('feedback_items')
			.select('id, submission_id, comment, anchor')
			.in('submission_id', submissionIds)
			.order('created_at', { ascending: false })

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
	const latestSubmission = feedbackSubmissions[0] ?? null

	return (
		<section className="space-y-5">
			<div className="surface p-5 lg:p-6">
				<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
					Finished pieces
				</p>
				<h1 className="literary-title mt-2 text-3xl text-parchment-100">
					Finished pieces
				</h1>
				<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
					Returned work appears here after a teacher publishes feedback, ready
					to reread with notes in place.
				</p>
			</div>

			<div className="surface p-5 lg:p-6">
				{loadError ? (
					<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						Unable to load published feedback: {loadError}
					</p>
				) : latestSubmission ? (
					<div className="space-y-5">
						<div className="rounded-2xl border border-accent-300/25 bg-accent-300/10 p-4 lg:p-5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<p className="text-xs uppercase tracking-[0.12em] text-accent-200">
										Latest finished piece
									</p>
									<h2 className="literary-title mt-2 line-clamp-2 text-2xl text-parchment-100">
										{latestSubmission.title}
									</h2>
									<p className="mt-2 text-xs leading-relaxed text-silver-300">
										Version {latestSubmission.version} {' · '}
										{new Date(latestSubmission.createdAt).toLocaleString()} {' · '}
										{latestSubmission.commentCount} comments
									</p>
								</div>
								<Link
									href={`/app/writer/feedback/${latestSubmission.id}`}
									className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30">
									Open finished piece
								</Link>
							</div>
						</div>
						<FeedbackSubmissionSelector submissions={feedbackSubmissions} />
					</div>
				) : (
					<FeedbackSubmissionSelector submissions={feedbackSubmissions} />
				)}
			</div>
		</section>
	)
}
