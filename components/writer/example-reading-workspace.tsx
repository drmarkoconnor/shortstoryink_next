'use client'

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AnchoredNote, NoteMarker, ReadingNavigation } from '@/components/reading/anchored-note'
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
 const [noteAnchor, setNoteAnchor] = useState<HTMLElement | null>(null)
 const readingRef = useRef<HTMLDivElement>(null)

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
	const totalSpreads = Math.max(1, totalPages)
	const currentPages = [
		pagedManuscript.pages[spreadIndex],
	]


	const goToSpread = useCallback(
		(nextSpread: number) => {
			const clamped = Math.max(0, Math.min(nextSpread, totalSpreads - 1))
			if (clamped === spreadIndex) {
				return
			}

			setSpreadIndex(clamped)
            readingRef.current?.scrollIntoView({block: "start"})
			setHoveredAnnotationId(null)
		},
		[spreadIndex, totalSpreads],
	)

	usePagedArrowNavigation({
		pageIndex: spreadIndex,
		totalPages: totalSpreads,
		onPageChange: goToSpread,
	})

 const renderParagraphWithAnnotations = (paragraph: {id:string;text:string}, blockItems:ExampleAnnotation[]):ReactNode[] => {
  if (!showNotes || !blockItems.length) return [paragraph.text]
  const segments = blockItems.flatMap(item => {
   const segment = annotationSegmentForParagraph(item.anchor, paragraph, paragraphIndexById)
   return segment ? [{item,start:Math.max(0,Math.min(segment.startOffset,paragraph.text.length)),end:Math.max(0,Math.min(segment.endOffset,paragraph.text.length))}] : []
  }).filter(segment=>segment.end>segment.start)
  const edges = [...new Set([0, paragraph.text.length, ...segments.flatMap(segment=>[segment.start,segment.end])])].sort((a,b)=>a-b)
  const nodes:ReactNode[]=[]
  for(let i=0;i<edges.length-1;i++) {
   const start=edges[i],end=edges[i+1]
   const covering=segments.filter(segment=>segment.start<=start&&segment.end>=end)
   const text=paragraph.text.slice(start,end)
   if(covering.length) {
    const item=covering.find(segment=>segment.item.id===hoveredAnnotationId)?.item ?? covering[0].item
    nodes.push(<mark key={`text-${start}`} className={`mark-craft rounded ${covering.some(segment=>segment.item.id===hoveredAnnotationId)?'ring-2 ring-studio-accent/40':''}`} onClick={()=>{
     if(window.getSelection()?.toString()) return
     const marker=document.getElementById(`marker-${paragraph.id}-${item.id}`)?.querySelector('button')
     if(marker) {  setNoteAnchor(marker); setHoveredAnnotationId(current=>current===item.id?null:item.id) }
    }}>{text}</mark>)
   } else nodes.push(text)
   for(const {item} of segments.filter(segment=>segment.end===end)) nodes.push(<span key={item.id} id={`marker-${paragraph.id}-${item.id}`}><NoteMarker number={sortedItems.findIndex(note=>note.id===item.id)+1} category={item.categoryLabel} active={hoveredAnnotationId===item.id} onOpen={anchor=>{ setNoteAnchor(anchor); setHoveredAnnotationId(current=>current===item.id?null:item.id)}} /></span>)
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
					<div className="flex flex-wrap gap-4 text-sm"><button type="button" className="studio-link" aria-pressed={largeText} onClick={() => setLargeText(value => !value)}>{largeText ? 'Standard text' : 'Larger text'}</button><button type="button" className="studio-link" aria-pressed={!showNotes} onClick={() => { setShowNotes(value => !value); setHoveredAnnotationId(null) }}>{showNotes ? 'Focus on the text' : 'Show notes'}</button></div>
				</div>
			</div>

			<div ref={readingRef} className="example-reading-column" data-large-text={largeText}>
<ReadingNavigation index={spreadIndex} total={totalSpreads} onChange={goToSpread} />
<p className="mt-5 text-sm text-studio-muted">{showNotes ? 'Open a numbered highlight to read its note.' : 'Notes are hidden while you focus on the text.'}</p>
{showNotes && hoveredAnnotationId && noteAnchor ? (() => { const item = sortedItems.find(note=>note.id===hoveredAnnotationId); return item ? <AnchoredNote anchor={noteAnchor} title={`Note ${sortedItems.indexOf(item)+1} · ${item.categoryLabel}`} onClose={()=>setHoveredAnnotationId(null)}><p className="mt-4 font-serif italic text-studio-muted">{formatQuote(item.anchor.quote)}</p><p className="mt-4 whitespace-pre-wrap text-base leading-7">{item.comment}</p></AnchoredNote> : null })() : null}
   <main className="relative min-w-0">
				<div
					className="example-page-spread example-book-spread">
					{renderBookPage(currentPages[0], 0)}
</div>
</main>
<ReadingNavigation index={spreadIndex} total={totalSpreads} onChange={goToSpread} />

   </div>
  </section>
	)
}
