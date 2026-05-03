import type { JSONContent } from '@tiptap/core'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PrintAction } from '@/components/export/print-action'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
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

type SnippetSourceMetadata = {
	sourceLabel?: string
	sourceKind?: string
	originalSource?: string
	createdByLabel?: string
}

type SnippetExampleAttrs = {
	text: string
	note: string
	includeNote: boolean
	sourceMetadata: SnippetSourceMetadata
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

function snippetAttrsFromNode(node: JSONContent): SnippetExampleAttrs {
	const attrs = node.attrs ?? {}
	const sourceMetadata =
		attrs.sourceMetadata && typeof attrs.sourceMetadata === 'object'
			? (attrs.sourceMetadata as SnippetSourceMetadata)
			: {}

	return {
		text: String(attrs.text ?? ''),
		note: String(attrs.note ?? ''),
		includeNote: attrs.includeNote !== false,
		sourceMetadata,
	}
}

function snippetAttribution(source: SnippetSourceMetadata) {
	const label = source.sourceLabel || source.createdByLabel
	const kind = source.sourceKind || source.originalSource

	if (label && kind) {
		return `${label}, ${kind}`
	}
	return label || kind || ''
}

function renderInlineContent(nodes: JSONContent[] | undefined): ReactNode {
	return (nodes ?? []).map((node, index) => {
		if (node.type === 'text') {
			let content: ReactNode = node.text ?? ''
			for (const mark of node.marks ?? []) {
				if (mark.type === 'bold') {
					content = <strong key={`${index}-bold`}>{content}</strong>
				}
				if (mark.type === 'italic') {
					content = <em key={`${index}-italic`}>{content}</em>
				}
			}
			return <span key={index}>{content}</span>
		}

		if (node.type === 'hardBreak') {
			return <br key={index} />
		}

		return <span key={index}>{renderInlineContent(node.content)}</span>
	})
}

function renderListItem(node: JSONContent, index: number) {
	return (
		<li key={index}>
			{(node.content ?? []).map((child, childIndex) => (
				<span key={childIndex}>{renderInlineContent(child.content)}</span>
			))}
		</li>
	)
}

function renderDocumentNode(node: JSONContent, index: number) {
	if (node.type === 'heading') {
		const level = Number(node.attrs?.level ?? 2)
		const heading = renderInlineContent(node.content)

		if (level === 1) {
			return (
				<h1 key={index} className="literary-title mt-7 text-4xl text-ink-900">
					{heading}
				</h1>
			)
		}
		if (level === 2) {
			return (
				<h2 key={index} className="literary-title mt-6 text-2xl text-ink-900">
					{heading}
				</h2>
			)
		}
		return (
			<h3 key={index} className="mt-5 text-lg font-semibold text-ink-900">
				{heading}
			</h3>
		)
	}

	if (node.type === 'bulletList') {
		return (
			<ul
				key={index}
				className="mt-3 list-disc space-y-1 pl-5 text-[15px] leading-7 text-ink-900/86">
				{(node.content ?? []).map(renderListItem)}
			</ul>
		)
	}

	if (node.type === 'orderedList') {
		return (
			<ol
				key={index}
				className="mt-3 list-decimal space-y-1 pl-5 text-[15px] leading-7 text-ink-900/86">
				{(node.content ?? []).map(renderListItem)}
			</ol>
		)
	}

	if (node.type === 'blockquote') {
		return (
			<blockquote
				key={index}
				className="mt-4 border-l-2 border-accent-700/35 px-4 py-2 text-[15px] leading-7 text-ink-900/78">
				{(node.content ?? []).map((child, childIndex) => (
					<p key={childIndex}>{renderInlineContent(child.content)}</p>
				))}
			</blockquote>
		)
	}

	if (node.type === 'snippetExample') {
		const attrs = snippetAttrsFromNode(node)
		const attribution = snippetAttribution(attrs.sourceMetadata)

		return (
			<aside
				key={index}
				className="print-break-avoid mt-5 border-l-2 border-accent-700/45 py-2 pl-5">
				<div className="relative">
					<span
						aria-hidden="true"
						className="absolute -left-4 -top-3 font-serif text-5xl leading-none text-accent-700/40">
						&ldquo;
					</span>
					<p className="whitespace-pre-wrap font-serif text-[17px] italic leading-8 text-ink-900/88">
						{attrs.text}
					</p>
					<span
						aria-hidden="true"
						className="mt-1 block text-right font-serif text-4xl leading-none text-accent-700/35">
						&rdquo;
					</span>
				</div>
				{attribution ? (
					<p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-ink-900/45">
						{attribution}
					</p>
				) : null}
				{attrs.includeNote && attrs.note ? (
					<p className="mt-3 border-l border-ink-900/15 pl-3 text-[14px] leading-6 text-ink-900/72">
						{attrs.note}
					</p>
				) : null}
			</aside>
		)
	}

	if (node.type === 'paragraph') {
		return (
			<p
				key={index}
				className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-ink-900/86">
				{renderInlineContent(node.content)}
			</p>
		)
	}

	return null
}

function todayStamp() {
	return new Date().toISOString().slice(0, 10)
}

function safeFilenamePart(value: string) {
	return value
		.trim()
		.replace(/[\\/:*?"<>|]+/g, '')
		.replace(/\s+/g, ' ')
		.slice(0, 90)
}

function printFilename(title: string) {
	const safeTitle = safeFilenamePart(title) || 'Teaching document'
	return `${safeTitle} - ${todayStamp()}`
}

export default async function WriterDocumentPage({
	params,
}: {
	params: Promise<{ documentId: string }>
}) {
	await requireWriter()
	const user = await getCurrentUser()
	const { documentId } = await params
	const supabase = await createServerSupabaseClient()

	const { data: memberRows, error: membershipError } = await supabase
		.from('workshop_members')
		.select('workshop_id')
		.eq('profile_id', user.id)

	if (membershipError) {
		notFound()
	}

	const writerWorkshopIds = new Set(
		(memberRows ?? []).map((row) => row.workshop_id as string),
	)
	if (writerWorkshopIds.size === 0) {
		notFound()
	}

	const { data: activeWorkshopRows, error: activeWorkshopError } = await supabase
		.from('workshops')
		.select('id')
		.in('id', Array.from(writerWorkshopIds))

	if (activeWorkshopError) {
		notFound()
	}

	const activeWriterWorkshopIds = new Set(
		(activeWorkshopRows ?? []).map((row) => row.id as string),
	)
	if (activeWriterWorkshopIds.size === 0) {
		notFound()
	}

	const adminSupabase = createAdminSupabaseClient()
	const { data: documentRow, error } = await adminSupabase
		.from('teacher_documents')
		.select('id, title, body, updated_at')
		.eq('id', documentId)
		.maybeSingle()

	if (error || !documentRow) {
		notFound()
	}

	const document = documentRow as DocumentRow
	const documentGroupIds = groupIdsFromBody(document.body)
	const canRead = documentGroupIds.some((groupId) =>
		activeWriterWorkshopIds.has(groupId),
	)

	if (!canRead) {
		notFound()
	}

	const content = contentFromBody(document.body)
	const documentType = typeFromBody(document.body)

	return (
		<section className="space-y-5">
			<div className="print-controls flex flex-wrap items-center justify-between gap-3">
				<Link
					href="/app/writer"
					className="rounded-full border border-white/15 px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-silver-100 transition hover:border-white/25 hover:text-parchment-100">
					Back to write
				</Link>
				<div className="flex flex-wrap items-center justify-end gap-3">
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						{documentType}
					</p>
					<PrintAction filename={printFilename(document.title)} />
				</div>
			</div>

			<article className="print-shell folio-page mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
				<div className="print-page-footer hidden text-[11px] uppercase tracking-[0.16em] text-ink-900/42 print:flex">
					<span>shortstory.ink</span>
					<span className="print-page-number" />
				</div>
				<header className="border-b border-ink-900/10 pb-5">
					<p className="text-xs uppercase tracking-[0.16em] text-ink-900/45">
						shortstory.ink teaching document
					</p>
					<p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-ink-900/45">
						{documentType}
					</p>
					<h1 className="literary-title mt-2 text-4xl text-ink-900">
						{document.title}
					</h1>
				</header>
				<div className="mt-2">{(content.content ?? []).map(renderDocumentNode)}</div>
			</article>
		</section>
	)
}
