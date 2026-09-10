'use client'

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type FormEvent,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
} from 'react'
import { AnchoredNote, NoteMarker, ReadingNavigation } from '@/components/reading/anchored-note'
import { usePagedArrowNavigation } from '@/components/prototype/use-paged-arrow-navigation'
import {
	captureManuscriptSelection,
	clearBrowserSelection,
	shouldIgnoreSelectionTarget,
} from '@/lib/manuscript/dom-selection'
import {
	bookReadingPageOptions,
	paginateManuscript,
} from '@/lib/manuscript/paging'
import {
	exampleCategorySlug,
	exampleCraftCategories,
	normalizeExampleCategory,
	parseExampleTagsInput,
	type ExampleAnnotation,
	type ExampleAnchor,
} from '@/lib/teaching-examples/types'

type SelectedAnchor = {
	blockId: string
	endBlockId?: string
	startOffset: number
	endOffset: number
	quote: string
	prefix: string
	suffix: string
	composerTop: number
	composerLeft: number
}

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







export function TeacherExampleAnnotationWorkspace({
	exampleId,
	title,
	status,
	paragraphs,
	annotations,
	notice,
	errorNotice,
}: {
	exampleId: string
	title: string
	status: 'draft' | 'published'
	paragraphs: Array<{ id: string; text: string }>
	annotations: ExampleAnnotation[]
	notice: string | null
	errorNotice: string | null
}) {
	const [liveStatus, setLiveStatus] = useState(status)
	const [items, setItems] = useState(annotations)
	const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
		null,
	)
	const [selectedAnchor, setSelectedAnchor] = useState<SelectedAnchor | null>(null)
	const [composerText, setComposerText] = useState('')
	const [composerCategory, setComposerCategory] = useState('Uncategorised')
	const [composerTags, setComposerTags] = useState('')
	const [composerError, setComposerError] = useState<string | null>(null)
	const [flashNotice, setFlashNotice] = useState(notice)
	const [sidePanelError, setSidePanelError] = useState<string | null>(null)
	const [sidePanelNotice, setSidePanelNotice] = useState<string | null>(null)
	const [isComposerSaving, setIsComposerSaving] = useState(false)
	const [isPanelSaving, setIsPanelSaving] = useState(false)
	const [isPublishing, setIsPublishing] = useState(false)
	const [editComment, setEditComment] = useState('')
	const [editCategory, setEditCategory] = useState('Uncategorised')
	const [editTags, setEditTags] = useState('')
	const [spreadIndex, setSpreadIndex] = useState(0)
 const [showNotes, setShowNotes] = useState(true)
 const [largeText, setLargeText] = useState(false)
 const [noteAnchor, setNoteAnchor] = useState<HTMLElement | null>(null)
 const readingRef = useRef<HTMLDivElement>(null)

	const mainRef = useRef<HTMLDivElement | null>(null)
	const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null)
	const composerFormRef = useRef<HTMLFormElement | null>(null)

	useEffect(() => {
		setItems(annotations)
	}, [annotations])

	useEffect(() => {
		setLiveStatus(status)
	}, [status])

	useEffect(() => {
		setFlashNotice(notice)
		if (!notice) {
			return
		}

		const timeout = window.setTimeout(() => setFlashNotice(null), 1200)
		return () => window.clearTimeout(timeout)
	}, [notice])

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
	const sortedItems = useMemo(
		() =>
			[...items].sort((a, b) => {
				if (a.anchor.blockId !== b.anchor.blockId) {
					return (paragraphIndexById[a.anchor.blockId] ?? 0) - (paragraphIndexById[b.anchor.blockId] ?? 0)
				}
				if (a.anchor.startOffset !== b.anchor.startOffset) {
					return a.anchor.startOffset - b.anchor.startOffset
				}
				return a.createdAt.localeCompare(b.createdAt)
			}),
		[items, paragraphIndexById],
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

	const activeAnnotation =
		sortedItems.find((item) => item.id === activeAnnotationId) ?? null
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

			setSelectedAnchor(null)
			setActiveAnnotationId(null)
			setSpreadIndex(clamped)
            readingRef.current?.scrollIntoView({block: "start"})
		},
		[spreadIndex, totalSpreads],
	)

	usePagedArrowNavigation({
		pageIndex: spreadIndex,
		totalPages: totalSpreads,
		onPageChange: goToSpread,
	})

	useEffect(() => {
		if (!activeAnnotation) {
			setEditComment('')
			setEditCategory('Uncategorised')
			setEditTags('')
			return
		}

		setEditComment(activeAnnotation.comment)
		setEditCategory(activeAnnotation.categoryLabel)
		setEditTags(activeAnnotation.tags.join(', '))

	}, [activeAnnotation])

	useEffect(() => {
		if (selectedAnchor) {
			const frame = window.requestAnimationFrame(() => {
				composerTextareaRef.current?.focus()
			})
			return () => window.cancelAnimationFrame(frame)
		}
	}, [selectedAnchor])

	const closeInlineComposer = () => {
		setSelectedAnchor(null)
		clearBrowserSelection()
	}

	const captureSelection = (
		event?: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
	) => {
		if (!showNotes || shouldIgnoreSelectionTarget(event?.target ?? null)) {
			return
		}

		const capturedSelection = captureManuscriptSelection(paragraphs)
		const containerRect = mainRef.current?.getBoundingClientRect()
		if (!capturedSelection || !containerRect) {
			return
		}

		const composerTop =
			capturedSelection.selectionRect.bottom - containerRect.top + 10
		const composerLeft = Math.min(
			Math.max(16, capturedSelection.selectionRect.left - containerRect.left),
			Math.max(16, containerRect.width - 320),
		)

		setActiveAnnotationId(null)
		setComposerText('')
		setSelectedAnchor({
			blockId: capturedSelection.blockId,
			endBlockId: capturedSelection.endBlockId,
			startOffset: capturedSelection.startOffset,
			endOffset: capturedSelection.endOffset,
			quote: capturedSelection.quote,
			prefix: capturedSelection.prefix,
			suffix: capturedSelection.suffix,
			composerTop,
			composerLeft,
		})
		clearBrowserSelection()
	}

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
    const item=covering.find(segment=>segment.item.id===activeAnnotationId)?.item ?? covering[0].item
    nodes.push(<mark key={`text-${start}`} className={`mark-craft rounded ${covering.some(segment=>segment.item.id===activeAnnotationId)?'ring-2 ring-studio-accent/40':''}`} onClick={()=>{
     if(window.getSelection()?.toString()) return
     const marker=document.getElementById(`marker-${paragraph.id}-${item.id}`)?.querySelector('button')
     if(marker) { closeInlineComposer(); setNoteAnchor(marker); setActiveAnnotationId(current=>current===item.id?null:item.id) }
    }}>{text}</mark>)
   } else nodes.push(text)
   for(const {item} of segments.filter(segment=>segment.end===end)) nodes.push(<span key={item.id} id={`marker-${paragraph.id}-${item.id}`}><NoteMarker number={sortedItems.findIndex(note=>note.id===item.id)+1} category={item.categoryLabel} active={activeAnnotationId===item.id} onOpen={anchor=>{closeInlineComposer(); setNoteAnchor(anchor); setActiveAnnotationId(current=>current===item.id?null:item.id)}} /></span>)
  }
  return nodes
 }

	const saveNewAnnotation = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!selectedAnchor || isComposerSaving) {
			return
		}

		const comment = composerText.trim()
		if (!comment) {
			setComposerError('Write a note before saving.')
			return
		}

		const categoryLabel = normalizeExampleCategory(composerCategory)
		const tags = parseExampleTagsInput(composerTags)
		const tempId = `temp-${Date.now()}`
		const optimistic: ExampleAnnotation = {
			id: tempId,
			comment,
			categoryLabel,
			categorySlug: exampleCategorySlug(categoryLabel),
			tags,
			createdAt: new Date().toISOString(),
			anchor: {
				blockId: selectedAnchor.blockId,
				endBlockId: selectedAnchor.endBlockId,
				startOffset: selectedAnchor.startOffset,
				endOffset: selectedAnchor.endOffset,
				quote: selectedAnchor.quote,
				prefix: selectedAnchor.prefix,
				suffix: selectedAnchor.suffix,
				categoryLabel,
				categorySlug: exampleCategorySlug(categoryLabel),
				tags,
			},
		}

		setComposerError(null)
		setIsComposerSaving(true)
		setItems((current) => [...current, optimistic])

		try {
			const response = await fetch(
				`/api/teacher/examples/${exampleId}/annotations`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						blockId: optimistic.anchor.blockId,
						endBlockId: optimistic.anchor.endBlockId,
						startOffset: optimistic.anchor.startOffset,
						endOffset: optimistic.anchor.endOffset,
						quote: optimistic.anchor.quote,
						prefix: optimistic.anchor.prefix,
						suffix: optimistic.anchor.suffix,
						comment,
						categoryLabel,
						tags,
					}),
				},
			)
			const payload = (await response.json()) as
				| { error?: string; annotation?: ExampleAnnotation }
				| undefined

			if (!response.ok || payload?.error || !payload?.annotation) {
				throw new Error(payload?.error ?? 'Unable to save note.')
			}

			setItems((current) =>
				current.map((item) =>
					item.id === tempId ? payload.annotation! : item,
				),
			)
			closeInlineComposer()
            setComposerText('')
            setFlashNotice('Note saved.')
		} catch (error) {
			setItems((current) => current.filter((item) => item.id !== tempId))
			setComposerError(error instanceof Error ? error.message : 'Unable to save note.')
		} finally {
			setIsComposerSaving(false)
		}
	}

	const saveActiveAnnotation = async (event?: FormEvent<HTMLFormElement>) => {
		event?.preventDefault()
		if (!activeAnnotation || isPanelSaving) {
			return
		}

		const comment = editComment.trim()
		if (!comment) {
			setSidePanelError('A note cannot be empty.')
			return
		}

		const categoryLabel = normalizeExampleCategory(editCategory)
		const tags = parseExampleTagsInput(editTags)
		setIsPanelSaving(true)
		setSidePanelError(null)

		try {
			const response = await fetch(
				`/api/teacher/examples/${exampleId}/annotations`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: activeAnnotation.id,
						comment,
						categoryLabel,
						tags,
					}),
				},
			)
			const payload = (await response.json()) as
				| { error?: string; annotation?: ExampleAnnotation }
				| undefined

			if (!response.ok || payload?.error || !payload?.annotation) {
				throw new Error(payload?.error ?? 'Unable to save note.')
			}

			setItems((current) =>
				current.map((item) =>
					item.id === activeAnnotation.id ? payload.annotation! : item,
				),
			)
			setSidePanelNotice('Note saved.')
		} catch (error) {
			setSidePanelError(error instanceof Error ? error.message : 'Unable to save note.')
		} finally {
			setIsPanelSaving(false)
		}
	}

	const deleteActiveAnnotation = async () => {
		if (!activeAnnotation || isPanelSaving) {
			return
		}

		setIsPanelSaving(true)
		setSidePanelError(null)

		try {
			const response = await fetch(
				`/api/teacher/examples/${exampleId}/annotations`,
				{
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ id: activeAnnotation.id }),
				},
			)
			const payload = (await response.json()) as { error?: string } | undefined
			if (!response.ok || payload?.error) {
				throw new Error(payload?.error ?? 'Unable to delete note.')
			}

			setItems((current) =>
				current.filter((item) => item.id !== activeAnnotation.id),
			)
			setActiveAnnotationId(null)
			setSidePanelNotice('Note deleted.')
		} catch (error) {
			setSidePanelError(error instanceof Error ? error.message : 'Unable to delete note.')
		} finally {
			setIsPanelSaving(false)
		}
	}

	const publishExample = async (nextStatus: 'draft' | 'published') => {
		if (isPublishing) {
			return
		}

		setIsPublishing(true)
		setSidePanelError(null)
		try {
			const response = await fetch(`/api/teacher/examples/${exampleId}/publish`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: nextStatus }),
			})
			const payload = (await response.json()) as
				| { error?: string; status?: 'draft' | 'published'; notice?: string }
				| undefined

			if (!response.ok || payload?.error || !payload?.status) {
				throw new Error(payload?.error ?? 'Unable to update publication.')
			}

			setLiveStatus(payload.status)
			setFlashNotice(payload.notice ?? 'Publication updated.')
		} catch (error) {
			setSidePanelError(
				error instanceof Error ? error.message : 'Unable to update publication.',
			)
		} finally {
			setIsPublishing(false)
		}
	}

	const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault()
			composerFormRef.current?.requestSubmit()
		}
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
			aria-label={page ? `${title}, page ${page.index + 1}` : 'Blank page'}>
			<div className="example-book-page__content space-y-4">
				{page
					? page.paragraphs.map((paragraph) => {
							const blockItems = annotationsByBlock[paragraph.id] ?? []
							const isSceneBreak = paragraph.text.trim() === '**'

							return (
								<div key={paragraph.id} className="space-y-3">
									<p
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
								</div>
							)
						})
					: null}
			</div>
		</article>
	)

	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<details className="border-b border-studio-line pb-4"><summary className="cursor-pointer text-sm text-studio-muted">Publication · {liveStatus}</summary><div className="mt-4 max-w-md">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs uppercase tracking-[0.1em] text-studio-muted">
								Publication
							</p>
							<p className="mt-1 text-sm text-studio-muted">
								{liveStatus === 'published'
									? 'Visible to writers in enabled groups.'
									: 'Private draft. Writers cannot see it yet.'}
							</p>
						</div>
						<span
							className={`rounded border px-2.5 py-1 text-xs uppercase tracking-[0.1em] ${
								liveStatus === 'published'
									? 'border-emerald-300/40 bg-emerald-300/12 text-emerald-800'
									: 'border-studio-line bg-studio-tint text-studio-muted'
							}`}>
							{liveStatus}
						</span>
					</div>
					<button
						type="button"
						disabled={isPublishing}
						onClick={() =>
							void publishExample(
								liveStatus === 'published' ? 'draft' : 'published',
							)
						}
						className="mt-4 w-full rounded border border-emerald-300/55 bg-emerald-300/14 px-4 py-2 text-xs uppercase tracking-[0.1em] text-emerald-800 transition hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-60">
						{isPublishing
							? 'Saving...'
							: liveStatus === 'published'
								? 'Unpublish example'
								: 'Publish example'}
					</button>
				</div></details>

				{errorNotice ? (
					<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
						{errorNotice}
					</p>
				) : null}
				{sidePanelError ? (
					<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
						{sidePanelError}
					</p>
				) : null}
				{sidePanelNotice ? (
					<p className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-800">
						{sidePanelNotice}
					</p>
				) : null}

</div>
<div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-studio-muted">{showNotes ? 'Open a numbered highlight to read or edit its note. Select text to add a note.' : 'Notes are hidden while you focus on the text.'}</p><div className="flex gap-4 text-sm"><button type="button" className="studio-link" aria-pressed={largeText} onClick={()=>setLargeText(value=>!value)}>{largeText?'Standard text':'Larger text'}</button><button type="button" className="studio-link" aria-pressed={!showNotes} onClick={()=>{setShowNotes(value=>!value);setActiveAnnotationId(null);closeInlineComposer()}}>{showNotes?'Focus on the text':'Show notes'}</button></div></div>
{activeAnnotation && noteAnchor ? <AnchoredNote key={activeAnnotation.id} anchor={noteAnchor} title={`Note ${sortedItems.findIndex(note=>note.id===activeAnnotation.id)+1} · ${activeAnnotation.categoryLabel}`} onClose={()=>setActiveAnnotationId(null)}>
<p className="mt-4 font-serif italic text-studio-muted">{formatQuote(activeAnnotation.anchor.quote)}</p>
<p className="mt-4 whitespace-pre-wrap text-base leading-7">{activeAnnotation.comment}</p>
<details className="mt-5 border-t border-studio-line pt-4"><summary className="studio-link cursor-pointer text-sm">Edit note</summary>
<form onSubmit={saveActiveAnnotation} className="mt-3 space-y-3" data-selection-ignore="true">
							<textarea aria-label="Note text"
								rows={editComment.includes('\n') ? 5 : 4}
								value={editComment}
								onChange={(event) => setEditComment(event.target.value)}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2 text-sm text-studio-ink"
							/>
							<label className="block">
								<span className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-studio-muted">
									Category
								</span>
								<select
									value={editCategory}
									onChange={(event) => setEditCategory(event.target.value)}
									className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink">
									{exampleCraftCategories.map((category) => (
										<option key={category} value={category}>
											{category}
										</option>
									))}
								</select>
							</label>
							<label className="block">
								<span className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-studio-muted">
									Tags
								</span>
								<input
									value={editTags}
									onChange={(event) => setEditTags(event.target.value)}
									className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink"
								/>
							</label>
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="submit"
									disabled={isPanelSaving}
									className="studio-primary">
									{isPanelSaving ? 'Saving...' : 'Save'}
								</button>
								<button
									type="button"
									disabled={isPanelSaving}
									onClick={deleteActiveAnnotation}
									className="rounded border border-studio-line px-3 py-1.5 text-sm text-studio-muted transition hover:border-amber-200/40 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-60">
									Delete
								</button>
							</div>
						</form></details>
{sidePanelError ? <p role="alert" className="mt-3 text-sm text-amber-800">{sidePanelError}</p> : null}
</AnchoredNote> : null}
<div ref={readingRef} className="example-reading-column" data-large-text={largeText}>
<ReadingNavigation index={spreadIndex} total={totalSpreads} onChange={goToSpread} />
			<main
				ref={mainRef}
				onMouseUp={captureSelection}
				onKeyUp={captureSelection}
				className="relative min-w-0">
				{flashNotice ? (
					<div className="pointer-events-none absolute right-4 top-3 z-30 rounded border border-emerald-300/40 bg-studio-canvas px-3 py-1.5 text-xs text-emerald-800 shadow-none">
						{flashNotice}
					</div>
				) : null}

				{selectedAnchor ? (
						<form
							ref={composerFormRef}
							onSubmit={saveNewAnnotation}
							data-selection-ignore="true"
							style={{
							top: `${selectedAnchor.composerTop}px`,
							left: `${selectedAnchor.composerLeft}px`,
						}}
						className="absolute z-40 w-[min(320px,calc(100%-2rem))] rounded-md border border-studio-line bg-studio-canvas p-3 shadow-none backdrop-blur">
						<p className="text-xs uppercase tracking-[0.12em] text-studio-muted">
							Craft note
						</p>
						<p className="mt-2 rounded-lg border border-studio-line bg-studio-tint px-3 py-2 text-sm leading-relaxed text-studio-muted">
							{selectedAnchor.quote}
						</p>
						<textarea aria-label="New note"
							ref={composerTextareaRef}
							rows={composerText.includes('\n') ? 4 : 3}
							value={composerText}
							onChange={(event) => setComposerText(event.target.value)}
							onKeyDown={handleComposerKeyDown}
							className="mt-3 w-full rounded border border-studio-line bg-studio-paper px-3 py-2 text-sm text-studio-ink outline-none ring-accent-400 transition focus:ring"
							placeholder="Explain the craft choice. Enter saves."
						/>
						<label className="mt-3 block">
							<span className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-studio-muted">
								Category
							</span>
							<select
								value={composerCategory}
								onChange={(event) => setComposerCategory(event.target.value)}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink">
								{exampleCraftCategories.map((category) => (
									<option key={category} value={category}>
										{category}
									</option>
								))}
							</select>
						</label>
						<label className="mt-3 block">
							<span className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-studio-muted">
								Tags
							</span>
							<input
								value={composerTags}
								onChange={(event) => setComposerTags(event.target.value)}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink"
								placeholder="motif, restraint"
							/>
						</label>
						{composerError ? (
							<p className="mt-2 text-xs text-amber-800">{composerError}</p>
						) : null}
						<div className="mt-3 flex items-center justify-between gap-3">
							<p className="text-xs text-studio-muted">
								{isComposerSaving ? 'Saving...' : 'Shift+Enter adds a line.'}
							</p>
<button type="submit" className="studio-primary" disabled={isComposerSaving}>Save note</button>
								<button
									type="button"
									onClick={closeInlineComposer}
									className="text-xs text-studio-muted transition hover:text-studio-ink">
								Close
							</button>
						</div>
					</form>
				) : null}

				<div className="example-page-spread example-book-spread">
					{renderBookPage(currentPages[0], 0)}
</div>
</main>
<ReadingNavigation index={spreadIndex} total={totalSpreads} onChange={goToSpread} />
</div>

</div>
 )
}
