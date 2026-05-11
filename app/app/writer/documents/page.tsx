import type { JSONContent } from '@tiptap/core'
import Link from 'next/link'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
	normalizeTeachingDocumentType,
	type TeachingDocumentType,
} from '@/lib/teacher-documents/types'

type DocumentRow = {
	id: string
	title: string
	body: unknown
	updated_at: string
}

type WriterGroup = {
	id: string
	title: string
}

type WriterTeachingDocument = {
	id: string
	title: string
	documentType: TeachingDocumentType
	updatedAt: string
	previewLines: string[]
	groupTitles: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object')
}

function normalizeContent(value: unknown): JSONContent {
	if (!isRecord(value) || value.type !== 'doc') {
		return { type: 'doc', content: [] }
	}

	return value as JSONContent
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

function groupIdsFromBody(body: unknown) {
	if (!isRecord(body) || !isRecord(body.metadata)) {
		return []
	}
	return Array.isArray(body.metadata.groupIds)
		? body.metadata.groupIds.map((id) => String(id).trim()).filter(Boolean)
		: []
}

function typeFromBody(body: unknown): TeachingDocumentType {
	if (!isRecord(body) || !isRecord(body.metadata)) {
		return 'Teaching note'
	}
	return normalizeTeachingDocumentType(body.metadata.documentType)
}

function textFromNode(node: JSONContent): string {
	if (node.type === 'text') {
		return node.text ?? ''
	}

	if (node.type === 'hardBreak') {
		return '\n'
	}

	if (node.type === 'snippetExample') {
		const attrs = node.attrs ?? {}
		const text = String(attrs.text ?? '')
		const note = attrs.includeNote === false ? '' : String(attrs.note ?? '')
		return [text, note].filter(Boolean).join(' ')
	}

	return (node.content ?? []).map(textFromNode).join(' ')
}

function previewLinesFromContent(content: JSONContent) {
	const lines: string[] = []

	for (const node of content.content ?? []) {
		const line = textFromNode(node).replace(/\s+/g, ' ').trim()
		if (line) {
			lines.push(line)
		}
		if (lines.length >= 3) {
			break
		}
	}

	return lines
}

function formatUpdatedDate(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return 'Recently updated'
	}

	return new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	}).format(date)
}

function isLegacySchemaError(message: string | null | undefined) {
	if (!message) {
		return false
	}

	const normalized = message.toLowerCase()
	return (
		normalized.includes('schema cache') ||
		normalized.includes('could not find the') ||
		(normalized.includes('column') && normalized.includes('does not exist')) ||
		(normalized.includes('relation') && normalized.includes('does not exist'))
	)
}

export default async function WriterDocumentsPage() {
	await requireWriter()
	const user = await getCurrentUser()
	const adminSupabase = createAdminSupabaseClient()

	let groups: WriterGroup[] = []
	let documents: WriterTeachingDocument[] = []
	let loadError: string | null = null

	const { data: memberRows, error: membershipError } = await adminSupabase
		.from('workshop_members')
		.select('workshop_id')
		.eq('profile_id', user.id)

	if (membershipError) {
		loadError = 'Unable to load your group memberships.'
	}

	const writerWorkshopIds = [
		...new Set((memberRows ?? []).map((row) => row.workshop_id as string)),
	]

	if (!loadError && writerWorkshopIds.length > 0) {
		const { data: groupRows, error: groupError } = await adminSupabase
			.from('workshops')
			.select('id, title')
			.in('id', writerWorkshopIds)
			.order('title', { ascending: true })

		if (groupError) {
			loadError = 'Unable to load your group details.'
		} else {
			groups = (groupRows ?? []) as WriterGroup[]
		}
	}

	if (!loadError && groups.length > 0) {
		const { data: documentRows, error } = await adminSupabase
			.from('teacher_documents')
			.select('id, title, body, updated_at')
			.order('updated_at', { ascending: false })
			.limit(200)

		if (error) {
			loadError = isLegacySchemaError(error.message)
				? 'Shared documents are not available until the teacher_documents migration has been applied.'
				: 'Unable to load teaching materials.'
		} else {
			const groupTitleById = Object.fromEntries(
				groups.map((group) => [group.id, group.title]),
			)
			const writerWorkshopSet = new Set(groups.map((group) => group.id))

			documents = ((documentRows ?? []) as DocumentRow[])
				.map((document) => {
					const groupIds = groupIdsFromBody(document.body).filter((groupId) =>
						writerWorkshopSet.has(groupId),
					)

					if (groupIds.length === 0) {
						return null
					}

					return {
						id: document.id,
						title: document.title,
						documentType: typeFromBody(document.body),
						updatedAt: document.updated_at,
						previewLines: previewLinesFromContent(contentFromBody(document.body)),
						groupTitles: groupIds.map(
							(groupId) => groupTitleById[groupId] ?? 'Your group',
						),
					}
				})
				.filter((document): document is WriterTeachingDocument =>
					Boolean(document),
				)
		}
	}

	return (
		<section className="space-y-5">
			<div className="surface p-5 lg:p-6">
				<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
					Teaching materials
				</p>
				<div className="mt-2 flex flex-wrap items-end justify-between gap-3">
					<div>
						<h1 className="literary-title text-3xl text-parchment-100">
							Your reading shelf
						</h1>
						<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
							Handouts and teaching notes shared with your groups appear here.
						</p>
					</div>
					<Link
						href="/app/writer"
						className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-silver-100 transition hover:border-white/30 hover:text-parchment-100">
						Write a piece
					</Link>
				</div>
			</div>

			{loadError ? (
				<div className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
					{loadError}
				</div>
			) : null}

			{!loadError && documents.length === 0 ? (
				<div className="surface p-5 lg:p-6">
					<h2 className="literary-title text-2xl text-parchment-100">
						No materials yet
					</h2>
					<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
						When teaching documents are shared with your group, they will be
						listed here with a short preview and a link to the full document.
					</p>
				</div>
			) : null}

			{documents.length > 0 ? (
				<div className="grid gap-4 md:grid-cols-2">
					{documents.map((document) => (
						<article
							key={document.id}
							className="rounded-2xl border border-white/12 bg-white/[0.04] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.16)]">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<p className="text-xs uppercase tracking-[0.12em] text-accent-200">
									{document.documentType}
								</p>
								<p className="text-xs text-silver-300">
									{formatUpdatedDate(document.updatedAt)}
								</p>
							</div>
							<h2 className="literary-title mt-3 line-clamp-2 text-2xl text-parchment-100">
								{document.title}
							</h2>
							<div className="mt-3 min-h-[4.5rem] space-y-1 text-sm leading-6 text-silver-100">
								{document.previewLines.length > 0 ? (
									document.previewLines.map((line, index) => (
										<p key={`${document.id}-${index}`} className="line-clamp-1">
											{line}
										</p>
									))
								) : (
									<p className="text-silver-300">
										Open the document to read the full teaching material.
									</p>
								)}
							</div>
							<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
								<p className="max-w-[18rem] truncate text-xs text-silver-300">
									{document.groupTitles.join(', ')}
								</p>
								<Link
									href={`/app/writer/documents/${document.id}`}
									className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30">
									Read document
								</Link>
							</div>
						</article>
					))}
				</div>
			) : null}
		</section>
	)
}
