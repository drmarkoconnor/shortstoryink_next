import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { normalizeTeacherDisplayName } from '@/lib/display-names'
import {
	feedbackSlug,
	normalizeSnippetCategoryLabel,
} from '@/lib/feedback/categories'
import { buildSnippetInsert } from '@/lib/snippets/build-snippet-insert'
import { cleanSnippetText } from '@/lib/snippets/text-cleanup'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type SourceExcerptPayload = {
	author?: string
	title?: string
	source?: string
	sourceUrl?: string
	sourceSection?: string
	licenceNote?: string
	excerpt?: string
	categoryLabel?: string
	tags?: string[]
	note?: string
}

function normalizeText(value: unknown) {
	return typeof value === 'string' ? value.trim() : ''
}

function normalizeTags(value: unknown) {
	if (!Array.isArray(value)) {
		return []
	}

	return [
		...new Set(
			value
				.map((tag) => String(tag).trim())
				.filter(Boolean)
				.slice(0, 12),
		),
	]
}

function optionalUrl(value: string) {
	if (!value) {
		return ''
	}

	try {
		return new URL(value).toString()
	} catch {
		return ''
	}
}

function sourceExcerptSaveError(error: { code?: string; message?: string } | null) {
	const message = error?.message?.toLowerCase() ?? ''

	if (
		error?.code === '23514' ||
		message.includes('snippets_source_type_check') ||
		(message.includes('check constraint') && message.includes('source_type'))
	) {
		return 'Source excerpts need the external-source snippet migration to be applied in Supabase before saving.'
	}

	return 'Unable to save source excerpt.'
}

export async function POST(request: Request) {
	const profile = await requireTeacher()
	const supabase = await createServerSupabaseClient()
	const payload = (await request.json()) as SourceExcerptPayload

	const author = normalizeText(payload.author)
	const title = normalizeText(payload.title)
	const source = normalizeText(payload.source) || 'manual'
	const sourceUrl = optionalUrl(normalizeText(payload.sourceUrl))
	const sourceSection = normalizeText(payload.sourceSection)
	const sourceLicenceNote = normalizeText(payload.licenceNote)
	const excerpt = cleanSnippetText(String(payload.excerpt ?? ''))
	const note = normalizeText(payload.note)
	const categoryLabel = normalizeSnippetCategoryLabel(payload.categoryLabel)
	const tags = normalizeTags(payload.tags)

	if (!author) {
		return NextResponse.json({ error: 'Enter the source author.' }, { status: 400 })
	}

	if (!title) {
		return NextResponse.json({ error: 'Enter the source title.' }, { status: 400 })
	}

	if (!excerpt) {
		return NextResponse.json({ error: 'Enter an excerpt.' }, { status: 400 })
	}

	if (normalizeText(payload.sourceUrl) && !sourceUrl) {
		return NextResponse.json(
			{ error: 'Enter a valid source URL, or leave it blank.' },
			{ status: 400 },
		)
	}

	const teacherProfileResult = await supabase
		.from('profiles')
		.select('display_name')
		.eq('id', profile.user.id)
		.maybeSingle()
	const teacherName = normalizeTeacherDisplayName(
		(teacherProfileResult.data?.display_name as string | null | undefined) ??
			(profile.user.user_metadata?.display_name as string | undefined) ??
			(profile.user.user_metadata?.name as string | undefined) ??
			profile.user.email,
	)

	const anchor = {
		blockId: `external:${Date.now()}`,
		startOffset: 0,
		endOffset: excerpt.length,
		quote: excerpt,
		prefix: '',
		suffix: '',
		categoryLabel,
		categorySlug:
			categoryLabel === 'Uncategorised'
				? 'uncategorised'
				: feedbackSlug(categoryLabel),
		tags,
		sourceLabel: author,
		sourceKind: title,
		originalSource: source,
		createdByLabel: teacherName,
		sourceAuthor: author,
		sourceTitle: title,
		sourceName: source,
		sourceUrl: sourceUrl || undefined,
		sourceSection: sourceSection || undefined,
		sourceLicenceNote: sourceLicenceNote || undefined,
		sourceTypeLabel: 'external',
		snippetType: 'source',
	}

	const insertResult = await supabase
		.from('snippets')
		.insert(
			buildSnippetInsert({
				savedBy: profile.user.id,
				capturedBy: profile.user.id,
				sourceType: 'external',
				sourceSubmissionId: null,
				sourceFeedbackItemId: null,
				sourceAuthorId: null,
				snippetText: excerpt,
				anchor,
				note,
				visibility: 'private',
			}),
		)
		.select('id, snippet_text, note, created_at, anchor')
		.single()

	if (insertResult.error || !insertResult.data) {
		return NextResponse.json(
			{ error: sourceExcerptSaveError(insertResult.error) },
			{ status: 500 },
		)
	}

	revalidatePath('/app/teacher/snippets')
	revalidatePath('/app/teacher/documents')
	revalidatePath('/app/teacher')
	revalidatePath('/app/teacher-studio')

	return NextResponse.json({
		notice: 'Source excerpt saved as a snippet.',
		snippet: {
			id: insertResult.data.id as string,
			text: insertResult.data.snippet_text as string,
			note: (insertResult.data.note as string | null) ?? '',
			createdAt: insertResult.data.created_at as string,
			categoryLabel,
			tags,
			sourceLabel: author,
			sourceTitle: title,
			sourceName: source,
			sourceSection,
			sourceLicenceNote,
		},
	})
}
