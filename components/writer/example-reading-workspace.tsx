'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePagedArrowNavigation } from '@/components/prototype/use-paged-arrow-navigation'
import {
	bookReadingPageOptions,
	paginateManuscript,
} from '@/lib/manuscript/paging'
import {
	exampleCraftCategories,
	type ExampleAnnotation,
	type ExampleAnchor,
} from '@/lib/teaching-examples/types'

type AnnotationSegment = {
	startOffset: number
	endOffset: number
}

type ExamplePage = ReturnType<typeof paginateManuscript>['pages'][number]

type TurningPage = {
	key: string
	direction: 'next' | 'previous'
	page: ExamplePage | undefined
}

function annotationSegmentForParagraph(
	anchor: ExampleAnchor,
	paragraph: { id: string; text: string },
	paragraphIndexById: Record<string, number>,
): AnnotationSegment | null {
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

function formatQuote(quote: string) {
	return quote.trim() ? `"${quote.trim()}"` : 'General note'
}

function markerClass(open: boolean) {
	return open
		? 'border-burgundy-400 bg-burgundy-500 text-parchment-100 shadow-[0_0_0_3px_rgba(122,47,69,0.18)]'
		: 'border-burgundy-300/60 bg-burgundy-500/10 text-burgundy-500 hover:border-burgundy-400 hover:bg-burgundy-500/18'
}

export function ExampleReadingWorkspace({
	title,
	authorName,
	editorialNote,
	contentNote,
	craftTags,
	paragraphs,
	annotations,
}: {
	title: string
	authorName: string
	editorialNote: string
	contentNote: string
	craftTags: string[]
	paragraphs: Array<{ id: string; text: string }>
	annotations: ExampleAnnotation[]
}) {
	const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(
		null,
	)
	const [selectedCategory, setSelectedCategory] = useState('All notes')
	const [spreadIndex, setSpreadIndex] = useState(0)
	const [turningPage, setTurningPage] = useState<TurningPage | null>(null)
	const [introOpen, setIntroOpen] = useState(true)
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
	const availableCategories = useMemo(
		() => [
			'All notes',
			...exampleCraftCategories.filter((category) =>
				annotations.some((item) => item.categoryLabel === category),
			),
		],
		[annotations],
	)
	const visibleAnnotations = useMemo(
		() =>
			selectedCategory === 'All notes'
				? annotations
				: annotations.filter((item) => item.categoryLabel === selectedCategory),
		[annotations, selectedCategory],
	)
	const sortedItems = useMemo(
		() =>
			[...visibleAnnotations].sort((a, b) => {
				const aBlock = paragraphIndexById[a.anchor.blockId] ?? Number.MAX_SAFE_INTEGER
				const bBlock = paragraphIndexById[b.anchor.blockId] ?? Number.MAX_SAFE_INTEGER

				if (aBlock !== bBlock) {
					return aBlock - bBlock
				}
				if (a.anchor.startOffset !== b.anchor.startOffset) {
					return a.anchor.startOffset - b.anchor.startOffset
				}
				return a.createdAt.localeCompare(b.createdAt)
			}),
		[paragraphIndexById, visibleAnnotations],
	)
	const annotationsByBlock = useMemo(() => {
		const map: Record<string, ExampleAnnotation[]> = {}
		for (const item of sortedItems) {
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
				map[paragraph.id] = [...(map[paragraph.id] ?? []), item]
			}
		}

		for (const [blockId, blockItems] of Object.entries(map)) {
			const paragraph = paragraphs[paragraphIndexById[blockId]]
			blockItems.sort((a, b) => {
				const aSegment = paragraph
					? annotationSegmentForParagraph(a.anchor, paragraph, paragraphIndexById)
					: null
				const bSegment = paragraph
					? annotationSegmentForParagraph(b.anchor, paragraph, paragraphIndexById)
					: null
				return (aSegment?.startOffset ?? 0) - (bSegment?.startOffset ?? 0)
			})
		}

		return map
	}, [paragraphIndexById, paragraphs, sortedItems])

	const totalPages = pagedManuscript.pages.length
	const totalSpreads = Math.max(1, Math.ceil(totalPages / 2))
	const currentPages = [
		pagedManuscript.pages[spreadIndex * 2],
		pagedManuscript.pages[spreadIndex * 2 + 1],
	]

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
					? pagedManuscript.pages[spreadIndex * 2 + 1] ??
						pagedManuscript.pages[spreadIndex * 2]
					: pagedManuscript.pages[spreadIndex * 2] ??
						pagedManuscript.pages[spreadIndex * 2 + 1]

			setTurningPage({
				key: `${spreadIndex}-${clamped}-${Date.now()}`,
				direction,
				page: sourcePage,
			})
			setSpreadIndex(clamped)
			setHoveredAnnotationId(null)
		},
		[pagedManuscript.pages, spreadIndex, totalSpreads],
	)

	usePagedArrowNavigation({
		pageIndex: spreadIndex,
		totalPages: totalSpreads,
		onPageChange: goToSpread,
	})

	const renderParagraphWithAnnotations = (
		paragraph: { id: string; text: string },
		blockItems: ExampleAnnotation[],
	): ReactNode[] => {
		const { text } = paragraph
		if (blockItems.length === 0) {
			return [text]
		}

		const nodes: ReactNode[] = []
		let cursor = 0

		for (const item of blockItems) {
			const segment = annotationSegmentForParagraph(
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
				const isOpen = hoveredAnnotationId === item.id
				nodes.push(
					<span
						key={item.id}
						className="group relative inline"
						onMouseEnter={() => setHoveredAnnotationId(item.id)}
						onMouseLeave={() =>
							setHoveredAnnotationId((current) =>
								current === item.id ? null : current,
							)
						}>
						<mark
							className={`mark-craft rounded px-1 transition ${
								isOpen ? 'ring-2 ring-burgundy-300/50' : ''
							}`}>
							{markedText}
						</mark>
						<button
							type="button"
							onClick={() => setHoveredAnnotationId(item.id)}
							onFocus={() => setHoveredAnnotationId(item.id)}
							onBlur={() =>
								setHoveredAnnotationId((current) =>
									current === item.id ? null : current,
								)
							}
							className={`ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 align-super text-[10px] font-semibold transition ${markerClass(
								isOpen,
							)}`}
							aria-label={`Open ${item.categoryLabel} note`}
							aria-expanded={isOpen}
							aria-controls={`example-note-${item.id}`}>
							<span aria-hidden="true">•</span>
						</button>
						<span
							id={`example-note-${item.id}`}
							role="note"
							className={`absolute left-1/2 top-full z-50 mt-3 w-[min(26rem,calc(100vw-3rem))] -translate-x-1/2 rounded-2xl border border-burgundy-300/35 bg-ink-950 px-4 py-4 text-left text-parchment-100 shadow-[0_18px_48px_rgba(0,0,0,0.34)] transition duration-150 ${
								isOpen
									? 'pointer-events-auto visible translate-y-0 opacity-100'
									: 'pointer-events-none invisible translate-y-1 opacity-0'
							}`}>
							<span
								className="absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-burgundy-300/75"
								aria-hidden="true"
							/>
							<span className="flex flex-wrap items-center gap-2">
								<span className="rounded-full border border-current/20 px-2 py-0.5 font-sans text-[11px] uppercase tracking-[0.1em] text-accent-100">
									{item.categoryLabel}
								</span>
								{item.tags.slice(0, 3).map((tag) => (
									<span
										key={tag}
										className="rounded-full border border-current/15 px-2 py-0.5 font-sans text-[11px] uppercase tracking-[0.08em] text-silver-200">
										{tag}
									</span>
								))}
							</span>
							<span className="mt-3 block font-serif text-[16px] italic leading-7 text-parchment-100/82">
								{formatQuote(item.anchor.quote)}
							</span>
							<span className="mt-3 block font-serif text-[18px] leading-8 text-parchment-100">
								{item.comment}
							</span>
						</span>
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

	const renderBookPage = (
		page: ExamplePage | undefined,
		pageSlot: 0 | 1,
		omitIds = false,
	) => (
		<article
			className={`example-book-page ${
				pageSlot === 0 ? 'example-book-page--left' : 'example-book-page--right'
			}`}
			aria-label={page ? `Page ${page.index + 1}` : 'Blank page'}>
			<div className="example-book-page__content space-y-4">
				{page
					? page.paragraphs.map((paragraph) => {
							const blockItems = annotationsByBlock[paragraph.id] ?? []
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
									{isSceneBreak
										? '***'
										: renderParagraphWithAnnotations(paragraph, blockItems)}
								</p>
							)
						})
					: null}
			</div>
		</article>
	)

	return (
		<section className="relative left-1/2 w-[min(calc(100vw-2rem),92rem)] -translate-x-1/2 space-y-3">
			{introOpen ? (
				<div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/75 p-4 backdrop-blur-sm">
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="reading-intro-title"
						className="surface max-h-[min(90vh,42rem)] w-full max-w-2xl overflow-y-auto p-5 lg:p-6">
						<p className="text-xs uppercase tracking-[0.12em] text-accent-200">
							Annotated reading
						</p>
						<h2
							id="reading-intro-title"
							className="literary-title mt-2 text-3xl leading-tight text-parchment-100">
							Before you read
						</h2>
						<p className="mt-4 text-base leading-8 text-silver-100">
							{editorialNote}
						</p>
						{contentNote ? (
							<p className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm leading-6 text-amber-100">
								{contentNote}
							</p>
						) : null}
						{craftTags.length > 0 ? (
							<div className="mt-4 flex flex-wrap gap-2">
								{craftTags.map((tag) => (
									<span
										key={tag}
										className="rounded-full border border-accent-300/25 bg-accent-300/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] text-accent-100">
										{tag}
									</span>
								))}
							</div>
						) : null}
						<div className="mt-6 flex flex-wrap items-center gap-3">
							<button
								type="button"
								onClick={() => setIntroOpen(false)}
								className="rounded-full border border-accent-300/45 bg-accent-300/18 px-4 py-2 text-sm font-semibold text-parchment-100 transition hover:bg-accent-300/24">
								Begin reading
							</button>
							<Link
								href="/app/writer/examples"
								className="rounded-full border border-white/15 bg-white/6 px-4 py-2 text-sm text-silver-100 transition hover:border-white/25 hover:text-parchment-100">
								Back to examples
							</Link>
						</div>
					</div>
				</div>
			) : null}

			<header className="surface overflow-hidden p-0">
				<div className="relative bg-ink-950">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_12%,rgba(207,184,124,0.2),transparent_26%),linear-gradient(135deg,rgba(17,24,39,0.96),rgba(44,28,34,0.9))]" />
					<div className="relative flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
						<div className="flex min-w-0 items-center gap-3">
							<Link
								href="/app/writer/examples"
								className="shrink-0 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-100 transition hover:border-white/30 hover:bg-white/12">
								Back
							</Link>
							<div className="min-w-0">
								<p className="text-[11px] uppercase tracking-[0.14em] text-accent-200">
									Annotated reading
								</p>
								<h1 className="literary-title truncate text-2xl leading-tight text-parchment-100 lg:text-3xl">
									{title}
								</h1>
								{authorName ? (
									<p className="truncate font-serif text-sm text-silver-100">
										{authorName}
									</p>
								) : null}
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
								Feedback
							</Link>
							<Link
								href="/app/writer/examples"
								className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
								Library
							</Link>
							<button
								type="button"
								onClick={() => setIntroOpen(true)}
								className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-100 transition hover:border-white/30 hover:bg-white/12">
								About
							</button>
						</div>
					</div>
				</div>
			</header>

			<div className="surface px-3 py-2">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="min-w-0 flex-1 overflow-x-auto pb-1">
						<div className="flex w-max gap-2">
							{availableCategories.map((category) => (
								<button
									key={category}
									type="button"
									onClick={() => {
										setSelectedCategory(category)
										setHoveredAnnotationId(null)
									}}
									className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] transition ${
										selectedCategory === category
											? 'border-accent-300 bg-accent-300/18 text-accent-50'
											: 'border-white/15 bg-white/6 text-silver-200 hover:border-white/25 hover:text-parchment-100'
									}`}>
									{category}
								</button>
							))}
						</div>
					</div>
					<p className="shrink-0 text-xs uppercase tracking-[0.12em] text-silver-300">
						{sortedItems.length} notes
					</p>
				</div>
			</div>

			<main className="relative min-w-0">
				<div
					className="example-page-spread example-book-spread">
					{renderBookPage(currentPages[0], 0)}
					{renderBookPage(currentPages[1], 1)}
					{turningPage ? (
						<div
							key={turningPage.key}
							className={`example-book-turning-page example-book-turning-page--${turningPage.direction}`}
							aria-hidden="true">
							{renderBookPage(
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
