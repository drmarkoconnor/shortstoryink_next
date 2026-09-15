'use client'

import { useCallback, useEffect, useMemo, useRef, useState, Fragment, type ReactNode } from 'react'
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
			: 'border-accent-300/55 bg-accent-300/18 text-studio-accent'
	}
	if (kind === 'typo') {
		return active
			? 'border-silver-300 bg-silver-300 text-ink-950'
			: 'border-silver-300/55 bg-silver-300/16 text-studio-muted'
	}
	return active
		? 'border-burgundy-200 bg-studio-soft text-studio-ink'
		: 'border-burgundy-300/55 bg-studio-soft text-studio-accent'
}

function inlineCardClass(kind: FeedbackKind) {
	if (kind === 'structure') {
		return 'border-accent-300/35 bg-studio-canvas text-studio-accent'
	}
	if (kind === 'typo') {
		return 'border-silver-300/35 bg-studio-canvas text-studio-muted'
	}
	return 'border-burgundy-300/35 bg-studio-canvas text-studio-ink'
}

function cutMarkClass(active: boolean) {
	return active
		? 'bg-transparent text-studio-ink/55 line-through decoration-2 decoration-ink-900/35 ring-2 ring-silver-500/35'
		: 'bg-transparent text-studio-ink/58 line-through decoration-2 decoration-ink-900/30'
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
	preview,
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
	preview?: { reviewUrl: string; onClose?: () => void; includesOverviewDraft?: boolean }
}) {
	const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
	const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
	const noteRef = useRef<HTMLElement>(null)
	const markerRef = useRef<HTMLButtonElement | null>(null)
	const readingRef = useRef<HTMLElement>(null)
	const dismissComment = useCallback((restoreFocus = false) => {
		setActiveCommentId(null)
		setActiveBlockId(null)
		if (restoreFocus) markerRef.current?.focus({ preventScroll: true })
	}, [])

	useEffect(() => {
		if (!activeCommentId) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault()
				dismissComment(true)
			}
		}
		const onOutsideClick = (event: MouseEvent) => {
			const target = event.target as Node
			if (!noteRef.current?.contains(target) && !markerRef.current?.contains(target)) {
				dismissComment()
			}
		}
		document.addEventListener('keydown', onKeyDown)
		document.addEventListener('click', onOutsideClick)
		noteRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.removeEventListener('click', onOutsideClick)
		}
	}, [activeCommentId, activeBlockId, dismissComment])
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
	const effectiveCommentId = activeCommentId
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
			dismissComment()
			requestAnimationFrame(() => {
				readingRef.current?.focus({ preventScroll: true })
				readingRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
			})
		},
		[readerPages, spreadIndex, totalSpreads, dismissComment],
	)

	usePagedArrowNavigation({
		pageIndex: spreadIndex,
		totalPages: totalSpreads,
		onPageChange: goToSpread,
	})

	const focusComment = (commentId: string, blockId: string, marker: HTMLButtonElement) => {
		markerRef.current = marker
		if (activeCommentId === commentId && activeBlockId === blockId) {
			dismissComment()
		} else {
			setActiveCommentId(commentId)
			setActiveBlockId(blockId)
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
				const isActive = effectiveCommentId === item.id && activeBlockId === paragraph.id
				const markClass =
					item.anchor.suggestedAction === 'cut'
						? cutMarkClass(isActive)
						: getMarkClass(kind)
				nodes.push(
					<span key={item.id} className="inline">
						<mark
							className={`${markClass} rounded px-1 transition ${
								isActive ? 'ring-2 ring-burgundy-300/50' : ''
							}`}>
							{markedText}
						</mark>
						<button
							type="button"
							onClick={(event) => focusComment(item.id, paragraph.id, event.currentTarget)}
							className={`ml-1 inline-flex min-h-8 min-w-8 items-center justify-center rounded border px-1.5 align-super text-xs font-semibold transition ${markerClass(
								kind,
								isActive,
							)}`}
							aria-label={`${feedbackLabel(item.anchor)} comment`}
							aria-expanded={isActive}
							aria-controls={`finished-piece-note-${item.id}`}>
							<span aria-hidden="true">•</span>
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
					<p className="text-xs uppercase tracking-[0.16em] text-studio-ink/50">
						Editorial letter
					</p>
					<div>
						<h1 className="literary-title text-4xl leading-tight text-studio-ink">
							{title}
						</h1>
						<p className="mt-3 text-sm uppercase tracking-[0.12em] text-studio-ink/50">
							Version {version} {' · '} {status.replaceAll('_', ' ')} {' · '}
							{new Date(createdAt).toLocaleDateString('en-GB', { timeZone: 'Europe/London' })}
						</p>
					</div>
					<div className="border-l border-burgundy-300/45 pl-5">
						<p className="whitespace-pre-wrap font-serif text-[21px] leading-9 text-studio-ink/88">
							{summary?.trim() ||
								'Your editor has returned this piece with comments in the manuscript.'}
						</p>
					</div>
					{publishedAt ? (
						<p className="text-sm leading-6 text-studio-ink/58">
							Published {new Date(publishedAt).toLocaleDateString('en-GB', { timeZone: 'Europe/London' })}.
						</p>
					) : null}
					{hasLaterVersion ? (
						<div className="rounded-md border border-accent-400/30 bg-accent-300/15 px-4 py-3 text-sm leading-6 text-studio-ink/72">
							<p>
								A later version exists: version {laterVersion.version} (
								{laterVersion.status.replaceAll('_', ' ')}).
							</p>
							{canOpenLaterFinishedPiece ? (
								<Link
									href={`/app/writer/feedback/${laterVersion.id}`}
									className="mt-2 inline-flex text-xs uppercase tracking-[0.1em] text-studio-accent hover:text-studio-accent">
									Open later returned feedback
								</Link>
							) : null}
						</div>
					) : null}
					<div className="rounded-md border border-ink-900/10 bg-studio-tint px-4 py-3 text-sm leading-6 text-studio-ink/64">
						<p>
							The manuscript begins on the following section. {modeLabel(commentMode)} are
							shown in place. Select a comment marker to read a note; use Close or Escape to return to the passage.
						</p>
						<p className="mt-2">
							{visibleFeedback.length} notes in this view. {quickFixCount} quick
							fixes stored.
						</p>
					</div>
					{!preview ? <div className="max-w-xs pt-1">
						<RevisionConfirmButton href={`/app/writer/revise/${submissionId}`} />
					</div> : null}
				</div>
			) : (
				<div className="example-book-page__content space-y-4">
					{page.page.paragraphs.map((paragraph) => {
						const isSceneBreak = paragraph.text.trim() === '**'

						return (
							<Fragment key={paragraph.id}>
							<p
								id={omitIds ? undefined : paragraph.id}
								className={
									isSceneBreak
										? 'text-center font-serif text-[19px] tracking-[0.22em] text-studio-ink/60'
										: 'whitespace-pre-wrap font-serif text-[18px] leading-8 text-studio-ink/90 xl:text-[19px] xl:leading-9'
								}>
								{isSceneBreak ? '***' : renderParagraph(paragraph)}
							</p>
							{!omitIds && activeBlockId === paragraph.id && effectiveComment ? (
								<aside ref={noteRef} id={`finished-piece-note-${effectiveComment.id}`} role="note"
									aria-label={`${effectiveComment.label} note`}
									className={`studio-inline-note my-4 min-w-0 rounded-md border p-4 text-left ${inlineCardClass(effectiveComment.kind)}`}>
									<div className="flex items-center justify-between gap-3">
										<span className="text-xs uppercase tracking-[0.1em]">{effectiveComment.label}</span>
										<button type="button" onClick={() => dismissComment(true)} className="studio-secondary min-h-11 shrink-0" aria-label="Close comment">Close <span aria-hidden="true">×</span></button>
									</div>
									<div className="mt-3 max-h-[45vh] overflow-y-auto overscroll-contain break-words" tabIndex={0} aria-label="Comment text">
										<p className="font-serif text-base italic leading-7">{formatQuote(effectiveComment.quote)}</p>
										<p className="mt-3 whitespace-pre-wrap font-serif text-lg leading-8">{effectiveComment.comment}</p>
									</div>
								</aside>
							) : null}
							</Fragment>
						)
					})}
				</div>
			)}
		</article>
	)

	return (
		<section className="mx-auto max-w-5xl space-y-6 studio-reading-page">
			{preview ? <div className="surface border-l-4 border-studio-line p-4 text-sm text-studio-ink" role="status">
				<p className="font-semibold">Preview writer view</p>
				<p className="mt-1">{status === 'feedback_published' ? 'This is the published feedback in the writer’s reading view.' : preview.includesOverviewDraft ? 'Preview of your saved comments and current overview. Nothing is sent until you confirm publication.' : 'Preview of saved comments. Unpublished feedback remains private; nothing is sent by opening this view.'}</p>
			</div> : null}
			<header className="surface overflow-hidden p-0">
				<div className="relative bg-studio-canvas">
					<div className="relative flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
						<div className="flex min-w-0 items-center gap-3">
							{preview?.onClose ? <button type="button" onClick={preview.onClose} className="studio-secondary shrink-0">Back to publication</button> : (
							<Link
								href={preview?.reviewUrl ?? "/app/writer/feedback"}
								className="shrink-0 rounded border border-studio-line bg-studio-tint px-3 py-1.5 text-sm text-studio-muted transition hover:border-studio-line hover:bg-studio-tint">
								{preview ? 'Back to editorial view' : 'Back'}
							</Link>
							)}
							<div className="min-w-0">
								<p className="text-xs uppercase tracking-[0.14em] text-studio-accent">
									Returned feedback
								</p>
								<h1 className="literary-title text-3xl leading-tight text-studio-ink lg:text-4xl">
									{title}
								</h1>
								<p className="truncate font-serif text-sm text-studio-muted">
									Version {version} {' · '} {visibleFeedback.length} notes in view
								</p>
							</div>
						</div>
						{!preview ? <div className="flex flex-wrap items-center gap-2 text-xs">
							<Link
								href="/app/writer"
								className="rounded border border-studio-line bg-studio-tint px-3 py-1.5 text-studio-muted transition hover:border-studio-line hover:text-studio-ink">
								Write
							</Link>
							<Link
								href="/app/writer/feedback"
								className="rounded border border-studio-line bg-studio-tint px-3 py-1.5 text-studio-muted transition hover:border-studio-line hover:text-studio-ink">
								Returned feedback
							</Link>
							<Link
								href="/app/writer/examples"
								className="rounded border border-studio-line bg-studio-tint px-3 py-1.5 text-studio-muted transition hover:border-studio-line hover:text-studio-ink">
								Reading
							</Link>
						</div> : null}
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
									dismissComment()
								}}
								className={`rounded border px-3 py-1.5 text-xs uppercase tracking-[0.1em] transition ${
									commentMode === mode
										? 'border-accent-300 bg-accent-300/18 text-studio-accent'
										: 'border-studio-line bg-studio-tint text-studio-muted hover:border-studio-line hover:text-studio-ink'
								}`}>
								{modeLabel(mode)}
							</button>
						))}
					</div>
					<p className="text-xs uppercase tracking-[0.12em] text-studio-muted">
						{visibleFeedback.length} shown / {feedback.length} total
					</p>
				</div>
			</div>

			<main ref={readingRef} tabIndex={-1} aria-label="Feedback reading section" className="relative min-w-0 scroll-mt-24">
				<div className="example-page-spread example-book-spread">
					{renderReaderPage(currentPages[0], 0)}
					{renderReaderPage(currentPages[1], 1)}
					{turningPage ? (
						<div
							key={turningPage.key}
							className={`example-book-turning-page example-book-turning-page--${turningPage.direction}`}
							aria-hidden="true" inert>
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
					className="studio-secondary my-4 mr-3"
					aria-label="Previous section">
					Previous
				</button>
				<button
					type="button"
					onClick={() => goToSpread(spreadIndex + 1)}
					disabled={spreadIndex >= totalSpreads - 1}
					className="studio-secondary my-4 mr-3"
					aria-label="Next section">
					Next
				</button>
				<p className="inline-block text-sm text-studio-muted" aria-live="polite">
					Section {spreadIndex + 1} of {totalSpreads}
				</p>
			</main>
		</section>
	)
}
