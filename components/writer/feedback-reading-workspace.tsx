'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { paginateManuscript } from '@/lib/manuscript/paging'

type FeedbackKind = 'typo' | 'craft' | 'pacing' | 'structure'

type FeedbackAnchor = {
	blockId: string
	startOffset: number
	endOffset: number
	quote: string
	prefix?: string
	suffix?: string
	kind?: FeedbackKind
	categoryLabel?: string
	categorySlug?: string
}

type FeedbackItem = {
	id: string
	comment: string
	anchor: FeedbackAnchor | null
	createdAt: string
}

type ActiveInlineComment = {
	id: string
	quote: string
	comment: string
	kind: FeedbackKind
	createdAt: string
}

function getMarkClass(kind: FeedbackKind) {
	if (kind === 'typo') {
		return 'mark-grammar'
	}
	if (kind === 'structure') {
		return 'mark-structure'
	}
	return 'mark-craft'
}

function kindLabel(kind: FeedbackKind) {
	if (kind === 'typo') {
		return 'Typo / Grammar'
	}
	if (kind === 'craft') {
		return 'Craft'
	}
	if (kind === 'pacing') {
		return 'Pacing'
	}
	return 'Structure'
}

function feedbackLabel(anchor: FeedbackAnchor | null | undefined) {
	if (anchor?.categoryLabel?.trim()) {
		return anchor.categoryLabel
	}
	return kindLabel(anchor?.kind ?? 'craft')
}

function formatQuote(quote: string) {
	return quote.trim() ? `"${quote}"` : 'General note'
}

export function WriterFeedbackReadingWorkspace({
	title,
	summary,
	publishedAt,
	paragraphs,
	feedback,
}: {
	title: string
	summary?: string | null
	publishedAt?: string | null
	paragraphs: Array<{ id: string; text: string }>
	feedback: FeedbackItem[]
}) {
	const pagedManuscript = useMemo(
		() => paginateManuscript(paragraphs),
		[paragraphs],
	)
	const initialCommentId = feedback[0]?.id ?? null
	const initialPageIndex = (() => {
		const firstAnchorBlockId = feedback[0]?.anchor?.blockId
		if (!firstAnchorBlockId) {
			return 0
		}
		return pagedManuscript.paragraphIdToPageIndex[firstAnchorBlockId] ?? 0
	})()

	const [activeCommentId, setActiveCommentId] = useState<string | null>(
		initialCommentId,
	)
	const [pageIndex, setPageIndex] = useState(initialPageIndex)
	const [isPanelOpen, setIsPanelOpen] = useState(false)

	const feedbackByBlock = useMemo(() => {
		const map: Record<string, FeedbackItem[]> = {}
		for (const item of feedback) {
			if (!item.anchor?.blockId) {
				continue
			}
			if (!map[item.anchor.blockId]) {
				map[item.anchor.blockId] = []
			}
			map[item.anchor.blockId].push(item)
		}
		for (const key of Object.keys(map)) {
			map[key].sort((a, b) => {
				const aStart = a.anchor?.startOffset ?? 0
				const bStart = b.anchor?.startOffset ?? 0
				return aStart - bStart
			})
		}
		return map
	}, [feedback])

	const activeComment = useMemo<ActiveInlineComment | null>(() => {
		if (!activeCommentId) {
			return null
		}
		const found = feedback.find((item) => item.id === activeCommentId)
		if (!found) {
			return null
		}
		const kind = found.anchor?.kind ?? 'craft'
		return {
			id: found.id,
			quote: found.anchor?.quote || 'General note',
			comment: found.comment,
			kind,
			createdAt: found.createdAt,
		}
	}, [activeCommentId, feedback])

	const totalPages = pagedManuscript.pages.length
	const currentPage =
		pagedManuscript.pages[Math.min(pageIndex, totalPages - 1)] ??
		pagedManuscript.pages[0]

	const goToPage = (nextPage: number) => {
		if (totalPages === 0) {
			return
		}
		const clamped = Math.max(0, Math.min(nextPage, totalPages - 1))
		setPageIndex(clamped)
	}

	const focusComment = (commentId: string) => {
		setActiveCommentId(commentId)
		const item = feedback.find((entry) => entry.id === commentId)
		const blockId = item?.anchor?.blockId
		if (!blockId) {
			return
		}
		const targetPage = pagedManuscript.paragraphIdToPageIndex[blockId]
		if (Number.isFinite(targetPage)) {
			goToPage(targetPage)
		}
	}

	const renderParagraph = (paragraphId: string, text: string) => {
		const items = feedbackByBlock[paragraphId] ?? []
		if (items.length === 0) {
			return [text]
		}

		const nodes: ReactNode[] = []
		let cursor = 0

		for (const item of items) {
			if (!item.anchor) {
				continue
			}
			const start = Math.max(
				cursor,
				Math.min(item.anchor.startOffset, text.length),
			)
			const end = Math.max(start, Math.min(item.anchor.endOffset, text.length))

			if (start > cursor) {
				nodes.push(text.slice(cursor, start))
			}

			const markedText = text.slice(start, end)
			if (markedText) {
				const kind = item.anchor.kind ?? 'craft'
				nodes.push(
					<button
						type="button"
						key={item.id}
						onClick={() => setActiveCommentId(item.id)}
						onMouseEnter={() => focusComment(item.id)}
						onFocus={() => focusComment(item.id)}
						className={`group relative isolate ${getMarkClass(kind)} rounded px-1 transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/70`}
						aria-label={`${kindLabel(kind)} comment: ${item.comment}`}>
						{markedText}
					</button>,
				)
			}

			cursor = end
		}

		if (cursor < text.length) {
			nodes.push(text.slice(cursor))
		}

		return nodes
	}

		return (
		<div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_300px] 2xl:grid-cols-[minmax(0,1.65fr)_320px]">
			<main className="min-w-0 space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/25 px-4 py-3">
					<div>
						<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
							Reading pages
						</p>
						<p className="mt-1 text-sm text-silver-200">
							Page {Math.min(pageIndex + 1, totalPages)} of {totalPages}
						</p>
					</div>
				</div>
				<article className="folio-page p-6 sm:p-7 lg:p-9 xl:p-10">
					<header className="mb-6 border-b border-ink-900/10 pb-5">
						<p className="text-xs uppercase tracking-[0.14em] text-ink-900/55">
							Published feedback draft
						</p>
						<h2 className="literary-title mt-2 text-3xl leading-tight text-ink-900">
							{title}
						</h2>
					</header>
					<div className="max-w-[78ch] space-y-5 font-serif text-[18px] leading-8 text-ink-900/90 lg:text-[18px] lg:leading-[1.95rem]">
						{(currentPage?.paragraphs ?? []).map((paragraph) => {
							const isSceneBreak = paragraph.text.trim() === '**'

							return (
								<p
									key={paragraph.id}
									id={paragraph.id}
									className={
										isSceneBreak
											? 'text-center tracking-[0.22em] text-ink-900/60'
											: 'whitespace-pre-wrap'
									}>
									{isSceneBreak
										? '***'
										: renderParagraph(paragraph.id, paragraph.text)}
								</p>
							)
						})}
					</div>
					<div className="mt-6 border-t border-ink-900/10 pt-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<button
								type="button"
								onClick={() => goToPage(pageIndex - 1)}
								disabled={pageIndex === 0}
								className="rounded-full border border-ink-900/15 bg-white/55 px-4 py-2 text-xs uppercase tracking-[0.1em] text-ink-900/75 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45">
								← Previous page
							</button>
							<p className="text-xs uppercase tracking-[0.12em] text-ink-900/55">
								Page {Math.min(pageIndex + 1, totalPages)} of {totalPages}
							</p>
							<button
								type="button"
								onClick={() => goToPage(pageIndex + 1)}
								disabled={pageIndex >= totalPages - 1}
								className="rounded-full border border-ink-900/15 bg-white/55 px-4 py-2 text-xs uppercase tracking-[0.1em] text-ink-900/75 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45">
								Next page →
							</button>
						</div>
					</div>
				</article>
			</main>

			<aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
				{activeComment ? (
					<div className="rounded-2xl border border-burgundy-300/20 bg-ink-900/35 px-4 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm">
						<div className="mb-3 flex items-start justify-between gap-3">
							<div className="space-y-2">
								<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
									Active feedback context
								</p>
								<p className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-300">
									{feedbackLabel(
										feedback.find((item) => item.id === activeComment.id)?.anchor,
									)}
								</p>
								<p className="font-serif text-sm italic leading-relaxed text-parchment-100/90">
									{formatQuote(activeComment.quote)}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setActiveCommentId(null)}
								className="text-xs text-accent-200 hover:text-accent-100">
								Dismiss
							</button>
						</div>
						<p className="text-sm leading-relaxed text-silver-100">
							{activeComment.comment}
						</p>
						<p className="mt-2 text-xs text-silver-300">
							{new Date(activeComment.createdAt).toLocaleString()}
						</p>
					</div>
				) : null}

				<div className="rounded-2xl border border-white/10 bg-ink-900/28 p-4">
					<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
						Published summary
					</p>
					<p className="mt-2 text-sm leading-relaxed text-silver-100">
						{summary || 'No summary published.'}
					</p>
					{publishedAt ? (
						<p className="mt-3 text-xs text-silver-300">
							Published {new Date(publishedAt).toLocaleString()}
						</p>
					) : null}
				</div>

				<div className="rounded-2xl border border-white/8 bg-ink-900/25 p-4">
					<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
						Feedback navigation
					</p>
					<p className="mt-2 text-sm leading-relaxed text-silver-200">
						Use inline highlights for focused reading, or open the full panel
						when you want the complete comment list beside the draft.
					</p>
					<button
						type="button"
						onClick={() => setIsPanelOpen((value) => !value)}
						className="mt-4 rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
						{isPanelOpen
							? 'Hide full comments panel'
							: 'Open full comments panel'}
					</button>
				</div>

				{isPanelOpen ? (
					<div className="rounded-2xl border border-white/10 bg-ink-800/55 p-5 shadow-glow">
						<div className="flex items-baseline justify-between gap-3">
							<h3 className="literary-title text-lg text-parchment-100">
								All comments
							</h3>
							<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
								{feedback.length} total
							</p>
						</div>
						{feedback.length === 0 ? (
							<p className="mt-3 text-sm text-silver-300">No comments found.</p>
						) : (
							<ul className="mt-3 space-y-2.5">
								{feedback.map((item) => {
									return (
										<li
											key={item.id}
											className="rounded-xl border border-white/8 bg-ink-900/28 p-3.5">
											<div className="flex flex-wrap items-center gap-2">
												<p className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-300">
													{feedbackLabel(item.anchor)}
												</p>
												<p className="font-serif text-sm italic text-parchment-100/90">
													{formatQuote(item.anchor?.quote ?? '')}
												</p>
											</div>
											<p className="mt-2 text-sm leading-relaxed text-parchment-100">
												{item.comment}
											</p>
											<button
												type="button"
												onClick={() => focusComment(item.id)}
												className="mt-3 text-xs text-accent-200 hover:text-accent-100">
												Focus in reading panel
											</button>
										</li>
									)
								})}
							</ul>
						)}
					</div>
				) : (
					<div className="rounded-2xl border border-white/8 bg-ink-900/18 px-4 py-3">
						<p className="text-xs leading-relaxed text-silver-300">
							Reading mode active. The manuscript stays central while inline
							feedback remains available above the folio.
						</p>
					</div>
				)}
			</aside>
		</div>
	)
}
