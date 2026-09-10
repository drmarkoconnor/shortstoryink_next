import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import {
	SnippetLibrary,
	type SnippetLibraryEntry,
} from '@/components/teacher/snippet-library'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { feedbackSlug, normalizeSnippetLabel } from '@/lib/feedback/categories'
import { teacherTabs } from '@/lib/mock/teacher-prototype'
import {
	normalizeSnippetStatus,
	normalizeSnippetUseFlags,
} from '@/lib/snippets/workbench'
import { createServerDataClient } from '@/lib/data/client'
import { teacherSnippetLibraryLimit } from '@/lib/teacher-library/query-limits'

type SnippetRow = {
	id: string
	snippet_text: string
	note: string | null
	created_at: string
	updated_at: string | null
	anchor: unknown
	source_submission_id: string | null
	source_type: string | null
}

type SelectionAnchor = {
	categoryLabel?: string
	categorySlug?: string
	tags?: unknown[]
	sourceLabel?: string
	sourceKind?: string
	originalSource?: string
	sourceAuthor?: string
	sourceTitle?: string
	sourceName?: string
	sourceUrl?: string
	sourceSection?: string
	snippetStatus?: unknown
	snippetUseFlags?: unknown
}

function isSelectionAnchor(value: unknown): value is SelectionAnchor {
	return Boolean(value && typeof value === 'object')
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

export default async function TeacherSnippetLibraryPage() {
	const profile = await requireTeacher()
	const dataClient = await createServerDataClient()
	let snippets: SnippetLibraryEntry[] = []
	let loadError: string | null = null

	const snippetsResult = await dataClient
		.from('snippets')
		.select('id, snippet_text, note, created_at, updated_at, anchor, source_submission_id, source_type')
		.eq('saved_by', profile.user.id)
		.order('created_at', { ascending: false })
		.limit(teacherSnippetLibraryLimit)

	if (snippetsResult.error) {
		loadError = snippetsResult.error.message
	} else {
		snippets = ((snippetsResult.data ?? []) as SnippetRow[]).map((row) => {
			const anchor = isSelectionAnchor(row.anchor) ? row.anchor : null
			const categoryLabel = categoryFromAnchor(anchor)

			return {
				id: row.id,
				text: row.snippet_text,
				note: row.note ?? '',
				createdAt: row.created_at,
				updatedAt: row.updated_at ?? row.created_at,
				categoryLabel,
				categorySlug:
					typeof anchor?.categorySlug === 'string' && anchor.categorySlug.trim()
						? anchor.categorySlug
						: categoryLabel === 'Uncategorised'
							? 'uncategorised'
							: feedbackSlug(categoryLabel),
				tags: tagsFromAnchor(anchor),
				sourceSubmissionId: row.source_submission_id,
				sourceType: row.source_type ?? null,
				sourceLabel: anchor?.sourceLabel ?? anchor?.sourceAuthor ?? '',
				sourceTitle: anchor?.sourceKind ?? anchor?.sourceTitle ?? '',
				sourceName: anchor?.sourceName ?? anchor?.originalSource ?? '',
				sourceUrl: anchor?.sourceUrl ?? '',
				sourceSection: anchor?.sourceSection ?? '',
				status: normalizeSnippetStatus(anchor?.snippetStatus),
				useFlags: normalizeSnippetUseFlags(anchor?.snippetUseFlags),
			}
		})
	}

	return (
		<section className="space-y-8">
			<MenuTabs
				tabs={teacherTabs}
				active="/app/teacher/snippets"
				context={
					<Link
						href="/app/teacher-studio"
						className="rounded border border-studio-line px-3 py-1.5 text-sm text-studio-muted transition hover:border-studio-line hover:text-studio-ink">
						Return to Studio
					</Link>
				}
			/>

			<div className="studio-page-header">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p className="text-xs uppercase tracking-[0.12em] text-studio-muted">
							A commonplace for teaching
						</p>
						<h1 className="studio-heading mt-3">
							Saved passages
						</h1>
						<p className="muted mt-1 max-w-prose text-sm leading-relaxed">
							Find, rank, tag, and prepare saved extracts for documents and classes.
						</p>
					</div>
				</div>
			</div>

			{loadError ? (
				<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
					Unable to load snippets: {loadError}
				</p>
			) : (
				<SnippetLibrary initialSnippets={snippets} />
			)}
		</section>
	)
}
