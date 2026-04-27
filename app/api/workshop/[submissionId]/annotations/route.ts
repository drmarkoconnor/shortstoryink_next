import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { buildSnippetInsert } from '@/lib/snippets/build-snippet-insert'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type AnnotationPayload = {
	type?: 'comment' | 'snippet'
	id?: string
	sourceFeedbackItemId?: string
	blockId?: string
	startOffset?: number
	endOffset?: number
	quote?: string
	prefix?: string
	suffix?: string
	comment?: string
	note?: string
	feedbackCategoryLabel?: string
	tags?: string[]
	snippetCategoryId?: string
	snippetCategoryLabel?: string
	suggestedAction?: 'cut'
}

type SelectionAnchor = {
	blockId?: string
	startOffset?: number
	endOffset?: number
	quote?: string
	prefix?: string
	suffix?: string
	kind?: 'typo' | 'craft' | 'pacing' | 'structure'
	categoryLabel?: string
	categorySlug?: string
	tags?: string[]
	suggestedAction?: 'cut'
}

const fixedFeedbackCategoryLabels = [
	'Character',
	'Setting',
	'Plot',
	'Structure',
	'Pace',
	'Point of View',
	'Voice',
	'Dialogue',
	'Image/detail',
	'Opening',
	'Ending',
	'Sentence style',
	'Theme',
	'Clarity',
	'Cut/tighten',
	'Praise/strength',
]

function isNonEmptyString(value: unknown) {
	return typeof value === 'string' && value.trim().length > 0
}

function isSelectionAnchor(value: unknown): value is SelectionAnchor {
	if (!value || typeof value !== 'object') {
		return false
	}

	return 'blockId' in value || 'quote' in value
}

function toCategorySlug(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function normalizeFeedbackCategoryLabel(value: unknown, suggestedAction?: 'cut') {
	if (suggestedAction === 'cut') {
		return 'Cut/tighten'
	}

	const label = typeof value === 'string' ? value.trim() : ''
	return fixedFeedbackCategoryLabels.includes(label) ? label : 'Uncategorised'
}

function normalizeTags(value: unknown) {
	if (!Array.isArray(value)) {
		return []
	}

	return [
		...new Set(
			value
				.map((item) => String(item).trim())
				.filter(Boolean)
				.slice(0, 12),
		),
	]
}

function toSnippetResponse(row: {
	id: string
	note: string | null
	created_at: string
	anchor: unknown
	snippet_category_id: string | null
}) {
	return {
		id: row.id,
		note: row.note ?? '',
		createdAt: row.created_at,
		snippetCategoryId: row.snippet_category_id ?? null,
		anchor: row.anchor as {
			blockId: string
			startOffset: number
			endOffset: number
			quote: string
			prefix?: string
			suffix?: string
			categoryLabel?: string
			categorySlug?: string
			tags?: string[]
		},
	}
}

function toFeedbackResponse(row: {
	id: string
	comment: string
	created_at: string
	anchor: unknown
}) {
	return {
		id: row.id,
		comment: row.comment,
		createdAt: row.created_at,
		anchor: row.anchor as {
			blockId: string
			startOffset: number
			endOffset: number
			quote: string
			prefix?: string
			suffix?: string
			kind?: 'typo' | 'craft' | 'pacing' | 'structure'
			categoryLabel?: string
			categorySlug?: string
			tags?: string[]
			suggestedAction?: 'cut'
		},
	}
}

async function loadModernSubmission(submissionId: string) {
	const supabase = await createServerSupabaseClient()
	const submissionResult = await supabase
		.from('submissions')
		.select('id, author_id, status')
		.eq('id', submissionId)
		.maybeSingle()

	return {
		supabase,
		submissionResult,
	}
}

function publishedFeedbackMutationBlocked(status: string | null | undefined) {
	return status === 'feedback_published'
}

function publishedFeedbackMutationResponse() {
	return NextResponse.json(
		{
			error:
				'Published feedback is locked. Comments and snippets cannot be created or edited after publish.',
		},
		{ status: 409 },
	)
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ submissionId: string }> },
) {
	const profile = await requireTeacher()
	const { submissionId } = await params
	const { supabase, submissionResult } = await loadModernSubmission(submissionId)
	const payload = (await request.json()) as AnnotationPayload

	const type = payload.type
	const blockId = String(payload.blockId ?? '').trim()
	const quote = String(payload.quote ?? '').trim()
	const prefix = String(payload.prefix ?? '').trim()
	const suffix = String(payload.suffix ?? '').trim()
	const comment = String(payload.comment ?? '')
	const suggestedAction = payload.suggestedAction === 'cut' ? 'cut' : undefined
	const feedbackCategoryLabel = normalizeFeedbackCategoryLabel(
		payload.feedbackCategoryLabel,
		suggestedAction,
	)
	const snippetCategoryLabel = normalizeFeedbackCategoryLabel(
		payload.snippetCategoryLabel ?? payload.feedbackCategoryLabel,
	)
	const snippetTags = normalizeTags(payload.tags)
	const startOffset = Number(payload.startOffset ?? -1)
	const endOffset = Number(payload.endOffset ?? -1)

	if (
		(type !== 'comment' && type !== 'snippet') ||
		!blockId ||
		!quote ||
		!Number.isFinite(startOffset) ||
		!Number.isFinite(endOffset) ||
		startOffset < 0 ||
		endOffset <= startOffset
	) {
		return NextResponse.json(
			{ error: 'Select a valid passage before saving.' },
			{ status: 400 },
		)
	}

	if (submissionResult.error || !submissionResult.data?.author_id) {
		return NextResponse.json(
			{ error: 'Inline save is only available in the modern submission workspace.' },
			{ status: 400 },
		)
	}

	if (publishedFeedbackMutationBlocked(submissionResult.data.status)) {
		return publishedFeedbackMutationResponse()
	}

	const anchor = {
		blockId,
		startOffset,
		endOffset,
		quote,
		prefix,
		suffix,
	}

	if (type === 'comment') {
		if (!isNonEmptyString(comment)) {
			return NextResponse.json(
				{ error: 'Enter a comment before saving.' },
				{ status: 400 },
			)
		}

		const feedbackAnchor = {
			...anchor,
			kind: 'craft' as const,
			categoryLabel: feedbackCategoryLabel,
			categorySlug:
				feedbackCategoryLabel === 'Uncategorised'
					? 'uncategorised'
					: toCategorySlug(feedbackCategoryLabel),
			suggestedAction,
		}

		const insertResult = await supabase
			.from('feedback_items')
			.insert({
				submission_id: submissionId,
				author_id: profile.user.id,
				comment: comment.trim(),
				anchor: feedbackAnchor,
			})
			.select('id, comment, anchor, created_at')
			.single()

		if (insertResult.error || !insertResult.data) {
			return NextResponse.json(
				{ error: 'Unable to save comment.' },
				{ status: 500 },
			)
		}

		await supabase
			.from('submissions')
			.update({ status: 'in_review' })
			.eq('id', submissionId)
			.eq('status', 'submitted')

		revalidatePath('/app/teacher/review-desk')

		return NextResponse.json({
			notice: 'Comment saved.',
			feedback: toFeedbackResponse(
				insertResult.data as {
					id: string
					comment: string
					created_at: string
					anchor: unknown
				},
			),
		})
	}

	const sourceFeedbackItemId = String(payload.sourceFeedbackItemId ?? '').trim()
	const snippetInsert = buildSnippetInsert({
		savedBy: profile.user.id,
		capturedBy: profile.user.id,
		sourceType: sourceFeedbackItemId ? 'feedback_item' : 'submission',
		sourceSubmissionId: submissionId,
		sourceFeedbackItemId: sourceFeedbackItemId || null,
		sourceAuthorId: submissionResult.data.author_id as string,
		snippetCategoryId: null,
		anchor: {
			...anchor,
			categoryLabel: snippetCategoryLabel,
			categorySlug:
				snippetCategoryLabel === 'Uncategorised'
					? 'uncategorised'
					: toCategorySlug(snippetCategoryLabel),
			tags: snippetTags,
		},
		note: payload.note ?? null,
		visibility: 'private',
	})

	const snippetResult = await supabase
		.from('snippets')
		.insert(snippetInsert)
		.select('id, note, created_at, anchor, snippet_category_id')
		.single()

	if (snippetResult.error || !snippetResult.data) {
		return NextResponse.json(
			{ error: 'Unable to save snippet.' },
			{ status: 500 },
		)
	}

	revalidatePath('/app/teacher-studio')

	return NextResponse.json({
		notice: 'Snippet saved.',
		snippet: toSnippetResponse(
			snippetResult.data as {
				id: string
				note: string | null
				created_at: string
				anchor: unknown
				snippet_category_id: string | null
			},
		),
	})
}

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ submissionId: string }> },
) {
	await requireTeacher()
	const { submissionId } = await params
	const { supabase, submissionResult } = await loadModernSubmission(submissionId)
	const payload = (await request.json()) as AnnotationPayload
	const type = payload.type
	const id = String(payload.id ?? '').trim()

	if (submissionResult.error || !submissionResult.data?.author_id) {
		return NextResponse.json(
			{ error: 'Inline editing is only available in the modern submission workspace.' },
			{ status: 400 },
		)
	}

	if (publishedFeedbackMutationBlocked(submissionResult.data.status)) {
		return publishedFeedbackMutationResponse()
	}

	if (!id || (type !== 'comment' && type !== 'snippet')) {
		return NextResponse.json(
			{ error: 'Choose a saved annotation before editing.' },
			{ status: 400 },
		)
	}

	if (type === 'comment') {
		const comment = String(payload.comment ?? '').trim()
		const suggestedAction = payload.suggestedAction === 'cut' ? 'cut' : undefined
		const categoryLabel = normalizeFeedbackCategoryLabel(
			payload.feedbackCategoryLabel,
			suggestedAction,
		)
		const categorySlug =
			categoryLabel === 'Uncategorised'
				? 'uncategorised'
				: toCategorySlug(categoryLabel)
		const tags = normalizeTags(payload.tags)

		if (!comment) {
			return NextResponse.json(
				{ error: 'Enter a comment before saving.' },
				{ status: 400 },
			)
		}

		const feedbackItemResult = await supabase
			.from('feedback_items')
			.select('id, anchor, created_at')
			.eq('id', id)
			.eq('submission_id', submissionId)
			.maybeSingle()

		if (!feedbackItemResult.data || !isSelectionAnchor(feedbackItemResult.data.anchor)) {
			return NextResponse.json(
				{ error: 'Unable to load that comment for editing.' },
				{ status: 404 },
			)
		}

		const updatedAnchor = {
			...feedbackItemResult.data.anchor,
			categoryLabel,
			categorySlug,
			tags,
			suggestedAction,
		}

		const updateResult = await supabase
			.from('feedback_items')
			.update({
				comment,
				anchor: updatedAnchor,
			})
			.eq('id', id)
			.eq('submission_id', submissionId)
			.select('id, comment, anchor, created_at')
			.single()

		if (updateResult.error || !updateResult.data) {
			return NextResponse.json(
				{ error: 'Unable to update comment.' },
				{ status: 500 },
			)
		}

		revalidatePath('/app/teacher/review-desk')

		return NextResponse.json({
			notice: 'Comment updated.',
			feedback: toFeedbackResponse(
				updateResult.data as {
					id: string
					comment: string
					created_at: string
					anchor: unknown
				},
			),
		})
	}

	const note = String(payload.note ?? '').trim()
	const snippetCategoryLabel = normalizeFeedbackCategoryLabel(
		payload.snippetCategoryLabel ?? payload.feedbackCategoryLabel,
	)
	const snippetResult = await supabase
		.from('snippets')
		.select('id, anchor')
		.eq('id', id)
		.eq('source_submission_id', submissionId)
		.maybeSingle()

	if (!snippetResult.data || !isSelectionAnchor(snippetResult.data.anchor)) {
		return NextResponse.json(
			{ error: 'Unable to load that snippet for editing.' },
			{ status: 404 },
		)
	}

	const updatedAnchor = {
		...snippetResult.data.anchor,
		categoryLabel: snippetCategoryLabel,
		categorySlug:
			snippetCategoryLabel === 'Uncategorised'
				? 'uncategorised'
				: toCategorySlug(snippetCategoryLabel),
	}

	const updateResult = await supabase
		.from('snippets')
		.update({
			note: note || null,
			snippet_category_id: null,
			anchor: updatedAnchor,
		})
		.eq('id', id)
		.eq('source_submission_id', submissionId)
		.select('id, note, created_at, anchor, snippet_category_id')
		.single()

	if (updateResult.error || !updateResult.data) {
		return NextResponse.json(
			{ error: 'Unable to update snippet.' },
			{ status: 500 },
		)
	}

	revalidatePath('/app/teacher-studio')

	return NextResponse.json({
		notice: 'Snippet updated.',
		snippet: toSnippetResponse(
			updateResult.data as {
				id: string
				note: string | null
				created_at: string
				anchor: unknown
				snippet_category_id: string | null
			},
		),
	})
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ submissionId: string }> },
) {
	await requireTeacher()
	const { submissionId } = await params
	const { supabase, submissionResult } = await loadModernSubmission(submissionId)
	const payload = (await request.json()) as AnnotationPayload
	const type = payload.type
	const id = String(payload.id ?? '').trim()

	if (submissionResult.error || !submissionResult.data) {
		return NextResponse.json(
			{ error: 'Inline deletion is only available in the modern submission workspace.' },
			{ status: 400 },
		)
	}

	if (!id || (type !== 'comment' && type !== 'snippet')) {
		return NextResponse.json(
			{ error: 'Choose a saved annotation before deleting.' },
			{ status: 400 },
		)
	}

	if (type === 'comment') {
		if (submissionResult.data.status === 'feedback_published') {
			return NextResponse.json(
				{
					error:
						'Published feedback comments cannot be deleted from this draft pane.',
				},
				{ status: 400 },
			)
		}

		const { error } = await supabase
			.from('feedback_items')
			.delete()
			.eq('id', id)
			.eq('submission_id', submissionId)

		if (error) {
			return NextResponse.json(
				{ error: 'Unable to delete comment.' },
				{ status: 500 },
			)
		}

		revalidatePath('/app/teacher/review-desk')

		return NextResponse.json({
			notice: 'Comment deleted.',
			deletedId: id,
		})
	}

	const { error } = await supabase
		.from('snippets')
		.delete()
		.eq('id', id)
		.eq('source_submission_id', submissionId)

	if (error) {
		return NextResponse.json(
			{ error: 'Unable to delete snippet.' },
			{ status: 500 },
		)
	}

	revalidatePath('/app/teacher-studio')

	return NextResponse.json({
		notice: 'Snippet deleted.',
		deletedId: id,
	})
}
