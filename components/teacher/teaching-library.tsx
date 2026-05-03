'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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

const emptyDraft = {
	id: null as string | null,
	itemType: 'note' as TeachingLibraryItemType | 'example',
	title: '',
	body: '',
	referenceType: 'book' as TeachingLibraryReferenceType,
	url: '',
	categoryLabel: 'Uncategorised',
	tagsText: '',
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

export function TeachingLibrary({
	initialEntries,
	persistenceNotice,
}: {
	initialEntries: TeachingLibraryEntry[]
	persistenceNotice?: string | null
}) {
	const router = useRouter()
	const [entries, setEntries] = useState(initialEntries)
	const [searchQuery, setSearchQuery] = useState('')
	const [typeFilter, setTypeFilter] = useState('')
	const [categoryFilter, setCategoryFilter] = useState('')
	const [draft, setDraft] = useState(emptyDraft)
	const [isSaving, setIsSaving] = useState(false)
	const [notice, setNotice] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

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
	const exampleCount = useMemo(
		() => entries.filter((entry) => entry.itemType === 'example').length,
		[entries],
	)
	const libraryOwnItemCount = entries.length - exampleCount
	const totalLibraryLoadLimit = teacherSnippetLibraryLimit + teacherLibraryItemLimit
	const isNearLibraryLoadLimit =
		isNearTeacherLibraryLimit(exampleCount, teacherSnippetLibraryLimit) ||
		isNearTeacherLibraryLimit(libraryOwnItemCount, teacherLibraryItemLimit)

	const clearMessages = () => {
		setNotice(null)
		setError(null)
	}

	const resetDraft = () => {
		clearMessages()
		setDraft(emptyDraft)
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
				setDraft(emptyDraft)
				setNotice(payload.notice ?? 'Snippet updated.')
				router.refresh()
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
			setDraft(emptyDraft)
			setNotice(payload.notice ?? 'Library item saved.')
			router.refresh()
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
		if (!draft.id) {
			return
		}

		if (draft.itemType === 'example') {
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
			setDraft(emptyDraft)
			setNotice(payload.notice ?? 'Library item deleted.')
			router.refresh()
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

	return (
		<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
			<section className="surface p-4">
				<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_190px]">
					<input
						type="search"
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
						placeholder="Search notes, examples, references"
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
							{entries.length} / {totalLibraryLoadLimit}
						</span>{' '}
						library items
						{isNearLibraryLoadLimit ? ' Pagination soon.' : ''}
					</p>
					<div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.1em] text-silver-300">
						<span>Notes</span>
						<span>Examples</span>
						<span>References</span>
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
					<ul className="mt-4 space-y-2">
						{filteredEntries.map((entry) => (
							<li
								key={`${entry.itemType}-${entry.id}`}
								className="rounded-xl border border-white/10 bg-ink-950/55 p-3">
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-silver-200">
												{itemTypeLabel(entry.itemType)}
											</span>
											<span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-silver-300">
												{entry.categoryLabel}
											</span>
											{entry.referenceType ? (
												<span className="text-[11px] uppercase tracking-[0.1em] text-silver-400">
													{entry.referenceType}
												</span>
											) : null}
										</div>
										<h2 className="mt-2 text-base font-semibold text-parchment-100">
											{entry.title}
										</h2>
									</div>
									<button
										type="button"
										onClick={() => editEntry(entry)}
										className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
										Edit
									</button>
								</div>
								<p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-silver-200">
									{compactPreview(entry.body)}
								</p>
								{entry.sourceLabel || entry.url || entry.tags.length ? (
									<div className="mt-2 flex flex-wrap gap-2 text-[11px] text-silver-400">
										{entry.sourceLabel ? <span>{entry.sourceLabel}</span> : null}
										{entry.url ? <span>{entry.url}</span> : null}
										{entry.tags.map((tag) => (
											<span
												key={tag}
												className="rounded-full border border-white/10 px-2 py-0.5">
												{tag}
											</span>
										))}
									</div>
								) : null}
							</li>
						))}
					</ul>
				)}
			</section>

			<aside className="surface p-4">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-[11px] uppercase tracking-[0.1em] text-silver-300">
							{draft.id
								? draft.itemType === 'example'
									? 'Edit snippet'
									: 'Edit item'
								: 'Create item'}
						</p>
						<h2 className="literary-title mt-1 text-2xl text-parchment-100">
							Library
						</h2>
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

				<div className="mt-4 space-y-3">
					<div className="grid grid-cols-2 gap-2">
						<button
							type="button"
							onClick={() =>
								setDraft((current) => ({ ...current, itemType: 'note' }))
							}
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
							onClick={() =>
								setDraft((current) => ({ ...current, itemType: 'reference' }))
							}
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
						<p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-silver-200">
							Editing a saved snippet example.
						</p>
					) : null}

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
		</div>
	)
}
