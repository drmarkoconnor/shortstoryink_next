import Link from 'next/link'
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
			.select('submission_id')
			.in('submission_id', submissionIds)

		feedbackCountBySubmission = (feedbackItemsResult.data ?? []).reduce(
			(acc, row) => {
				const key = row.submission_id as string
				acc[key] = (acc[key] ?? 0) + 1
				return acc
			},
			{} as Record<string, number>,
		)
	}

	return (
		<section className="space-y-5">
			<div className="surface p-6 lg:p-8">
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

			<div className="surface p-6 lg:p-8">
				{loadError ? (
					<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						Unable to load published feedback: {loadError}
					</p>
				) : submissions.length === 0 ? (
					<p className="text-sm text-silver-300">No published feedback yet.</p>
				) : (
					<ul className="space-y-2.5">
						{submissions.map((submission) => (
							<li
								key={submission.id}
								className="rounded-2xl border border-white/10 bg-ink-900/35 p-4 transition hover:border-white/15 hover:bg-ink-900/45">
								<div className="flex flex-wrap items-start justify-between gap-2">
									<div>
										<p className="text-sm font-medium text-parchment-100">
											{submission.title}
										</p>
										<p className="mt-1 text-xs text-silver-300">
											{submission.created_at
												? new Date(submission.created_at).toLocaleString()
												: 'Unknown date'}
											{' · '}
											{feedbackCountBySubmission[submission.id] ?? 0} comments {' · '}
											Version {submission.version}
										</p>
									</div>
									<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
										Published
									</p>
								</div>
								<p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-silver-100">
									{summariesBySubmission[submission.id] ||
										'No summary published.'}
								</p>
								<div className="mt-3 flex flex-wrap gap-3 text-xs">
									<Link
										href={`/app/writer/feedback/${submission.id}`}
										className="text-accent-200 hover:text-accent-100">
										Open full inline feedback
									</Link>
									<Link
										href={`/app/writer/revise/${submission.id}`}
										className="text-silver-200 hover:text-parchment-100">
										Start revision
									</Link>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	)
}
