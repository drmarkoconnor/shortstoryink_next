import type { JSONContent } from '@tiptap/core'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import {
	DocumentBuilder,
	type BuilderSnippet,
	type SavedTeachingDocument,
	type SnippetSourceMetadata,
} from '@/components/teacher/document-builder'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { normalizeTeacherDisplayName } from '@/lib/display-names'
import { normalizeSnippetLabel } from '@/lib/feedback/categories'
import { teacherTabs } from '@/lib/mock/teacher-prototype'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
	normalizeTeachingDocumentType,
	type TeachingDocumentType,
} from '@/lib/teacher-documents/types'

type SnippetRow = {
	id: string
	snippet_text: string
	note: string | null
	created_at: string
	anchor: unknown
	source_type: string | null
	source_submission_id: string | null
	source_feedback_item_id: string | null
	source_author_id: string | null
}

type DocumentRow = {
	id: string
	title: string
	body: unknown
	created_at: string
	updated_at: string
}

type SelectionAnchor = {
	categoryLabel?: string
	tags?: unknown[]
	sourceLabel?: string
	sourceKind?: string
	originalSource?: string
	createdByLabel?: string
	sourceAuthor?: string
	sourceTitle?: string
	sourceName?: string
	sourceUrl?: string
	sourceSection?: string
	sourceTypeLabel?: string
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

function isSelectionAnchor(value: unknown): value is SelectionAnchor {
	return isRecord(value)
}

function tagsFromAnchor(anchor: SelectionAnchor | null) {
	return Array.isArray(anchor?.tags)
		? anchor.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean)
		: []
}

function categoryFromAnchor(anchor: SelectionAnchor | null) {
	return normalizeSnippetLabel(
		typeof anchor?.categoryLabel === 'string' ? anchor.categoryLabel : '',
	)
}

function normalizeDocumentType(value: unknown): TeachingDocumentType {
	return normalizeTeachingDocumentType(value)
}

function defaultContent(): JSONContent {
	return {
		type: 'doc',
		content: [
			{
				type: 'heading',
				attrs: { level: 1 },
				content: [{ type: 'text', text: 'Teaching document' }],
			},
			{
				type: 'paragraph',
				content: [
					{
						type: 'text',
						text: 'Write a short introduction, then insert snippets as teaching examples.',
					},
				],
			},
		],
	}
}

function legacySectionsToContent(body: Record<string, unknown>): JSONContent {
	if (!Array.isArray(body.sections)) {
		return defaultContent()
	}

	const content: JSONContent[] = []
	for (const section of body.sections) {
		if (!isRecord(section)) {
			continue
		}
		const title = typeof section.title === 'string' ? section.title : 'Section'
		content.push({
			type: 'heading',
			attrs: { level: 2 },
			content: [{ type: 'text', text: title }],
		})
		if (!Array.isArray(section.blocks)) {
			continue
		}
		for (const block of section.blocks) {
			if (!isRecord(block)) {
				continue
			}
			const text = typeof block.text === 'string' ? block.text : ''
			if (!text.trim()) {
				continue
			}
			if (block.type === 'snippet') {
				content.push({
					type: 'snippetExample',
					attrs: {
						snippetId: typeof block.snippetId === 'string' ? block.snippetId : '',
						text,
						category: categoryFromAnchor({
							categoryLabel:
								typeof block.categoryLabel === 'string'
									? block.categoryLabel
									: '',
						}),
						tags: Array.isArray(block.tags)
							? block.tags.map((tag) => String(tag).trim()).filter(Boolean)
							: [],
						sourceMetadata: {},
					},
				})
			} else {
				content.push({
					type: 'paragraph',
					content: [{ type: 'text', text }],
				})
			}
		}
	}

	return {
		type: 'doc',
		content: content.length ? content : defaultContent().content,
	}
}

function contentFromBody(body: unknown): JSONContent {
	if (!isRecord(body)) {
		return defaultContent()
	}
	if (isRecord(body.editor) && body.editor.type === 'doc') {
		return body.editor as JSONContent
	}
	if (isRecord(body.content) && body.content.type === 'doc') {
		return body.content as JSONContent
	}
	return legacySectionsToContent(body)
}

function typeFromBody(body: unknown): TeachingDocumentType {
	if (!isRecord(body) || !isRecord(body.metadata)) {
		return 'Teaching note'
	}
	return normalizeDocumentType(body.metadata.documentType)
}

export default async function TeacherDocumentsPage() {
	const profile = await requireTeacher()
	const supabase = await createServerSupabaseClient()
	let snippets: BuilderSnippet[] = []
	let documents: SavedTeachingDocument[] = []
	let snippetsError: string | null = null
	let documentsNotice: string | null = null

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

	const snippetsResult = await supabase
		.from('snippets')
		.select(
			'id, snippet_text, note, created_at, anchor, source_type, source_submission_id, source_feedback_item_id, source_author_id',
		)
		.eq('saved_by', profile.user.id)
		.order('created_at', { ascending: false })
		.limit(100)

	if (snippetsResult.error) {
		snippetsError = snippetsResult.error.message
	} else {
		snippets = ((snippetsResult.data ?? []) as SnippetRow[]).map((row) => {
			const anchor = isSelectionAnchor(row.anchor) ? row.anchor : null
			const sourceMetadata: SnippetSourceMetadata = {
				sourceType: row.source_type ?? undefined,
				sourceSubmissionId: row.source_submission_id,
				sourceFeedbackItemId: row.source_feedback_item_id,
				sourceAuthorId: row.source_author_id,
				sourceLabel: anchor?.sourceLabel ?? anchor?.sourceAuthor ?? teacherName,
				sourceKind:
					anchor?.sourceKind ??
					anchor?.sourceTitle ??
					(row.source_feedback_item_id
						? 'promoted teaching note'
						: 'teaching snippet'),
				originalSource: anchor?.originalSource,
				createdByLabel: anchor?.createdByLabel ?? teacherName,
				createdAt: row.created_at,
				sourceName: anchor?.sourceName,
				sourceUrl: anchor?.sourceUrl,
				sourceSection: anchor?.sourceSection,
				sourceTypeLabel: anchor?.sourceTypeLabel,
			}

			return {
				id: row.id,
				text: row.snippet_text,
				note: row.note ?? '',
				categoryLabel: categoryFromAnchor(anchor),
				tags: tagsFromAnchor(anchor),
				sourceMetadata,
			}
		})
	}

	const documentsResult = await supabase
		.from('teacher_documents')
		.select('id, title, body, created_at, updated_at')
		.eq('owner_id', profile.user.id)
		.order('updated_at', { ascending: false })
		.limit(40)

	if (documentsResult.error) {
		documentsNotice = isSchemaCacheMissing(documentsResult.error.message)
			? 'Document saving is not available until the teacher_documents migration has been applied. You can still draft, insert snippets, and print from this page.'
			: `Saved documents could not be loaded: ${documentsResult.error.message}`
	} else {
		documents = ((documentsResult.data ?? []) as DocumentRow[]).map((row) => ({
			id: row.id,
			title: row.title,
			documentType: typeFromBody(row.body),
			content: contentFromBody(row.body),
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		}))
	}

	return (
		<section className="space-y-5">
			<MenuTabs
				tabs={teacherTabs}
				active="/app/teacher/documents"
				context={
					<div className="document-builder-controls flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
						<div className="min-w-0">
							<p className="text-[10px] uppercase tracking-[0.12em] text-silver-400">
								Teacher Studio
							</p>
							<p className="truncate text-sm text-parchment-100">
								Document Builder
							</p>
						</div>
					</div>
				}
			/>

			{snippetsError ? (
				<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
					Unable to load snippets for the document builder: {snippetsError}
				</p>
			) : (
				<DocumentBuilder
					initialSnippets={snippets}
					initialDocuments={documents}
					persistenceNotice={documentsNotice}
				/>
			)}
		</section>
	)
}
