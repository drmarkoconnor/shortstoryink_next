'use client'

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
	type FormEvent,
	type ReactNode,
} from 'react'
import { PendingSubmitButton } from '@/components/prototype/pending-submit-button'
import { StoryFolio } from '@/components/prototype/story-folio'
import { usePagedArrowNavigation } from '@/components/prototype/use-paged-arrow-navigation'
import { ProtoCard } from '@/components/prototype/card'
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
}

type FeedbackItem = {
	id: string
	comment: string
	createdAt: string
	anchor: FeedbackAnchor | null
}

type SnippetItem = {
	id: string
	note: string
	createdAt: string
	snippetCategoryId: string | null
	anchor: FeedbackAnchor | null
}

type SelectedAnchor = {
	blockId: string
	startOffset: number
	endOffset: number
	quote: string
	prefix: string
	suffix: string
	composerTop: number
	composerLeft: number
}

type AnnotationItem = {
	id: string
	type: 'comment' | 'snippet'
	text: string
	createdAt: string
	anchor: FeedbackAnchor
	label: string
	categoryId?: string | null
}

function feedbackLabel(anchor: FeedbackAnchor | null | undefined) {
	return anchor?.categoryLabel?.trim() || 'Uncategorised'
}

function formatQuote(quote: string | undefined) {
	return quote && quote.trim() ? `"${quote}"` : 'General note'
}

function annotationBorderClass(type: AnnotationItem['type']) {
	return type === 'snippet'
		? 'border-accent-300/25 bg-accent-300/10 text-accent-100'
		: 'border-burgundy-300/25 bg-burgundy-500/10 text-burgundy-100'
}

function annotationMarkerClass(type: AnnotationItem['type'], active: boolean) {
	if (type === 'snippet') {
		return active
			? 'border-accent-300 bg-accent-300 text-ink-950'
			: 'border-accent-300/55 bg-accent-300/20 text-accent-100'
	}
	return active
		? 'border-burgundy-200 bg-burgundy-300 text-parchment-100'
		: 'border-burgundy-300/55 bg-burgundy-500/20 text-burgundy-100'
}

function getMarkClass(
	type: AnnotationItem['type'],
	kind: FeedbackKind | undefined,
	active: boolean,
) {
	if (type === 'snippet') {
		return active
			? 'bg-accent-200/55 ring-2 ring-accent-300/50'
			: 'bg-accent-200/30'
	}
	if (kind === 'typo') {
		return active
			? 'mark-grammar ring-2 ring-burgundy-300/45'
			: 'mark-grammar'
	}
	if (kind === 'structure') {
		return active
			? 'mark-structure ring-2 ring-burgundy-300/45'
			: 'mark-structure'
	}
	return active ? 'mark-craft ring-2 ring-burgundy-300/45' : 'mark-craft'
}

function parseInitialActiveId(value: string | null | undefined) {
	if (!value) {
		return null
	}

	const parts = value.split(':')
	if (parts.length !== 2) {
		return null
	}

	return value
}

export function TeacherReviewWorkspace({
	submissionId,
	title,
	paragraphs,
	feedback,
	snippets,
	notice,
	errorNotice,
	initialActiveAnnotationId,
	sidebarHeader,
	publishPanel,
	submissionStatus,
	canDeleteFeedback,
	snippetCategories,
	feedbackCategories,
	updateFeedbackAction,
	updateSnippetAction,
	deleteFeedbackAction,
}: {
	submissionId: string
	title: string
	paragraphs: Array<{ id: string; text: string }>
	feedback: FeedbackItem[]
	snippets: SnippetItem[]
	notice: string | null
	errorNotice: string | null
	initialActiveAnnotationId?: string | null
	sidebarHeader?: ReactNode
	publishPanel?: ReactNode
	submissionStatus: string
	canDeleteFeedback: boolean
	snippetCategories: Array<{ id: string; name: string }>
	feedbackCategories: Array<{ id: string; name: string }>
	updateFeedbackAction: (formData: FormData) => void
	updateSnippetAction: (formData: FormData) => void
	deleteFeedbackAction: (formData: FormData) => void
}) {
	const initialActiveId = useMemo(
		() => parseInitialActiveId(initialActiveAnnotationId),
		[initialActiveAnnotationId],
	)
	const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
		initialActiveId,
	)
	const [selectedAnchor, setSelectedAnchor] = useState<SelectedAnchor | null>(null)
	const [composerText, setComposerText] = useState('')
	const [flashNotice, setFlashNotice] = useState(notice)
	const [panelError, setPanelError] = useState<string | null>(null)
	const [isComposerSaving, setIsComposerSaving] = useState(false)
	const [isPanelOpen, setIsPanelOpen] = useState(false)
	const [isPublishStageOpen, setIsPublishStageOpen] = useState(false)
	const [feedbackItems, setFeedbackItems] = useState(feedback)
	const [snippetItems, setSnippetItems] = useState(snippets)
	const mainRef = useRef<HTMLDivElement | null>(null)
	const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null)
	const composerFormRef = useRef<HTMLFormElement | null>(null)

	useEffect(() => {
		setFeedbackItems(feedback)
	}, [feedback])

	useEffect(() => {
		setSnippetItems(snippets)
	}, [snippets])

	useEffect(() => {
		setFlashNotice(notice)
		if (!notice) {
			return
		}

		const timeout = window.setTimeout(() => {
			setFlashNotice(null)
		}, 1800)

		return () => window.clearTimeout(timeout)
	}, [notice])

	useEffect(() => {
		if (selectedAnchor) {
			composerTextareaRef.current?.focus()
		}
	}, [selectedAnchor])

	const pagedManuscript = useMemo(
		() => paginateManuscript(paragraphs, readingPageOptions),
		[paragraphs],
	)
	const [pageIndex, setPageIndex] = useState(0)

	const annotations = useMemo<AnnotationItem[]>(() => {
		const commentItems = feedbackItems
			.filter((item): item is FeedbackItem & { anchor: FeedbackAnchor } => Boolean(item.anchor))
			.map((item) => ({
				id: `feedback:${item.id}`,
				type: 'comment' as const,
				text: item.comment,
				createdAt: item.createdAt,
				anchor: item.anchor,
				label: feedbackLabel(item.anchor),
				categoryId: null,
			}))
		const snippetCategoryNameById = Object.fromEntries(
			snippetCategories.map((category) => [category.id, category.name]),
		)
		const localSnippetItems = snippetItems
			.filter((item): item is SnippetItem & { anchor: FeedbackAnchor } => Boolean(item.anchor))
			.map((item) => ({
				id: `snippet:${item.id}`,
				type: 'snippet' as const,
				text: item.note,
				createdAt: item.createdAt,
				anchor: item.anchor,
				label:
					item.snippetCategoryId
						? snippetCategoryNameById[item.snippetCategoryId] ?? 'Uncategorised'
						: 'Uncategorised',
				categoryId: item.snippetCategoryId,
			}))

		return [...commentItems, ...localSnippetItems].sort((a, b) => {
			if (a.anchor.blockId !== b.anchor.blockId) {
				return a.anchor.blockId.localeCompare(b.anchor.blockId)
			}
			if (a.anchor.startOffset !== b.anchor.startOffset) {
				return a.anchor.startOffset - b.anchor.startOffset
			}
			return a.createdAt.localeCompare(b.createdAt)
		})
	}, [feedbackItems, snippetItems, snippetCategories])

	const annotationsByBlock = useMemo(() => {
		const map: Record<string, AnnotationItem[]> = {}
		for (const item of annotations) {
			if (!map[item.anchor.blockId]) {
				map[item.anchor.blockId] = []
			}
			map[item.anchor.blockId].push(item)
		}
		return map
	}, [annotations])

	const activeAnnotation = useMemo(() => {
		if (!activeAnnotationId) {
			return null
		}
		return annotations.find((item) => item.id === activeAnnotationId) ?? null
	}, [activeAnnotationId, annotations])

	const totalPages = pagedManuscript.pages.length
	const currentPage =
		pagedManuscript.pages[Math.min(pageIndex, totalPages - 1)] ??
		pagedManuscript.pages[0]

	const goToPage = useCallback((nextPage: number) => {
		if (totalPages === 0) {
			return
		}

		const clamped = Math.max(0, Math.min(nextPage, totalPages - 1))
		setSelectedAnchor(null)
		setPageIndex(clamped)
	}, [totalPages])

	usePagedArrowNavigation({
		pageIndex,
		totalPages,
		onPageChange: goToPage,
	})

	useEffect(() => {
		if (!activeAnnotation) {
			return
		}
		const targetPage =
			pagedManuscript.paragraphIdToPageIndex[activeAnnotation.anchor.blockId]
		if (Number.isFinite(targetPage)) {
			setPageIndex(targetPage)
		}
	}, [activeAnnotation, pagedManuscript.paragraphIdToPageIndex])

	const captureSelection = () => {
		const selection = window.getSelection()
		if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
			return
		}

		const range = selection.getRangeAt(0)
		const startEl =
			range.startContainer instanceof Element
				? range.startContainer
				: range.startContainer.parentElement
		const endEl =
			range.endContainer instanceof Element
				? range.endContainer
				: range.endContainer.parentElement
		const startParagraph = startEl?.closest(
			'p[id^="p-"]',
		) as HTMLParagraphElement | null
		const endParagraph = endEl?.closest(
			'p[id^="p-"]',
		) as HTMLParagraphElement | null
		const containerRect = mainRef.current?.getBoundingClientRect()

		if (
			!startParagraph ||
			!endParagraph ||
			startParagraph.id !== endParagraph.id ||
			!containerRect
		) {
			return
		}

		const paragraphText = startParagraph.textContent ?? ''
		if (!paragraphText) {
			return
		}

		const startRange = range.cloneRange()
		startRange.selectNodeContents(startParagraph)
		startRange.setEnd(range.startContainer, range.startOffset)
		const startOffset = startRange.toString().length

		const endRange = range.cloneRange()
		endRange.selectNodeContents(startParagraph)
		endRange.setEnd(range.endContainer, range.endOffset)
		const endOffset = endRange.toString().length

		if (endOffset <= startOffset) {
			return
		}

		const quote = paragraphText.slice(startOffset, endOffset)
		if (!quote.trim()) {
			return
		}

		const selectionRect = range.getBoundingClientRect()
		const composerTop = selectionRect.bottom - containerRect.top + 10
		const composerLeft = Math.min(
			Math.max(16, selectionRect.left - containerRect.left),
			Math.max(16, containerRect.width - 320),
		)

		setComposerText('')
		setSelectedAnchor({
			blockId: startParagraph.id,
			startOffset,
			endOffset,
			quote,
			prefix: paragraphText.slice(Math.max(0, startOffset - 24), startOffset),
			suffix: paragraphText.slice(
				endOffset,
				Math.min(paragraphText.length, endOffset + 24),
			),
			composerTop,
			composerLeft,
		})
	}

	const toggleAnnotation = (annotationId: string) => {
		setSelectedAnchor(null)
		setActiveAnnotationId((current) =>
			current === annotationId ? null : annotationId,
		)
	}

	const focusAnnotation = (annotationId: string) => {
		setSelectedAnchor(null)
		setActiveAnnotationId(annotationId)
	}

	const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault()
			composerFormRef.current?.requestSubmit()
		}
	}

	const activeFeedbackCategoryId =
		activeAnnotation?.type === 'comment'
			? feedbackCategories.find((category) => category.name === activeAnnotation.label)
					?.id ?? ''
			: ''

	const submitInlineAnnotation = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (!selectedAnchor || isComposerSaving) {
			return
		}

		const trimmedText = composerText.trim()
		const annotationType = trimmedText ? 'comment' : 'snippet'
		const tempId = `temp-${annotationType}-${Date.now()}`
		const optimisticCreatedAt = new Date().toISOString()
		const optimisticAnchor: FeedbackAnchor = {
			blockId: selectedAnchor.blockId,
			startOffset: selectedAnchor.startOffset,
			endOffset: selectedAnchor.endOffset,
			quote: selectedAnchor.quote,
			prefix: selectedAnchor.prefix,
			suffix: selectedAnchor.suffix,
			...(annotationType === 'comment'
				? { categoryLabel: 'Uncategorised', categorySlug: 'uncategorised' }
				: {}),
		}

		setPanelError(null)
		setIsComposerSaving(true)

		if (annotationType === 'comment') {
			setFeedbackItems((current) => [
				...current,
				{
					id: tempId,
					comment: trimmedText,
					createdAt: optimisticCreatedAt,
					anchor: optimisticAnchor,
				},
			])
		} else {
			setSnippetItems((current) => [
				...current,
				{
					id: tempId,
					note: '',
					createdAt: optimisticCreatedAt,
					snippetCategoryId: null,
					anchor: optimisticAnchor,
				},
			])
		}

		try {
			const response = await fetch(
				`/api/workshop/${submissionId}/annotations`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						type: annotationType,
						blockId: selectedAnchor.blockId,
						startOffset: selectedAnchor.startOffset,
						endOffset: selectedAnchor.endOffset,
						quote: selectedAnchor.quote,
						prefix: selectedAnchor.prefix,
						suffix: selectedAnchor.suffix,
						comment: trimmedText,
					}),
				},
			)

			const payload = (await response.json()) as
				| {
						error?: string
						notice?: string
						feedback?: FeedbackItem
						snippet?: SnippetItem
				  }
				| undefined

			if (!response.ok || payload?.error) {
				throw new Error(payload?.error ?? 'Unable to save annotation.')
			}

			if (annotationType === 'comment' && payload?.feedback) {
				setFeedbackItems((current) =>
					current.map((item) =>
						item.id === tempId ? payload.feedback! : item,
					),
				)
				setActiveAnnotationId(
					trimmedText.length > 120 ? `feedback:${payload.feedback.id}` : null,
				)
			}

			if (annotationType === 'snippet' && payload?.snippet) {
				setSnippetItems((current) =>
					current.map((item) =>
						item.id === tempId ? payload.snippet! : item,
					),
				)
				setActiveAnnotationId(null)
			}

			setFlashNotice(payload?.notice ?? 'Saved.')
			setComposerText('')
			setSelectedAnchor(null)
		} catch (error) {
			if (annotationType === 'comment') {
				setFeedbackItems((current) =>
					current.filter((item) => item.id !== tempId),
				)
			} else {
				setSnippetItems((current) =>
					current.filter((item) => item.id !== tempId),
				)
			}

			setPanelError(
				error instanceof Error ? error.message : 'Unable to save annotation.',
			)
		} finally {
			setIsComposerSaving(false)
		}
	}

	const renderParagraphWithAnnotations = (
		text: string,
		items: AnnotationItem[],
	): ReactNode[] => {
		if (items.length === 0) {
			return [text]
		}

		const nodes: ReactNode[] = []
		let cursor = 0

		for (const item of items) {
			const start = Math.max(cursor, Math.min(item.anchor.startOffset, text.length))
			const end = Math.max(start, Math.min(item.anchor.endOffset, text.length))

			if (start > cursor) {
				nodes.push(text.slice(cursor, start))
			}

			const markedText = text.slice(start, end)
			if (markedText) {
				const isActive = activeAnnotationId === item.id
				nodes.push(
					<span key={item.id} className="inline">
						<mark className={`${getMarkClass(item.type, item.anchor.kind, isActive)} rounded px-1 transition`}>
							{markedText}
						</mark>
						<button
							type="button"
							onClick={() => toggleAnnotation(item.id)}
							className={`ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 align-super text-[10px] font-medium transition ${annotationMarkerClass(item.type, isActive)}`}
							aria-label={`${item.type === 'snippet' ? 'Snippet' : 'Comment'} marker`}>
							{item.type === 'snippet' ? '◇' : '•'}
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
			<main ref={mainRef} onMouseUp={captureSelection} onKeyUp={captureSelection} className="relative min-w-0">
				{flashNotice ? (
					<div className="pointer-events-none absolute right-4 top-3 z-20 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-100 shadow-lg">
						{flashNotice}
					</div>
				) : null}
				{selectedAnchor ? (
					<form
						ref={composerFormRef}
						onSubmit={submitInlineAnnotation}
						style={{
							top: `${selectedAnchor.composerTop}px`,
							left: `${selectedAnchor.composerLeft}px`,
						}}
						className="absolute z-20 w-[min(300px,calc(100%-2rem))] rounded-2xl border border-white/12 bg-ink-950/95 p-3 shadow-[0_18px_40px_rgba(0,0,0,0.3)] backdrop-blur">
						<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
							Marginal note
						</p>
						<p className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-silver-100">
							{selectedAnchor.quote}
						</p>
						<textarea
							ref={composerTextareaRef}
							name="comment"
							rows={composerText.includes('\n') ? 3 : 2}
							value={composerText}
							onChange={(event) => setComposerText(event.target.value)}
							onKeyDown={handleComposerKeyDown}
							className="mt-3 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition focus:ring"
							placeholder="Type a note. Enter saves. Empty Enter saves as snippet."
						/>
						{panelError ? (
							<p className="mt-2 text-xs text-amber-100">{panelError}</p>
						) : null}
						<div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-silver-300">
							<p>{isComposerSaving ? 'Saving...' : 'Enter saves. Shift+Enter adds a new line.'}</p>
							<button
								type="button"
								disabled={isComposerSaving}
								onClick={() => setSelectedAnchor(null)}
								className="text-silver-200 transition hover:text-parchment-100">
								Close
							</button>
						</div>
					</form>
				) : null}

				<StoryFolio
					title={title}
					paged
					hideHeader
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
						const blockItems = annotationsByBlock[paragraph.id] ?? []
						const activeBlockItem =
							blockItems.find((item) => item.id === activeAnnotationId) ?? null
						const isSceneBreak = paragraph.text.trim() === '**'

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
										: renderParagraphWithAnnotations(paragraph.text, blockItems)}
								</p>
								{activeBlockItem ? (
									<div
										className={`max-w-[44rem] rounded-2xl border px-4 py-3 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.08)] ${annotationBorderClass(activeBlockItem.type)}`}>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div className="flex flex-wrap items-center gap-2">
												<p className="text-[11px] uppercase tracking-[0.12em]">
													{activeBlockItem.type === 'snippet'
														? 'Saved snippet'
														: submissionStatus === 'feedback_published'
															? 'Published comment'
															: 'Draft comment'}
												</p>
												<p className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]">
													{activeBlockItem.label}
												</p>
											</div>
											<button
												type="button"
												onClick={() => setActiveAnnotationId(null)}
												className="text-xs text-current/85 transition hover:text-current">
												Close
											</button>
										</div>
										<p className="mt-2 font-serif italic text-parchment-100/90">
											{formatQuote(activeBlockItem.anchor.quote)}
										</p>
										<p className="mt-3 leading-relaxed text-parchment-100">
											{activeBlockItem.text.trim()
												? activeBlockItem.text
												: activeBlockItem.type === 'snippet'
													? 'Snippet saved without a note.'
													: 'Draft comment'}
										</p>
									</div>
								) : null}
							</div>
						)
					})}
				</StoryFolio>
			</main>

			<aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
				<div className="rounded-2xl border border-white/10 bg-ink-900/30 px-3 py-2.5">
					<div className="flex items-center justify-between gap-2">
						<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
							Reading pages
						</p>
						<p className="text-xs text-silver-200">
							Page {Math.min(pageIndex + 1, totalPages)} of {totalPages}
						</p>
					</div>
					<div className="mt-2 flex gap-2">
						<button
							type="button"
							onClick={() => goToPage(pageIndex - 1)}
							disabled={pageIndex === 0}
							className="flex-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100 disabled:cursor-not-allowed disabled:opacity-45">
							Previous
						</button>
						<button
							type="button"
							onClick={() => goToPage(pageIndex + 1)}
							disabled={pageIndex >= totalPages - 1}
							className="flex-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100 disabled:cursor-not-allowed disabled:opacity-45">
							Next
						</button>
					</div>
				</div>
				{sidebarHeader}
				{errorNotice ? (
					<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						{errorNotice}
					</p>
				) : null}

				<ProtoCard title="Marginalia" meta="Comments and snippets">
					<p
						className={`mb-3 rounded-xl border px-3 py-2 text-sm leading-relaxed ${
							submissionStatus === 'feedback_published'
								? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'
								: 'border-burgundy-300/25 bg-burgundy-500/10 text-burgundy-100'
						}`}>
						{submissionStatus === 'feedback_published'
							? 'The writer can see the published comments. New edits stay private until you publish again.'
							: 'Draft comments and snippets stay private while you read.'}
					</p>
					<div className="mb-3 flex items-center justify-between gap-3">
						<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
							{feedback.length} comments {' · '} {snippets.length} snippets
						</p>
						<button
							type="button"
							onClick={() => setIsPanelOpen((value) => !value)}
							className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
							{isPanelOpen ? 'Collapse' : 'Show'}
						</button>
					</div>
					{!isPanelOpen ? (
						<p className="text-sm text-silver-200">
							Annotation list hidden. Markers remain in the manuscript.
						</p>
					) : annotations.length === 0 ? (
						<p className="text-sm text-silver-200">No annotations yet.</p>
					) : (
						<div className="max-h-[38vh] overflow-y-auto pr-1">
							<ul className="space-y-2">
							{annotations.map((item) => (
								<li key={item.id}>
									<button
										type="button"
										onClick={() => focusAnnotation(item.id)}
										className={`w-full rounded-xl border px-3 py-3 text-left transition ${
											activeAnnotationId === item.id
												? annotationBorderClass(item.type)
												: 'border-white/10 bg-ink-900/35 text-silver-100 hover:border-white/20'
										}`}>
										<div className="flex flex-wrap items-center gap-2">
											<p className="text-[11px] uppercase tracking-[0.1em]">
												{item.type === 'snippet' ? 'Snippet' : 'Comment'}
											</p>
											<p className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]">
												{item.label}
											</p>
										</div>
										<p className="mt-2 text-sm italic text-parchment-100/90">
											{formatQuote(item.anchor.quote)}
										</p>
										<p className="mt-2 text-sm leading-relaxed">
											{item.text.trim()
												? item.text
												: item.type === 'snippet'
													? 'Snippet saved without a note.'
													: 'Draft comment'}
										</p>
									</button>
								</li>
							))}
							</ul>
						</div>
					)}
				</ProtoCard>

				{activeAnnotation ? (
					<ProtoCard
						title={
							activeAnnotation.type === 'snippet'
								? 'Edit snippet'
								: 'Refine comment'
						}
						meta="Secondary editing surface">
						{activeAnnotation.type === 'comment' ? (
							<>
								<form action={updateFeedbackAction} className="space-y-3">
									<input
										type="hidden"
										name="feedbackItemId"
										value={activeAnnotation.id.replace('feedback:', '')}
									/>
									<p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-silver-100">
										{formatQuote(activeAnnotation.anchor.quote)}
									</p>
									<textarea
										name="comment"
										required
										rows={5}
										defaultValue={activeAnnotation.text}
										className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
									/>
									<div>
										<label className="mb-2 block text-xs uppercase tracking-[0.1em] text-silver-300">
											Category
										</label>
										<select
											name="feedbackCategoryId"
											defaultValue={activeFeedbackCategoryId}
											className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
											<option value="">Uncategorised</option>
											{feedbackCategories.map((category) => (
												<option key={category.id} value={category.id}>
													{category.name}
												</option>
											))}
										</select>
									</div>
									<div className="flex items-center justify-between gap-3">
										<PendingSubmitButton
											className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs text-parchment-100 transition hover:bg-accent-400/30"
											pendingChildren="Saving...">
											Save changes
										</PendingSubmitButton>
									</div>
								</form>
								{canDeleteFeedback ? (
									<form action={deleteFeedbackAction} className="mt-3">
										<input
											type="hidden"
											name="feedbackItemId"
											value={activeAnnotation.id.replace('feedback:', '')}
										/>
										<PendingSubmitButton
											className="rounded-full border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-silver-300 transition hover:border-amber-200/40 hover:text-amber-100"
											pendingChildren="Deleting...">
											Delete
										</PendingSubmitButton>
									</form>
								) : null}
							</>
						) : (
							<form action={updateSnippetAction} className="space-y-3">
								<input
									type="hidden"
									name="snippetId"
									value={activeAnnotation.id.replace('snippet:', '')}
								/>
								<p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-silver-100">
									{formatQuote(activeAnnotation.anchor.quote)}
								</p>
								<textarea
									name="note"
									rows={4}
									defaultValue={activeAnnotation.text}
									className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
									placeholder="Optional private note for this snippet"
								/>
								<div>
									<label className="mb-2 block text-xs uppercase tracking-[0.1em] text-silver-300">
										Category
									</label>
									<select
										name="snippetCategoryId"
										defaultValue={activeAnnotation.categoryId ?? ''}
										className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
										<option value="">Uncategorised</option>
										{snippetCategories.map((category) => (
											<option key={category.id} value={category.id}>
												{category.name}
											</option>
										))}
									</select>
								</div>
								<PendingSubmitButton
									className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs text-parchment-100 transition hover:bg-accent-400/30"
									pendingChildren="Saving...">
									Save changes
								</PendingSubmitButton>
							</form>
						)}
					</ProtoCard>
				) : (
					<ProtoCard title="Selected annotation" meta="Secondary editing surface">
						<p className="text-sm leading-relaxed text-silver-200">
							Select a marker in the manuscript to refine the note, adjust a
							category, or review the saved wording.
						</p>
					</ProtoCard>
				)}

				<div className="surface p-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
								Publish
							</p>
							<p className="mt-1 text-sm text-silver-200">
								Move from close reading into writer-facing feedback when ready.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsPublishStageOpen((value) => !value)}
							className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-emerald-100 transition hover:bg-emerald-300/15">
							{isPublishStageOpen
								? 'Hide publish'
								: submissionStatus === 'feedback_published'
									? 'Update published feedback'
									: 'Publish to writer'}
						</button>
					</div>
					{isPublishStageOpen ? (
						<div className="mt-4">
							{/* TODO: allow importing an earlier version summary into a later publish draft. */}
							{publishPanel}
						</div>
					) : null}
				</div>
			</aside>
		</div>
	)
}
