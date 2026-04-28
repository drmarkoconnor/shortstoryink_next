import { MenuTabs } from '@/components/prototype/menu-tabs'
import {
	SnippetLibrary,
	type SnippetLibraryEntry,
} from '@/components/teacher/snippet-library'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { feedbackSlug, normalizeFeedbackLabel } from '@/lib/feedback/categories'
import { teacherTabs } from '@/lib/mock/teacher-prototype'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type SnippetRow = {
	id: string
	snippet_text: string
	note: string | null
	created_at: string
	anchor: unknown
	source_submission_id: string | null
}

type SelectionAnchor = {
	categoryLabel?: string
	categorySlug?: string
	tags?: unknown[]
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
	return normalizeFeedbackLabel(
		typeof anchor?.categoryLabel === 'string' ? anchor.categoryLabel : '',
	)
}

export default async function TeacherSnippetLibraryPage() {
	const profile = await requireTeacher()
	const supabase = await createServerSupabaseClient()
	let snippets: SnippetLibraryEntry[] = []
	let loadError: string | null = null

	const snippetsResult = await supabase
		.from('snippets')
		.select('id, snippet_text, note, created_at, anchor, source_submission_id')
		.eq('saved_by', profile.user.id)
		.order('created_at', { ascending: false })
		.limit(100)

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
				categoryLabel,
				categorySlug:
					typeof anchor?.categorySlug === 'string' && anchor.categorySlug.trim()
						? anchor.categorySlug
						: categoryLabel === 'Uncategorised'
							? 'uncategorised'
							: feedbackSlug(categoryLabel),
				tags: tagsFromAnchor(anchor),
				sourceSubmissionId: row.source_submission_id,
			}
		})
	}

	return (
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher/snippets" />

			<div className="surface p-5 lg:p-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
							Snippet Library
						</p>
						<h1 className="literary-title mt-2 text-3xl text-parchment-100">
							Snippets
						</h1>
						<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
							Browse, tidy, and reuse saved teaching snippets without leaving the
							review workflow behind.
						</p>
					</div>
				</div>
			</div>

			{loadError ? (
				<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
					Unable to load snippets: {loadError}
				</p>
			) : (
				<SnippetLibrary initialSnippets={snippets} />
			)}
		</section>
	)
}
