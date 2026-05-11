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

function markClass(active: boolean) {
	return active
		? 'mark-craft rounded px-1 ring-2 ring-burgundy-300/45'
		: 'mark-craft rounded px-1'
}

function markerClass(active: boolean) {
	return active
		? 'border-burgundy-200 bg-burgundy-300 text-parchment-100'
		: 'border-burgundy-300/55 bg-burgundy-500/18 text-burgundy-100'
}

function compact(value: string, limit = 130) {
	const normalized = value.replace(/\s+/g, ' ').trim()
	if (normalized.length <= limit) {
		return normalized
	}
	return `${normalized.slice(0, limit - 1).trimEnd()}...`
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
	const [turningPage, setTurningPage] = useState<TurningPage | null>(null)
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
					return a.anchor.blockId.localeCompare(b.anchor.blockId)
				}
				if (a.anchor.startOffset !== b.anchor.startOffset) {
					return a.anchor.startOffset - b.anchor.startOffset
				}
				return a.createdAt.localeCompare(b.createdAt)
			}),
		[items],
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
			setSelectedAnchor(null)
			setSpreadIndex(clamped)
		},
		[pagedManuscript.pages, spreadIndex, totalSpreads],
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

		const targetPage =
			pagedManuscript.paragraphIdToPageIndex[activeAnnotation.anchor.blockId]
		if (Number.isFinite(targetPage)) {
			setSpreadIndex(Math.floor(targetPage / 2))
		}
	}, [activeAnnotation, pagedManuscript.paragraphIdToPageIndex])

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
		if (shouldIgnoreSelectionTarget(event?.target ?? null)) {
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
				const isActive = activeAnnotationId === item.id
				nodes.push(
					<span key={item.id} className="inline">
						<mark className={markClass(isActive)}>{markedText}</mark>
							<button
								type="button"
								onClick={() => {
									closeInlineComposer()
									setActiveAnnotationId((current) =>
										current === item.id ? null : item.id,
									)
							}}
							className={`ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 align-super text-[10px] font-medium transition ${markerClass(
								isActive,
							)}`}
							aria-label="Open example annotation">
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
		closeInlineComposer()
		setComposerText('')

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
			setActiveAnnotationId(payload.annotation.id)
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
							const activeBlockItem =
								blockItems.find((item) => item.id === activeAnnotationId) ??
								null
							const shouldShowActiveBlockItem =
								activeBlockItem?.anchor.blockId === paragraph.id
							const isSceneBreak = paragraph.text.trim() === '**'

							return (
								<div key={paragraph.id} className="space-y-3">
									<p
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
									{shouldShowActiveBlockItem ? (
										<div className="rounded-2xl border border-burgundy-300/35 bg-ink-950 px-4 py-3 text-sm text-parchment-100 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
											<div className="flex flex-wrap items-center justify-between gap-2">
												<p className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]">
													{activeBlockItem.categoryLabel}
												</p>
												<button
													type="button"
													onClick={() => setActiveAnnotationId(null)}
													className="text-xs text-current/85 transition hover:text-current">
													Close
												</button>
											</div>
											<p className="mt-2 font-serif italic text-parchment-100/85">
												{formatQuote(activeBlockItem.anchor.quote)}
											</p>
											<p className="mt-3 leading-relaxed">
												{activeBlockItem.comment}
											</p>
										</div>
									) : null}
								</div>
							)
						})
					: null}
			</div>
		</article>
	)

	return (
		<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
			<main
				ref={mainRef}
				onMouseUp={captureSelection}
				onKeyUp={captureSelection}
				className="relative min-w-0">
				{flashNotice ? (
					<div className="pointer-events-none absolute right-4 top-3 z-30 rounded-full border border-emerald-300/40 bg-ink-950/95 px-3 py-1.5 text-xs text-emerald-100 shadow-lg">
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
						className="absolute z-40 w-[min(320px,calc(100%-2rem))] rounded-2xl border border-white/12 bg-ink-950/95 p-3 shadow-[0_18px_40px_rgba(0,0,0,0.3)] backdrop-blur">
						<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
							Craft note
						</p>
						<p className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-silver-100">
							{selectedAnchor.quote}
						</p>
						<textarea
							ref={composerTextareaRef}
							rows={composerText.includes('\n') ? 4 : 3}
							value={composerText}
							onChange={(event) => setComposerText(event.target.value)}
							onKeyDown={handleComposerKeyDown}
							className="mt-3 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition focus:ring"
							placeholder="Explain the craft choice. Enter saves."
						/>
						<label className="mt-3 block">
							<span className="mb-1.5 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
								Category
							</span>
							<select
								value={composerCategory}
								onChange={(event) => setComposerCategory(event.target.value)}
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
								{exampleCraftCategories.map((category) => (
									<option key={category} value={category}>
										{category}
									</option>
								))}
							</select>
						</label>
						<label className="mt-3 block">
							<span className="mb-1.5 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
								Tags
							</span>
							<input
								value={composerTags}
								onChange={(event) => setComposerTags(event.target.value)}
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
								placeholder="motif, restraint"
							/>
						</label>
						{composerError ? (
							<p className="mt-2 text-xs text-amber-100">{composerError}</p>
						) : null}
						<div className="mt-3 flex items-center justify-between gap-3">
							<p className="text-[11px] text-silver-300">
								{isComposerSaving ? 'Saving...' : 'Shift+Enter adds a line.'}
							</p>
								<button
									type="button"
									onClick={closeInlineComposer}
									className="text-[11px] text-silver-200 transition hover:text-parchment-100">
								Close
							</button>
						</div>
					</form>
				) : null}

				<div className="example-page-spread example-book-spread">
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
					className="absolute left-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink-900/10 bg-parchment-50/80 font-serif text-3xl leading-none text-ink-900 shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition hover:bg-parchment-100 disabled:cursor-not-allowed disabled:opacity-25"
					aria-label="Previous spread">
					‹
				</button>
				<button
					type="button"
					onClick={() => goToSpread(spreadIndex + 1)}
					disabled={spreadIndex >= totalSpreads - 1}
					className="absolute right-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ink-900/10 bg-parchment-50/80 font-serif text-3xl leading-none text-ink-900 shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition hover:bg-parchment-100 disabled:cursor-not-allowed disabled:opacity-25"
					aria-label="Next spread">
					›
				</button>
				<p className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full border border-ink-900/10 bg-parchment-50/80 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-ink-900/70 shadow-[0_8px_20px_rgba(0,0,0,0.14)]">
					Spread {spreadIndex + 1} of {totalSpreads}
				</p>
			</main>

			<aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
				<div className="surface p-4">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
								Publication
							</p>
							<p className="mt-1 text-sm text-silver-200">
								{liveStatus === 'published'
									? 'Visible to writers in enabled groups.'
									: 'Private draft. Writers cannot see it yet.'}
							</p>
						</div>
						<span
							className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] ${
								liveStatus === 'published'
									? 'border-emerald-300/40 bg-emerald-300/12 text-emerald-100'
									: 'border-white/15 bg-white/6 text-silver-200'
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
						className="mt-4 w-full rounded-full border border-emerald-300/55 bg-emerald-300/14 px-4 py-2 text-xs uppercase tracking-[0.1em] text-emerald-100 transition hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-60">
						{isPublishing
							? 'Saving...'
							: liveStatus === 'published'
								? 'Unpublish example'
								: 'Publish example'}
					</button>
				</div>

				{errorNotice ? (
					<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						{errorNotice}
					</p>
				) : null}
				{sidePanelError ? (
					<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						{sidePanelError}
					</p>
				) : null}
				{sidePanelNotice ? (
					<p className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
						{sidePanelNotice}
					</p>
				) : null}

				<div className="surface p-4">
					<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
						Annotations
					</p>
					<p className="mt-1 text-sm text-silver-200">
						{sortedItems.length} craft notes
					</p>
					{sortedItems.length === 0 ? (
						<p className="mt-3 text-sm text-silver-300">
							Highlight text in the story to add the first note.
						</p>
					) : (
						<ul className="mt-3 max-h-[42vh] space-y-2 overflow-y-auto pr-1">
							{sortedItems.map((item) => (
								<li key={item.id}>
										<button
											type="button"
											onClick={() => {
												closeInlineComposer()
												setActiveAnnotationId(item.id)
											}}
										className={`block w-full rounded-xl border px-3 py-3 text-left transition ${
											activeAnnotationId === item.id
												? 'border-burgundy-300/45 bg-burgundy-500/18 text-parchment-100'
												: 'border-white/10 bg-ink-900/35 text-silver-100 hover:border-white/20'
										}`}>
										<div className="flex flex-wrap items-center gap-2">
											<p className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]">
												{item.categoryLabel}
											</p>
										</div>
										<p className="mt-2 text-sm italic text-parchment-100/85">
											{formatQuote(compact(item.anchor.quote, 90))}
										</p>
										<p className="mt-2 text-sm leading-relaxed">
											{compact(item.comment)}
										</p>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="surface p-4">
					<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
						Selected note
					</p>
					{activeAnnotation ? (
						<form onSubmit={saveActiveAnnotation} className="mt-3 space-y-3">
							<p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm italic leading-relaxed text-silver-100">
								{formatQuote(activeAnnotation.anchor.quote)}
							</p>
							<textarea
								rows={editComment.includes('\n') ? 5 : 4}
								value={editComment}
								onChange={(event) => setEditComment(event.target.value)}
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
							/>
							<label className="block">
								<span className="mb-1.5 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
									Category
								</span>
								<select
									value={editCategory}
									onChange={(event) => setEditCategory(event.target.value)}
									className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
									{exampleCraftCategories.map((category) => (
										<option key={category} value={category}>
											{category}
										</option>
									))}
								</select>
							</label>
							<label className="block">
								<span className="mb-1.5 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
									Tags
								</span>
								<input
									value={editTags}
									onChange={(event) => setEditTags(event.target.value)}
									className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
								/>
							</label>
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="submit"
									disabled={isPanelSaving}
									className="rounded-full border border-accent-400/70 bg-accent-400/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
									{isPanelSaving ? 'Saving...' : 'Save'}
								</button>
								<button
									type="button"
									disabled={isPanelSaving}
									onClick={deleteActiveAnnotation}
									className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-amber-200/40 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-60">
									Delete
								</button>
							</div>
						</form>
					) : (
						<p className="mt-3 text-sm leading-relaxed text-silver-200">
							Open a marker or highlight text in the story to work with a craft
							note.
						</p>
					)}
				</div>
			</aside>
		</div>
	)
}
