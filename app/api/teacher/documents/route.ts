import type { JSONContent } from '@tiptap/core'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import {
	normalizeTeachingDocumentType,
	type TeachingDocumentType,
} from '@/lib/teacher-documents/types'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type DocumentPayload = {
	id?: string | null
	title?: string
	documentType?: string
	content?: unknown
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object')
}

function normalizeDocumentType(value: unknown): TeachingDocumentType {
	return normalizeTeachingDocumentType(value)
}

function normalizeJsonNode(value: unknown, depth = 0): JSONContent | null {
	if (!isRecord(value) || typeof value.type !== 'string' || depth > 12) {
		return null
	}

	const node: JSONContent = {
		type: value.type,
	}

	if (isRecord(value.attrs)) {
		node.attrs = value.attrs
	}

	if (Array.isArray(value.marks)) {
		node.marks = value.marks
			.filter(isRecord)
			.map((mark) => ({
				type: typeof mark.type === 'string' ? mark.type : '',
				attrs: isRecord(mark.attrs) ? mark.attrs : undefined,
			}))
			.filter((mark) => mark.type)
	}

	if (typeof value.text === 'string') {
		node.text = value.text
	}

	if (Array.isArray(value.content)) {
		node.content = value.content
			.map((child) => normalizeJsonNode(child, depth + 1))
			.filter((child): child is JSONContent => Boolean(child))
			.slice(0, 240)
	}

	return node
}

function normalizeContent(value: unknown): JSONContent {
	const content = normalizeJsonNode(value)
	if (content?.type === 'doc') {
		return content
	}

	return {
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [{ type: 'text', text: '' }],
			},
		],
	}
}

function contentFromBody(body: unknown) {
	if (!isRecord(body)) {
		return normalizeContent(null)
	}
	if (isRecord(body.editor)) {
		return normalizeContent(body.editor)
	}
	if (isRecord(body.content)) {
		return normalizeContent(body.content)
	}
	return normalizeContent(null)
}

function typeFromBody(body: unknown) {
	if (!isRecord(body) || !isRecord(body.metadata)) {
		return 'Teaching note' as TeachingDocumentType
	}
	return normalizeDocumentType(body.metadata.documentType)
}

function toDocumentResponse(row: {
	id: string
	title: string
	body: unknown
	created_at: string
	updated_at: string
}) {
	return {
		id: row.id,
		title: row.title,
		documentType: typeFromBody(row.body),
		content: contentFromBody(row.body),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

export async function POST(request: Request) {
	const profile = await requireTeacher()
	const supabase = await createServerSupabaseClient()
	const payload = (await request.json()) as DocumentPayload
	const documentId = String(payload.id ?? '').trim()
	const title = String(payload.title ?? '').trim()
	const documentType = normalizeDocumentType(payload.documentType)
	const content = normalizeContent(payload.content)

	if (!title) {
		return NextResponse.json({ error: 'Enter a document title.' }, { status: 400 })
	}

	const body = {
		version: 'tiptap_document_v1',
		metadata: {
			documentType,
		},
		editor: content,
	}

	const result = documentId
		? await supabase
				.from('teacher_documents')
				.update({ title, body })
				.eq('id', documentId)
				.eq('owner_id', profile.user.id)
				.select('id, title, body, created_at, updated_at')
				.single()
		: await supabase
				.from('teacher_documents')
				.insert({
					owner_id: profile.user.id,
					title,
					body,
				})
				.select('id, title, body, created_at, updated_at')
				.single()

	if (result.error || !result.data) {
		const message = isSchemaCacheMissing(result.error?.message)
			? 'Document saving is not available until the teacher_documents migration has been applied.'
			: 'Unable to save document.'
		return NextResponse.json({ error: message }, { status: 500 })
	}

	revalidatePath('/app/teacher/documents')

	return NextResponse.json({
		notice: 'Document saved.',
		document: toDocumentResponse(
			result.data as {
				id: string
				title: string
				body: unknown
				created_at: string
				updated_at: string
			},
		),
	})
}

export async function DELETE(request: Request) {
	const profile = await requireTeacher()
	const supabase = await createServerSupabaseClient()
	const requestUrl = new URL(request.url)
	const documentId = String(requestUrl.searchParams.get('id') ?? '').trim()

	if (!documentId) {
		return NextResponse.json(
			{ error: 'Choose a document to delete.' },
			{ status: 400 },
		)
	}

	const result = await supabase
		.from('teacher_documents')
		.delete()
		.eq('id', documentId)
		.eq('owner_id', profile.user.id)

	if (result.error) {
		const message = isSchemaCacheMissing(result.error.message)
			? 'Document deletion is not available until the teacher_documents migration has been applied.'
			: 'Unable to delete document.'
		return NextResponse.json({ error: message }, { status: 500 })
	}

	revalidatePath('/app/teacher/documents')

	return NextResponse.json({
		notice: 'Document deleted.',
		documentId,
	})
}
