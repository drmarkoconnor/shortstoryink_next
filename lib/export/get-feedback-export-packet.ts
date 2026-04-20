import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type FeedbackKind = 'typo' | 'craft' | 'pacing' | 'structure'

type ExportAnchor = {
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

export type ExportFeedbackItem = {
	id: string
	comment: string
	createdAt: string
	authorId: string
	authorName: string
	anchor: ExportAnchor | null
}

export type ExportSnippetItem = {
	id: string
	text: string
	note: string | null
	createdAt: string
	anchor: ExportAnchor
	categoryName: string | null
}

export type FeedbackExportPacket = {
	submissionId: string
	title: string
	writerId: string
	writerName: string
	status: string
	version: number
	source: 'workshop' | 'try_writing'
	createdAt: string
	paragraphs: Array<{ id: string; text: string }>
	summary: {
		text: string
		publishedAt: string | null
		authorId: string | null
		authorName: string
	} | null
	feedback: ExportFeedbackItem[]
	snippets: ExportSnippetItem[]
}

function isAnchor(value: unknown): value is ExportAnchor {
	if (!value || typeof value !== 'object') {
		return false
	}

	return (
		'blockId' in value &&
		'startOffset' in value &&
		'endOffset' in value &&
		'quote' in value
	)
}

function normalizeAnchor(value: unknown): ExportAnchor | null {
	if (!isAnchor(value)) {
		return null
	}

	return {
		blockId: String(value.blockId),
		startOffset: Number(value.startOffset),
		endOffset: Number(value.endOffset),
		quote: String(value.quote ?? ''),
		prefix: typeof value.prefix === 'string' ? value.prefix : undefined,
		suffix: typeof value.suffix === 'string' ? value.suffix : undefined,
		categoryLabel:
			typeof value.categoryLabel === 'string' ? value.categoryLabel : undefined,
		categorySlug:
			typeof value.categorySlug === 'string' ? value.categorySlug : undefined,
		kind:
			value.kind === 'typo' ||
			value.kind === 'craft' ||
			value.kind === 'pacing' ||
			value.kind === 'structure'
				? value.kind
				: 'craft',
	}
}

export async function getFeedbackExportPacket(
	submissionId: string,
	savedByTeacherId: string,
) {
	const supabase = await createServerSupabaseClient()

	const submissionResult = await supabase
		.from('submissions')
		.select(
			'id, title, body, status, created_at, author_id, version, source',
		)
		.eq('id', submissionId)
		.maybeSingle()

	if (submissionResult.error || !submissionResult.data) {
		return null
	}

	const submission = submissionResult.data as {
		id: string
		title: string
		body: string
		status: string
		created_at: string
		author_id: string
		version: number
		source?: string
	}

	const writerResult = await supabase
		.from('profiles')
		.select('display_name')
		.eq('id', submission.author_id)
		.maybeSingle()

	const feedbackResult = await supabase
		.from('feedback_items')
		.select('id, comment, anchor, created_at, author_id')
		.eq('submission_id', submission.id)
		.order('created_at', { ascending: true })

	const summaryResult = await supabase
		.from('feedback_summaries')
		.select('summary, published_at, author_id')
		.eq('submission_id', submission.id)
		.maybeSingle()

	const snippetsResult = await supabase
		.from('snippets')
		.select('id, snippet_text, note, created_at, anchor, snippet_category_id')
		.eq('source_submission_id', submission.id)
		.eq('saved_by', savedByTeacherId)
		.order('created_at', { ascending: true })

	const feedbackRows = (feedbackResult.data ?? []) as Array<{
		id: string
		comment: string
		anchor: unknown
		created_at: string
		author_id: string
	}>

	const feedbackAuthorIds = [
		...new Set(feedbackRows.map((item) => item.author_id).filter(Boolean)),
	]
	const summaryAuthorId =
		(summaryResult.data?.author_id as string | undefined) ?? null
	const authorIds = [
		...new Set(
			[...feedbackAuthorIds, summaryAuthorId].filter(
				(value): value is string => Boolean(value),
			),
		),
	]

	let authorNameById: Record<string, string> = {}
	if (authorIds.length > 0) {
		const authorLookup = await supabase
			.from('profiles')
			.select('id, display_name')
			.in('id', authorIds)

		authorNameById = Object.fromEntries(
			(authorLookup.data ?? []).map((item) => [
				item.id as string,
				(item.display_name as string | null) ?? 'Teacher',
			]),
		)
	}

	const snippetRows = (snippetsResult.data ?? []) as Array<{
		id: string
		snippet_text: string
		note: string | null
		created_at: string
		anchor: unknown
		snippet_category_id: string | null
	}>

	const snippetCategoryIds = [
		...new Set(
			snippetRows
				.map((item) => item.snippet_category_id)
				.filter((value): value is string => Boolean(value)),
		),
	]

	let snippetCategoryNameById: Record<string, string> = {}
	if (snippetCategoryIds.length > 0) {
		const categoryLookup = await supabase
			.from('snippet_categories')
			.select('id, name')
			.in('id', snippetCategoryIds)

		snippetCategoryNameById = Object.fromEntries(
			(categoryLookup.data ?? []).map((item) => [
				item.id as string,
				(item.name as string | null) ?? 'Category',
			]),
		)
	}

	const feedback: ExportFeedbackItem[] = feedbackRows.map((item) => ({
		id: item.id,
		comment: item.comment,
		createdAt: item.created_at,
		authorId: item.author_id,
		authorName: authorNameById[item.author_id] ?? 'Teacher',
		anchor: normalizeAnchor(item.anchor),
	}))

	const snippets: ExportSnippetItem[] = snippetRows
		.map((item) => ({
			id: item.id,
			text: item.snippet_text,
			note: item.note,
			createdAt: item.created_at,
			anchor: normalizeAnchor(item.anchor),
			categoryName: item.snippet_category_id
				? snippetCategoryNameById[item.snippet_category_id] ?? null
				: null,
		}))
		.filter((item): item is ExportSnippetItem => Boolean(item.anchor))

	return {
		submissionId: submission.id,
		title: submission.title,
		writerId: submission.author_id,
		writerName:
			(writerResult.data?.display_name as string | null | undefined) ?? 'Writer',
		status: submission.status,
		version: submission.version,
		source: submission.source === 'try_writing' ? 'try_writing' : 'workshop',
		createdAt: submission.created_at,
		paragraphs: toManuscriptParagraphs(submission.body),
		summary: summaryResult.data
			? {
					text: (summaryResult.data.summary as string | null) ?? '',
					publishedAt:
						(summaryResult.data.published_at as string | null) ?? null,
					authorId:
						(summaryResult.data.author_id as string | null | undefined) ?? null,
					authorName:
						authorNameById[
							(summaryResult.data.author_id as string | undefined) ?? ''
						] ?? 'Teacher',
				}
			: null,
		feedback,
		snippets,
	} satisfies FeedbackExportPacket
}
