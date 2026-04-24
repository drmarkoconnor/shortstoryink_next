'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { StoryFolio } from '@/components/prototype/story-folio'
import { usePagedArrowNavigation } from '@/components/prototype/use-paged-arrow-navigation'
import { RevisionConfirmButton } from '@/components/writer/revision-confirm-button'
import { paginateManuscript, readingPageOptions } from '@/lib/manuscript/paging'

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
	suggestedAction?: 'cut'
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
	createdAt: string
	label: string
	kind: FeedbackKind
	suggestedAction?: 'cut'
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
	return quote.trim() ? `\u201c${quote.trim()}\u201d` : 'General note'
}

function markerClass(kind: FeedbackKind, active: boolean) {
	if (kind === 'structure') {
		return active
			? 'border-accent-300 bg-accent-300 text-ink-950'
			: 'border-accent-300/55 bg-accent-300/18 text-accent-100'
	}
	return active
		? 'border-burgundy-200 bg-burgundy-300 text-parchment-100'
		: 'border-burgundy-300/55 bg-burgundy-500/18 text-burgundy-100'
}

function inlineCardClass(kind: FeedbackKind) {
	if (kind === 'structure') {
		return 'border-accent-300/35 bg-ink-950 text-accent-50'
	}
	return 'border-burgundy-300/35 bg-ink-950 text-parchment-100'
}

function cutMarkClass(active: boolean) {
	return active
		? 'bg-transparent text-ink-900/55 line-through decoration-2 decoration-ink-900/35 ring-2 ring-silver-500/35'
		: 'bg-transparent text-ink-900/58 line-through decoration-2 decoration-ink-900/30'
}

export function WriterFeedbackReadingWorkspace({
	submissionId,
	title,
	status,
	version,
	createdAt,
	summary,
	publishedAt,
	paragraphs,
	feedback,
}: {
	submissionId: string
	title: string
	status: string
	version: number
	createdAt: string
	summary?: string | null
	publishedAt?: string | null
	paragraphs: Array<{ id: string; text: string }>
	feedback: FeedbackItem[]
}) {
	const pagedManuscript = useMemo(
		() => paginateManuscript(paragraphs, readingPageOptions),
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
	const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)
	const [pageIndex, setPageIndex] = useState(initialPageIndex)
	const [isCommentsOpen, setIsCommentsOpen] = useState(true)
	const [showInstruction, setShowInstruction] = useState(true)

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

	const effectiveCommentId = hoveredCommentId ?? activeCommentId

	const effectiveComment = useMemo<ActiveInlineComment | null>(() => {
		if (!effectiveCommentId) {
			return null
		}
		const found = feedback.find((item) => item.id === effectiveCommentId)
		if (!found) {
			return null
		}
		return {
			id: found.id,
			quote: found.anchor?.quote || 'General note',
			comment: found.comment,
			createdAt: found.createdAt,
			label: feedbackLabel(found.anchor),
			kind: found.anchor?.kind ?? 'craft',
			suggestedAction: found.anchor?.suggestedAction,
		}
	}, [effectiveCommentId, feedback])

	const totalPages = pagedManuscript.pages.length
	const currentPage =
		pagedManuscript.pages[Math.min(pageIndex, totalPages - 1)] ??
		pagedManuscript.pages[0]

	const goToPage = useCallback((nextPage: number) => {
		if (totalPages === 0) {
			return
		}
		const clamped = Math.max(0, Math.min(nextPage, totalPages - 1))
		setPageIndex(clamped)
	}, [totalPages])

	usePagedArrowNavigation({
		pageIndex,
		totalPages,
		onPageChange: goToPage,
	})

	const focusComment = (commentId: string) => {
		setShowInstruction(false)
		setActiveCommentId((current) => (current === commentId ? null : commentId))
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

	const previewComment = (commentId: string) => {
		setShowInstruction(false)
		setHoveredCommentId(commentId)
	}

	const clearPreviewComment = () => {
		setHoveredCommentId(null)
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
				const isActive = effectiveCommentId === item.id
				const markClass =
					item.anchor.suggestedAction === 'cut'
						? cutMarkClass(isActive)
						: getMarkClass(kind)
				nodes.push(
					<span key={item.id} className="inline">
						<button
							type="button"
							onClick={() => focusComment(item.id)}
							onMouseEnter={() => previewComment(item.id)}
							onMouseLeave={clearPreviewComment}
							onFocus={() => previewComment(item.id)}
							onBlur={clearPreviewComment}
							className={`group relative isolate ${markClass} rounded px-1 transition hover:opacity-90 hover:ring-2 hover:ring-burgundy-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/70`}
							aria-label={`${kindLabel(kind)} comment: ${item.comment}`}>
							{markedText}
						</button>
						<button
							type="button"
							onClick={() => focusComment(item.id)}
							onMouseEnter={() => previewComment(item.id)}
							onMouseLeave={clearPreviewComment}
							onFocus={() => previewComment(item.id)}
							onBlur={clearPreviewComment}
							className={`ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 align-super text-[10px] font-medium transition ${markerClass(
								kind,
								isActive,
							)}`}
							aria-label={`${kindLabel(kind)} marker`}>
							•
						</button>
					</span>,
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
		<div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_300px] 2xl:grid-cols-[minmax(0,1.7fr)_320px]">
			<main className="min-w-0">
				<StoryFolio
					title={title}
					eyebrow="Published feedback"
					paged
					footer={
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
					}>
					{(currentPage?.paragraphs ?? []).map((paragraph) => {
						const isSceneBreak = paragraph.text.trim() === '**'
						const blockItems = feedbackByBlock[paragraph.id] ?? []
						const activeBlockItem =
							blockItems.find((item) => item.id === effectiveCommentId) ?? null

						return (
							<div key={paragraph.id} className="space-y-3">
								<p
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
								{activeBlockItem?.anchor ? (
									<div
										className={`max-w-[44rem] rounded-2xl border px-4 py-3 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.08)] ${inlineCardClass(
											activeBlockItem.anchor.kind ?? 'craft',
										)}`}>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div className="flex flex-wrap items-center gap-2">
												<p className="text-[11px] uppercase tracking-[0.12em]">
													Published comment
												</p>
												<p className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]">
													{feedbackLabel(activeBlockItem.anchor)}
												</p>
											</div>
											<button
												type="button"
												onClick={() => setActiveCommentId(null)}
												className="text-xs text-current/85 transition hover:text-current">
												Close
											</button>
										</div>
										<p className="mt-2 font-serif italic text-current/90">
											{formatQuote(activeBlockItem.anchor.quote)}
										</p>
										<p className="mt-3 leading-relaxed text-current">
											{activeBlockItem.comment}
										</p>
									</div>
								) : null}
							</div>
						)
					})}
				</StoryFolio>
				<div className="mt-4 max-w-xs">
					<RevisionConfirmButton href={`/app/writer/revise/${submissionId}`} />
				</div>
			</main>

			<aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
				<div className="surface p-4">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="text-xs uppercase tracking-[0.12em] text-accent-300">
								Published feedback
							</p>
						</div>
						<Link
							href="/app/writer/feedback"
							className="text-xs text-accent-200 hover:text-accent-100">
							Back to feedback list
						</Link>
					</div>
					<p className="mt-3 text-xs leading-relaxed text-silver-300">
						{status.replaceAll('_', ' ')} {' · '} Feedback on version {version} {' · '}
						{new Date(createdAt).toLocaleString()}
					</p>
					{summary ? (
						<div className="mt-4 border-l border-accent-300/50 pl-3">
							<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
								Overview
							</p>
							<p className="mt-2 text-[15px] leading-relaxed text-silver-100">
								{summary}
							</p>
						</div>
					) : null}
					{publishedAt ? (
						<p className="mt-3 text-xs text-silver-300">
							Published {new Date(publishedAt).toLocaleString()}
						</p>
					) : null}
				</div>

				{effectiveComment ? (
					<div
						key={effectiveComment.id}
						className="feedback-panel-pulse rounded-2xl border-2 border-burgundy-200/80 bg-ink-700/95 px-4 py-4 shadow-[0_0_0_1px_rgba(252,251,248,0.06),0_16px_36px_rgba(0,0,0,0.32)] transition">
						<div className="mb-3 flex items-start justify-between gap-3">
							<div className="space-y-2">
								<p className="text-[11px] uppercase tracking-[0.12em] text-accent-300">
									Selected feedback
								</p>
								<p className="inline-flex rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-200">
									{effectiveComment.label}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setActiveCommentId(null)}
								className="text-xs text-accent-200 hover:text-accent-100">
								Clear selection
							</button>
						</div>
						<div className="border-l border-white/25 pl-3">
							<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
								Quoted passage
							</p>
							<p className="mt-1 text-[15px] leading-relaxed text-silver-100">
								{formatQuote(effectiveComment.quote)}
							</p>
						</div>
						<p className="mt-4 border-l border-burgundy-200 pl-3 font-serif text-[16px] italic leading-relaxed text-parchment-100">
							{effectiveComment.comment}
						</p>
						<p className="mt-2 text-xs text-silver-300">
							{new Date(effectiveComment.createdAt).toLocaleString()}
						</p>
					</div>
				) : (
					<div className="rounded-2xl border border-burgundy-300/40 bg-ink-800/85 p-4">
						<p className="text-[11px] uppercase tracking-[0.12em] text-accent-300">
							Selected feedback
						</p>
						{showInstruction ? (
							<div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-silver-100">
								Hover over highlighted passages to read your teacher&apos;s comments.
							</div>
						) : null}
						<p className="mt-2 text-sm leading-relaxed text-silver-100">
							Hover previews a comment. Click a marker to keep it open while you
							read.
						</p>
					</div>
				)}

				<div className="rounded-2xl border border-white/15 bg-ink-800/90 p-5 shadow-glow">
					<div className="flex items-center justify-between gap-3">
						<h3 className="literary-title text-lg text-parchment-100">
							All comments
						</h3>
						<div className="flex items-center gap-2">
							<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
								{feedback.length} total
							</p>
							<button
								type="button"
								onClick={() => setIsCommentsOpen((value) => !value)}
								className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-100 transition hover:bg-white/10 hover:text-parchment-100"
								aria-expanded={isCommentsOpen}>
								{isCommentsOpen ? 'Collapse' : 'Show'}
							</button>
						</div>
					</div>
					{!isCommentsOpen ? (
						<p className="mt-3 text-sm leading-relaxed text-silver-200">
							Comment list hidden. Inline highlights and selected feedback stay
							available.
						</p>
					) : feedback.length === 0 ? (
						<p className="mt-3 text-sm text-silver-200">No comments found.</p>
					) : (
						<ul className="mt-3 space-y-2.5">
							{feedback.map((item) => {
								return (
									<li
										key={item.id}
										className="rounded-xl border border-white/15 bg-ink-900/50 p-3.5">
										<div className="flex flex-wrap items-center gap-2">
											<p className="inline-flex rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-200">
												{feedbackLabel(item.anchor)}
											</p>
										</div>
										<p className="mt-2 text-sm leading-relaxed text-silver-100">
											{formatQuote(item.anchor?.quote ?? '')}
										</p>
										<p className="mt-2 border-l border-burgundy-300/70 pl-3 font-serif text-sm italic leading-relaxed text-parchment-100">
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
			</aside>
		</div>
	)
}
