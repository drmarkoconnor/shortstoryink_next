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
		? 'border-burgundy-400 bg-studio-soft text-studio-ink shadow-none'
		: 'border-burgundy-300/60 bg-studio-soft text-studio-accent hover:border-burgundy-400 hover:bg-studio-soft'
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
	const [introOpen, setIntroOpen] = useState(Boolean(contentNote))
 const [showNotes, setShowNotes] = useState(true)
 const [largeText, setLargeText] = useState(false)
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
		if (!showNotes || blockItems.length === 0) {
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
							onClick={() => setHoveredAnnotationId(current => current === item.id ? null : item.id)}
                            onKeyDown={event => { if (event.key === 'Escape') setHoveredAnnotationId(null) }}
							onBlur={() =>
								setHoveredAnnotationId((current) =>
									current === item.id ? null : current,
								)
							}
							className={`ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5 align-super text-xs font-semibold transition ${markerClass(
								isOpen,
							)}`}
							aria-label={`Open note ${sortedItems.findIndex(note => note.id === item.id) + 1}: ${item.categoryLabel}`}
							aria-expanded={isOpen}
							aria-controls={`example-note-${item.id}`}>
							<span aria-hidden="true">{sortedItems.findIndex(note => note.id === item.id) + 1}</span>
						</button>
						<span
							id={`example-note-${item.id}`}
							role="note"
							className={`studio-inline-note absolute left-1/2 top-full z-50 mt-3 w-[min(26rem,calc(100vw-3rem))] -translate-x-1/2 rounded-md border border-burgundy-300/35 bg-studio-canvas px-4 py-4 text-left text-studio-ink shadow-none transition duration-150 ${
								isOpen
									? 'pointer-events-auto visible translate-y-0 opacity-100'
									: 'hidden'
							}`}>
							<span
								className="absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2 bg-studio-soft"
								aria-hidden="true"
							/>
							<span className="flex flex-wrap items-center gap-2">
								<span className="rounded border border-current/20 px-2 py-0.5 font-sans text-xs uppercase tracking-[0.1em] text-studio-accent">
									{item.categoryLabel}
								</span>
								{item.tags.slice(0, 3).map((tag) => (
									<span
										key={tag}
										className="rounded border border-current/15 px-2 py-0.5 font-sans text-xs uppercase tracking-[0.08em] text-studio-muted">
										{tag}
									</span>
								))}
							</span>
							<span className="mt-3 block font-serif text-[16px] italic leading-7 text-studio-ink/82">
								{formatQuote(item.anchor.quote)}
							</span>
							<span className="mt-3 block font-serif text-[18px] leading-8 text-studio-ink">
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
											? 'text-center font-serif text-[19px] tracking-[0.22em] text-studio-ink/60'
											: 'whitespace-pre-wrap font-serif text-[18px] leading-8 text-studio-ink/90 xl:text-[19px] xl:leading-9'
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
		<section className="mx-auto max-w-6xl space-y-6 studio-reading-page" data-large-text={largeText}>
   <header className="border-b border-studio-line pb-6">
    <Link className="studio-link" href="/app/writer/examples">Back to annotated readings</Link>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-5"><div><p className="studio-eyebrow">Annotated reading</p><h1 className="studio-heading mt-3">{title}</h1><p className="mt-3 font-serif text-xl text-studio-muted">{authorName}</p></div><button type="button" className="studio-secondary" onClick={() => setIntroOpen(value => !value)} aria-expanded={introOpen}>About this reading</button></div>
   </header>

			{introOpen ? (
				<div className="border-b border-studio-line pb-6">
					<div
						role="region"

						aria-labelledby="reading-intro-title"
						className="max-w-3xl">
						<p className="text-xs uppercase tracking-[0.12em] text-studio-accent">
							Annotated reading
						</p>
						<h2
							id="reading-intro-title"
							className="literary-title mt-2 text-3xl leading-tight text-studio-ink">
							A note on this reading
						</h2>
						<p className="mt-4 text-base leading-8 text-studio-muted">
							{editorialNote}
						</p>
						{contentNote ? (
							<p className="mt-4 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm leading-6 text-amber-800">
								{contentNote}
							</p>
						) : null}
						{craftTags.length > 0 ? (
							<div className="mt-4 flex flex-wrap gap-2">
								{craftTags.map((tag) => (
									<span
										key={tag}
										className="rounded border border-accent-300/25 bg-accent-300/10 px-2.5 py-1 text-xs uppercase tracking-[0.08em] text-studio-accent">
										{tag}
									</span>
								))}
							</div>
						) : null}
						<div className="mt-6 flex flex-wrap items-center gap-3">
							<button
								type="button"
								onClick={() => setIntroOpen(false)}
								className="rounded border border-accent-300/45 bg-accent-300/18 px-4 py-2 text-sm font-semibold text-studio-ink transition hover:bg-accent-300/24">
								Close introduction
							</button>
							<Link
								href="/app/writer/examples"
								className="rounded border border-studio-line bg-studio-tint px-4 py-2 text-sm text-studio-muted transition hover:border-studio-line hover:text-studio-ink">
								Back to examples
							</Link>
						</div>
					</div>
				</div>
			) : null}

			<div className="border-b border-studio-line py-3">
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
									className={`shrink-0 rounded border px-3 py-1.5 text-xs uppercase tracking-[0.1em] transition ${
										selectedCategory === category
											? 'border-accent-300 bg-accent-300/18 text-studio-accent'
											: 'border-studio-line bg-studio-tint text-studio-muted hover:border-studio-line hover:text-studio-ink'
									}`}>
									{category}
								</button>
							))}
						</div>
					</div>
					<div className="flex flex-wrap gap-4 text-sm"><button type="button" className="studio-link" aria-pressed={largeText} onClick={() => setLargeText(value => !value)}>{largeText ? 'Standard text' : 'Larger text'}</button><button type="button" className="studio-link" aria-pressed={!showNotes} onClick={() => setShowNotes(value => !value)}>{showNotes ? 'Focus on the text' : 'Show margin notes'}</button></div>
				</div>
			</div>

			<div className={`grid items-start gap-10 ${showNotes ? 'lg:grid-cols-[minmax(0,1fr)_290px]' : 'mx-auto max-w-3xl'}`}>
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
				<p className="inline-block text-sm text-studio-muted">
					Section {spreadIndex + 1} of {totalSpreads}
				</p>
   </main>
   {showNotes ? <aside className="border-t border-studio-line pt-6 lg:border-l lg:border-t-0 lg:pl-6"><h2 className="literary-title text-2xl">In the margins</h2><p className="mt-2 text-sm text-studio-muted">Writing choices to notice</p><div className="mt-5 divide-y divide-studio-line">{sortedItems.filter(item => currentPages.some(page => page?.paragraphs.some(paragraph => annotationsByBlock[paragraph.id]?.some(note => note.id === item.id)))).map(item => <div key={item.id} className="py-5"><p className="studio-eyebrow">{sortedItems.findIndex(note => note.id === item.id) + 1}. {item.categoryLabel}</p><p className="mt-3 font-serif text-lg leading-7">{item.comment}</p><button type="button" className="studio-link mt-4" onClick={() => {setHoveredAnnotationId(item.id);document.getElementById(item.anchor.blockId)?.scrollIntoView({block:'center',behavior:'smooth'})}}>See it in the text</button></div>)}</div>{sortedItems.length === 0 ? <p className="mt-5 text-sm text-studio-muted">No notes in this view.</p> : null}</aside> : null}
   </div>
  </section>
	)
}
