'use client'

import Link from 'next/link'
import {
	Fragment,
	type FocusEvent as ReactFocusEvent,
	type MouseEvent as ReactMouseEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import {
	fixedSnippetCategories,
	normalizeSnippetCategoryLabel,
} from '@/lib/feedback/categories'
import {
	teachingLibraryReferenceTypes,
	type TeachingLibraryItemType,
	type TeachingLibraryReferenceType,
} from '@/lib/teacher-library/types'
import {
	isNearTeacherLibraryLimit,
	teacherLibraryItemLimit,
	teacherSnippetLibraryLimit,
} from '@/lib/teacher-library/query-limits'

export type TeachingLibraryEntry = {
	id: string
	itemType: TeachingLibraryItemType | 'example'
	title: string
	body: string
	note?: string
	categoryLabel: string
	tags: string[]
	updatedAt: string
	referenceType?: TeachingLibraryReferenceType | null
	url?: string | null
	sourceLabel?: string
}

type EditableLibraryEntry = TeachingLibraryEntry & {
	itemType: TeachingLibraryItemType | 'example'
}

type DraftState = {
	id: string | null
	itemType: TeachingLibraryItemType | 'example'
	title: string
	body: string
	referenceType: TeachingLibraryReferenceType
	url: string
	categoryLabel: string
	tagsText: string
}

type HoverPreview = {
	entry: TeachingLibraryEntry
	x: number
	y: number
}

const emptyDraft: DraftState = {
	id: null,
	itemType: 'note',
	title: '',
	body: '',
	referenceType: 'book',
	url: '',
	categoryLabel: 'Uncategorised',
	tagsText: '',
}

function entryKey(entry: TeachingLibraryEntry) {
	return `${entry.itemType}:${entry.id}`
}

function compactPreview(value: string, limit = 180) {
	const normalized = value.replace(/\s+/g, ' ').trim()
	if (normalized.length <= limit) {
		return normalized
	}
	return `${normalized.slice(0, limit - 1).trimEnd()}...`
}

function splitTags(value: string) {
	return Array.from(
		new Set(
			value
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
	).slice(0, 12)
}

function itemTypeLabel(type: TeachingLibraryEntry['itemType']) {
	if (type === 'note') {
		return 'Note'
	}
	if (type === 'reference') {
		return 'Reference'
	}
	return 'Example'
}

function itemTypeClassName(type: TeachingLibraryEntry['itemType']) {
	if (type === 'note') {
		return 'border-sky-200/25 bg-sky-200/10 text-sky-100'
	}
	if (type === 'reference') {
		return 'border-amber-200/25 bg-amber-200/10 text-amber-100'
	}
	return 'border-accent-300/35 bg-accent-300/10 text-accent-100'
}

function formatShortDate(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return ''
	}
	return new Intl.DateTimeFormat('en-GB', {
		day: '2-digit',
		month: 'short',
		year: '2-digit',
	}).format(date)
}

function libraryLimitTitle({
	exampleCount,
	itemCount,
}: {
	exampleCount: number
	itemCount: number
}) {
	if (
		isNearTeacherLibraryLimit(exampleCount, teacherSnippetLibraryLimit) ||
		isNearTeacherLibraryLimit(itemCount, teacherLibraryItemLimit)
	) {
		return `Approaching a temporary client load limit. Examples load up to ${teacherSnippetLibraryLimit}; notes and references load up to ${teacherLibraryItemLimit}. Return to the codebase soon to add pagination or server-side search.`
	}
	return `This client view currently loads up to ${teacherSnippetLibraryLimit} examples plus ${teacherLibraryItemLimit} notes and references.`
}

function entryCopyText(entry: TeachingLibraryEntry) {
	const parts = [
		entry.title.trim(),
		entry.body.trim(),
		entry.sourceLabel ? `Source: ${entry.sourceLabel}` : '',
		entry.url ? `URL: ${entry.url}` : '',
		entry.tags.length ? `Tags: ${entry.tags.join(', ')}` : '',
	].filter(Boolean)

	return parts.join('\n\n')
}

function getHoverPosition(event: ReactMouseEvent<HTMLElement>) {
	const cardWidth = 420
	const cardHeight = 260
	const left = Math.max(
		16,
		Math.min(event.clientX + 18, window.innerWidth - cardWidth - 16),
	)
	const top = Math.max(
		16,
		Math.min(event.clientY + 18, window.innerHeight - cardHeight - 16),
	)

	return { x: left, y: top }
}

export function TeachingLibrary({
	initialEntries,
	persistenceNotice,
}: {
	initialEntries: TeachingLibraryEntry[]
	persistenceNotice?: string | null
}) {
	const [entries, setEntries] = useState(initialEntries)
	const [searchQuery, setSearchQuery] = useState('')
	const [typeFilter, setTypeFilter] = useState('')
	const [categoryFilter, setCategoryFilter] = useState('')
	const [draft, setDraft] = useState<DraftState>(emptyDraft)
	const [isSaving, setIsSaving] = useState(false)
	const [notice, setNotice] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [expandedEntryKey, setExpandedEntryKey] = useState<string | null>(null)
	const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null)
	const [copiedEntryKey, setCopiedEntryKey] = useState<string | null>(null)
	const editorRef = useRef<HTMLElement | null>(null)

	useEffect(() => {
		setEntries(initialEntries)
	}, [initialEntries])

	const categories = useMemo(() => {
		return [
			'Uncategorised',
			...fixedSnippetCategories,
			...entries.map((entry) => entry.categoryLabel),
		].filter((category, index, all) => category && all.indexOf(category) === index)
	}, [entries])

	const counts = useMemo(() => {
		return entries.reduce(
			(accumulator, entry) => {
				accumulator[entry.itemType] += 1
				return accumulator
			},
			{ note: 0, example: 0, reference: 0 },
		)
	}, [entries])

	const filteredEntries = useMemo(() => {
		const query = searchQuery.trim().toLowerCase()
		return entries.filter((entry) => {
			if (typeFilter && entry.itemType !== typeFilter) {
				return false
			}
			if (categoryFilter && entry.categoryLabel !== categoryFilter) {
				return false
			}
			if (!query) {
				return true
			}
			return [
				entry.title,
				entry.body,
				entry.categoryLabel,
				entry.sourceLabel,
				entry.referenceType,
				entry.url,
				...entry.tags,
			]
				.join(' ')
				.toLowerCase()
				.includes(query)
		})
	}, [categoryFilter, entries, searchQuery, typeFilter])

	const exampleCount = counts.example
	const libraryOwnItemCount = counts.note + counts.reference
	const isNearLibraryLoadLimit =
		isNearTeacherLibraryLimit(exampleCount, teacherSnippetLibraryLimit) ||
		isNearTeacherLibraryLimit(libraryOwnItemCount, teacherLibraryItemLimit)

	const clearMessages = () => {
		setNotice(null)
		setError(null)
	}

	const resetDraft = () => {
		clearMessages()
		setDraft({ ...emptyDraft })
	}

	const createDraft = (itemType: TeachingLibraryItemType) => {
		clearMessages()
		setDraft({ ...emptyDraft, itemType })
		window.requestAnimationFrame(() => {
			editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
		})
	}

	const editEntry = (entry: EditableLibraryEntry) => {
		clearMessages()
		setDraft({
			id: entry.id,
			itemType: entry.itemType,
			title: entry.itemType === 'example' ? entry.note ?? '' : entry.title,
			body: entry.body,
			referenceType: entry.referenceType ?? 'book',
			url: entry.url ?? '',
			categoryLabel: entry.categoryLabel,
			tagsText: entry.tags.join(', '),
		})
		window.requestAnimationFrame(() => {
			editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
		})
	}

	const saveDraft = async () => {
		const title = draft.title.trim()
		const body = draft.body.trim()
		clearMessages()

		if (draft.itemType !== 'example' && !title) {
			setError('Enter a title.')
			return
		}
		if (draft.itemType === 'note' && !body) {
			setError('Enter the note text.')
			return
		}
		if (draft.itemType === 'reference' && !body && !draft.url.trim()) {
			setError('Add a short note or URL for the reference.')
			return
		}
		if (draft.itemType === 'example' && !body) {
			setError('Snippet text cannot be empty.')
			return
		}

		setIsSaving(true)
		try {
			if (draft.itemType === 'example') {
				if (!draft.id) {
					throw new Error('Choose a snippet to edit.')
				}

				const response = await fetch(`/api/teacher/snippets/${draft.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						text: body,
						note: title,
						categoryLabel: draft.categoryLabel,
						tags: splitTags(draft.tagsText),
					}),
				})
				const payload = (await response.json()) as
					| {
							error?: string
							notice?: string
							snippet?: {
								id: string
								text: string
								note: string
								createdAt: string
								categoryLabel: string
								tags: string[]
							}
					  }
					| undefined

				if (!response.ok || payload?.error || !payload?.snippet) {
					throw new Error(payload?.error ?? 'Unable to update snippet.')
				}

				const savedSnippet = payload.snippet
				setEntries((current) =>
					current.map((entry) =>
						entry.itemType === 'example' && entry.id === savedSnippet.id
							? {
									...entry,
									title: savedSnippet.note.trim()
										? savedSnippet.note.trim()
										: 'Teaching example',
									body: savedSnippet.text,
									note: savedSnippet.note,
									categoryLabel: savedSnippet.categoryLabel,
									tags: savedSnippet.tags,
									updatedAt: new Date().toISOString(),
								}
							: entry,
					),
				)
				setDraft({ ...emptyDraft })
				setNotice(payload.notice ?? 'Snippet updated.')
				return
			}

			const response = await fetch('/api/teacher/library', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: draft.id,
					itemType: draft.itemType,
					title,
					body,
					referenceType: draft.referenceType,
					url: draft.url,
					categoryLabel: draft.categoryLabel,
					tags: splitTags(draft.tagsText),
				}),
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string; item?: TeachingLibraryEntry }
				| undefined

			if (!response.ok || payload?.error || !payload?.item) {
				throw new Error(payload?.error ?? 'Unable to save library item.')
			}

			const savedItem = payload.item
			setEntries((current) => {
				const exists = current.some((entry) => entry.id === savedItem.id)
				if (exists) {
					return current.map((entry) =>
						entry.id === savedItem.id ? savedItem : entry,
					)
				}
				return [savedItem, ...current]
			})
			setDraft({ ...emptyDraft })
			setNotice(payload.notice ?? 'Library item saved.')
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: 'Unable to save library item.',
			)
		} finally {
			setIsSaving(false)
		}
	}

	const deleteDraft = async () => {
		if (!draft.id || draft.itemType === 'example') {
			return
		}

		const confirmed = window.confirm('Delete this library item?')
		if (!confirmed) {
			return
		}

		clearMessages()
		setIsSaving(true)
		try {
			const response = await fetch(
				`/api/teacher/library?id=${encodeURIComponent(draft.id)}`,
				{ method: 'DELETE' },
			)
			const payload = (await response.json()) as
				| { error?: string; notice?: string; deletedId?: string }
				| undefined

			if (!response.ok || payload?.error || !payload?.deletedId) {
				throw new Error(payload?.error ?? 'Unable to delete library item.')
			}

			setEntries((current) =>
				current.filter((entry) => entry.id !== payload.deletedId),
			)
			setDraft({ ...emptyDraft })
			setNotice(payload.notice ?? 'Library item deleted.')
		} catch (deleteError) {
			setError(
				deleteError instanceof Error
					? deleteError.message
					: 'Unable to delete library item.',
			)
		} finally {
			setIsSaving(false)
		}
	}

	const copyEntry = async (entry: TeachingLibraryEntry) => {
		clearMessages()
		const key = entryKey(entry)
		try {
			await navigator.clipboard.writeText(entryCopyText(entry))
			setCopiedEntryKey(key)
			setNotice('Copied to clipboard.')
			window.setTimeout(() => {
				setCopiedEntryKey((current) => (current === key ? null : current))
			}, 1400)
		} catch {
			setError('Unable to copy this item.')
		}
	}

	const showHoverPreview = (
		entry: TeachingLibraryEntry,
		event: ReactMouseEvent<HTMLElement>,
	) => {
		const position = getHoverPosition(event)
		setHoverPreview({ entry, ...position })
	}

	const showFocusPreview = (
		entry: TeachingLibraryEntry,
		event: ReactFocusEvent<HTMLElement>,
	) => {
		const rect = event.currentTarget.getBoundingClientRect()
		const x = Math.max(16, Math.min(rect.left, window.innerWidth - 436))
		const y = Math.max(16, Math.min(rect.bottom + 8, window.innerHeight - 276))
		setHoverPreview({ entry, x, y })
	}

	return (
		<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
			<section className="surface p-4">
				<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_180px_auto]">
					<input
						type="search"
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
						placeholder="Search reusable material"
					/>
					<select
						value={typeFilter}
						onChange={(event) => setTypeFilter(event.target.value)}
						className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100">
						<option value="">All types</option>
						<option value="note">Notes</option>
						<option value="example">Examples</option>
						<option value="reference">References</option>
					</select>
					<select
						value={categoryFilter}
						onChange={(event) => setCategoryFilter(event.target.value)}
						className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100">
						<option value="">All categories</option>
						{categories.map((category) => (
							<option key={category} value={category}>
								{category}
							</option>
						))}
					</select>
					<Link
						href="/app/teacher/documents"
						className="inline-flex items-center justify-center rounded-xl border border-accent-300/50 bg-accent-300/10 px-3 py-2 text-center text-[11px] uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-300/20">
						Open builder
					</Link>
				</div>

				<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
					<p className="text-sm text-silver-300">
						{filteredEntries.length} shown from{' '}
						<span
							title={libraryLimitTitle({
								exampleCount,
								itemCount: libraryOwnItemCount,
							})}
							className={
								isNearLibraryLoadLimit
									? 'text-amber-100 underline decoration-amber-200/50 decoration-dotted underline-offset-4'
									: 'underline decoration-white/20 decoration-dotted underline-offset-4'
							}>
							{entries.length}
						</span>{' '}
						curated items
						{isNearLibraryLoadLimit ? ' Pagination soon.' : ''}
					</p>
					<div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.1em] text-silver-300">
						<span>{counts.note} notes</span>
						<span>{counts.example} examples</span>
						<span>{counts.reference} references</span>
					</div>
				</div>

				{persistenceNotice ? (
					<p className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						{persistenceNotice}
					</p>
				) : null}

				{filteredEntries.length === 0 ? (
					<p className="mt-5 text-sm text-silver-300">No library items found.</p>
				) : (
					<div className="mt-4 overflow-x-auto">
						<table className="w-full min-w-[980px] table-fixed border-collapse text-left text-sm">
							<colgroup>
								<col className="w-[112px]" />
								<col />
								<col className="w-[150px]" />
								<col className="w-[170px]" />
								<col className="w-[170px]" />
								<col className="w-[92px]" />
								<col className="w-[142px]" />
							</colgroup>
							<thead>
								<tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.1em] text-silver-400">
									<th className="px-2 py-2 font-medium">Type</th>
									<th className="px-2 py-2 font-medium">Material</th>
									<th className="px-2 py-2 font-medium">Category</th>
									<th className="px-2 py-2 font-medium">Tags</th>
									<th className="px-2 py-2 font-medium">Source</th>
									<th className="px-2 py-2 font-medium">Updated</th>
									<th className="px-2 py-2 font-medium">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/10">
								{filteredEntries.map((entry) => {
									const key = entryKey(entry)
									const isActive =
										draft.id === entry.id && draft.itemType === entry.itemType
									const isExpanded = expandedEntryKey === key
									const visibleTags = entry.tags.slice(0, 3)

										return (
											<Fragment key={key}>
												<tr
												className={`transition ${
													isActive
														? 'bg-accent-300/10'
														: 'hover:bg-white/[0.035]'
												}`}>
												<td className="align-top px-2 py-3">
													<span
														className={`inline-flex rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${itemTypeClassName(entry.itemType)}`}>
														{itemTypeLabel(entry.itemType)}
													</span>
													{entry.referenceType ? (
														<p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-silver-400">
															{entry.referenceType}
														</p>
													) : null}
												</td>
												<td className="align-top px-2 py-3">
													<button
														type="button"
														onClick={() =>
															setExpandedEntryKey((current) =>
																current === key ? null : key,
															)
														}
														onMouseEnter={(event) =>
															showHoverPreview(entry, event)
														}
														onMouseMove={(event) =>
															showHoverPreview(entry, event)
														}
														onMouseLeave={() => setHoverPreview(null)}
														onFocus={(event) => showFocusPreview(entry, event)}
														onBlur={() => setHoverPreview(null)}
														className="block w-full text-left">
														<span className="block truncate font-semibold text-parchment-100">
															{entry.title}
														</span>
														<span className="mt-1 block text-xs leading-relaxed text-silver-300">
															{compactPreview(entry.body, 110)}
														</span>
													</button>
												</td>
												<td className="align-top px-2 py-3">
													<span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-silver-200">
														{entry.categoryLabel}
													</span>
												</td>
												<td className="align-top px-2 py-3">
													{visibleTags.length > 0 ? (
														<div className="flex flex-wrap gap-1">
															{visibleTags.map((tag) => (
																<span
																	key={tag}
																	className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-silver-300">
																	{tag}
																</span>
															))}
															{entry.tags.length > visibleTags.length ? (
																<span className="text-[11px] text-silver-500">
																	+{entry.tags.length - visibleTags.length}
																</span>
															) : null}
														</div>
													) : (
														<span className="text-silver-500">-</span>
													)}
												</td>
												<td className="align-top px-2 py-3 text-xs leading-relaxed text-silver-300">
													{entry.url ? (
														<a
															href={entry.url}
															target="_blank"
															rel="noreferrer"
															className="line-clamp-2 underline decoration-white/20 underline-offset-4 hover:text-parchment-100">
															{entry.sourceLabel || entry.url}
														</a>
													) : (
														<span className="line-clamp-2">
															{entry.sourceLabel || '-'}
														</span>
													)}
												</td>
												<td className="align-top px-2 py-3 text-xs text-silver-400">
													{formatShortDate(entry.updatedAt)}
												</td>
												<td className="align-top px-2 py-3">
													<div className="flex flex-wrap gap-1.5">
														<button
															type="button"
															onClick={() => {
																void copyEntry(entry)
															}}
															className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
															{copiedEntryKey === key ? 'Copied' : 'Copy'}
														</button>
														<button
															type="button"
															onClick={() => editEntry(entry)}
															className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
															Edit
														</button>
													</div>
												</td>
											</tr>
											{isExpanded ? (
												<tr key={`${key}:expanded`} className="bg-ink-950/70">
													<td colSpan={7} className="px-3 py-3">
														<div className="rounded-xl border border-white/10 bg-ink-900/70 p-4">
															<div className="flex flex-wrap items-start justify-between gap-3">
																<div>
																	<p className="text-[10px] uppercase tracking-[0.1em] text-silver-400">
																		Full preview
																	</p>
																	<h3 className="mt-1 font-semibold text-parchment-100">
																		{entry.title}
																	</h3>
																</div>
																<button
																	type="button"
																	onClick={() => setExpandedEntryKey(null)}
																	className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
																	Close
																</button>
															</div>
															<p className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-silver-200">
																{entry.body}
															</p>
														</div>
													</td>
												</tr>
											) : null}
											</Fragment>
										)
								})}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<aside ref={editorRef} className="surface p-4 xl:sticky xl:top-24">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-[11px] uppercase tracking-[0.1em] text-silver-300">
							{draft.id
								? draft.itemType === 'example'
									? 'Edit example'
									: 'Edit item'
								: 'Create item'}
						</p>
						<h2 className="literary-title mt-1 text-2xl text-parchment-100">
							Library
						</h2>
						<p className="mt-1 text-xs leading-relaxed text-silver-400">
							Notes and references live here. Examples are curated snippets.
						</p>
					</div>
					{draft.id ? (
						<button
							type="button"
							onClick={resetDraft}
							className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
							New
						</button>
					) : null}
				</div>

				<div className="mt-4 grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => createDraft('note')}
						disabled={draft.itemType === 'example'}
						className={`rounded-xl border px-3 py-2 text-sm transition ${
							draft.itemType === 'note'
								? 'border-accent-300/50 bg-accent-300/15 text-parchment-100'
								: 'border-white/10 text-silver-200 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50'
						}`}>
						Note
					</button>
					<button
						type="button"
						onClick={() => createDraft('reference')}
						disabled={draft.itemType === 'example'}
						className={`rounded-xl border px-3 py-2 text-sm transition ${
							draft.itemType === 'reference'
								? 'border-accent-300/50 bg-accent-300/15 text-parchment-100'
								: 'border-white/10 text-silver-200 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50'
						}`}>
						Reference
					</button>
				</div>

				{draft.itemType === 'example' ? (
					<p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-silver-200">
						Editing a curated snippet example. Snippet triage still lives in
						the Snippets workbench.
					</p>
				) : null}

				<div className="mt-4 space-y-3">
					<input
						type="text"
						value={draft.title}
						onChange={(event) =>
							setDraft((current) => ({ ...current, title: event.target.value }))
						}
						className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
						placeholder={
							draft.itemType === 'example'
								? 'Teacher note optional'
								: 'Title'
						}
					/>

					{draft.itemType === 'reference' ? (
						<div className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)]">
							<select
								value={draft.referenceType}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										referenceType: event.target
											.value as TeachingLibraryReferenceType,
									}))
								}
								className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100">
								{teachingLibraryReferenceTypes.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
							<input
								type="url"
								value={draft.url}
								onChange={(event) =>
									setDraft((current) => ({ ...current, url: event.target.value }))
								}
								className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
								placeholder="URL optional"
							/>
						</div>
					) : null}

					<textarea
						value={draft.body}
						onChange={(event) =>
							setDraft((current) => ({ ...current, body: event.target.value }))
						}
						rows={draft.itemType === 'note' ? 7 : 4}
						className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-sm leading-6 text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
						placeholder={
							draft.itemType === 'note'
								? 'Reusable teaching explanation'
								: draft.itemType === 'example'
									? 'Snippet text'
									: 'Short teacher note'
						}
					/>

					<select
						value={draft.categoryLabel}
						onChange={(event) =>
							setDraft((current) => ({
								...current,
								categoryLabel: normalizeSnippetCategoryLabel(event.target.value),
							}))
						}
						className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100">
						<option value="Uncategorised">Uncategorised</option>
						{fixedSnippetCategories.map((category) => (
							<option key={category} value={category}>
								{category}
							</option>
						))}
					</select>

					<input
						type="text"
						value={draft.tagsText}
						onChange={(event) =>
							setDraft((current) => ({
								...current,
								tagsText: event.target.value,
							}))
						}
						className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
						placeholder="Tags, comma separated"
					/>

					{notice ? (
						<p className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
							{notice}
						</p>
					) : null}
					{error ? (
						<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
							{error}
						</p>
					) : null}

					<div className="flex flex-wrap justify-between gap-2">
						{draft.id && draft.itemType !== 'example' ? (
							<button
								type="button"
								onClick={deleteDraft}
								disabled={isSaving}
								className="rounded-full border border-rose-300/35 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-rose-100 transition hover:border-rose-200/55 hover:bg-rose-300/10 disabled:cursor-not-allowed disabled:opacity-40">
								Delete
							</button>
						) : (
							<span />
						)}
						<button
							type="button"
							onClick={saveDraft}
							disabled={isSaving}
							className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-1.5 text-[11px] uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
							{isSaving ? 'Saving...' : draft.id ? 'Save' : 'Create'}
						</button>
					</div>
				</div>
			</aside>

			{hoverPreview ? (
				<div
					className="pointer-events-none fixed z-50 hidden max-h-64 w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-xl border border-white/15 bg-ink-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur md:block"
					style={{ left: hoverPreview.x, top: hoverPreview.y }}>
					<div className="flex items-center gap-2">
						<span
							className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${itemTypeClassName(hoverPreview.entry.itemType)}`}>
							{itemTypeLabel(hoverPreview.entry.itemType)}
						</span>
						<span className="truncate text-xs text-silver-400">
							{hoverPreview.entry.categoryLabel}
						</span>
					</div>
					<h3 className="mt-2 font-semibold text-parchment-100">
						{hoverPreview.entry.title}
					</h3>
					<p className="mt-2 max-h-40 overflow-hidden whitespace-pre-wrap text-sm leading-6 text-silver-200">
						{hoverPreview.entry.body}
					</p>
				</div>
			) : null}
		</div>
	)
}
