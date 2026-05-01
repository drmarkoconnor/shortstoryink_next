import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import {
	feedbackSlug,
	normalizeSnippetCategoryLabel,
} from '@/lib/feedback/categories'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type SnippetPayload = {
	text?: string
	note?: string
	categoryLabel?: string
	tags?: string[]
}

type SelectionAnchor = {
	blockId?: string
	startOffset?: number
	endOffset?: number
	quote?: string
	prefix?: string
	suffix?: string
	categoryLabel?: string
	categorySlug?: string
	tags?: string[]
}

function isSelectionAnchor(value: unknown): value is SelectionAnchor {
	return Boolean(value && typeof value === 'object')
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
	snippet_text: string
	note: string | null
	created_at: string
	anchor: unknown
}) {
	const anchor = isSelectionAnchor(row.anchor) ? row.anchor : {}
	const categoryLabel =
		typeof anchor.categoryLabel === 'string' && anchor.categoryLabel.trim()
			? anchor.categoryLabel
			: 'Uncategorised'
	const tags = Array.isArray(anchor.tags)
		? anchor.tags.map((tag) => String(tag).trim()).filter(Boolean)
		: []

	return {
		id: row.id,
		text: row.snippet_text,
		note: row.note ?? '',
		createdAt: row.created_at,
		categoryLabel,
		categorySlug:
			typeof anchor.categorySlug === 'string' && anchor.categorySlug.trim()
				? anchor.categorySlug
				: categoryLabel === 'Uncategorised'
					? 'uncategorised'
					: feedbackSlug(categoryLabel),
		tags,
	}
}

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ snippetId: string }> },
) {
	const profile = await requireTeacher()
	const { snippetId } = await params
	const supabase = await createServerSupabaseClient()
	const payload = (await request.json()) as SnippetPayload
	const text = String(payload.text ?? '').trim()
	const note = String(payload.note ?? '').trim()
	const categoryLabel = normalizeSnippetCategoryLabel(payload.categoryLabel)
	const tags = normalizeTags(payload.tags)

	if (!snippetId) {
		return NextResponse.json({ error: 'Choose a snippet to update.' }, { status: 400 })
	}

	if (!text) {
		return NextResponse.json({ error: 'Snippet text cannot be empty.' }, { status: 400 })
	}

	const snippetResult = await supabase
		.from('snippets')
		.select('id, anchor')
		.eq('id', snippetId)
		.eq('saved_by', profile.user.id)
		.maybeSingle()

	if (snippetResult.error || !snippetResult.data) {
		return NextResponse.json({ error: 'Unable to load that snippet.' }, { status: 404 })
	}

	const existingAnchor = isSelectionAnchor(snippetResult.data.anchor)
		? snippetResult.data.anchor
		: {}
	const updatedAnchor = {
		...existingAnchor,
		categoryLabel,
		categorySlug:
			categoryLabel === 'Uncategorised'
				? 'uncategorised'
				: feedbackSlug(categoryLabel),
		tags,
	}

	const updateResult = await supabase
		.from('snippets')
		.update({
			snippet_text: text,
			note: note || null,
			snippet_category_id: null,
			anchor: updatedAnchor,
		})
		.eq('id', snippetId)
		.eq('saved_by', profile.user.id)
		.select('id, snippet_text, note, created_at, anchor')
		.single()

	if (updateResult.error || !updateResult.data) {
		return NextResponse.json({ error: 'Unable to update snippet.' }, { status: 500 })
	}

	revalidatePath('/app/teacher/snippets')
	revalidatePath('/app/teacher-studio')

	return NextResponse.json({
		notice: 'Snippet updated.',
		snippet: toSnippetResponse(
			updateResult.data as {
				id: string
				snippet_text: string
				note: string | null
				created_at: string
				anchor: unknown
			},
		),
	})
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ snippetId: string }> },
) {
	const profile = await requireTeacher()
	const { snippetId } = await params
	const supabase = await createServerSupabaseClient()

	if (!snippetId) {
		return NextResponse.json({ error: 'Choose a snippet to delete.' }, { status: 400 })
	}

	const { error } = await supabase
		.from('snippets')
		.delete()
		.eq('id', snippetId)
		.eq('saved_by', profile.user.id)

	if (error) {
		return NextResponse.json({ error: 'Unable to delete snippet.' }, { status: 500 })
	}

	revalidatePath('/app/teacher/snippets')
	revalidatePath('/app/teacher-studio')

	return NextResponse.json({
		notice: 'Snippet deleted.',
		deletedId: snippetId,
	})
}
