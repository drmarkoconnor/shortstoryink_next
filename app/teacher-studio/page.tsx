import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { fixedFeedbackCategories } from '@/lib/feedback/categories'
import { teacherTabs } from '@/lib/mock/teacher-prototype'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { teacherSnippetLibraryLimit } from '@/lib/teacher-library/query-limits'

type SnippetMetricRow = {
	id: string
	anchor: unknown
	note?: string | null
	source_type?: string | null
	created_at?: string
	snippet_text?: string | null
}

type DocumentMetricRow = {
	id: string
	title: string | null
	updated_at: string | null
}

type SelectionAnchor = {
	categoryLabel?: string
	tags?: unknown[]
	sourceAuthor?: string
	sourceLabel?: string
	sourceKind?: string
	sourceTitle?: string
	sourceName?: string
	originalSource?: string
}

function isSelectionAnchor(value: unknown): value is SelectionAnchor {
	return Boolean(value && typeof value === 'object')
}

function categoryLabelFromAnchor(anchor: unknown) {
	if (!isSelectionAnchor(anchor)) {
		return 'Uncategorised'
	}

	const label = typeof anchor.categoryLabel === 'string'
		? anchor.categoryLabel.trim()
		: ''

	return fixedFeedbackCategories.includes(label) ? label : 'Uncategorised'
}

function cleanMetricLabel(value: unknown) {
	return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

function topCounts(values: string[], limit = 5) {
	const counts = values.reduce(
		(acc, value) => {
			const label = cleanMetricLabel(value)
			if (label) {
				acc[label] = (acc[label] ?? 0) + 1
			}
			return acc
		},
		{} as Record<string, number>,
	)

	return Object.entries(counts)
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, limit)
		.map(([label, count]) => ({ label, count }))
}

function tagsFromAnchor(anchor: unknown) {
	if (!isSelectionAnchor(anchor) || !Array.isArray(anchor.tags)) {
		return []
	}
	return anchor.tags.map((tag) => cleanMetricLabel(tag)).filter(Boolean)
}

function authorLabelFromSnippet(snippet: SnippetMetricRow) {
	if (!isSelectionAnchor(snippet.anchor)) {
		return ''
	}
	return (
		cleanMetricLabel(snippet.anchor.sourceAuthor) ||
		(snippet.source_type === 'external'
			? cleanMetricLabel(snippet.anchor.sourceLabel)
			: '')
	)
}

function sourceLabelFromSnippet(snippet: SnippetMetricRow) {
	if (!isSelectionAnchor(snippet.anchor)) {
		return ''
	}
	return (
		cleanMetricLabel(snippet.anchor.sourceName) ||
		cleanMetricLabel(snippet.anchor.originalSource) ||
		cleanMetricLabel(snippet.anchor.sourceTitle) ||
		cleanMetricLabel(snippet.anchor.sourceKind)
	)
}

function MetricList({
	title,
	items,
	emptyLabel,
}: {
	title: string
	items: Array<{ label: string; count: number }>
	emptyLabel: string
}) {
	return (
		<div className="rounded-xl border border-white/10 bg-ink-950/35 p-3">
			<p className="text-[11px] uppercase tracking-[0.1em] text-silver-300">
				{title}
			</p>
			{items.length ? (
				<ol className="mt-2 space-y-1.5">
					{items.map((item) => (
						<li
							key={item.label}
							className="flex items-center justify-between gap-3 text-sm">
							<span className="min-w-0 truncate text-silver-100">
								{item.label}
							</span>
							<span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-silver-300">
								{item.count}
							</span>
						</li>
					))}
				</ol>
			) : (
				<p className="mt-2 text-sm text-silver-400">{emptyLabel}</p>
			)}
		</div>
	)
}

function formatShortDate(value: string | null | undefined) {
	if (!value) {
		return ''
	}
	return new Date(value).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
	})
}

function RecentList({
	title,
	items,
	emptyLabel,
}: {
	title: string
	items: Array<{ id: string; href: string; label: string; meta: string }>
	emptyLabel: string
}) {
	return (
		<div className="rounded-xl border border-white/10 bg-ink-950/35 p-3">
			<p className="text-[11px] uppercase tracking-[0.1em] text-silver-300">
				{title}
			</p>
			{items.length ? (
				<ul className="mt-2 space-y-1.5">
					{items.map((item) => (
						<li key={item.id}>
							<Link
								href={item.href}
								className="block rounded-lg px-2 py-1.5 transition hover:bg-white/[0.05]">
								<span className="block truncate text-sm text-silver-100">
									{item.label}
								</span>
								<span className="block truncate text-[11px] uppercase tracking-[0.08em] text-silver-400">
									{item.meta}
								</span>
							</Link>
						</li>
					))}
				</ul>
			) : (
				<p className="mt-2 text-sm text-silver-400">{emptyLabel}</p>
			)}
		</div>
	)
}

export default async function TeacherStudioPage() {
	const profile = await requireTeacher()
	const supabase = await createServerSupabaseClient()
	let snippets: SnippetMetricRow[] = []
	let documents: DocumentMetricRow[] = []
	let recentSourceSnippets: SnippetMetricRow[] = []
	let loadError: string | null = null

	const snippetsResult = await supabase
		.from('snippets')
		.select('id, anchor, note, source_type, created_at, snippet_text')
		.eq('saved_by', profile.user.id)
		.limit(teacherSnippetLibraryLimit)

	if (snippetsResult.error) {
		loadError = snippetsResult.error.message
	} else {
		snippets = (snippetsResult.data ?? []) as SnippetMetricRow[]
	}

	const documentsResult = await supabase
		.from('teacher_documents')
		.select('id, title, updated_at')
		.eq('owner_id', profile.user.id)
		.order('updated_at', { ascending: false })
		.limit(5)

	if (!documentsResult.error) {
		documents = (documentsResult.data ?? []) as DocumentMetricRow[]
	}

	const recentSourcesResult = await supabase
		.from('snippets')
		.select('id, anchor, source_type, created_at, snippet_text')
		.eq('saved_by', profile.user.id)
		.eq('source_type', 'external')
		.order('created_at', { ascending: false })
		.limit(5)

	if (!recentSourcesResult.error) {
		recentSourceSnippets = (recentSourcesResult.data ?? []) as SnippetMetricRow[]
	}

	const totalSnippets = snippets.length
	const uncategorisedSnippets = snippets.filter(
		(snippet) => categoryLabelFromAnchor(snippet.anchor) === 'Uncategorised',
	).length
	const representedCategories = new Set(
		snippets
			.map((snippet) => categoryLabelFromAnchor(snippet.anchor))
			.filter((label) => label !== 'Uncategorised'),
	).size
	const sourceSnippetCount = snippets.filter(
		(snippet) => snippet.source_type === 'external',
	).length
	const snippetsWithNotes = snippets.filter((snippet) =>
		String(snippet.note ?? '').trim(),
	).length
	const taggedSnippets = snippets.filter(
		(snippet) => tagsFromAnchor(snippet.anchor).length > 0,
	).length
	const topCategories = topCounts(
		snippets.map((snippet) => categoryLabelFromAnchor(snippet.anchor)),
	)
	const topAuthors = topCounts(snippets.map(authorLabelFromSnippet))
	const topSources = topCounts(snippets.map(sourceLabelFromSnippet))
	const recentDocuments = documents.map((document) => ({
		id: document.id,
		href: '/app/teacher/documents',
		label: document.title?.trim() || 'Untitled document',
		meta: formatShortDate(document.updated_at) || 'Date pending',
	}))
	const recentSources = recentSourceSnippets.map((snippet) => ({
		id: snippet.id,
		href: '/app/teacher/sources/read',
		label:
			sourceLabelFromSnippet(snippet) ||
			cleanMetricLabel(snippet.snippet_text).slice(0, 80) ||
			'Source snippet',
		meta: formatShortDate(snippet.created_at) || 'Date pending',
	}))

	return (
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher-studio" />

			<div className="surface p-4 lg:p-5">
				<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
					Teacher Studio
				</p>
				<h1 className="literary-title mt-1 text-2xl text-parchment-100">
					Studio
				</h1>
				<p className="muted mt-2 max-w-prose text-sm leading-relaxed">
					Reusable teaching material, source capture, snippets, and documents.
				</p>
			</div>

			{loadError ? (
				<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
					Unable to load studio metrics: {loadError}
				</p>
			) : (
				<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
					<Link
						href="/app/teacher/snippets"
						className="surface block p-5 transition hover:border-white/20 hover:bg-white/[0.04]">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
									Active
								</p>
								<h2 className="mt-2 text-xl font-semibold text-parchment-100">
									Snippet Library
								</h2>
							</div>
							<p className="rounded-full border border-accent-300/35 bg-accent-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-accent-100">
								Open
							</p>
						</div>
						<p className="mt-3 text-sm leading-relaxed text-silver-200">
							Browse, search, categorise, tag, edit, and clean up saved
							snippets.
						</p>
						<div className="mt-4 grid gap-2 sm:grid-cols-3">
							<p className="rounded-xl border border-white/10 bg-ink-950/50 px-3 py-2 text-sm text-silver-100">
								<span className="block text-lg text-parchment-100">
									{totalSnippets}
								</span>
								snippets
							</p>
							<p className="rounded-xl border border-white/10 bg-ink-950/50 px-3 py-2 text-sm text-silver-100">
								<span className="block text-lg text-parchment-100">
									{uncategorisedSnippets}
								</span>
								uncategorised
							</p>
							<p className="rounded-xl border border-white/10 bg-ink-950/50 px-3 py-2 text-sm text-silver-100">
								<span className="block text-lg text-parchment-100">
									{representedCategories}
								</span>
								categories
							</p>
						</div>
						<div className="mt-3 grid gap-2 sm:grid-cols-3">
							<p className="rounded-xl border border-white/10 bg-ink-950/35 px-3 py-2 text-sm text-silver-100">
								<span className="block text-lg text-parchment-100">
									{sourceSnippetCount}
								</span>
								source snippets
							</p>
							<p className="rounded-xl border border-white/10 bg-ink-950/35 px-3 py-2 text-sm text-silver-100">
								<span className="block text-lg text-parchment-100">
									{taggedSnippets}
								</span>
								tagged
							</p>
							<p className="rounded-xl border border-white/10 bg-ink-950/35 px-3 py-2 text-sm text-silver-100">
								<span className="block text-lg text-parchment-100">
									{snippetsWithNotes}
								</span>
								with notes
							</p>
						</div>
						<div className="mt-4 grid gap-3 lg:grid-cols-3">
							<MetricList
								title="Top categories"
								items={topCategories}
								emptyLabel="No categories yet"
							/>
							<MetricList
								title="Top authors"
								items={topAuthors}
								emptyLabel="No source authors yet"
							/>
							<MetricList
								title="Top sources"
								items={topSources}
								emptyLabel="No source metadata yet"
							/>
						</div>
					</Link>

					<div className="space-y-3">
						<Link
							href="/app/teacher/library"
							className="surface block p-5 transition hover:border-white/20 hover:bg-white/[0.04]">
							<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
								Active
							</p>
							<h2 className="mt-2 text-lg font-semibold text-parchment-100">
								Teaching Library
							</h2>
							<p className="mt-2 text-sm leading-relaxed text-silver-300">
								Search notes, examples, and lightweight references for fast reuse.
							</p>
						</Link>
						<Link
							href="/app/teacher/documents"
							className="surface block p-5 transition hover:border-white/20 hover:bg-white/[0.04]">
							<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
								Active
							</p>
							<h2 className="mt-2 text-lg font-semibold text-parchment-100">
								Document Builder
							</h2>
							<p className="mt-2 text-sm leading-relaxed text-silver-300">
								Assemble printable teaching documents from snippets and text.
							</p>
						</Link>
						<Link
							href="/app/teacher/sources/new"
							className="surface block p-5 transition hover:border-white/20 hover:bg-white/[0.04]">
							<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
								Active
							</p>
							<h2 className="mt-2 text-lg font-semibold text-parchment-100">
								Create single source
							</h2>
							<p className="mt-2 text-sm leading-relaxed text-silver-300">
								Paste longer passages for reading, or save individual source excerpts.
							</p>
							<div className="mt-3 flex flex-wrap gap-2">
								<span className="rounded-full border border-white/10 bg-ink-950/50 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-silver-300">
									{sourceSnippetCount} source snippets
								</span>
								<span className="rounded-full border border-accent-300/35 bg-accent-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-accent-100">
									Open
								</span>
							</div>
						</Link>
						<Link
							href="/app/teacher/sources/read"
							className="surface block p-5 transition hover:border-white/20 hover:bg-white/[0.04]">
							<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
								Active
							</p>
							<h2 className="mt-2 text-lg font-semibold text-parchment-100">
								Create multi-snippets from long source
							</h2>
							<p className="mt-2 text-sm leading-relaxed text-silver-300">
								Read a pasted source passage and extract multiple attributed snippets.
							</p>
						</Link>
					</div>
				</div>
			)}

			{loadError ? null : (
				<div className="grid gap-3 lg:grid-cols-2">
					<RecentList
						title="Last documents"
						items={recentDocuments}
						emptyLabel="No documents yet"
					/>
					<RecentList
						title="Last source captures"
						items={recentSources}
						emptyLabel="No source snippets yet"
					/>
				</div>
			)}
		</section>
	)
}
