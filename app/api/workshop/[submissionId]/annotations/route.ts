import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { buildSnippetInsert } from '@/lib/snippets/build-snippet-insert'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type AnnotationPayload = {
	type?: 'comment' | 'snippet'
	blockId?: string
	startOffset?: number
	endOffset?: number
	quote?: string
	prefix?: string
	suffix?: string
	comment?: string
}

function isNonEmptyString(value: unknown) {
	return typeof value === 'string' && value.trim().length > 0
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ submissionId: string }> },
) {
	const profile = await requireTeacher()
	const { submissionId } = await params
	const supabase = await createServerSupabaseClient()
	const payload = (await request.json()) as AnnotationPayload

	const type = payload.type
	const blockId = String(payload.blockId ?? '').trim()
	const quote = String(payload.quote ?? '').trim()
	const prefix = String(payload.prefix ?? '').trim()
	const suffix = String(payload.suffix ?? '').trim()
	const comment = String(payload.comment ?? '')
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

	const submissionResult = await supabase
		.from('submissions')
		.select('id, author_id, status')
		.eq('id', submissionId)
		.maybeSingle()

	if (submissionResult.error || !submissionResult.data?.author_id) {
		return NextResponse.json(
			{ error: 'Inline save is only available in the modern submission workspace.' },
			{ status: 400 },
		)
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
			categoryLabel: 'Uncategorised',
			categorySlug: 'uncategorised',
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

		return NextResponse.json({
			notice: 'Comment saved.',
			feedback: {
				id: insertResult.data.id as string,
				comment: insertResult.data.comment as string,
				createdAt: insertResult.data.created_at as string,
				anchor: insertResult.data.anchor as {
					blockId: string
					startOffset: number
					endOffset: number
					quote: string
					prefix?: string
					suffix?: string
					kind?: 'typo' | 'craft' | 'pacing' | 'structure'
					categoryLabel?: string
					categorySlug?: string
				},
			},
		})
	}

	const snippetInsert = buildSnippetInsert({
		savedBy: profile.user.id,
		capturedBy: profile.user.id,
		sourceType: 'submission',
		sourceSubmissionId: submissionId,
		sourceAuthorId: submissionResult.data.author_id as string,
		snippetCategoryId: null,
		anchor,
		note: null,
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

	return NextResponse.json({
		notice: 'Snippet saved.',
		snippet: {
			id: snippetResult.data.id as string,
			note: (snippetResult.data.note as string | null) ?? '',
			createdAt: snippetResult.data.created_at as string,
			snippetCategoryId:
				(snippetResult.data.snippet_category_id as string | null) ?? null,
			anchor: snippetResult.data.anchor as {
				blockId: string
				startOffset: number
				endOffset: number
				quote: string
				prefix?: string
				suffix?: string
			},
		},
	})
}
