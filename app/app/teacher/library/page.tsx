import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import {
	TeachingLibrary,
	type TeachingLibraryEntry,
} from '@/components/teacher/teaching-library'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { normalizeTeacherDisplayName } from '@/lib/display-names'
import { normalizeSnippetLabel } from '@/lib/feedback/categories'
import { teacherTabs } from '@/lib/mock/teacher-prototype'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
	teacherLibraryItemLimit,
	teacherSnippetLibraryLimit,
} from '@/lib/teacher-library/query-limits'
import {
	normalizeTeachingLibraryItemType,
	normalizeTeachingLibraryReferenceType,
} from '@/lib/teacher-library/types'

type LibraryRow = {
	id: string
	item_type: string | null
	title: string
	body: string | null
	reference_type: string | null
	url: string | null
	category_label: string | null
	tags: string[] | null
	created_at: string
	updated_at: string
}

type SnippetRow = {
	id: string
	snippet_text: string
	note: string | null
	created_at: string
	updated_at: string | null
	anchor: unknown
	source_type: string | null
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
		? anchor.tags.map((tag) => String(tag).trim()).filter(Boolean)
		: []
}

function categoryFromAnchor(anchor: SelectionAnchor | null) {
	return normalizeSnippetLabel(
		typeof anchor?.categoryLabel === 'string' ? anchor.categoryLabel : '',
	)
}

function sourceLabelFromAnchor(anchor: SelectionAnchor | null, fallback: string) {
	if (!anchor) {
		return fallback
	}

	return [
		anchor.sourceAuthor,
		anchor.sourceLabel,
		anchor.createdByLabel,
		anchor.sourceTitle,
		anchor.sourceName,
		anchor.originalSource,
		anchor.sourceKind,
	]
		.map((value) => (typeof value === 'string' ? value.trim() : ''))
		.find(Boolean) ?? fallback
}

export default async function TeacherLibraryPage() {
	const profile = await requireTeacher()
	const supabase = await createServerSupabaseClient()
	let entries: TeachingLibraryEntry[] = []
	let persistenceNotice: string | null = null
	let loadError: string | null = null

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

	const libraryResult = await supabase
		.from('teaching_library_items')
		.select(
			'id, item_type, title, body, reference_type, url, category_label, tags, created_at, updated_at',
		)
		.eq('owner_id', profile.user.id)
		.order('updated_at', { ascending: false })
		.limit(teacherLibraryItemLimit)

	if (libraryResult.error) {
		persistenceNotice = isSchemaCacheMissing(libraryResult.error.message)
			? 'Teaching notes and references need the teaching_library_items migration before they can be saved. Existing examples still appear.'
			: `Unable to load teaching notes and references: ${libraryResult.error.message}`
	} else {
		entries = ((libraryResult.data ?? []) as LibraryRow[]).map((row) => {
			const itemType = normalizeTeachingLibraryItemType(row.item_type)
			return {
				id: row.id,
				itemType,
				title: row.title,
				body: row.body ?? '',
				referenceType:
					itemType === 'reference'
						? normalizeTeachingLibraryReferenceType(row.reference_type)
						: null,
				url: row.url,
				categoryLabel: normalizeSnippetLabel(row.category_label ?? ''),
				tags: row.tags ?? [],
				updatedAt: row.updated_at,
			}
		})
	}

	const snippetsResult = await supabase
		.from('snippets')
		.select('id, snippet_text, note, created_at, updated_at, anchor, source_type')
		.eq('saved_by', profile.user.id)
		.order('created_at', { ascending: false })
		.limit(teacherSnippetLibraryLimit)

	if (snippetsResult.error) {
		loadError = snippetsResult.error.message
	} else {
		const examples = ((snippetsResult.data ?? []) as SnippetRow[]).map((row) => {
			const anchor = isSelectionAnchor(row.anchor) ? row.anchor : null
			return {
				id: row.id,
				itemType: 'example' as const,
				title: row.note?.trim() ? row.note.trim() : 'Teaching example',
				body: row.snippet_text,
				note: row.note ?? '',
				categoryLabel: categoryFromAnchor(anchor),
				tags: tagsFromAnchor(anchor),
				updatedAt: row.updated_at ?? row.created_at,
				sourceLabel: sourceLabelFromAnchor(anchor, teacherName),
			}
		})
		entries = [...entries, ...examples].sort((a, b) =>
			b.updatedAt.localeCompare(a.updatedAt),
		)
	}

	return (
		<section className="space-y-5">
			<MenuTabs
				tabs={teacherTabs}
				active="/app/teacher-studio"
				context={
					<Link
						href="/app/teacher-studio"
						className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
						Return to Studio
					</Link>
				}
			/>

			<div className="surface p-5 lg:p-6">
				<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
					Teaching Library
				</p>
				<h1 className="literary-title mt-2 text-3xl text-parchment-100">
					Library
				</h1>
				<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
					Reusable teaching notes, saved examples, and lightweight references
					for quick recall and document insertion.
				</p>
			</div>

			{loadError ? (
				<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
					Unable to load examples: {loadError}
				</p>
			) : null}

			<TeachingLibrary
				initialEntries={entries}
				persistenceNotice={persistenceNotice}
			/>
		</section>
	)
}
