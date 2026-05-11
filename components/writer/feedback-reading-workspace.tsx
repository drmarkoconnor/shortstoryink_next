'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePagedArrowNavigation } from '@/components/prototype/use-paged-arrow-navigation'
import { RevisionConfirmButton } from '@/components/writer/revision-confirm-button'
import {
	bookReadingPageOptions,
	paginateManuscript,
	type ManuscriptPage,
} from '@/lib/manuscript/paging'

type FeedbackKind = 'typo' | 'craft' | 'pacing' | 'structure'

type FeedbackAnchor = {
	blockId: string
	endBlockId?: string
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
	label: string
	kind: FeedbackKind
	suggestedAction?: 'cut'
}

type FeedbackSegment = {
	startOffset: number
	endOffset: number
}

type CommentMode = 'craft' | 'quick' | 'all'

type ReaderPage =
	| {
			kind: 'overview'
			index: number
		}
	| {
			kind: 'manuscript'
			index: number
			page: ManuscriptPage
		}

type TurningPage = {
	key: string
	direction: 'next' | 'previous'
	page: ReaderPage | undefined
}

type LaterVersion = {
	id: string
	version: number
	status: string
} | null

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

function isQuickFix(item: FeedbackItem) {
	const label = feedbackLabel(item.anchor).toLowerCase()
	return (
		item.anchor?.kind === 'typo' ||
		label.includes('typo') ||
		label.includes('grammar')
	)
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
	if (kind === 'typo') {
		return active
			? 'border-silver-300 bg-silver-300 text-ink-950'
			: 'border-silver-300/55 bg-silver-300/16 text-silver-100'
	}
	return active
		? 'border-burgundy-200 bg-burgundy-300 text-parchment-100'
		: 'border-burgundy-300/55 bg-burgundy-500/18 text-burgundy-100'
}

function inlineCardClass(kind: FeedbackKind) {
	if (kind === 'structure') {
		return 'border-accent-300/35 bg-ink-950 text-accent-50'
	}
	if (kind === 'typo') {
		return 'border-silver-300/35 bg-ink-950 text-silver-100'
	}
	return 'border-burgundy-300/35 bg-ink-950 text-parchment-100'
}

function cutMarkClass(active: boolean) {
	return active
		? 'bg-transparent text-ink-900/55 line-through decoration-2 decoration-ink-900/35 ring-2 ring-silver-500/35'
		: 'bg-transparent text-ink-900/58 line-through decoration-2 decoration-ink-900/30'
}

function feedbackSegmentForParagraph(
	anchor: FeedbackAnchor,
	paragraph: { id: string; text: string },
	paragraphIndexById: Record<string, number>,
): FeedbackSegment | null {
	const startIndex = paragraphIndexById[anchor.blockId]
	const endBlockId = anchor.endBlockId ?? anchor.blockId
	const endIndex = paragraphIndexById[endBlockId]
	const paragraphIndex = paragraphIndexById[paragraph.id]

	if (
		startIndex === undefined ||
		endIndex === undefined ||
		paragraphIndex === undefined ||
		paragraphIndex < startIndex ||
		paragraphIndex > endIndex
	) {
		return null
	}

	if (anchor.blockId === endBlockId) {
		return {
			startOffset: anchor.startOffset,
			endOffset: anchor.endOffset,
		}
	}

	if (paragraph.id === anchor.blockId) {
		return {
			startOffset: anchor.startOffset,
			endOffset: paragraph.text.length,
		}
	}

	if (paragraph.id === endBlockId) {
		return {
			startOffset: 0,
			endOffset: anchor.endOffset,
		}
	}

	return {
		startOffset: 0,
		endOffset: paragraph.text.length,
	}
}

function modeLabel(mode: CommentMode) {
	if (mode === 'quick') {
		return 'Quick fixes'
	}
	if (mode === 'all') {
		return 'All notes'
	}
	return 'Craft notes'
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
	laterVersion,
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
	laterVersion?: LaterVersion
}) {
	const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
	const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)
	const [commentMode, setCommentMode] = useState<CommentMode>('craft')
	const [spreadIndex, setSpreadIndex] = useState(0)
	const [turningPage, setTurningPage] = useState<TurningPage | null>(null)
	const pagedManuscript = useMemo(
		() => paginateManuscript(paragraphs, bookReadingPageOptions),
		[paragraphs],
	)
	const paragraphIndexById = useMemo(
		() =>
			Object.fromEntries(
				paragraphs.map((paragraph, index) => [paragraph.id, index]),
			) as Record<string, number>,
		[paragraphs],
	)
	const quickFixCount = useMemo(
		() => feedback.filter((item) => isQuickFix(item)).length,
		[feedback],
	)
	const visibleFeedback = useMemo(() => {
		if (commentMode === 'all') {
			return feedback
		}
		if (commentMode === 'quick') {
			return feedback.filter((item) => isQuickFix(item))
		}
		return feedback.filter((item) => !isQuickFix(item))
	}, [commentMode, feedback])
	const feedbackByBlock = useMemo(() => {
		const map: Record<string, FeedbackItem[]> = {}
		for (const item of visibleFeedback) {
			if (!item.anchor?.blockId) {
				continue
			}
			const startIndex = paragraphIndexById[item.anchor.blockId]
			const endIndex =
				paragraphIndexById[item.anchor.endBlockId ?? item.anchor.blockId]
			if (startIndex === undefined || endIndex === undefined) {
				continue
			}
			for (let index = startIndex; index <= endIndex; index += 1) {
				const paragraph = paragraphs[index]
				if (!paragraph) {
					continue
				}
				if (!map[paragraph.id]) {
					map[paragraph.id] = []
				}
				map[paragraph.id].push(item)
			}
		}
		for (const [blockId, blockItems] of Object.entries(map)) {
			const paragraph = paragraphs[paragraphIndexById[blockId]]
			blockItems.sort((a, b) => {
				const aSegment =
					a.anchor && paragraph
						? feedbackSegmentForParagraph(a.anchor, paragraph, paragraphIndexById)
						: null
				const bSegment =
					b.anchor && paragraph
						? feedbackSegmentForParagraph(b.anchor, paragraph, paragraphIndexById)
						: null
				const aStart = aSegment?.startOffset ?? a.anchor?.startOffset ?? 0
				const bStart = bSegment?.startOffset ?? b.anchor?.startOffset ?? 0
				return aStart - bStart
			})
		}
		return map
	}, [visibleFeedback, paragraphIndexById, paragraphs])
	const readerPages = useMemo<ReaderPage[]>(
		() => [
			{ kind: 'overview', index: 0 },
			...pagedManuscript.pages.map((page) => ({
				kind: 'manuscript' as const,
				index: page.index + 1,
				page,
			})),
		],
		[pagedManuscript.pages],
	)
	const totalSpreads = Math.max(1, Math.ceil(readerPages.length / 2))
	const currentPages = [
		readerPages[spreadIndex * 2],
		readerPages[spreadIndex * 2 + 1],
	]
	const effectiveCommentId = hoveredCommentId ?? activeCommentId
	const effectiveComment = useMemo<ActiveInlineComment | null>(() => {
		if (!effectiveCommentId) {
			return null
		}
		const found = visibleFeedback.find((item) => item.id === effectiveCommentId)
		if (!found) {
			return null
		}
		return {
			id: found.id,
			quote: found.anchor?.quote || 'General note',
			comment: found.comment,
			label: feedbackLabel(found.anchor),
			kind: found.anchor?.kind ?? 'craft',
			suggestedAction: found.anchor?.suggestedAction,
		}
	}, [effectiveCommentId, visibleFeedback])
	const hasLaterVersion =
		laterVersion && laterVersion.version > version && laterVersion.id !== submissionId
	const canOpenLaterFinishedPiece =
		hasLaterVersion && laterVersion.status === 'feedback_published'

	useEffect(() => {
		if (!turningPage) {
			return
		}

		const timeout = window.setTimeout(() => setTurningPage(null), 720)

		return () => window.clearTimeout(timeout)
	}, [turningPage])

	const goToSpread = useCallback(
		(nextSpread: number) => {
			const clamped = Math.max(0, Math.min(nextSpread, totalSpreads - 1))
			if (clamped === spreadIndex) {
				return
			}

			const direction = clamped > spreadIndex ? 'next' : 'previous'
			const sourcePage =
				direction === 'next'
					? readerPages[spreadIndex * 2 + 1] ?? readerPages[spreadIndex * 2]
					: readerPages[spreadIndex * 2] ?? readerPages[spreadIndex * 2 + 1]

			setTurningPage({
				key: `${spreadIndex}-${clamped}-${Date.now()}`,
				direction,
				page: sourcePage,
			})
			setSpreadIndex(clamped)
			setHoveredCommentId(null)
		},
		[readerPages, spreadIndex, totalSpreads],
	)

	usePagedArrowNavigation({
		pageIndex: spreadIndex,
		totalPages: totalSpreads,
		onPageChange: goToSpread,
	})

	const focusComment = (commentId: string) => {
		setActiveCommentId((current) => (current === commentId ? null : commentId))
		const item = visibleFeedback.find((entry) => entry.id === commentId)
		const blockId = item?.anchor?.blockId
		if (!blockId) {
			return
		}
		const manuscriptPageIndex = pagedManuscript.paragraphIdToPageIndex[blockId]
		if (Number.isFinite(manuscriptPageIndex)) {
			setSpreadIndex(Math.floor((manuscriptPageIndex + 1) / 2))
		}
	}

	const renderParagraph = (paragraph: { id: string; text: string }) => {
		const items = feedbackByBlock[paragraph.id] ?? []
		const { text } = paragraph
		if (items.length === 0) {
			return [text]
		}

		const nodes: ReactNode[] = []
		let cursor = 0

		for (const item of items) {
			if (!item.anchor) {
				continue
			}
			const segment = feedbackSegmentForParagraph(
				item.anchor,
				paragraph,
				paragraphIndexById,
			)
			if (!segment) {
				continue
			}
			const start = Math.max(cursor, Math.min(segment.startOffset, text.length))
			const end = Math.max(start, Math.min(segment.endOffset, text.length))

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
					<span
						key={item.id}
						className="group relative inline"
						onMouseEnter={() => setHoveredCommentId(item.id)}
						onMouseLeave={() =>
							setHoveredCommentId((current) =>
								current === item.id ? null : current,
							)
						}>
						<mark
							className={`${markClass} rounded px-1 transition ${
								isActive ? 'ring-2 ring-burgundy-300/50' : ''
							}`}>
							{markedText}
						</mark>
						<button
							type="button"
							onClick={() => focusComment(item.id)}
							onFocus={() => setHoveredCommentId(item.id)}
							onBlur={() =>
								setHoveredCommentId((current) =>
									current === item.id ? null : current,
								)
							}
							className={`ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 align-super text-[10px] font-semibold transition ${markerClass(
								kind,
								isActive,
							)}`}
							aria-label={`${feedbackLabel(item.anchor)} comment`}
							aria-expanded={isActive}
							aria-controls={`finished-piece-note-${item.id}`}>
							<span aria-hidden="true">•</span>
						</button>
						{isActive && effectiveComment ? (
							<span
								id={`finished-piece-note-${item.id}`}
								role="note"
								className={`absolute left-1/2 top-full z-50 mt-3 w-[min(26rem,calc(100vw-3rem))] -translate-x-1/2 rounded-2xl border px-4 py-4 text-left shadow-[0_18px_48px_rgba(0,0,0,0.34)] ${inlineCardClass(
									effectiveComment.kind,
								)}`}>
								<span
									className="absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-burgundy-300/75"
									aria-hidden="true"
								/>
								<span className="rounded-full border border-current/20 px-2 py-0.5 font-sans text-[11px] uppercase tracking-[0.1em]">
									{effectiveComment.label}
								</span>
								<span className="mt-3 block font-serif text-[16px] italic leading-7 text-current/82">
									{formatQuote(effectiveComment.quote)}
								</span>
								<span className="mt-3 block font-serif text-[18px] leading-8 text-current">
									{effectiveComment.comment}
								</span>
							</span>
						) : null}
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

	const renderReaderPage = (
		page: ReaderPage | undefined,
		pageSlot: 0 | 1,
		omitIds = false,
	) => (
		<article
			className={`example-book-page ${
				pageSlot === 0 ? 'example-book-page--left' : 'example-book-page--right'
			}`}>
			{!page ? null : page.kind === 'overview' ? (
				<div className="example-book-page__content max-w-[56ch] space-y-5">
					<p className="text-[11px] uppercase tracking-[0.16em] text-ink-900/50">
						Editorial letter
					</p>
					<div>
						<h1 className="literary-title text-4xl leading-tight text-ink-900">
							{title}
						</h1>
						<p className="mt-3 text-sm uppercase tracking-[0.12em] text-ink-900/50">
							Version {version} {' · '} {status.replaceAll('_', ' ')} {' · '}
							{new Date(createdAt).toLocaleDateString()}
						</p>
					</div>
					<div className="border-l border-burgundy-300/45 pl-5">
						<p className="font-serif text-[21px] leading-9 text-ink-900/88">
							{summary?.trim() ||
								'Your teacher has returned this piece with comments in the manuscript.'}
						</p>
					</div>
					{publishedAt ? (
						<p className="text-sm leading-6 text-ink-900/58">
							Published {new Date(publishedAt).toLocaleDateString()}.
						</p>
					) : null}
					{hasLaterVersion ? (
						<div className="rounded-2xl border border-accent-400/30 bg-accent-300/15 px-4 py-3 text-sm leading-6 text-ink-900/72">
							<p>
								A later version exists: version {laterVersion.version} (
								{laterVersion.status.replaceAll('_', ' ')}).
							</p>
							{canOpenLaterFinishedPiece ? (
								<Link
									href={`/app/writer/feedback/${laterVersion.id}`}
									className="mt-2 inline-flex text-xs uppercase tracking-[0.1em] text-burgundy-500 hover:text-burgundy-400">
									Open later finished piece
								</Link>
							) : null}
						</div>
					) : null}
					<div className="rounded-2xl border border-ink-900/10 bg-white/45 px-4 py-3 text-sm leading-6 text-ink-900/64">
						<p>
							The manuscript begins on the facing page. {modeLabel(commentMode)} are
							shown in place; quick fixes are hidden until you choose that filter.
						</p>
						<p className="mt-2">
							{visibleFeedback.length} notes in this view. {quickFixCount} quick
							fixes stored.
						</p>
					</div>
					<div className="max-w-xs pt-1">
						<RevisionConfirmButton href={`/app/writer/revise/${submissionId}`} />
					</div>
				</div>
			) : (
				<div className="example-book-page__content space-y-4">
					{page.page.paragraphs.map((paragraph) => {
						const isSceneBreak = paragraph.text.trim() === '**'

						return (
							<p
								key={paragraph.id}
								id={omitIds ? undefined : paragraph.id}
								className={
									isSceneBreak
										? 'text-center font-serif text-[19px] tracking-[0.22em] text-ink-900/60'
										: 'whitespace-pre-wrap font-serif text-[18px] leading-8 text-ink-900/90 xl:text-[19px] xl:leading-9'
								}>
								{isSceneBreak ? '***' : renderParagraph(paragraph)}
							</p>
						)
					})}
				</div>
			)}
		</article>
	)

	return (
		<section className="relative left-1/2 w-[min(calc(100vw-2rem),92rem)] -translate-x-1/2 space-y-3">
			<header className="surface overflow-hidden p-0">
				<div className="relative bg-ink-950">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_12%,rgba(207,184,124,0.2),transparent_26%),linear-gradient(135deg,rgba(17,24,39,0.96),rgba(44,28,34,0.9))]" />
					<div className="relative flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
						<div className="flex min-w-0 items-center gap-3">
							<Link
								href="/app/writer/feedback"
								className="shrink-0 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-100 transition hover:border-white/30 hover:bg-white/12">
								Back
							</Link>
							<div className="min-w-0">
								<p className="text-[11px] uppercase tracking-[0.14em] text-accent-200">
									Finished piece
								</p>
								<h1 className="literary-title truncate text-2xl leading-tight text-parchment-100 lg:text-3xl">
									{title}
								</h1>
								<p className="truncate font-serif text-sm text-silver-100">
									Version {version} {' · '} {visibleFeedback.length} notes in view
								</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2 text-xs">
							<Link
								href="/app/writer"
								className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
								Write
							</Link>
							<Link
								href="/app/writer/feedback"
								className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
								Finished pieces
							</Link>
							<Link
								href="/app/writer/examples"
								className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
								Examples
							</Link>
						</div>
					</div>
				</div>
			</header>

			<div className="surface px-3 py-2">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-wrap gap-2">
						{(['craft', 'quick', 'all'] as CommentMode[]).map((mode) => (
							<button
								key={mode}
								type="button"
								onClick={() => {
									setCommentMode(mode)
									setActiveCommentId(null)
									setHoveredCommentId(null)
								}}
								className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] transition ${
									commentMode === mode
										? 'border-accent-300 bg-accent-300/18 text-accent-50'
										: 'border-white/15 bg-white/6 text-silver-200 hover:border-white/25 hover:text-parchment-100'
								}`}>
								{modeLabel(mode)}
							</button>
						))}
					</div>
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						{visibleFeedback.length} shown / {feedback.length} total
					</p>
				</div>
			</div>

			<main className="relative min-w-0">
				<div className="example-page-spread example-book-spread">
					{renderReaderPage(currentPages[0], 0)}
					{renderReaderPage(currentPages[1], 1)}
					{turningPage ? (
						<div
							key={turningPage.key}
							className={`example-book-turning-page example-book-turning-page--${turningPage.direction}`}
							aria-hidden="true">
							{renderReaderPage(
								turningPage.page,
								turningPage.direction === 'next' ? 1 : 0,
								true,
							)}
						</div>
					) : null}
				</div>

				<button
					type="button"
					onClick={() => goToSpread(spreadIndex - 1)}
					disabled={spreadIndex === 0}
					className="absolute left-3 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink-900/10 bg-parchment-50/80 font-serif text-3xl leading-none text-ink-900 shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition hover:bg-parchment-100 disabled:cursor-not-allowed disabled:opacity-25"
					aria-label="Previous spread">
					‹
				</button>
				<button
					type="button"
					onClick={() => goToSpread(spreadIndex + 1)}
					disabled={spreadIndex >= totalSpreads - 1}
					className="absolute right-3 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink-900/10 bg-parchment-50/80 font-serif text-3xl leading-none text-ink-900 shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition hover:bg-parchment-100 disabled:cursor-not-allowed disabled:opacity-25"
					aria-label="Next spread">
					›
				</button>
				<p className="absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full border border-ink-900/10 bg-parchment-50/80 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-ink-900/70 shadow-[0_8px_20px_rgba(0,0,0,0.14)]">
					Spread {spreadIndex + 1} of {totalSpreads}
				</p>
			</main>
		</section>
	)
}
