import Link from 'next/link'
import { notFound } from 'next/navigation'
import { WriterFeedbackReadingWorkspace } from '@/components/writer/feedback-reading-workspace'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type FeedbackKind = 'typo' | 'craft' | 'pacing' | 'structure'

type FeedbackAnchor = {
	blockId: string
	startOffset: number
	endOffset: number
	quote: string
	prefix?: string
	suffix?: string
	kind?: FeedbackKind
}

type FeedbackItem = {
	id: string
	comment: string
	anchor: FeedbackAnchor | null
	created_at: string
}

function isFeedbackAnchor(value: unknown): value is FeedbackAnchor {
	if (!value || typeof value !== 'object') {
		return false
	}

	return 'blockId' in value && 'startOffset' in value && 'endOffset' in value
}

export default async function WriterFeedbackDetailPage({
	params,
}: {
	params: Promise<{ submissionId: string }>
}) {
	await requireWriter()
	const user = await getCurrentUser()
	const { submissionId } = await params
	const supabase = await createServerSupabaseClient()

	const submissionResult = await supabase
		.from('submissions')
		.select('id, title, body, status, created_at, author_id, version')
		.eq('id', submissionId)
		.eq('author_id', user.id)
		.eq('status', 'feedback_published')
		.maybeSingle()

	if (submissionResult.error || !submissionResult.data) {
		notFound()
	}

	const submission = submissionResult.data as {
		id: string
		title: string
		body: string
		status: string
		created_at: string
		version: number
	}

	const paragraphs = toManuscriptParagraphs(submission.body)

	const feedbackRowsResult = await supabase
		.from('feedback_items')
		.select('id, comment, anchor, created_at')
		.eq('submission_id', submission.id)
		.order('created_at', { ascending: true })

	const feedbackRows = (feedbackRowsResult.data ?? []) as Array<{
		id: string
		comment: string
		anchor: unknown
		created_at: string
	}>

	const feedback: FeedbackItem[] = feedbackRows.map((item) => ({
		id: item.id,
		comment: item.comment,
		created_at: item.created_at,
		anchor: isFeedbackAnchor(item.anchor)
			? {
					blockId: String(item.anchor.blockId),
					startOffset: Number(item.anchor.startOffset),
					endOffset: Number(item.anchor.endOffset),
					quote: String(item.anchor.quote ?? ''),
					prefix:
						typeof item.anchor.prefix === 'string'
							? item.anchor.prefix
							: undefined,
					suffix:
						typeof item.anchor.suffix === 'string'
							? item.anchor.suffix
							: undefined,
					kind:
						item.anchor.kind === 'typo' ||
						item.anchor.kind === 'craft' ||
						item.anchor.kind === 'pacing' ||
						item.anchor.kind === 'structure'
							? item.anchor.kind
							: 'craft',
				}
			: null,
	}))

	const summaryResult = await supabase
		.from('feedback_summaries')
		.select('summary, published_at')
		.eq('submission_id', submission.id)
		.maybeSingle()

	return (
		<section className="space-y-4">
			<div className="surface p-6 lg:p-8">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p className="text-xs uppercase tracking-[0.11em] text-silver-300">
							Writer feedback detail
						</p>
						<h1 className="literary-title mt-1 text-3xl text-parchment-100">
							{submission.title}
						</h1>
						<p className="mt-1 text-xs text-silver-300">
							{submission.status.replaceAll('_', ' ')} {' · '}Version{' '}
							{submission.version} {' · '}
							{new Date(submission.created_at).toLocaleString()}
						</p>
					</div>
					<Link
						href={`/app/writer/revise/${submission.id}`}
						className="rounded-full border border-accent-400/60 bg-accent-400/15 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/25">
						Start revision
					</Link>
				</div>
				<p className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-silver-100">
					{summaryResult.data?.summary || 'No summary published.'}
				</p>
				{summaryResult.data?.published_at && (
					<p className="mt-2 text-xs text-silver-300">
						Published{' '}
						{new Date(summaryResult.data.published_at).toLocaleString()}
					</p>
				)}
			</div>

			<WriterFeedbackReadingWorkspace
				title={submission.title}
				paragraphs={paragraphs}
				feedback={feedback.map((item) => ({
					id: item.id,
					comment: item.comment,
					anchor: item.anchor,
					createdAt: item.created_at,
				}))}
			/>
		</section>
	)
}

