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
	categoryLabel?: string
	categorySlug?: string
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
					categoryLabel:
						typeof item.anchor.categoryLabel === 'string'
							? item.anchor.categoryLabel
							: undefined,
					categorySlug:
						typeof item.anchor.categorySlug === 'string'
							? item.anchor.categorySlug
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
		<section>
			<WriterFeedbackReadingWorkspace
				submissionId={submission.id}
				title={submission.title}
				status={submission.status}
				version={submission.version}
				createdAt={submission.created_at}
				summary={summaryResult.data?.summary ?? null}
				publishedAt={summaryResult.data?.published_at ?? null}
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
