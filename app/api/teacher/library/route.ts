import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { normalizeSnippetCategoryLabel } from '@/lib/feedback/categories'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
	normalizeTeachingLibraryItemType,
	normalizeTeachingLibraryReferenceType,
	type TeachingLibraryItemType,
	type TeachingLibraryReferenceType,
} from '@/lib/teacher-library/types'

type LibraryPayload = {
	id?: string | null
	itemType?: unknown
	title?: unknown
	body?: unknown
	referenceType?: unknown
	url?: unknown
	categoryLabel?: unknown
	tags?: unknown
}

type LibraryRow = {
	id: string
	item_type: TeachingLibraryItemType
	title: string
	body: string | null
	reference_type: TeachingLibraryReferenceType | null
	url: string | null
	category_label: string | null
	tags: string[] | null
	created_at: string
	updated_at: string
}

function isSchemaCacheMissing(message: string | null | undefined) {
	if (!message) {
		return false
	}

	const normalized = message.toLowerCase()
	return (
		normalized.includes('schema cache') ||
		normalized.includes('could not find the') ||
		(normalized.includes('relation') && normalized.includes('does not exist'))
	)
}

function normalizeTags(value: unknown) {
	if (!Array.isArray(value)) {
		return []
	}

	return Array.from(
		new Set(value.map((item) => String(item).trim()).filter(Boolean)),
	).slice(0, 12)
}

function normalizeUrl(value: unknown) {
	const url = String(value ?? '').trim()
	if (!url) {
		return null
	}

	try {
		const parsed = new URL(url)
		return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null
	} catch {
		return null
	}
}

function toLibraryResponse(row: LibraryRow) {
	return {
		id: row.id,
		itemType: row.item_type,
		title: row.title,
		body: row.body ?? '',
		referenceType: row.reference_type,
		url: row.url,
		categoryLabel: row.category_label ?? 'Uncategorised',
		tags: row.tags ?? [],
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

function revalidateLibraryPaths() {
	revalidatePath('/app/teacher/library')
	revalidatePath('/app/teacher/documents')
	revalidatePath('/app/teacher')
	revalidatePath('/app/teacher-studio')
}

export async function POST(request: Request) {
	const profile = await requireTeacher()
	const supabase = await createServerSupabaseClient()
	const payload = (await request.json()) as LibraryPayload

	const libraryItemId = String(payload.id ?? '').trim()
	const itemType = normalizeTeachingLibraryItemType(payload.itemType)
	const title = String(payload.title ?? '').replace(/\s+/g, ' ').trim()
	const body = String(payload.body ?? '').trim()
	const referenceType =
		itemType === 'reference'
			? normalizeTeachingLibraryReferenceType(payload.referenceType)
			: null
	const url = itemType === 'reference' ? normalizeUrl(payload.url) : null
	const categoryLabel = normalizeSnippetCategoryLabel(payload.categoryLabel)
	const tags = normalizeTags(payload.tags)

	if (!title) {
		return NextResponse.json({ error: 'Enter a title.' }, { status: 400 })
	}

	if (itemType === 'note' && !body) {
		return NextResponse.json(
			{ error: 'Enter the note text.' },
			{ status: 400 },
		)
	}

	if (itemType === 'reference' && !body && !url) {
		return NextResponse.json(
			{ error: 'Add a short note or URL for the reference.' },
			{ status: 400 },
		)
	}

	const record = {
		item_type: itemType,
		title,
		body,
		reference_type: referenceType,
		url,
		category_label: categoryLabel,
		tags,
	}

	const result = libraryItemId
		? await supabase
				.from('teaching_library_items')
				.update(record)
				.eq('id', libraryItemId)
				.eq('owner_id', profile.user.id)
				.select(
					'id, item_type, title, body, reference_type, url, category_label, tags, created_at, updated_at',
				)
				.single()
		: await supabase
				.from('teaching_library_items')
				.insert({
					owner_id: profile.user.id,
					...record,
				})
				.select(
					'id, item_type, title, body, reference_type, url, category_label, tags, created_at, updated_at',
				)
				.single()

	if (result.error || !result.data) {
		const message = isSchemaCacheMissing(result.error?.message)
			? 'Teaching Library notes and references need the latest migration before saving.'
			: 'Unable to save library item.'
		return NextResponse.json({ error: message }, { status: 500 })
	}

	revalidateLibraryPaths()

	return NextResponse.json({
		notice: libraryItemId ? 'Library item updated.' : 'Library item created.',
		item: toLibraryResponse(result.data as LibraryRow),
	})
}

export async function DELETE(request: Request) {
	const profile = await requireTeacher()
	const supabase = await createServerSupabaseClient()
	const requestUrl = new URL(request.url)
	const libraryItemId = String(requestUrl.searchParams.get('id') ?? '').trim()

	if (!libraryItemId) {
		return NextResponse.json(
			{ error: 'Choose a library item to delete.' },
			{ status: 400 },
		)
	}

	const result = await supabase
		.from('teaching_library_items')
		.delete()
		.eq('id', libraryItemId)
		.eq('owner_id', profile.user.id)

	if (result.error) {
		const message = isSchemaCacheMissing(result.error.message)
			? 'Teaching Library notes and references need the latest migration before deleting.'
			: 'Unable to delete library item.'
		return NextResponse.json({ error: message }, { status: 500 })
	}

	revalidateLibraryPaths()

	return NextResponse.json({
		notice: 'Library item deleted.',
		deletedId: libraryItemId,
	})
}
