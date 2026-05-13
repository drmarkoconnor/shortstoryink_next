'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { fixedFeedbackCategories } from '@/lib/feedback/categories'

export type FeedbackMemoryEntry = {
	id: string
	submissionId: string
	submissionTitle: string
	writerId: string
	writerLabel: string
	version: number | null
	status: string
	comment: string
	quote: string
	categoryLabel: string
	tags: string[]
	createdAt: string
}

function compactPreview(value: string, limit = 260) {
	const normalized = value.replace(/\s+/g, ' ').trim()
	if (normalized.length <= limit) {
		return normalized
	}
	return `${normalized.slice(0, limit - 1).trimEnd()}...`
}

function formatShortDate(value: string) {
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return ''
	}
	return parsed.toLocaleDateString(undefined, {
		day: '2-digit',
		month: 'short',
		year: '2-digit',
	})
}

function statusLabel(status: string) {
	return status.replaceAll('_', ' ')
}

export function FeedbackMemoryWorkbench({
	initialEntries,
}: {
	initialEntries: FeedbackMemoryEntry[]
}) {
	const [entries] = useState(initialEntries)
	const [searchQuery, setSearchQuery] = useState('')
	const [writerFilter, setWriterFilter] = useState('')
	const [categoryFilter, setCategoryFilter] = useState('')
	const [copiedId, setCopiedId] = useState<string | null>(null)

	const writers = useMemo(() => {
		return [...new Map(entries.map((entry) => [entry.writerId, entry.writerLabel]))]
			.sort((left, right) => left[1].localeCompare(right[1]))
			.map(([id, label]) => ({ id, label }))
	}, [entries])

	const filteredEntries = useMemo(() => {
		const query = searchQuery.trim().toLowerCase()
		return entries.filter((entry) => {
			if (writerFilter && entry.writerId !== writerFilter) {
				return false
			}
			if (categoryFilter && entry.categoryLabel !== categoryFilter) {
				return false
			}
			if (!query) {
				return true
			}
			return [
				entry.writerLabel,
				entry.submissionTitle,
				entry.comment,
				entry.quote,
				entry.categoryLabel,
				...entry.tags,
			]
				.join(' ')
				.toLowerCase()
				.includes(query)
		})
	}, [categoryFilter, entries, searchQuery, writerFilter])

	const focusedWriter = writerFilter
		? writers.find((writer) => writer.id === writerFilter)?.label
		: null

	const copyMemory = async (entry: FeedbackMemoryEntry, includeQuote = false) => {
		const text = includeQuote
			? [`"${entry.quote}"`, entry.comment].filter(Boolean).join('\n\n')
			: entry.comment

		try {
			await navigator.clipboard.writeText(text)
			setCopiedId(entry.id)
			window.setTimeout(() => setCopiedId(null), 1600)
		} catch {
			setCopiedId(null)
		}
	}

	return (
		<div className="space-y-4">
			<section className="surface p-3">
				<div className="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.8fr)_minmax(12rem,0.8fr)]">
					<label className="block">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Search
						</span>
						<input
							type="search"
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
							placeholder="Comment, quote, story, writer"
						/>
					</label>
					<label className="block">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Writer
						</span>
						<select
							value={writerFilter}
							onChange={(event) => setWriterFilter(event.target.value)}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100">
							<option value="">All writers</option>
							{writers.map((writer) => (
								<option key={writer.id} value={writer.id}>
									{writer.label}
								</option>
							))}
						</select>
					</label>
					<label className="block">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Category
						</span>
						<select
							value={categoryFilter}
							onChange={(event) => setCategoryFilter(event.target.value)}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100">
							<option value="">All categories</option>
							<option value="Uncategorised">Uncategorised</option>
							{fixedFeedbackCategories.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					</label>
				</div>
				<div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
					<p className="text-xs text-silver-300">
						{filteredEntries.length} shown from {entries.length} saved comments.
						{focusedWriter ? ` ${focusedWriter} in focus.` : ''}
					</p>
					<button
						type="button"
						onClick={() => {
							setSearchQuery('')
							setWriterFilter('')
							setCategoryFilter('')
						}}
						className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
						Clear filters
					</button>
				</div>
			</section>

			{filteredEntries.length === 0 ? (
				<section className="surface p-6">
					<p className="text-sm text-silver-300">No feedback memory matches.</p>
				</section>
			) : (
				<section className="grid gap-3 lg:grid-cols-2">
					{filteredEntries.map((entry) => (
						<article
							key={entry.id}
							className="surface p-4 transition hover:border-white/20">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-1.5">
										<span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-silver-200">
											{entry.categoryLabel}
										</span>
										<span className="text-[10px] uppercase tracking-[0.08em] text-silver-400">
											{formatShortDate(entry.createdAt)}
										</span>
										{entry.version ? (
											<span className="text-[10px] uppercase tracking-[0.08em] text-silver-400">
												v{entry.version}
											</span>
										) : null}
									</div>
									<h2 className="mt-2 truncate text-base font-semibold text-parchment-100">
										{entry.writerLabel}
									</h2>
									<p className="mt-0.5 truncate text-xs text-silver-300">
										{entry.submissionTitle} / {statusLabel(entry.status)}
									</p>
								</div>
								<button
									type="button"
									onClick={() => setWriterFilter(entry.writerId)}
									className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
									Writer
								</button>
							</div>
							{entry.quote ? (
								<p className="mt-3 border-l border-accent-300/35 pl-3 text-sm italic leading-relaxed text-parchment-100/90">
									{compactPreview(entry.quote, 220)}
								</p>
							) : null}
							<p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-silver-100">
								{compactPreview(entry.comment, 340)}
							</p>
							{entry.tags.length > 0 ? (
								<div className="mt-3 flex flex-wrap gap-1.5">
									{entry.tags.map((tag) => (
										<span
											key={tag}
											className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-silver-300">
											{tag}
										</span>
									))}
								</div>
							) : null}
							<div className="mt-4 flex flex-wrap items-center gap-2">
								<button
									type="button"
									onClick={() => {
										void copyMemory(entry)
									}}
									className="rounded-full border border-accent-300/35 bg-accent-300/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-accent-100 transition hover:bg-accent-300/18">
									{copiedId === entry.id ? 'Copied' : 'Copy comment'}
								</button>
								<button
									type="button"
									onClick={() => {
										void copyMemory(entry, true)
									}}
									className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
									Copy quote
								</button>
								<Link
									href={`/app/workshop/${entry.submissionId}?focus=feedback:${entry.id}`}
									className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
									Open
								</Link>
							</div>
						</article>
					))}
				</section>
			)}
		</div>
	)
}
