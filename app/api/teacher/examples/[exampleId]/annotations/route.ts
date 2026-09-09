import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createAdminDataClient } from '@/lib/data/client'
import {
	exampleCategorySlug,
	normalizeExampleCategory,
	normalizeExampleTags,
	type ExampleAnnotation,
} from '@/lib/teaching-examples/types'

type AnnotationPayload = {
	id?: string
	blockId?: string
	endBlockId?: string
	startOffset?: number
	endOffset?: number
	quote?: string
	prefix?: string
	suffix?: string
	comment?: string
	categoryLabel?: string
	tags?: string[]
}

function toAnnotationResponse(row: {
	id: string
	comment: string
	category_label: string
	category_slug: string
	tags: string[] | null
	anchor: unknown
	created_at: string
}): ExampleAnnotation {
	const categoryLabel = normalizeExampleCategory(row.category_label)

	return {
		id: row.id,
		comment: row.comment,
		categoryLabel,
		categorySlug: row.category_slug || exampleCategorySlug(categoryLabel),
		tags: row.tags ?? [],
		createdAt: row.created_at,
		anchor: row.anchor as ExampleAnnotation['anchor'],
	}
}

function validAnchorPayload(payload: AnnotationPayload) {
	const blockId = String(payload.blockId ?? '').trim()
	const endBlockId = String(payload.endBlockId ?? '').trim()
	const quote = String(payload.quote ?? '').trim()
	const prefix = String(payload.prefix ?? '').trim()
	const suffix = String(payload.suffix ?? '').trim()
	const startOffset = Number(payload.startOffset ?? -1)
	const endOffset = Number(payload.endOffset ?? -1)
	const isMultiBlockSelection = Boolean(endBlockId && endBlockId !== blockId)

	if (
		!blockId ||
		!quote ||
		!Number.isFinite(startOffset) ||
		!Number.isFinite(endOffset) ||
		startOffset < 0 ||
		(isMultiBlockSelection ? endOffset < 0 : endOffset <= startOffset)
	) {
		return null
	}

	return {
		blockId,
		...(isMultiBlockSelection ? { endBlockId } : {}),
		startOffset,
		endOffset,
		quote,
		prefix,
		suffix,
	}
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ exampleId: string }> },
) {
	const profile = await requireTeacher()
	const { exampleId } = await params
	const payload = (await request.json()) as AnnotationPayload
	const adminData = createAdminDataClient()

	const anchor = validAnchorPayload(payload)
	const comment = String(payload.comment ?? '').trim()
	const categoryLabel = normalizeExampleCategory(payload.categoryLabel)
	const categorySlug = exampleCategorySlug(categoryLabel)
	const tags = normalizeExampleTags(payload.tags)

	if (!anchor || !comment) {
		return NextResponse.json(
			{ error: 'Select a valid passage and write a note before saving.' },
			{ status: 400 },
		)
	}

	const exampleResult = await adminData
		.from('teaching_examples')
		.select('id')
		.eq('id', exampleId)
		.maybeSingle()

	if (exampleResult.error || !exampleResult.data) {
		return NextResponse.json({ error: 'Example not found.' }, { status: 404 })
	}

	const insertResult = await adminData
		.from<Parameters<typeof toAnnotationResponse>[0]>('teaching_example_annotations')
		.insert({
			example_id: exampleId,
			author_id: profile.user.id,
			comment,
			category_label: categoryLabel,
			category_slug: categorySlug,
			tags,
			anchor: {
				...anchor,
				categoryLabel,
				categorySlug,
				tags,
			},
		})
		.select('id, comment, category_label, category_slug, tags, anchor, created_at')
		.single()

	if (insertResult.error || !insertResult.data) {
		return NextResponse.json({ error: 'Unable to save note.' }, { status: 500 })
	}

	return NextResponse.json({
		annotation: toAnnotationResponse(insertResult.data),
	})
}

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ exampleId: string }> },
) {
	await requireTeacher()
	const { exampleId } = await params
	const payload = (await request.json()) as AnnotationPayload
	const annotationId = String(payload.id ?? '').trim()
	const comment = String(payload.comment ?? '').trim()
	const categoryLabel = normalizeExampleCategory(payload.categoryLabel)
	const categorySlug = exampleCategorySlug(categoryLabel)
	const tags = normalizeExampleTags(payload.tags)
	const adminData = createAdminDataClient()

	if (!annotationId || !comment) {
		return NextResponse.json(
			{ error: 'Choose a note and keep the note text filled in.' },
			{ status: 400 },
		)
	}

	const existingResult = await adminData
		.from<Parameters<typeof toAnnotationResponse>[0]>('teaching_example_annotations')
		.select('id, anchor')
		.eq('id', annotationId)
		.eq('example_id', exampleId)
		.maybeSingle()

	if (existingResult.error || !existingResult.data) {
		return NextResponse.json({ error: 'Note not found.' }, { status: 404 })
	}

	const existingAnchor =
		existingResult.data.anchor && typeof existingResult.data.anchor === 'object'
			? (existingResult.data.anchor as Record<string, unknown>)
			: {}

	const updateResult = await adminData
		.from<Parameters<typeof toAnnotationResponse>[0]>('teaching_example_annotations')
		.update({
			comment,
			category_label: categoryLabel,
			category_slug: categorySlug,
			tags,
			anchor: {
				...existingAnchor,
				categoryLabel,
				categorySlug,
				tags,
			},
		})
		.eq('id', annotationId)
		.eq('example_id', exampleId)
		.select('id, comment, category_label, category_slug, tags, anchor, created_at')
		.single()

	if (updateResult.error || !updateResult.data) {
		return NextResponse.json({ error: 'Unable to save note.' }, { status: 500 })
	}

	return NextResponse.json({
		annotation: toAnnotationResponse(updateResult.data),
	})
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ exampleId: string }> },
) {
	await requireTeacher()
	const { exampleId } = await params
	const payload = (await request.json()) as AnnotationPayload
	const annotationId = String(payload.id ?? '').trim()
	const adminData = createAdminDataClient()

	if (!annotationId) {
		return NextResponse.json({ error: 'Choose a note to delete.' }, { status: 400 })
	}

	const deleteResult = await adminData
		.from<Parameters<typeof toAnnotationResponse>[0]>('teaching_example_annotations')
		.delete()
		.eq('id', annotationId)
		.eq('example_id', exampleId)

	if (deleteResult.error) {
		return NextResponse.json(
			{ error: 'Unable to delete note.' },
			{ status: 500 },
		)
	}

	return NextResponse.json({ notice: 'Note deleted.' })
}
