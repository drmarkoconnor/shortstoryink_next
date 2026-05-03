'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
	feedbackSlug,
	fixedSnippetCategories,
	normalizeSnippetLabel,
} from '@/lib/feedback/categories'
import { cleanSnippetText } from '@/lib/snippets/text-cleanup'
import {
	isNearTeacherLibraryLimit,
	teacherSnippetLibraryLimit,
} from '@/lib/teacher-library/query-limits'

export type SnippetLibraryEntry = {
	id: string
	text: string
	note: string
	createdAt: string
	categoryLabel: string
	categorySlug: string
	tags: string[]
	sourceSubmissionId: string | null
	sourceType: string | null
	sourceLabel: string
	sourceTitle: string
	sourceName: string
	sourceUrl: string
	sourceSection: string
}

function compactPreview(value: string, limit = 180) {
	const normalized = value.replace(/\s+/g, ' ').trim()
	if (normalized.length <= limit) {
		return normalized
	}
	return `${normalized.slice(0, limit - 1).trimEnd()}...`
}

function parseTagsInput(value: string) {
	return [
		...new Set(
			value
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
	].slice(0, 12)
}

function loadLimitTitle(count: number, limit: number) {
	if (isNearTeacherLibraryLimit(count, limit)) {
		return `Approaching the temporary client load limit of ${limit}. Return to the codebase soon to add pagination or server-side search.`
	}
	return `This client view currently loads up to ${limit} snippets.`
}

export function SnippetLibrary({
	initialSnippets,
}: {
	initialSnippets: SnippetLibraryEntry[]
}) {
	const [snippets, setSnippets] = useState(initialSnippets)
	const [searchQuery, setSearchQuery] = useState('')
	const [categoryFilter, setCategoryFilter] = useState('')
	const [noteFilter, setNoteFilter] = useState('')
	const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null)
	const [draftText, setDraftText] = useState('')
	const [draftCategory, setDraftCategory] = useState('')
	const [draftTags, setDraftTags] = useState('')
	const [draftNote, setDraftNote] = useState('')
	const [savingSnippetId, setSavingSnippetId] = useState<string | null>(null)
	const [deletingSnippetId, setDeletingSnippetId] = useState<string | null>(null)
	const [selectedSnippetIds, setSelectedSnippetIds] = useState<string[]>([])
	const [notice, setNotice] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const router = useRouter()

	const clearMessages = useCallback(() => {
		setNotice(null)
		setError(null)
	}, [])

	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = {
			Uncategorised: 0,
		}

		for (const category of fixedSnippetCategories) {
			counts[category] = 0
		}

		for (const snippet of snippets) {
			const label = fixedSnippetCategories.includes(snippet.categoryLabel)
				? snippet.categoryLabel
				: 'Uncategorised'
			counts[label] = (counts[label] ?? 0) + 1
		}

		return counts
	}, [snippets])

	const noteCounts = useMemo(() => {
		return snippets.reduce(
			(counts, snippet) => {
				if (snippet.note.trim()) {
					counts.withNote += 1
				} else {
					counts.withoutNote += 1
				}
				return counts
			},
			{ withNote: 0, withoutNote: 0 },
		)
	}, [snippets])

	const filteredSnippets = useMemo(() => {
		const query = searchQuery.trim().toLowerCase()

		return snippets.filter((snippet) => {
			if (categoryFilter === 'uncategorised' && snippet.categoryLabel !== 'Uncategorised') {
				return false
			}
			if (
				categoryFilter &&
				categoryFilter !== 'uncategorised' &&
				snippet.categoryLabel !== categoryFilter
			) {
				return false
			}

			if (noteFilter === 'with-note' && !snippet.note.trim()) {
				return false
			}
			if (noteFilter === 'without-note' && snippet.note.trim()) {
				return false
			}

			if (!query) {
				return true
			}

			const haystack = [
				snippet.text,
				snippet.note,
				snippet.categoryLabel,
				snippet.sourceLabel,
				snippet.sourceTitle,
				snippet.sourceName,
				snippet.sourceUrl,
				snippet.sourceSection,
				...snippet.tags,
			]
				.join(' ')
				.toLowerCase()

			return haystack.includes(query)
		})
	}, [categoryFilter, noteFilter, searchQuery, snippets])
	const isUncategorisedFilter = categoryFilter === 'uncategorised'
	const visibleSnippetIds = useMemo(
		() => filteredSnippets.map((snippet) => snippet.id),
		[filteredSnippets],
	)
	const selectedVisibleSnippetIds = useMemo(
		() => selectedSnippetIds.filter((id) => visibleSnippetIds.includes(id)),
		[selectedSnippetIds, visibleSnippetIds],
	)
	const allVisibleSelected =
		visibleSnippetIds.length > 0 &&
		visibleSnippetIds.every((id) => selectedSnippetIds.includes(id))
	const isBulkDeleting = deletingSnippetId === 'bulk'
	const isNearSnippetLoadLimit = isNearTeacherLibraryLimit(
		snippets.length,
		teacherSnippetLibraryLimit,
	)

	useEffect(() => {
		if (!isUncategorisedFilter) {
			setSelectedSnippetIds([])
			return
		}

		setSelectedSnippetIds((current) =>
			current.filter((id) => visibleSnippetIds.includes(id)),
		)
	}, [isUncategorisedFilter, visibleSnippetIds])

	useEffect(() => {
		if (!notice) {
			return
		}

		const timeout = window.setTimeout(() => {
			setNotice(null)
		}, 1600)

		return () => window.clearTimeout(timeout)
	}, [notice])

	const openSnippet = (snippet: SnippetLibraryEntry) => {
		setActiveSnippetId((current) => (current === snippet.id ? null : snippet.id))
		setDraftText(cleanSnippetText(snippet.text))
		setDraftCategory(
			fixedSnippetCategories.includes(snippet.categoryLabel)
				? snippet.categoryLabel
				: '',
		)
		setDraftTags(snippet.tags.join(', '))
		setDraftNote(snippet.note)
		clearMessages()
	}

	const saveSnippetDraft = useCallback(async (
		snippet: SnippetLibraryEntry,
		options: { close?: boolean; keepalive?: boolean; silent?: boolean } = {},
	) => {
		const nextText = cleanSnippetText(draftText)
		if (!nextText) {
			setError('Snippet text cannot be empty.')
			return
		}

		const categoryLabel = normalizeSnippetLabel(draftCategory)
		const tags = parseTagsInput(draftTags)
		const nextNote = draftNote.trim()
		const hasChanges =
			nextText !== cleanSnippetText(snippet.text) ||
			nextNote !== snippet.note.trim() ||
			categoryLabel !== snippet.categoryLabel ||
			tags.join('\u0000') !== snippet.tags.join('\u0000')

		if (!hasChanges) {
			if (options.close) {
				setActiveSnippetId(null)
			}
			return
		}

		const previousSnippets = snippets

		if (!options.silent) {
			setSavingSnippetId(snippet.id)
			clearMessages()
		}
		setSnippets((current) =>
			current.map((item) =>
				item.id === snippet.id
					? {
							...item,
							text: nextText,
							note: nextNote,
							categoryLabel,
							categorySlug:
								categoryLabel === 'Uncategorised'
									? 'uncategorised'
									: feedbackSlug(categoryLabel),
							tags,
						}
					: item,
			),
		)

		try {
			const response = await fetch(`/api/teacher/snippets/${snippet.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				keepalive: options.keepalive,
				body: JSON.stringify({
					text: nextText,
					note: nextNote,
					categoryLabel,
					tags,
				}),
			})
			const payload = (await response.json()) as
				| {
						error?: string
						notice?: string
						snippet?: Omit<
							SnippetLibraryEntry,
							| 'sourceSubmissionId'
							| 'sourceType'
							| 'sourceLabel'
							| 'sourceTitle'
							| 'sourceName'
							| 'sourceUrl'
							| 'sourceSection'
						>
				  }
				| undefined

			const savedSnippet = payload?.snippet
			if (!response.ok || payload?.error || !savedSnippet) {
				throw new Error(payload?.error ?? 'Unable to save snippet.')
			}

			setSnippets((current) =>
				current.map((item) =>
					item.id === snippet.id
						? {
								...item,
								...savedSnippet,
								sourceSubmissionId: item.sourceSubmissionId,
								sourceType: item.sourceType,
								sourceLabel: item.sourceLabel,
								sourceTitle: item.sourceTitle,
								sourceName: item.sourceName,
								sourceUrl: item.sourceUrl,
								sourceSection: item.sourceSection,
							}
						: item,
				),
				)
				if (!options.silent) {
					setNotice(payload.notice ?? 'Snippet updated.')
				}
				if (options.close ?? true) {
					setActiveSnippetId(null)
				}
				setSelectedSnippetIds((current) =>
					current.filter((id) => id !== snippet.id || categoryLabel === 'Uncategorised'),
				)
				router.refresh()
			} catch (saveError) {
				setSnippets(previousSnippets)
				if (!options.silent) {
					setError(
						saveError instanceof Error
							? saveError.message
							: 'Unable to save snippet.',
					)
				}
			} finally {
			if (!options.silent) {
				setSavingSnippetId(null)
			}
		}
	}, [clearMessages, draftCategory, draftNote, draftTags, draftText, router, snippets])

	const saveSnippet = async (
		event: FormEvent<HTMLFormElement>,
		snippet: SnippetLibraryEntry,
	) => {
		event.preventDefault()
		await saveSnippetDraft(snippet, { close: true })
	}

	useEffect(() => {
		const autosaveActiveSnippet = (keepalive = false) => {
			if (!activeSnippetId || savingSnippetId === activeSnippetId) {
				return
			}

			const snippet = snippets.find((item) => item.id === activeSnippetId)
			if (!snippet) {
				return
			}

			void saveSnippetDraft(snippet, {
				close: false,
				keepalive,
				silent: true,
			})
		}

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'hidden') {
				autosaveActiveSnippet(true)
			}
		}

		const handlePageHide = () => autosaveActiveSnippet(true)
		const handleDocumentClick = (event: MouseEvent) => {
			const target = event.target
			if (!(target instanceof Element)) {
				return
			}

			const link = target.closest('a[href]')
			if (link) {
				autosaveActiveSnippet(true)
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)
		window.addEventListener('pagehide', handlePageHide)
		document.addEventListener('click', handleDocumentClick, { capture: true })

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			window.removeEventListener('pagehide', handlePageHide)
			document.removeEventListener('click', handleDocumentClick, { capture: true })
		}
	}, [activeSnippetId, savingSnippetId, saveSnippetDraft, snippets])

	const deleteSnippet = async (snippet: SnippetLibraryEntry) => {
		if (!window.confirm('Delete this snippet? This cannot be undone.')) {
			return
		}

		const previousSnippets = snippets

		setDeletingSnippetId(snippet.id)
		clearMessages()
		setSnippets((current) => current.filter((item) => item.id !== snippet.id))

		try {
			const response = await fetch(`/api/teacher/snippets/${snippet.id}`, {
				method: 'DELETE',
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string; deletedId?: string }
				| undefined

			if (!response.ok || payload?.error) {
				throw new Error(payload?.error ?? 'Unable to delete snippet.')
			}

			setActiveSnippetId(null)
			setSelectedSnippetIds((current) =>
				current.filter((id) => id !== snippet.id),
			)
			setNotice(payload?.notice ?? 'Snippet deleted.')
			router.refresh()
		} catch (deleteError) {
			setSnippets(previousSnippets)
			setError(
				deleteError instanceof Error
					? deleteError.message
					: 'Unable to delete snippet.',
			)
		} finally {
			setDeletingSnippetId(null)
		}
	}

	const toggleSnippetSelection = (snippetId: string) => {
		clearMessages()
		setSelectedSnippetIds((current) =>
			current.includes(snippetId)
				? current.filter((id) => id !== snippetId)
				: [...current, snippetId],
		)
	}

	const toggleAllVisibleSelections = () => {
		clearMessages()
		if (allVisibleSelected) {
			setSelectedSnippetIds((current) =>
				current.filter((id) => !visibleSnippetIds.includes(id)),
			)
			return
		}

		setSelectedSnippetIds((current) => [
			...current,
			...visibleSnippetIds.filter((id) => !current.includes(id)),
		])
	}

	const deleteSelectedSnippets = async () => {
		if (!isUncategorisedFilter || selectedVisibleSnippetIds.length === 0) {
			return
		}

		if (
			!window.confirm(
				`Delete ${selectedVisibleSnippetIds.length} selected uncategorised snippets? This cannot be undone.`,
			)
		) {
			return
		}

		const idsToDelete = selectedVisibleSnippetIds
		const previousSnippets = snippets
		const previousSelectedIds = selectedSnippetIds

		setDeletingSnippetId('bulk')
		clearMessages()
		setActiveSnippetId((current) =>
			current && idsToDelete.includes(current) ? null : current,
		)
		setSnippets((current) =>
			current.filter((item) => !idsToDelete.includes(item.id)),
		)
		setSelectedSnippetIds((current) =>
			current.filter((id) => !idsToDelete.includes(id)),
		)

		try {
			const responses = await Promise.all(
				idsToDelete.map(async (snippetId) => {
					const response = await fetch(`/api/teacher/snippets/${snippetId}`, {
						method: 'DELETE',
					})
					const payload = (await response.json()) as
						| { error?: string; notice?: string; deletedId?: string }
						| undefined

					if (!response.ok || payload?.error) {
						throw new Error(payload?.error ?? 'Unable to delete selected snippets.')
					}

					return payload
				}),
				)

			setNotice(
				responses.length === 1
					? 'Snippet deleted.'
					: `${responses.length} snippets deleted.`,
			)
			router.refresh()
		} catch (deleteError) {
			setSnippets(previousSnippets)
			setSelectedSnippetIds(previousSelectedIds)
			setError(
				deleteError instanceof Error
					? deleteError.message
					: 'Unable to delete selected snippets.',
			)
		} finally {
			setDeletingSnippetId(null)
		}
	}

	return (
		<div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
			<aside className="surface space-y-4 p-4 xl:sticky xl:top-24 xl:self-start">
				<div>
					<label
						htmlFor="snippet-search"
						className="text-[11px] uppercase tracking-[0.1em] text-silver-300">
						Search
					</label>
					<input
						id="snippet-search"
						type="search"
						value={searchQuery}
						onChange={(event) => {
							clearMessages()
							setSearchQuery(event.target.value)
							}}
							className="mt-2 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
							placeholder="Text, note, author, source, tag"
						/>
					</div>
				<div>
					<label
						htmlFor="snippet-category"
						className="text-[11px] uppercase tracking-[0.1em] text-silver-300">
						Category
					</label>
					<select
						id="snippet-category"
						value={categoryFilter}
						onChange={(event) => {
							clearMessages()
							setCategoryFilter(event.target.value)
						}}
						className="mt-2 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
						<option value="">
							All snippets ({snippets.length} / {teacherSnippetLibraryLimit})
						</option>
						<option value="uncategorised">
							Uncategorised ({categoryCounts.Uncategorised})
						</option>
						{fixedSnippetCategories.map((category) => (
							<option key={category} value={category}>
								{category} ({categoryCounts[category] ?? 0})
							</option>
						))}
						</select>
					</div>
					<div>
						<label
							htmlFor="snippet-note-filter"
							className="text-[11px] uppercase tracking-[0.1em] text-silver-300">
							Teacher note
						</label>
						<select
							id="snippet-note-filter"
							value={noteFilter}
							onChange={(event) => {
								clearMessages()
								setNoteFilter(event.target.value)
							}}
							className="mt-2 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
							<option value="">Any note status</option>
							<option value="with-note">With note ({noteCounts.withNote})</option>
							<option value="without-note">
								No note ({noteCounts.withoutNote})
							</option>
						</select>
					</div>
					<p className="border-t border-white/10 pt-4 text-xs leading-relaxed text-silver-300">
						<span
							title={loadLimitTitle(snippets.length, teacherSnippetLibraryLimit)}
							className={
								isNearSnippetLoadLimit
									? 'text-amber-100 underline decoration-amber-200/50 decoration-dotted underline-offset-4'
									: 'underline decoration-white/20 decoration-dotted underline-offset-4'
							}>
							{snippets.length} / {teacherSnippetLibraryLimit} snippets
						</span>
						. {categoryCounts.Uncategorised} uncategorised.
						{categoryFilter || noteFilter || searchQuery.trim()
							? ` ${filteredSnippets.length} shown.`
							: ''}
						{isNearSnippetLoadLimit ? ' Pagination soon.' : ''}
					</p>
				{isUncategorisedFilter ? (
					<div className="space-y-3 border-t border-white/10 pt-4">
						<p className="text-xs leading-relaxed text-silver-300">
							Select uncategorised snippets here for quick cleanup.
						</p>
						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								onClick={toggleAllVisibleSelections}
								disabled={visibleSnippetIds.length === 0 || isBulkDeleting}
								className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100 disabled:cursor-not-allowed disabled:opacity-50">
								{allVisibleSelected ? 'Clear selection' : 'Select visible'}
							</button>
							<button
								type="button"
								onClick={() => {
									void deleteSelectedSnippets()
								}}
								disabled={
									selectedVisibleSnippetIds.length === 0 || isBulkDeleting
								}
								className="rounded-full border border-amber-200/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-amber-100 transition hover:bg-amber-200/10 disabled:cursor-not-allowed disabled:opacity-50">
								{isBulkDeleting
									? 'Deleting...'
									: `Delete selected (${selectedVisibleSnippetIds.length})`}
							</button>
						</div>
					</div>
				) : null}
			</aside>

			<main className="surface p-4 lg:p-5">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
					<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
						{snippets.length} snippets
					</p>
						<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-silver-300">
							{categoryCounts.Uncategorised} uncategorised
						</p>
						<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-silver-300">
							{noteCounts.withNote} with notes
						</p>
					</div>
				{notice ? (
					<p className="mb-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
						{notice}
					</p>
				) : null}
				{error ? (
					<p className="mb-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						{error}
					</p>
				) : null}
				{filteredSnippets.length === 0 ? (
					<p className="text-sm text-silver-300">
						No snippets match these filters.
					</p>
				) : (
					<ul className="divide-y divide-white/10">
						{filteredSnippets.map((snippet) => {
							const isActive = activeSnippetId === snippet.id
							const isSaving = savingSnippetId === snippet.id
							const isDeleting = deletingSnippetId === snippet.id
							const isSelected = selectedSnippetIds.includes(snippet.id)

							return (
								<li key={snippet.id} className="py-4 first:pt-0 last:pb-0">
									<div className="flex items-start gap-3">
										{isUncategorisedFilter ? (
											<input
												type="checkbox"
												checked={isSelected}
												onChange={() => toggleSnippetSelection(snippet.id)}
												className="mt-1 h-4 w-4 rounded border-white/20 bg-ink-900 accent-burgundy-400"
												aria-label="Select snippet for deletion"
											/>
										) : null}
										<button
											type="button"
											onClick={() => openSnippet(snippet)}
											className="block min-w-0 flex-1 text-left">
											<div className="flex flex-wrap items-center gap-2">
												<p className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-silver-200">
													{snippet.categoryLabel}
												</p>
												<p className="text-[10px] uppercase tracking-[0.1em] text-silver-400">
													{new Date(snippet.createdAt).toLocaleDateString()}
												</p>
											</div>
											<p className="mt-2 text-sm leading-relaxed text-parchment-100">
												{compactPreview(snippet.text)}
											</p>
											{snippet.tags.length > 0 ? (
												<div className="mt-2 flex flex-wrap gap-1.5">
													{snippet.tags.map((tag) => (
														<p
															key={tag}
															className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-silver-300">
															{tag}
														</p>
													))}
												</div>
											) : null}
											{snippet.sourceLabel || snippet.sourceTitle ? (
												<p className="mt-2 text-[11px] uppercase tracking-[0.08em] text-silver-400">
													{[snippet.sourceLabel, snippet.sourceTitle]
														.filter(Boolean)
														.join(', ')}
												</p>
											) : null}
										</button>
									</div>

									{isActive ? (
										<form
											onSubmit={(event) => {
												void saveSnippet(event, snippet)
											}}
											className="mt-4 space-y-3 rounded-xl border border-white/10 bg-ink-950/55 p-3">
											<label className="block">
												<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
													Text
												</span>
												<textarea
													value={draftText}
													rows={4}
													onChange={(event) => {
														clearMessages()
														setDraftText(event.target.value)
													}}
													className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
												/>
											</label>
											<label className="block">
												<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
													Category
												</span>
												<select
													value={draftCategory}
													onChange={(event) => {
														clearMessages()
														setDraftCategory(event.target.value)
													}}
													className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
													<option value="">Uncategorised</option>
													{fixedSnippetCategories.map((category) => (
														<option key={category} value={category}>
															{category}
														</option>
													))}
												</select>
											</label>
											<label className="block">
												<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
													Tags
												</span>
												<input
													type="text"
													value={draftTags}
													onChange={(event) => {
														clearMessages()
														setDraftTags(event.target.value)
													}}
													className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
													placeholder="image, opening, dialogue"
												/>
											</label>
											<label className="block">
												<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
													Note
												</span>
												<textarea
													value={draftNote}
													rows={3}
													onChange={(event) => {
														clearMessages()
														setDraftNote(event.target.value)
													}}
													className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
													placeholder="Optional private note"
												/>
											</label>
											<div className="flex flex-wrap items-center gap-2">
												<button
													type="submit"
													disabled={isSaving || isDeleting}
													className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
													{isSaving ? 'Saving...' : 'Save'}
												</button>
												<button
													type="button"
													disabled={isSaving || isDeleting}
													onClick={() => {
														void deleteSnippet(snippet)
													}}
													className="rounded-full border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-silver-300 transition hover:border-amber-200/40 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-60">
													{isDeleting ? 'Deleting...' : 'Delete'}
												</button>
												{snippet.sourceSubmissionId ? (
													<Link
														href={`/app/workshop/${snippet.sourceSubmissionId}`}
														className="rounded-full border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
														View source
													</Link>
												) : null}
												{snippet.sourceUrl ? (
													<Link
														href={snippet.sourceUrl}
														className="rounded-full border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
														Open source
													</Link>
												) : null}
												<button
													type="button"
													onClick={() => setActiveSnippetId(null)}
													className="text-[11px] uppercase tracking-[0.1em] text-silver-400 transition hover:text-parchment-100">
													Close
												</button>
											</div>
										</form>
									) : null}
								</li>
							)
						})}
					</ul>
				)}
			</main>
		</div>
	)
}
