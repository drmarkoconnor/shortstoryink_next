'use client'

import { Children } from 'react'
import Link from 'next/link'
import { WriterFeedbackReadingWorkspace } from '@/components/writer/feedback-reading-workspace'
import { repairSingleBlockAnchor } from '@/lib/manuscript/anchor-repair'
import { useRouter } from 'next/navigation'
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
	type FormEvent,
	type MouseEvent,
	type ReactNode,
} from 'react'
import { StoryFolio } from '@/components/prototype/story-folio'
import { usePagedArrowNavigation } from '@/components/prototype/use-paged-arrow-navigation'
import { ProtoCard } from '@/components/prototype/card'
import {
	feedbackSlug,
	fixedFeedbackCategories,
	fixedSnippetCategories,
	normalizeFeedbackLabel,
	normalizeSnippetLabel,
} from '@/lib/feedback/categories'
import {
	captureManuscriptSelection,
	clearBrowserSelection,
	shouldIgnoreSelectionTarget,
} from '@/lib/manuscript/dom-selection'
import { paginateManuscript, readingPageOptions } from '@/lib/manuscript/paging'

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
	tags?: string[]
	suggestedAction?: 'cut'
	sourceLabel?: string
	sourceKind?: string
	originalSource?: string
	createdByLabel?: string
}

type FeedbackItem = {
	id: string
	comment: string
	createdAt: string
	anchor: FeedbackAnchor | null
}

type SnippetItem = {
	id: string
	text?: string
	note: string
	createdAt: string
	snippetCategoryId: string | null
	anchor: FeedbackAnchor | null
}

type SnippetLibraryItem = {
	id: string
	text: string
	createdAt: string
	categoryLabel: string
	categorySlug: string
	tags: string[]
	anchor: FeedbackAnchor | null
}

type FeedbackMemoryItem = {
	id: string
	submissionId: string
	submissionTitle: string
	writerLabel: string
	version: number | null
	comment: string
	quote: string
	categoryLabel: string
	categorySlug: string
	tags: string[]
	createdAt: string
}

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

type AnnotationItem = {
	id: string
	type: 'comment' | 'snippet'
	text: string
	createdAt: string
	anchor: FeedbackAnchor
	label: string
	tags?: string[]
}

type AnnotationSegment = {
	startOffset: number
	endOffset: number
}

const CUT_SUGGESTION_COMMENT =
	'Consider the effect of cutting here on pace, clarity, and emphasis.'

function feedbackLabel(anchor: FeedbackAnchor | null | undefined) {
	if (anchor?.suggestedAction === 'cut' || anchor?.categoryLabel === 'Cut') {
		return 'Cut/tighten'
	}

	return anchor?.categoryLabel?.trim() || 'Uncategorised'
}

function parseTagsInput(value: string) {
	return [
		...new Set(
			value
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
	].slice(0, 12)
}

function compactPreview(value: string, limit = 120) {
	const normalized = value.replace(/\s+/g, ' ').trim()
	if (normalized.length <= limit) {
		return normalized
	}
	return `${normalized.slice(0, limit - 1).trimEnd()}...`
}

function annotationSegmentForParagraph(
	anchor: FeedbackAnchor,
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

function formatQuote(quote: string | undefined) {
	return quote && quote.trim() ? `"${quote}"` : 'General note'
}

function snippetText(snippet: SnippetLibraryItem) {
	return snippet.text.trim() || snippet.anchor?.quote.trim() || ''
}

function snippetItemToLibraryItem(snippet: SnippetItem): SnippetLibraryItem | null {
	if (!snippet.anchor) {
		return null
	}

	const categoryLabel = normalizeSnippetLabel(feedbackLabel(snippet.anchor))

	return {
		id: snippet.id,
		text: snippet.note.trim() || snippet.text?.trim() || snippet.anchor.quote,
		createdAt: snippet.createdAt,
		categoryLabel,
		categorySlug:
			categoryLabel === 'Uncategorised'
				? 'uncategorised'
				: feedbackSlug(categoryLabel),
		tags: snippet.anchor.tags ?? [],
		anchor: snippet.anchor,
	}
}

function joinCommentText(existing: string, insertion: string) {
	const current = existing.trim()
	const next = insertion.trim()

	if (!current) {
		return next
	}

	if (!next) {
		return current
	}

	return `${current}\n\n${next}`
}

function annotationBorderClass(type: AnnotationItem['type']) {
	return type === 'snippet'
		? 'border-accent-300/35 bg-studio-canvas text-studio-ink'
		: 'border-burgundy-300/35 bg-studio-canvas text-studio-ink'
}

function annotationMarkerClass(type: AnnotationItem['type'], active: boolean) {
	if (type === 'snippet') {
		return active
			? 'border-accent-300 bg-accent-300 text-ink-950'
			: 'border-accent-300/55 bg-accent-300/20 text-studio-accent'
	}
	return active
		? 'border-burgundy-200 bg-studio-soft text-studio-ink'
		: 'border-burgundy-300/55 bg-studio-soft text-studio-accent'
}

function getMarkClass(
	type: AnnotationItem['type'],
	kind: FeedbackKind | undefined,
	active: boolean,
	suggestedAction: FeedbackAnchor['suggestedAction'],
) {
	if (type === 'snippet') {
		return active
			? 'bg-accent-200/55 ring-2 ring-accent-300/50'
			: 'bg-accent-200/30'
	}
	// TODO: Keep cut-mark styling in parity with the writer folio and export output.
	if (suggestedAction === 'cut') {
		return active
			? 'bg-transparent text-studio-ink/55 line-through decoration-2 decoration-ink-900/35 ring-2 ring-silver-500/35'
			: 'bg-transparent text-studio-ink/58 line-through decoration-2 decoration-ink-900/30'
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
	version,
	createdAt,
	paragraphs,
	feedback,
	snippets,
	snippetLibrary,
	feedbackMemory,
	notice,
	errorNotice,
	initialActiveAnnotationId,
	sidebarHeader,
	submissionStatus,
	canDeleteFeedback,
	canPublishFeedback,
	canExportFeedback,
	initialSummary,
	initialSummaryPublishedAt,
}: {
	submissionId: string
	title: string
	version: number
	createdAt: string
	paragraphs: Array<{ id: string; text: string }>
	feedback: FeedbackItem[]
	snippets: SnippetItem[]
	snippetLibrary: SnippetLibraryItem[]
	feedbackMemory: FeedbackMemoryItem[]
	notice: string | null
	errorNotice: string | null
	initialActiveAnnotationId?: string | null
	sidebarHeader?: ReactNode
	submissionStatus: string
	canDeleteFeedback: boolean
	canPublishFeedback: boolean
	canExportFeedback: boolean
	initialSummary: string
	initialSummaryPublishedAt: string | null
}) {
	const router = useRouter()
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
	const [composerError, setComposerError] = useState<string | null>(null)
	const [sidePanelError, setSidePanelError] = useState<string | null>(null)
	const [sidePanelNotice, setSidePanelNotice] = useState<string | null>(null)
	const [isComposerSaving, setIsComposerSaving] = useState(false)
	const [isPanelOpen, setIsPanelOpen] = useState(false)
	const [feedbackItems, setFeedbackItems] = useState(feedback)
	const [snippetItems, setSnippetItems] = useState(snippets)
	const [snippetLibraryItems, setSnippetLibraryItems] = useState(snippetLibrary)
	const [feedbackMemoryItems, setFeedbackMemoryItems] = useState(feedbackMemory)
	const [liveSubmissionStatus, setLiveSubmissionStatus] = useState(submissionStatus)
	const [publishSummary, setPublishSummary] = useState(initialSummary)
	const [summaryPublishedAt, setSummaryPublishedAt] = useState(
		initialSummaryPublishedAt,
	)
	const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)
	const [publishError, setPublishError] = useState<string | null>(null)
	const [isPublishing, setIsPublishing] = useState(false)
	const [isWriterPreviewOpen, setIsWriterPreviewOpen] = useState(false)
	const [commentDraft, setCommentDraft] = useState('')
	const [commentCategoryId, setCommentCategoryId] = useState('')
	const [commentTagsDraft, setCommentTagsDraft] = useState('')
	const [composerCategoryLabel, setComposerCategoryLabel] = useState('')
	const [commentSuggestedAction, setCommentSuggestedAction] = useState<
		FeedbackAnchor['suggestedAction'] | null
	>(null)
	const [snippetNoteDraft, setSnippetNoteDraft] = useState('')
	const [snippetCategoryIdDraft, setSnippetCategoryIdDraft] = useState('')
	const [snippetSearchQuery, setSnippetSearchQuery] = useState('')
	const [snippetSearchCategory, setSnippetSearchCategory] = useState('')
	const [memorySearchQuery, setMemorySearchQuery] = useState('')
	const [memorySearchCategory, setMemorySearchCategory] = useState('')
	const [isPanelSaving, setIsPanelSaving] = useState(false)
	const [savingCommentId, setSavingCommentId] = useState<string | null>(null)
	const [promotingCommentId, setPromotingCommentId] = useState<string | null>(null)
	const [reviewUncategorisedOnly, setReviewUncategorisedOnly] = useState(false)
	const [isDeletingAnnotation, setIsDeletingAnnotation] = useState(false)
	const [isInlineEditingComment, setIsInlineEditingComment] = useState(false)
	const isPublishedReadOnly = liveSubmissionStatus === 'feedback_published'
	const canLiveExportFeedback = canExportFeedback || isPublishedReadOnly
	const mainRef = useRef<HTMLDivElement | null>(null)
	const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null)
	const composerFormRef = useRef<HTMLFormElement | null>(null)
	const inlineCommentTextareaRef = useRef<HTMLTextAreaElement | null>(null)
	const publishTextareaRef = useRef<HTMLTextAreaElement | null>(null)
	const annotationMarkerRef = useRef<HTMLButtonElement | null>(null)

	useEffect(() => {
		if (!isPublishedReadOnly || isWriterPreviewOpen || !activeAnnotationId) return
		const onKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.key === 'Escape') {
				setActiveAnnotationId(null)
				annotationMarkerRef.current?.focus({ preventScroll: true })
			}
		}
		const onOutsideClick = (event: globalThis.MouseEvent) => {
			const target = event.target
			if (target instanceof HTMLElement && !target.closest('[data-editor-note], button, a, input, textarea, select')) {
				setActiveAnnotationId(null)
			}
		}
		document.addEventListener('keydown', onKeyDown)
		document.addEventListener('click', onOutsideClick)
		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.removeEventListener('click', onOutsideClick)
		}
	}, [activeAnnotationId, isPublishedReadOnly, isWriterPreviewOpen])

	useEffect(() => {
		setFeedbackItems(feedback)
	}, [feedback])

	useEffect(() => {
		setSnippetItems(snippets)
	}, [snippets])

	useEffect(() => {
		setSnippetLibraryItems(snippetLibrary)
	}, [snippetLibrary])

	useEffect(() => {
		setFeedbackMemoryItems(feedbackMemory)
	}, [feedbackMemory])

	useEffect(() => {
		setLiveSubmissionStatus(submissionStatus)
	}, [submissionStatus])

	useEffect(() => {
		setPublishSummary(initialSummary)
	}, [initialSummary])

	useEffect(() => {
		setSummaryPublishedAt(initialSummaryPublishedAt)
	}, [initialSummaryPublishedAt])

	useEffect(() => {
		setFlashNotice(notice)
		if (!notice) {
			return
		}

		const timeout = window.setTimeout(() => {
			setFlashNotice(null)
		}, 4000)

		return () => window.clearTimeout(timeout)
	}, [notice])

	useEffect(() => {
		if (!sidePanelNotice) {
			return
		}

		const timeout = window.setTimeout(() => {
			setSidePanelNotice(null)
		}, 4000)

		return () => window.clearTimeout(timeout)
	}, [sidePanelNotice])

	useEffect(() => {
		if (selectedAnchor && !isInlineEditingComment) {
			const frame = window.requestAnimationFrame(() => {
				composerTextareaRef.current?.focus()
			})
			return () => window.cancelAnimationFrame(frame)
		}
	}, [selectedAnchor, isInlineEditingComment])

	useEffect(() => {
		if (isPublishModalOpen && !isWriterPreviewOpen) {
			publishTextareaRef.current?.focus()
		}
	}, [isPublishModalOpen, isWriterPreviewOpen])

	const pagedManuscript = useMemo(
		() => paginateManuscript(paragraphs, readingPageOptions),
		[paragraphs],
	)
	const paragraphIndexById = useMemo(
		() =>
			Object.fromEntries(
				paragraphs.map((paragraph, index) => [paragraph.id, index]),
			) as Record<string, number>,
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
				tags: item.anchor.tags ?? [],
			}))
		const localSnippetItems = snippetItems
			.filter((item): item is SnippetItem & { anchor: FeedbackAnchor } => Boolean(item.anchor))
			.map((item) => ({
				id: `snippet:${item.id}`,
				type: 'snippet' as const,
				text: item.note,
				createdAt: item.createdAt,
				anchor: item.anchor,
				label: feedbackLabel(item.anchor),
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
	}, [feedbackItems, snippetItems])

	const annotationsByBlock = useMemo(() => {
		const map: Record<string, AnnotationItem[]> = {}
		for (const item of annotations) {
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
				const aSegment = paragraph
					? annotationSegmentForParagraph(a.anchor, paragraph, paragraphIndexById)
					: null
				const bSegment = paragraph
					? annotationSegmentForParagraph(b.anchor, paragraph, paragraphIndexById)
					: null
				const aStart = aSegment?.startOffset ?? a.anchor.startOffset
				const bStart = bSegment?.startOffset ?? b.anchor.startOffset
				return aStart - bStart || a.createdAt.localeCompare(b.createdAt)
			})
		}

		return map
	}, [annotations, paragraphIndexById, paragraphs])

	const activeAnnotation = useMemo(() => {
		if (!activeAnnotationId) {
			return null
		}
		return annotations.find((item) => item.id === activeAnnotationId) ?? null
	}, [activeAnnotationId, annotations])

	useEffect(() => {
		if (
			activeAnnotation?.type === 'comment' &&
			isInlineEditingComment &&
			!isPublishedReadOnly
		) {
			const frame = window.requestAnimationFrame(() => {
				const textarea = inlineCommentTextareaRef.current
				textarea?.focus()
				const end = textarea?.value.length ?? 0
				textarea?.setSelectionRange(end, end)
			})
			return () => window.cancelAnimationFrame(frame)
		}
	}, [activeAnnotation, isInlineEditingComment, isPublishedReadOnly])

	const commentCount = feedbackItems.length
	const snippetCount = snippetItems.length
	const commentAnnotations = annotations.filter((item) => item.type === 'comment')
	const snippetAnnotations = annotations.filter((item) => item.type === 'snippet')
	const uncategorisedCommentCount = commentAnnotations.filter(
		(item) => item.label === 'Uncategorised',
	).length
	const visibleCommentAnnotations = reviewUncategorisedOnly
		? commentAnnotations.filter((item) => item.label === 'Uncategorised')
		: commentAnnotations
	const filteredSnippetLibrary = useMemo(() => {
		const query = snippetSearchQuery.trim().toLowerCase()
		return snippetLibraryItems.filter((item) => {
			if (
				snippetSearchCategory &&
				item.categoryLabel !== snippetSearchCategory
			) {
				return false
			}

			if (!query) {
				return true
			}

			const haystack = [
				item.text,
				item.anchor?.quote ?? '',
				item.categoryLabel,
				...item.tags,
			]
				.join(' ')
				.toLowerCase()

			return haystack.includes(query)
		})
		}, [snippetLibraryItems, snippetSearchCategory, snippetSearchQuery])
		const filteredFeedbackMemory = useMemo(() => {
			const query = memorySearchQuery.trim().toLowerCase()
			return feedbackMemoryItems.filter((item) => {
				if (
					memorySearchCategory &&
					item.categoryLabel !== memorySearchCategory
				) {
					return false
				}

				if (!query) {
					return true
				}

				const haystack = [
					item.comment,
					item.quote,
					item.submissionTitle,
					item.writerLabel,
					item.categoryLabel,
					...item.tags,
				]
					.join(' ')
					.toLowerCase()

				return haystack.includes(query)
			})
		}, [feedbackMemoryItems, memorySearchCategory, memorySearchQuery])

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
		setActiveAnnotationId(null)
		setPageIndex(clamped)
	}, [totalPages])

	usePagedArrowNavigation({
		pageIndex,
		totalPages: isWriterPreviewOpen ? 1 : totalPages,
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

		if (isPublishedReadOnly) {
			closeInlineComposer()
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

	const toggleAnnotation = (annotationId: string) => {
		closeInlineComposer()
		setIsInlineEditingComment(false)
		setActiveAnnotationId((current) =>
			current === annotationId ? null : annotationId,
		)
	}

	const focusAnnotation = (annotationId: string) => {
		closeInlineComposer()
		setIsInlineEditingComment(false)
		setActiveAnnotationId(annotationId)
	}

	const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault()
			composerFormRef.current?.requestSubmit()
		}
	}

	const handleInlineCommentKeyDown = (
		event: KeyboardEvent<HTMLTextAreaElement>,
	) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault()
			void saveActiveComment()
		}
	}

	const activeFeedbackCategoryLabel =
		activeAnnotation?.type === 'comment' &&
		fixedFeedbackCategories.includes(activeAnnotation.label)
			? activeAnnotation.label
			: ''

	useEffect(() => {
		setSidePanelError(null)
		setSidePanelNotice(null)

		if (!activeAnnotation) {
			setCommentDraft('')
			setCommentCategoryId('')
			setCommentTagsDraft('')
			setCommentSuggestedAction(null)
			setSnippetNoteDraft('')
			setSnippetCategoryIdDraft('')
			setIsInlineEditingComment(false)
			return
		}

		if (activeAnnotation.type === 'comment') {
			setCommentDraft(activeAnnotation.text)
			setCommentCategoryId(activeFeedbackCategoryLabel)
			setCommentTagsDraft((activeAnnotation.tags ?? []).join(', '))
			setCommentSuggestedAction(activeAnnotation.anchor.suggestedAction ?? null)
			setSnippetNoteDraft('')
			setSnippetCategoryIdDraft('')
			setIsInlineEditingComment(!isPublishedReadOnly)
			return
		}

		setSnippetNoteDraft(activeAnnotation.text)
		setSnippetCategoryIdDraft(
			fixedSnippetCategories.includes(activeAnnotation.label)
				? activeAnnotation.label
				: '',
		)
		setCommentDraft('')
		setCommentCategoryId('')
		setCommentTagsDraft('')
		setCommentSuggestedAction(null)
		setIsInlineEditingComment(false)
	}, [activeAnnotation, activeFeedbackCategoryLabel, isPublishedReadOnly])

	const saveNewAnnotation = async (
		annotationIntent: 'comment' | 'snippet' | 'cut',
	) => {
		if (!selectedAnchor || isComposerSaving || isPublishedReadOnly) {
			if (isPublishedReadOnly) {
				setComposerError('Published feedback is read-only for this version.')
			}
			return
		}

		const anchorSelection = selectedAnchor
		const trimmedText =
			annotationIntent === 'cut'
				? CUT_SUGGESTION_COMMENT
				: composerText.trim()
		const annotationType =
			annotationIntent === 'snippet'
				? 'snippet'
				: trimmedText
					? 'comment'
					: 'snippet'
		const suggestedAction = annotationIntent === 'cut' ? 'cut' : undefined
		const categoryLabel = normalizeFeedbackLabel(
			composerCategoryLabel,
			suggestedAction,
		)
		const tempId = `temp-${annotationType}-${Date.now()}`
		const optimisticCreatedAt = new Date().toISOString()
		const optimisticAnchor: FeedbackAnchor = {
			blockId: anchorSelection.blockId,
			endBlockId: anchorSelection.endBlockId,
			startOffset: anchorSelection.startOffset,
			endOffset: anchorSelection.endOffset,
			quote: anchorSelection.quote,
			prefix: anchorSelection.prefix,
			suffix: anchorSelection.suffix,
			...(annotationType === 'comment'
				? suggestedAction === 'cut'
					? {
							categoryLabel: 'Cut/tighten',
							categorySlug: 'cut-tighten',
							suggestedAction: 'cut' as const,
						}
					: {
							categoryLabel,
							categorySlug:
								composerCategoryLabel &&
								fixedFeedbackCategories.includes(composerCategoryLabel)
									? feedbackSlug(composerCategoryLabel)
									: 'uncategorised',
						}
				: {
						categoryLabel,
						categorySlug:
							categoryLabel === 'Uncategorised'
								? 'uncategorised'
								: feedbackSlug(categoryLabel),
					}),
		}

		setComposerError(null)
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

		setComposerText('')
		closeInlineComposer()

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
						blockId: anchorSelection.blockId,
						endBlockId: anchorSelection.endBlockId,
						startOffset: anchorSelection.startOffset,
						endOffset: anchorSelection.endOffset,
						quote: anchorSelection.quote,
						prefix: anchorSelection.prefix,
						suffix: anchorSelection.suffix,
						comment: trimmedText,
						suggestedAction,
						feedbackCategoryLabel: categoryLabel,
						snippetCategoryLabel: categoryLabel,
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
				setActiveAnnotationId(null)
			}

			if (annotationType === 'snippet' && payload?.snippet) {
				setSnippetItems((current) =>
					current.map((item) =>
						item.id === tempId ? payload.snippet! : item,
					),
				)
				const librarySnippet = snippetItemToLibraryItem(payload.snippet)
				if (librarySnippet) {
					setSnippetLibraryItems((current) => [
						librarySnippet,
						...current.filter((item) => item.id !== librarySnippet.id),
					])
				}
				setActiveAnnotationId(null)
			}
			setComposerCategoryLabel('')

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

			setComposerError(
				error instanceof Error ? error.message : 'Unable to save annotation.',
			)
		} finally {
			setIsComposerSaving(false)
		}
	}

	const submitInlineAnnotation = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		await saveNewAnnotation(
			composerText.trim() ? 'comment' : 'snippet',
		)
	}

	const saveActiveComment = async (event?: FormEvent<HTMLFormElement>) => {
		event?.preventDefault()

		if (
			!activeAnnotation ||
			activeAnnotation.type !== 'comment' ||
			isPanelSaving ||
			isPublishedReadOnly
		) {
			if (isPublishedReadOnly) {
				setSidePanelError('Published feedback is read-only for this version.')
			}
			return
		}

		const nextComment = commentDraft.trim()
		if (!nextComment) {
			setSidePanelError('Enter a comment before saving.')
			return
		}

		const feedbackItemId = activeAnnotation.id.replace('feedback:', '')
		const previousItems = feedbackItems
		const categoryLabel = normalizeFeedbackLabel(
			commentCategoryId,
			commentSuggestedAction,
		)
		const nextTags = parseTagsInput(commentTagsDraft)

		setSidePanelError(null)
		setSidePanelNotice(null)
		setIsPanelSaving(true)
		setFeedbackItems((current) =>
			current.map((item) =>
				item.id === feedbackItemId
					? {
							...item,
							comment: nextComment,
							anchor: item.anchor
								? {
										...item.anchor,
										categoryLabel,
										categorySlug:
											categoryLabel === 'Uncategorised'
												? 'uncategorised'
												: feedbackSlug(categoryLabel),
										tags: nextTags,
										suggestedAction:
											commentSuggestedAction === 'cut' ? 'cut' : undefined,
									}
								: item.anchor,
						}
					: item,
			),
		)

		try {
			const response = await fetch(`/api/workshop/${submissionId}/annotations`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					type: 'comment',
					id: feedbackItemId,
					comment: nextComment,
					feedbackCategoryLabel: categoryLabel,
					tags: nextTags,
					suggestedAction: commentSuggestedAction,
				}),
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string; feedback?: FeedbackItem }
				| undefined

			const savedFeedback = payload?.feedback
			if (!response.ok || payload?.error || !savedFeedback) {
				throw new Error(payload?.error ?? 'Unable to update comment.')
			}

			setFeedbackItems((current) =>
				current.map((item) =>
					item.id === feedbackItemId ? savedFeedback : item,
				),
			)
			setIsInlineEditingComment(false)
		} catch (error) {
			setFeedbackItems(previousItems)
			setSidePanelError(
				error instanceof Error ? error.message : 'Unable to update comment.',
			)
		} finally {
			setIsPanelSaving(false)
		}
	}

	const saveActiveSnippet = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (
			!activeAnnotation ||
			activeAnnotation.type !== 'snippet' ||
			isPanelSaving
		) {
			return
		}

		const snippetId = activeAnnotation.id.replace('snippet:', '')
		const previousItems = snippetItems
		const categoryLabel = normalizeSnippetLabel(snippetCategoryIdDraft)

		setSidePanelError(null)
		setSidePanelNotice(null)
		setIsPanelSaving(true)
		setSnippetItems((current) =>
			current.map((item) =>
				item.id === snippetId
					? {
							...item,
							note: snippetNoteDraft.trim(),
							snippetCategoryId: null,
							anchor: item.anchor
								? {
										...item.anchor,
										categoryLabel,
										categorySlug:
											categoryLabel === 'Uncategorised'
												? 'uncategorised'
												: feedbackSlug(categoryLabel),
									}
								: item.anchor,
						}
					: item,
			),
		)

		try {
			const response = await fetch(`/api/workshop/${submissionId}/annotations`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					type: 'snippet',
					id: snippetId,
					note: snippetNoteDraft,
					snippetCategoryLabel: categoryLabel,
				}),
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string; snippet?: SnippetItem }
				| undefined

			const savedSnippet = payload?.snippet
			if (!response.ok || payload?.error || !savedSnippet) {
				throw new Error(payload?.error ?? 'Unable to update snippet.')
			}

			setSnippetItems((current) =>
				current.map((item) =>
					item.id === snippetId ? savedSnippet : item,
				),
			)
			const librarySnippet = snippetItemToLibraryItem(savedSnippet)
			if (librarySnippet) {
				setSnippetLibraryItems((current) =>
					current.map((item) =>
						item.id === librarySnippet.id ? librarySnippet : item,
					),
				)
			}
			setSidePanelNotice(payload.notice ?? 'Saved.')
		} catch (error) {
			setSnippetItems(previousItems)
			setSidePanelError(
				error instanceof Error ? error.message : 'Unable to update snippet.',
			)
		} finally {
			setIsPanelSaving(false)
		}
	}

	const patchSnippetCategoryFromPanel = async (
		annotation: AnnotationItem,
		nextCategory: string,
	) => {
		if (annotation.type !== 'snippet' || isPublishedReadOnly) {
			return
		}

		const snippetId = annotation.id.replace('snippet:', '')
		const snippetItem = snippetItems.find((item) => item.id === snippetId)

		if (!snippetItem?.anchor) {
			return
		}

		const categoryLabel = normalizeSnippetLabel(nextCategory)
		const previousItems = snippetItems

		setSavingCommentId(snippetId)
		setSidePanelError(null)
		setSnippetItems((current) =>
			current.map((item) =>
				item.id === snippetId && item.anchor
					? {
							...item,
							snippetCategoryId: null,
							anchor: {
								...item.anchor,
								categoryLabel,
								categorySlug:
									categoryLabel === 'Uncategorised'
										? 'uncategorised'
										: feedbackSlug(categoryLabel),
							},
						}
					: item,
			),
		)

		try {
			const response = await fetch(`/api/workshop/${submissionId}/annotations`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					type: 'snippet',
					id: snippetId,
					note: snippetItem.note,
					snippetCategoryLabel: categoryLabel,
				}),
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string; snippet?: SnippetItem }
				| undefined

			const savedSnippet = payload?.snippet
			if (!response.ok || payload?.error || !savedSnippet) {
				throw new Error(payload?.error ?? 'Unable to update snippet.')
			}

			setSnippetItems((current) =>
				current.map((item) =>
					item.id === snippetId ? savedSnippet : item,
				),
			)
			const librarySnippet = snippetItemToLibraryItem(savedSnippet)
			if (librarySnippet) {
				setSnippetLibraryItems((current) =>
					current.map((item) =>
						item.id === librarySnippet.id ? librarySnippet : item,
					),
				)
			}
			setSidePanelNotice(payload.notice ?? 'Snippet updated.')
		} catch (error) {
			setSnippetItems(previousItems)
			setSidePanelError(
				error instanceof Error ? error.message : 'Unable to update snippet.',
			)
		} finally {
			setSavingCommentId(null)
		}
	}

	const patchCommentFromPanel = async ({
		annotation,
		categoryLabel,
		tags,
	}: {
		annotation: AnnotationItem
		categoryLabel?: string
		tags?: string[]
	}) => {
		if (annotation.type !== 'comment' || isPublishedReadOnly) {
			return
		}

		const feedbackItemId = annotation.id.replace('feedback:', '')
		const feedbackItem = feedbackItems.find((item) => item.id === feedbackItemId)

		if (!feedbackItem?.anchor) {
			return
		}

		const nextCategoryLabel = normalizeFeedbackLabel(
			categoryLabel ?? annotation.label,
			feedbackItem.anchor.suggestedAction,
		)
		const nextTags = tags ?? feedbackItem.anchor.tags ?? []
		const previousItems = feedbackItems

		setSavingCommentId(feedbackItemId)
		setSidePanelError(null)
		setFeedbackItems((current) =>
			current.map((item) =>
				item.id === feedbackItemId && item.anchor
					? {
							...item,
							anchor: {
								...item.anchor,
								categoryLabel: nextCategoryLabel,
								categorySlug:
									nextCategoryLabel === 'Uncategorised'
										? 'uncategorised'
										: feedbackSlug(nextCategoryLabel),
								tags: nextTags,
							},
						}
					: item,
			),
		)

		try {
			const response = await fetch(`/api/workshop/${submissionId}/annotations`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					type: 'comment',
					id: feedbackItemId,
					comment: feedbackItem.comment,
					feedbackCategoryLabel: nextCategoryLabel,
					tags: nextTags,
					suggestedAction: feedbackItem.anchor.suggestedAction,
				}),
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string; feedback?: FeedbackItem }
				| undefined

			const savedFeedback = payload?.feedback
			if (!response.ok || payload?.error || !savedFeedback) {
				throw new Error(payload?.error ?? 'Unable to update comment.')
			}

			setFeedbackItems((current) =>
				current.map((item) =>
					item.id === feedbackItemId ? savedFeedback : item,
				),
			)
			setSidePanelNotice(payload.notice ?? 'Comment updated.')
		} catch (error) {
			setFeedbackItems(previousItems)
			setSidePanelError(
				error instanceof Error ? error.message : 'Unable to update comment.',
			)
		} finally {
			setSavingCommentId(null)
		}
	}

	const promoteCommentToSnippet = async (annotation: AnnotationItem) => {
		if (annotation.type !== 'comment' || isPublishedReadOnly) {
			return
		}

		const feedbackItemId = annotation.id.replace('feedback:', '')
		const tempId = `temp-snippet-${Date.now()}`
		const previousSnippets = snippetItems

		setPromotingCommentId(feedbackItemId)
		setSidePanelError(null)
		setSnippetItems((current) => [
			...current,
			{
				id: tempId,
				note: annotation.text,
				createdAt: new Date().toISOString(),
				snippetCategoryId: null,
				anchor: {
					...annotation.anchor,
					categoryLabel: 'Promoted',
					categorySlug: 'promoted',
				},
			},
		])

		try {
			const response = await fetch(`/api/workshop/${submissionId}/annotations`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					type: 'snippet',
					sourceFeedbackItemId: feedbackItemId,
					blockId: annotation.anchor.blockId,
					startOffset: annotation.anchor.startOffset,
					endOffset: annotation.anchor.endOffset,
					quote: annotation.anchor.quote,
					prefix: annotation.anchor.prefix,
					suffix: annotation.anchor.suffix,
					note: annotation.text,
					snippetCategoryLabel: 'Promoted',
					tags: annotation.tags ?? [],
				}),
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string; snippet?: SnippetItem }
				| undefined

			const savedSnippet = payload?.snippet
			if (!response.ok || payload?.error || !savedSnippet) {
				throw new Error(payload?.error ?? 'Unable to save snippet.')
			}

			setSnippetItems((current) =>
				current.map((item) =>
					item.id === tempId ? savedSnippet : item,
				),
			)
			const librarySnippet = snippetItemToLibraryItem(savedSnippet)
			if (librarySnippet) {
				setSnippetLibraryItems((current) => [
					librarySnippet,
					...current.filter((item) => item.id !== librarySnippet.id),
				])
			}
			setSidePanelNotice('Comment saved as snippet.')
		} catch (error) {
			setSnippetItems(previousSnippets)
			setSidePanelError(
				error instanceof Error ? error.message : 'Unable to save snippet.',
			)
		} finally {
			setPromotingCommentId(null)
		}
	}

	const createCommentFromSnippet = async (
		snippet: SnippetLibraryItem,
		anchorSelection: SelectedAnchor,
		text: string,
		successNotice = 'Snippet inserted as comment.',
		errorNotice = 'Unable to insert snippet.',
	) => {
		if (isPanelSaving || isPublishedReadOnly) {
			return
		}

		const categoryLabel = normalizeFeedbackLabel(snippet.categoryLabel)
		const tempId = `temp-feedback-${Date.now()}`
		const optimisticCreatedAt = new Date().toISOString()
		const optimisticAnchor: FeedbackAnchor = {
			blockId: anchorSelection.blockId,
			endBlockId: anchorSelection.endBlockId,
			startOffset: anchorSelection.startOffset,
			endOffset: anchorSelection.endOffset,
			quote: anchorSelection.quote,
			prefix: anchorSelection.prefix,
			suffix: anchorSelection.suffix,
			kind: 'craft',
			categoryLabel,
			categorySlug:
				categoryLabel === 'Uncategorised'
					? 'uncategorised'
					: feedbackSlug(categoryLabel),
		}

		setSidePanelError(null)
		setSidePanelNotice(null)
		setIsPanelSaving(true)
		closeInlineComposer()
		setFeedbackItems((current) => [
			...current,
			{
				id: tempId,
				comment: text,
				createdAt: optimisticCreatedAt,
				anchor: optimisticAnchor,
			},
		])

		try {
			const response = await fetch(`/api/workshop/${submissionId}/annotations`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					type: 'comment',
					blockId: anchorSelection.blockId,
					endBlockId: anchorSelection.endBlockId,
					startOffset: anchorSelection.startOffset,
					endOffset: anchorSelection.endOffset,
					quote: anchorSelection.quote,
					prefix: anchorSelection.prefix,
					suffix: anchorSelection.suffix,
					comment: text,
					feedbackCategoryLabel: categoryLabel,
				}),
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string; feedback?: FeedbackItem }
				| undefined

			const savedFeedback = payload?.feedback
			if (!response.ok || payload?.error || !savedFeedback) {
				throw new Error(payload?.error ?? errorNotice)
			}

			setFeedbackItems((current) =>
				current.map((item) =>
					item.id === tempId ? savedFeedback : item,
				),
			)
			setActiveAnnotationId(`feedback:${savedFeedback.id}`)
			setSidePanelNotice(payload.notice ?? successNotice)
		} catch (error) {
			setFeedbackItems((current) => current.filter((item) => item.id !== tempId))
			setSidePanelError(
				error instanceof Error ? error.message : errorNotice,
			)
		} finally {
			setIsPanelSaving(false)
		}
	}

	const saveSnippetIntoExistingComment = async (
		annotation: AnnotationItem,
		nextText: string,
		successNotice = 'Snippet inserted into active comment.',
		errorNotice = 'Unable to insert snippet.',
	) => {
		const feedbackItemId = annotation.id.replace('feedback:', '')
		const feedbackItem = feedbackItems.find((item) => item.id === feedbackItemId)

		if (!feedbackItem?.anchor) {
			setSidePanelError('Unable to find the active comment.')
			return
		}

		const categoryLabel = normalizeFeedbackLabel(
			annotation.label,
			feedbackItem.anchor.suggestedAction,
		)
		const tags = feedbackItem.anchor.tags ?? []
		const previousItems = feedbackItems

		setSavingCommentId(feedbackItemId)
		setSidePanelError(null)
		setSidePanelNotice(null)
		setFeedbackItems((current) =>
			current.map((item) =>
				item.id === feedbackItemId && item.anchor
					? {
							...item,
							comment: nextText,
							anchor: {
								...item.anchor,
								categoryLabel,
								categorySlug:
									categoryLabel === 'Uncategorised'
										? 'uncategorised'
										: feedbackSlug(categoryLabel),
								tags,
							},
						}
					: item,
			),
		)

		try {
			const response = await fetch(`/api/workshop/${submissionId}/annotations`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					type: 'comment',
					id: feedbackItemId,
					comment: nextText,
					feedbackCategoryLabel: categoryLabel,
					tags,
					suggestedAction: feedbackItem.anchor.suggestedAction,
				}),
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string; feedback?: FeedbackItem }
				| undefined

			const savedFeedback = payload?.feedback
			if (!response.ok || payload?.error || !savedFeedback) {
				throw new Error(payload?.error ?? errorNotice)
			}

			setFeedbackItems((current) =>
				current.map((item) =>
					item.id === feedbackItemId ? savedFeedback : item,
				),
			)
			setCommentDraft(savedFeedback.comment)
			setIsInlineEditingComment(false)
			setSidePanelNotice(successNotice)
		} catch (error) {
			setFeedbackItems(previousItems)
			setSidePanelError(
				error instanceof Error ? error.message : errorNotice,
			)
		} finally {
			setSavingCommentId(null)
		}
	}

	const insertSnippetIntoComment = async (snippet: SnippetLibraryItem) => {
		if (isPublishedReadOnly) {
			setSidePanelError('Published feedback is read-only for this version.')
			return
		}

		const text = snippetText(snippet)
		if (!text) {
			setSidePanelError('That snippet has no reusable text yet.')
			return
		}

		if (activeAnnotation?.type === 'comment') {
			const nextText = joinCommentText(
				isInlineEditingComment ? commentDraft : activeAnnotation.text,
				text,
			)

			setCommentDraft(nextText)
			await saveSnippetIntoExistingComment(activeAnnotation, nextText)
			return
		}

		if (selectedAnchor) {
			await createCommentFromSnippet(snippet, selectedAnchor, text)
			return
		}

		setSidePanelError('Select a passage or open a comment before inserting a snippet.')
	}

	const insertFeedbackMemoryIntoComment = async (memory: FeedbackMemoryItem) => {
		if (isPublishedReadOnly) {
			setSidePanelError('Published feedback is read-only for this version.')
			return
		}

		const text = memory.comment.trim()
		if (!text) {
			setSidePanelError('That saved comment has no reusable text yet.')
			return
		}

		if (activeAnnotation?.type === 'comment') {
			const nextText = joinCommentText(
				isInlineEditingComment ? commentDraft : activeAnnotation.text,
				text,
			)

			setCommentDraft(nextText)
			await saveSnippetIntoExistingComment(
				activeAnnotation,
				nextText,
				'Memory inserted into active comment.',
				'Unable to insert memory.',
			)
			return
		}

		if (selectedAnchor) {
			await createCommentFromSnippet(
				{
					id: `memory:${memory.id}`,
					text,
					createdAt: memory.createdAt,
					categoryLabel: memory.categoryLabel,
					categorySlug:
						memory.categorySlug ||
						(memory.categoryLabel === 'Uncategorised'
							? 'uncategorised'
							: feedbackSlug(memory.categoryLabel)),
					tags: memory.tags,
					anchor: {
						blockId: selectedAnchor.blockId,
						endBlockId: selectedAnchor.endBlockId,
						startOffset: selectedAnchor.startOffset,
						endOffset: selectedAnchor.endOffset,
						quote: memory.quote || selectedAnchor.quote,
						prefix: selectedAnchor.prefix,
						suffix: selectedAnchor.suffix,
						categoryLabel: memory.categoryLabel,
						categorySlug:
							memory.categorySlug ||
							(memory.categoryLabel === 'Uncategorised'
								? 'uncategorised'
								: feedbackSlug(memory.categoryLabel)),
						tags: memory.tags,
					},
				},
				selectedAnchor,
				text,
				'Memory inserted as comment.',
				'Unable to insert memory.',
			)
			return
		}

		setSidePanelError('Select a passage or open a comment before inserting memory.')
	}

	const deleteActiveComment = async () => {
		if (
			!activeAnnotation ||
			activeAnnotation.type !== 'comment' ||
			!canDeleteFeedback ||
			isDeletingAnnotation
		) {
			return
		}

		const feedbackItemId = activeAnnotation.id.replace('feedback:', '')
		const previousItems = feedbackItems

		setSidePanelError(null)
		setSidePanelNotice(null)
		setIsDeletingAnnotation(true)
		setActiveAnnotationId(null)
		setFeedbackItems((current) =>
			current.filter((item) => item.id !== feedbackItemId),
		)

		try {
			const response = await fetch(`/api/workshop/${submissionId}/annotations`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					type: 'comment',
					id: feedbackItemId,
				}),
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string }
				| undefined

			if (!response.ok || payload?.error) {
				throw new Error(payload?.error ?? 'Unable to delete comment.')
			}

			setSidePanelNotice(payload?.notice ?? 'Comment deleted.')
		} catch (error) {
			setFeedbackItems(previousItems)
			setSidePanelError(
				error instanceof Error ? error.message : 'Unable to delete comment.',
			)
		} finally {
			setIsDeletingAnnotation(false)
		}
	}

	const publishToWriter = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (isPublishing) {
			return
		}

		setPublishError(null)
		setIsPublishing(true)

		try {
			const response = await fetch(`/api/workshop/${submissionId}/publish`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					summary: publishSummary,
				}),
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string; status?: string; publishedAt?: string }
				| undefined

			if (!response.ok || payload?.error) {
				throw new Error(payload?.error ?? 'Unable to publish feedback.')
			}

			setLiveSubmissionStatus(payload?.status ?? 'feedback_published')
			setSummaryPublishedAt(payload?.publishedAt ?? new Date().toISOString())
			setIsPublishModalOpen(false)
			setFlashNotice(payload?.notice ?? 'Feedback published to writer.')
			router.refresh()
		} catch (error) {
			setPublishError(
				error instanceof Error ? error.message : 'Unable to publish feedback.',
			)
		} finally {
			setIsPublishing(false)
		}
	}

	const renderParagraphWithAnnotations = (
		paragraph: { id: string; text: string },
		items: AnnotationItem[],
	): ReactNode[] => {
		const { text } = paragraph
		if (items.length === 0) {
			return [text]
		}

		const nodes: ReactNode[] = []
		let cursor = 0

		for (const item of items) {
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
						<mark className={`${getMarkClass(item.type, item.anchor.kind, isActive, item.anchor.suggestedAction)} rounded px-1 transition`}>
							{markedText}
						</mark>
						<button
							type="button"
							onClick={(event) => { annotationMarkerRef.current = event.currentTarget; toggleAnnotation(item.id) }}
							className={`ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5 align-super text-xs font-medium transition ${annotationMarkerClass(item.type, isActive)}`}
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

	if (isWriterPreviewOpen) {
		return <WriterFeedbackReadingWorkspace
			submissionId={submissionId} title={title} version={version} createdAt={createdAt}
			status={liveSubmissionStatus} summary={publishSummary} publishedAt={summaryPublishedAt}
			paragraphs={paragraphs}
			feedback={feedbackItems.map(item => ({ ...item, anchor: item.anchor ? repairSingleBlockAnchor(item.anchor, paragraphs) : null }))}
			preview={{ reviewUrl: `/app/workshop/${submissionId}`, includesOverviewDraft: true, onClose: () => setIsWriterPreviewOpen(false) }}
		/>
	}

	return (
		<div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_300px] 2xl:grid-cols-[minmax(0,1.7fr)_320px]">
			<main ref={mainRef} onMouseUp={captureSelection} onKeyUp={captureSelection} className="relative min-w-0">
				{isPublishedReadOnly ? <section className="surface mb-5 p-5" aria-label="Published overview">
					<h2 className="literary-title text-2xl">Published overview</h2>
					<p className="mt-3 whitespace-pre-wrap font-serif text-lg leading-8">{publishSummary.trim() || 'No overview note was published for this version.'}</p>
				</section> : null}
				{flashNotice ? (
					<div className="pointer-events-none absolute right-4 top-3 z-30 rounded border border-emerald-300/40 bg-studio-canvas px-3 py-1.5 text-xs text-emerald-800 shadow-none">
						{flashNotice}
					</div>
				) : null}
				{selectedAnchor && !isPublishedReadOnly ? (
						<form
							ref={composerFormRef}
							onSubmit={submitInlineAnnotation}
							data-selection-ignore="true"
							style={{
							top: `${selectedAnchor.composerTop}px`,
							left: `${selectedAnchor.composerLeft}px`,
						}}
						className="absolute z-40 w-[min(300px,calc(100%-2rem))] rounded-md border border-studio-line bg-studio-canvas p-3 shadow-none backdrop-blur">
						<p className="text-xs uppercase tracking-[0.12em] text-studio-muted">
							Marginal note
						</p>
						<p className="mt-2 rounded-lg border border-studio-line bg-studio-tint px-3 py-2 text-sm leading-relaxed text-studio-muted">
							{selectedAnchor.quote}
						</p>
						<textarea
							ref={composerTextareaRef}
							name="comment"
							rows={composerText.includes('\n') ? 3 : 2}
							value={composerText}
							onChange={(event) => setComposerText(event.target.value)}
							onKeyDown={handleComposerKeyDown}
							className="mt-3 w-full rounded border border-studio-line bg-studio-paper px-3 py-2 text-sm text-studio-ink outline-none ring-accent-400 transition focus:ring"
							placeholder="Type a note. Enter saves. Empty Enter saves as snippet."
						/>
						<label className="mt-3 block">
							<span className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-studio-muted">
								Category
							</span>
							<select
								value={composerCategoryLabel}
								onChange={(event) => setComposerCategoryLabel(event.target.value)}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink">
								<option value="">Uncategorised</option>
								{fixedFeedbackCategories.map((category) => (
									<option key={category} value={category}>
										{category}
									</option>
								))}
							</select>
						</label>
						{composerError ? (
							<p className="mt-2 text-xs text-amber-800">{composerError}</p>
						) : null}
						<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									disabled={isComposerSaving}
									onClick={() => {
										void saveNewAnnotation('cut')
									}}
									className="rounded border border-studio-line bg-studio-tint px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-studio-muted transition hover:bg-studio-soft disabled:cursor-not-allowed disabled:opacity-60">
									Cut
								</button>
								<p className="text-xs text-studio-muted">
									{isComposerSaving
										? 'Saving...'
										: 'Enter saves. Shift+Enter adds a new line.'}
								</p>
							</div>
								<button
									type="button"
									disabled={isComposerSaving}
									onClick={closeInlineComposer}
									className="text-xs text-studio-muted transition hover:text-studio-ink">
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
								className="rounded border border-ink-900/15 bg-studio-tint px-4 py-2 text-xs uppercase tracking-[0.1em] text-studio-ink/75 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45">
								← Previous page
							</button>
							<p className="text-xs uppercase tracking-[0.12em] text-studio-ink/55">
								Page {Math.min(pageIndex + 1, totalPages)} of {totalPages}
							</p>
							<button
								type="button"
								onClick={() => goToPage(pageIndex + 1)}
								disabled={pageIndex >= totalPages - 1}
								className="rounded border border-ink-900/15 bg-studio-tint px-4 py-2 text-xs uppercase tracking-[0.1em] text-studio-ink/75 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45">
								Next page →
							</button>
						</div>
					}>
						{(currentPage?.paragraphs ?? []).map((paragraph) => {
							const blockItems = annotationsByBlock[paragraph.id] ?? []
							const activeBlockItem =
								blockItems.find((item) => item.id === activeAnnotationId) ?? null
							const shouldShowActiveBlockItem =
								activeBlockItem?.anchor.blockId === paragraph.id
							const isSceneBreak = paragraph.text.trim() === '**'

						return (
							<div key={paragraph.id} className="space-y-3">
								<p
									id={paragraph.id}
									className={
										isSceneBreak
											? 'text-center tracking-[0.22em] text-studio-ink/60'
											: 'whitespace-pre-wrap'
									}>
									{isSceneBreak
										? '***'
										: renderParagraphWithAnnotations(paragraph, blockItems)}
								</p>
								{shouldShowActiveBlockItem ? (
									<div data-editor-note
										className={`max-w-[44rem] rounded-md border px-4 py-3 text-sm shadow-none ${annotationBorderClass(activeBlockItem.type)}`}>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div className="flex flex-wrap items-center gap-2">
												<p className="text-xs uppercase tracking-[0.12em]">
													{activeBlockItem.type === 'snippet'
														? 'Saved snippet'
														: liveSubmissionStatus === 'feedback_published'
															? 'Published comment'
															: 'Draft comment'}
												</p>
												<p className="rounded border border-current/20 px-2 py-0.5 text-xs uppercase tracking-[0.1em]">
													{activeBlockItem.label}
												</p>
											</div>
											<button
												type="button"
												onClick={() => { setActiveAnnotationId(null); annotationMarkerRef.current?.focus({ preventScroll: true }) }}
												className="text-xs text-current/85 transition hover:text-current">
												Close
											</button>
										</div>
										<p className="mt-2 font-serif italic text-studio-ink/90">
											{formatQuote(activeBlockItem.anchor.quote)}
										</p>
										{activeBlockItem.type === 'comment' ? (
											isInlineEditingComment &&
											activeAnnotationId === activeBlockItem.id ? (
													<form
														onSubmit={saveActiveComment}
														className="mt-3 space-y-3">
														<textarea
															ref={inlineCommentTextareaRef}
															name="comment"
														rows={commentDraft.includes('\n') ? 5 : 4}
														value={commentDraft}
														onChange={(event) => setCommentDraft(event.target.value)}
														onKeyDown={handleInlineCommentKeyDown}
														className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2 text-sm text-studio-ink"
													/>
													<label className="block">
														<span className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-studio-muted">
															Category
														</span>
														<select
															value={commentCategoryId}
															onChange={(event) =>
																setCommentCategoryId(event.target.value)
															}
															className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink">
															<option value="">Uncategorised</option>
															{fixedFeedbackCategories.map((category) => (
																<option key={category} value={category}>
																	{category}
																</option>
															))}
														</select>
													</label>
													<div className="flex flex-wrap items-center gap-2">
														<button
															type="button"
															onClick={() => {
																setCommentDraft(CUT_SUGGESTION_COMMENT)
																setCommentSuggestedAction('cut')
																setCommentCategoryId('')
															}}
															className="rounded border border-studio-line bg-studio-tint px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-studio-muted transition hover:bg-studio-soft">
															Cut note
														</button>
														<button
															type="submit"
															disabled={isPanelSaving}
															className="studio-primary">
															{isPanelSaving ? 'Saving...' : 'Save'}
														</button>
														<button
															type="button"
															onClick={() => {
																setIsInlineEditingComment(false)
																setCommentDraft(activeBlockItem.text)
																setCommentSuggestedAction(
																	activeBlockItem.anchor.suggestedAction ?? null,
																)
															}}
															className="rounded border border-studio-line px-3 py-1.5 text-sm text-studio-muted transition hover:border-studio-line hover:text-studio-ink">
															Cancel
														</button>
													</div>
													<p className="text-xs text-current/80">
														Enter saves. Shift+Enter adds a new line.
													</p>
												</form>
											) : (
												<div className="mt-3">
													<p className="leading-relaxed text-studio-ink">
														{activeBlockItem.text.trim()
															? activeBlockItem.text
															: 'Draft comment'}
													</p>
													<div className="mt-3 flex flex-wrap items-center gap-2">
														{!isPublishedReadOnly ? (
															<button
																type="button"
																onClick={() => setIsInlineEditingComment(true)}
																className="rounded border border-studio-line px-3 py-1.5 text-sm text-studio-muted transition hover:border-studio-line hover:text-studio-ink">
																Edit
															</button>
														) : null}
														{!isPublishedReadOnly ? (
								<button
									type="button"
									onClick={() => {
										setIsInlineEditingComment(true)
										setCommentDraft(CUT_SUGGESTION_COMMENT)
										setCommentSuggestedAction('cut')
										setCommentCategoryId('')
									}}
									className="rounded border border-studio-line bg-studio-tint px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-studio-muted transition hover:bg-studio-soft">
									Cut
								</button>
							) : null}
							{canDeleteFeedback && !isPublishedReadOnly ? (
								<button
																type="button"
																onClick={deleteActiveComment}
																disabled={isDeletingAnnotation}
																className="rounded border border-studio-line px-3 py-1.5 text-sm text-studio-muted transition hover:border-amber-200/40 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-60">
																{isDeletingAnnotation ? 'Deleting...' : 'Delete'}
															</button>
														) : null}
													</div>
												</div>
											)
										) : (
											<div className="mt-3 space-y-3">
												<p className="leading-relaxed text-studio-ink">
													{activeBlockItem.text.trim()
														? activeBlockItem.text
														: 'Snippet saved without a note.'}
												</p>
												{!isPublishedReadOnly ? (
													<label className="block max-w-xs">
														<span className="mb-1 block text-xs uppercase tracking-[0.1em] text-studio-muted">
															Category
														</span>
														<select
															value={
																fixedFeedbackCategories.includes(
																	activeBlockItem.label,
																)
																	? activeBlockItem.label
																	: ''
															}
															disabled={
																savingCommentId ===
																activeBlockItem.id.replace('snippet:', '')
															}
															onChange={(event) => {
																void patchSnippetCategoryFromPanel(
																	activeBlockItem,
																	event.target.value,
																)
															}}
															className="w-full rounded border border-studio-line bg-studio-paper px-2.5 py-2.5 text-xs text-studio-ink">
															<option value="">Uncategorised</option>
															{fixedFeedbackCategories.map((category) => (
																<option key={category} value={category}>
																	{category}
																</option>
															))}
														</select>
													</label>
												) : null}
											</div>
										)}
									</div>
								) : null}
							</div>
						)
					})}
				</StoryFolio>
			</main>

			<aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
				<div className="surface p-4">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs uppercase tracking-[0.1em] text-studio-muted">
								{isPublishedReadOnly ? 'Published feedback' : 'Feedback status'}
							</p>
							<p className="mt-1 text-sm text-studio-muted">
								{isPublishedReadOnly
									? 'Review what the writer received or prepare a feedback document.'
									: canPublishFeedback
										? 'Keep reading private until you are ready to return the piece.'
										: 'Publish from the latest reviewable version in the chain.'}
							</p>
						</div>
						<div className="flex flex-wrap items-center justify-end gap-2">
							{canLiveExportFeedback ? (
								<Link
									href={`/app/workshop/${submissionId}/export`}
									className="inline-flex rounded border border-studio-line bg-studio-tint px-3.5 py-2 text-sm text-studio-muted shadow-none transition hover:border-studio-line hover:bg-studio-tint hover:text-studio-ink">
									Prepare feedback document
								</Link>
							) : null}
							{!isPublishedReadOnly && canPublishFeedback ? (
								<button
									type="button"
									onClick={() => {
										setPublishError(null)
										setIsPublishModalOpen(true)
									}}
									className="inline-flex rounded border border-emerald-300/55 bg-emerald-300/14 px-4 py-2 text-xs uppercase tracking-[0.1em] text-emerald-800 shadow-none transition hover:-translate-y-[1px] hover:bg-emerald-300/20 active:translate-y-0">
									Publish to writer
								</button>
							) : null}
						</div>
					</div>
					<p
						className={`mt-3 rounded-md border px-3 py-2 text-sm leading-relaxed ${
							liveSubmissionStatus === 'feedback_published'
								? 'border-emerald-300/25 bg-studio-canvas text-emerald-800'
								: 'border-burgundy-300/25 bg-studio-canvas text-studio-ink'
						}`}>
						{isPublishedReadOnly
							? 'Feedback has been published for this version. It is now read-only. Use this view for reference; further feedback should happen on a new submission or revised version.'
							: canPublishFeedback
								? 'Draft comments and snippets stay private while you read.'
								: 'A newer version exists. Open that draft to continue active review or publish new feedback.'}
					</p>
					{summaryPublishedAt ? (
						<p className="mt-2 text-xs text-studio-muted">
							Last published {new Date(summaryPublishedAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })}
						</p>
					) : null}
					{!canLiveExportFeedback ? (
						<p className="mt-2 text-xs text-studio-muted">
							Feedback must be published before export is available.
						</p>
					) : null}
					<div className="mt-3 flex flex-wrap gap-2">
						<Link href={`/app/workshop/${submissionId}?view=writer`} className="studio-secondary">
							{isPublishedReadOnly ? 'View published feedback' : 'Preview saved feedback'}
						</Link>
						<Link href="/app/teacher/review-desk" className="studio-secondary">Back to editorial desk</Link>
					</div>
				</div>
				{Children.toArray(sidebarHeader)}
				{errorNotice ? (
					<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
						{errorNotice}
					</p>
				) : null}

				<ProtoCard title="Snippets" meta="Search and reuse">
					<div className="space-y-3">
						<div className="grid gap-2">
							<input
								type="search"
								value={snippetSearchQuery}
								onChange={(event) => setSnippetSearchQuery(event.target.value)}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink outline-none ring-accent-400 transition placeholder:text-studio-muted focus:ring"
								placeholder="Search snippets"
							/>
							<select
								value={snippetSearchCategory}
								onChange={(event) => setSnippetSearchCategory(event.target.value)}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink">
								<option value="">All categories</option>
								{fixedSnippetCategories.map((category) => (
									<option key={category} value={category}>
										{category}
									</option>
								))}
							</select>
						</div>
						<div className="max-h-[28vh] overflow-y-auto pr-1">
							{filteredSnippetLibrary.length === 0 ? (
								<p className="text-sm text-studio-muted">
									No snippets found.
								</p>
							) : (
								<ul className="space-y-2">
									{filteredSnippetLibrary.map((snippet) => {
										const text = snippetText(snippet)

										return (
											<li key={snippet.id}>
												<div className="rounded-md border border-studio-line bg-studio-canvas px-3 py-3 text-studio-muted">
													<div className="flex flex-wrap items-center gap-2">
														<p className="rounded border border-current/20 px-2 py-0.5 text-xs uppercase tracking-[0.1em]">
															{snippet.categoryLabel}
														</p>
														<p className="text-xs uppercase tracking-[0.1em] text-studio-muted">
															{new Date(snippet.createdAt).toLocaleDateString('en-GB', { timeZone: 'Europe/London' })}
														</p>
													</div>
													<p className="mt-2 text-sm leading-relaxed text-studio-ink">
														{text
															? compactPreview(text)
															: compactPreview(snippet.anchor?.quote ?? '')}
													</p>
													<button
														type="button"
														disabled={isPanelSaving || isPublishedReadOnly}
														onClick={() => {
															void insertSnippetIntoComment(snippet)
														}}
														className="mt-3 rounded border border-accent-300/35 bg-accent-300/10 px-3 py-1 text-xs uppercase tracking-[0.1em] text-studio-accent transition hover:bg-accent-300/18 disabled:cursor-not-allowed disabled:opacity-60">
														Insert into comment
													</button>
												</div>
											</li>
										)
									})}
								</ul>
							)}
						</div>
					</div>
					</ProtoCard>

					<ProtoCard title="Writer memory" meta="Previous comments">
						<div className="space-y-3">
							<div className="grid gap-2">
								<input
									type="search"
									value={memorySearchQuery}
									onChange={(event) => setMemorySearchQuery(event.target.value)}
									className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink outline-none ring-accent-400 transition placeholder:text-studio-muted focus:ring"
									placeholder="Search previous feedback"
								/>
								<select
									value={memorySearchCategory}
									onChange={(event) => setMemorySearchCategory(event.target.value)}
									className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink">
									<option value="">All categories</option>
									{fixedFeedbackCategories.map((category) => (
										<option key={category} value={category}>
											{category}
										</option>
									))}
								</select>
							</div>
							<div className="max-h-[28vh] overflow-y-auto pr-1">
								{filteredFeedbackMemory.length === 0 ? (
									<p className="text-sm text-studio-muted">
										No previous comments found.
									</p>
								) : (
									<ul className="space-y-2">
										{filteredFeedbackMemory.map((memory) => (
											<li key={memory.id}>
												<div className="rounded-md border border-studio-line bg-studio-canvas px-3 py-3 text-studio-muted">
													<div className="flex flex-wrap items-center gap-2">
														<p className="rounded border border-current/20 px-2 py-0.5 text-xs uppercase tracking-[0.1em]">
															{memory.categoryLabel}
														</p>
														<p className="text-xs uppercase tracking-[0.1em] text-studio-muted">
															v{memory.version ?? '?'}
														</p>
													</div>
													<p className="mt-2 text-xs text-studio-muted">
														{memory.submissionTitle}
													</p>
													{memory.quote ? (
														<p className="mt-2 border-l border-accent-300/35 pl-3 text-sm italic leading-relaxed text-studio-ink/90">
															{compactPreview(memory.quote, 130)}
														</p>
													) : null}
													<p className="mt-2 text-sm leading-relaxed text-studio-ink">
														{compactPreview(memory.comment, 150)}
													</p>
													<div className="mt-3 flex flex-wrap gap-2">
														<button
															type="button"
															disabled={isPanelSaving || isPublishedReadOnly}
															onClick={() => {
																void insertFeedbackMemoryIntoComment(memory)
															}}
															className="rounded border border-accent-300/35 bg-accent-300/10 px-3 py-1 text-xs uppercase tracking-[0.1em] text-studio-accent transition hover:bg-accent-300/18 disabled:cursor-not-allowed disabled:opacity-60">
															Insert memory
														</button>
														<Link
															href={`/app/workshop/${memory.submissionId}?focus=feedback:${memory.id}`}
															className="rounded border border-studio-line px-3 py-1 text-sm text-studio-muted transition hover:border-studio-line hover:text-studio-ink">
															Open
														</Link>
													</div>
												</div>
											</li>
										))}
									</ul>
								)}
							</div>
						</div>
					</ProtoCard>

					<ProtoCard title="Marginalia" meta="Comments and snippets">
					<p
						className={`mb-3 rounded-md border px-3 py-2 text-sm leading-relaxed ${
							liveSubmissionStatus === 'feedback_published'
								? 'border-emerald-300/25 bg-studio-canvas text-emerald-800'
								: 'border-burgundy-300/25 bg-studio-canvas text-studio-ink'
						}`}>
						{isPublishedReadOnly
							? 'Published comments are shown here for reference only.'
							: 'Draft comments and snippets stay private while you read.'}
					</p>
					<div className="mb-3 flex items-center justify-between gap-3">
						<p className="text-xs uppercase tracking-[0.1em] text-studio-muted">
							{commentCount} comments {' · '} {snippetCount} snippets
						</p>
						<button
							type="button"
							onClick={() => setIsPanelOpen((value) => !value)}
							className="rounded border border-studio-line px-3 py-1 text-sm text-studio-muted transition hover:border-studio-line hover:text-studio-ink">
							{isPanelOpen ? 'Collapse' : 'Show'}
						</button>
					</div>
					<div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-studio-line bg-studio-canvas px-3 py-2">
						<p className="text-sm text-studio-muted">
							{uncategorisedCommentCount} comments uncategorised
						</p>
						<button
							type="button"
							onClick={() => {
								setIsPanelOpen(true)
								setReviewUncategorisedOnly(true)
								const firstUncategorised = commentAnnotations.find(
									(item) => item.label === 'Uncategorised',
								)
								if (firstUncategorised) {
									focusAnnotation(firstUncategorised.id)
								}
							}}
							className="rounded border border-accent-300/40 bg-accent-300/10 px-3 py-1 text-xs uppercase tracking-[0.1em] text-studio-accent transition hover:bg-accent-300/18">
							Review categories
						</button>
					</div>
					{sidePanelError ? (
						<p className="mb-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
							{sidePanelError}
						</p>
					) : null}
					{sidePanelNotice ? (
						<p className="mb-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-800">
							{sidePanelNotice}
						</p>
					) : null}
					{!isPanelOpen ? (
						<p className="text-sm text-studio-muted">
							Annotation list hidden. Markers remain in the manuscript.
						</p>
					) : annotations.length === 0 ? (
						<p className="text-sm text-studio-muted">No annotations yet.</p>
					) : (
						<div className="max-h-[36vh] overflow-y-auto pr-1">
							<div className="space-y-4">
								<section>
									<div className="mb-2 flex items-center justify-between gap-2">
										<p className="text-xs uppercase tracking-[0.12em] text-studio-muted">
											{reviewUncategorisedOnly ? 'Uncategorised comments' : 'Comments'}
										</p>
										<button
											type="button"
											onClick={() =>
												setReviewUncategorisedOnly((value) => !value)
											}
											className="text-xs uppercase tracking-[0.1em] text-studio-muted transition hover:text-studio-ink">
											{reviewUncategorisedOnly ? 'Show all' : 'Only uncategorised'}
										</button>
									</div>
									{visibleCommentAnnotations.length === 0 ? (
										<p className="text-sm text-studio-muted">No comments yet.</p>
									) : (
										<ul className="space-y-2">
											{visibleCommentAnnotations.map((item) => {
												const feedbackItemId = item.id.replace('feedback:', '')
												const tagInputId = `tags-${feedbackItemId}`
												const isSavingThis = savingCommentId === feedbackItemId
												const isPromotingThis =
													promotingCommentId === feedbackItemId

												return (
													<li key={item.id}>
														<div
															className={`rounded-md border px-3 py-3 transition ${
																activeAnnotationId === item.id
																	? annotationBorderClass(item.type)
																	: 'border-studio-line bg-studio-canvas text-studio-muted hover:border-studio-line'
															}`}>
															<button
																type="button"
																onClick={() => focusAnnotation(item.id)}
																className="block w-full text-left">
																<div className="flex flex-wrap items-center gap-2">
																	<p className="text-xs uppercase tracking-[0.1em]">
																		Comment
																	</p>
																	<p className="rounded border border-current/20 px-2 py-0.5 text-xs uppercase tracking-[0.1em]">
																		{item.label}
																	</p>
																</div>
																<p className="mt-2 text-sm italic text-studio-ink/90">
																	{formatQuote(item.anchor.quote)}
																</p>
																<p className="mt-2 text-sm leading-relaxed text-current">
																	{item.text.trim() ? item.text : 'Draft comment'}
																</p>
															</button>
															{!isPublishedReadOnly ? (
																<div className="mt-3 space-y-2 border-t border-studio-line pt-3">
																	<label className="block">
																		<span className="mb-1 block text-xs uppercase tracking-[0.1em] text-studio-muted">
																			Category
																		</span>
																		<select
																			value={
																				fixedFeedbackCategories.includes(item.label)
																					? item.label
																					: ''
																			}
																			disabled={isSavingThis}
																			onChange={(event) => {
																				void patchCommentFromPanel({
																					annotation: item,
																					categoryLabel: event.target.value,
																				})
																			}}
																			className="w-full rounded border border-studio-line bg-studio-paper px-2.5 py-2.5 text-xs text-studio-ink">
																			<option value="">Uncategorised</option>
																			{fixedFeedbackCategories.map((category) => (
																				<option key={category} value={category}>
																					{category}
																				</option>
																			))}
																		</select>
																	</label>
																	<label htmlFor={tagInputId} className="block">
																		<span className="mb-1 block text-xs uppercase tracking-[0.1em] text-studio-muted">
																			Tags
																		</span>
																		<input
																			id={tagInputId}
																			type="text"
																			defaultValue={(item.tags ?? []).join(', ')}
																			onBlur={(event) => {
																				void patchCommentFromPanel({
																					annotation: item,
																					tags: parseTagsInput(event.target.value),
																				})
																			}}
																			className="w-full rounded border border-studio-line bg-studio-paper px-2.5 py-2.5 text-xs text-studio-ink"
																			placeholder="motivation, scene work"
																		/>
																	</label>
																	<div className="flex flex-wrap items-center gap-2">
																		<button
																			type="button"
																			disabled={isPromotingThis}
																			onClick={() => {
																				void promoteCommentToSnippet(item)
																			}}
																			className="rounded border border-accent-300/35 bg-accent-300/10 px-3 py-1 text-xs uppercase tracking-[0.1em] text-studio-accent transition hover:bg-accent-300/18 disabled:cursor-not-allowed disabled:opacity-60">
																			{isPromotingThis ? 'Saving...' : 'Save as snippet'}
																		</button>
																		{isSavingThis ? (
																			<p className="text-xs text-studio-muted">
																				Saving...
																			</p>
																		) : null}
																	</div>
																</div>
															) : null}
															{item.tags && item.tags.length > 0 ? (
																<div className="mt-2 flex flex-wrap gap-1.5">
																	{item.tags.map((tag) => (
																		<p
																			key={tag}
																			className="rounded border border-current/20 px-2 py-0.5 text-xs uppercase tracking-[0.1em]">
																			{tag}
																		</p>
																	))}
																</div>
															) : null}
														</div>
													</li>
												)
											})}
										</ul>
									)}
								</section>
								<section>
									<div className="mb-2 flex items-center justify-between gap-2">
										<p className="text-xs uppercase tracking-[0.12em] text-studio-muted">
											Snippets
										</p>
										<p className="text-xs uppercase tracking-[0.1em] text-studio-muted">
											{snippetCount}
										</p>
									</div>
									{snippetAnnotations.length === 0 ? (
										<p className="text-sm text-studio-muted">No snippets yet.</p>
									) : (
										<ul className="space-y-2">
											{snippetAnnotations.map((item) => {
												const snippetId = item.id.replace('snippet:', '')
												const isSavingThis = savingCommentId === snippetId

												return (
													<li key={item.id}>
														<div
															className={`rounded-md border px-3 py-3 transition ${
																activeAnnotationId === item.id
																	? annotationBorderClass(item.type)
																	: 'border-studio-line bg-studio-canvas text-studio-muted hover:border-studio-line'
															}`}>
															<button
																type="button"
																onClick={() => focusAnnotation(item.id)}
																className="block w-full text-left">
																<div className="flex flex-wrap items-center gap-2">
																	<p className="text-xs uppercase tracking-[0.1em]">
																		Snippet
																	</p>
																	<p className="rounded border border-current/20 px-2 py-0.5 text-xs uppercase tracking-[0.1em]">
																		{item.label}
																	</p>
																</div>
																<p className="mt-2 text-sm italic text-studio-ink/90">
																	{formatQuote(item.anchor.quote)}
																</p>
																<p className="mt-2 text-sm leading-relaxed text-current">
																	{item.text.trim()
																		? item.text
																		: 'Snippet saved without a note.'}
																</p>
															</button>
															{!isPublishedReadOnly ? (
																<label className="mt-3 block border-t border-studio-line pt-3">
																	<span className="mb-1 block text-xs uppercase tracking-[0.1em] text-studio-muted">
																		Category
																	</span>
																	<select
																		value={
																			fixedFeedbackCategories.includes(item.label)
																				? item.label
																				: ''
																		}
																		disabled={isSavingThis}
																		onChange={(event) => {
																			void patchSnippetCategoryFromPanel(
																				item,
																				event.target.value,
																			)
																		}}
																		className="w-full rounded border border-studio-line bg-studio-paper px-2.5 py-2.5 text-xs text-studio-ink">
																		<option value="">Uncategorised</option>
																		{fixedFeedbackCategories.map((category) => (
																			<option key={category} value={category}>
																				{category}
																			</option>
																		))}
																	</select>
																</label>
															) : null}
														</div>
													</li>
												)
											})}
										</ul>
									)}
								</section>
							</div>
						</div>
					)}
				</ProtoCard>

				{activeAnnotation?.type === 'snippet' ? (
					<ProtoCard
						title="Edit snippet"
						meta="Secondary editing surface">
						{sidePanelError ? (
							<p className="mb-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
								{sidePanelError}
							</p>
						) : null}
						<form onSubmit={saveActiveSnippet} className="space-y-3">
							<p className="rounded-lg border border-studio-line bg-studio-tint px-3 py-2 text-sm leading-relaxed text-studio-muted">
								{formatQuote(activeAnnotation.anchor.quote)}
							</p>
							<textarea
								name="note"
								rows={4}
								value={snippetNoteDraft}
								onChange={(event) => setSnippetNoteDraft(event.target.value)}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2 text-sm text-studio-ink"
								placeholder="Optional private note for this snippet"
							/>
							<div>
								<label className="mb-2 block text-xs uppercase tracking-[0.1em] text-studio-muted">
									Category
								</label>
								<select
									name="snippetCategoryLabel"
									value={snippetCategoryIdDraft}
									onChange={(event) =>
										setSnippetCategoryIdDraft(event.target.value)
									}
									className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink">
									<option value="">Uncategorised</option>
									{fixedSnippetCategories.map((category) => (
										<option key={category} value={category}>
											{category}
										</option>
									))}
								</select>
							</div>
							<button
								type="submit"
								disabled={isPanelSaving}
								className="studio-primary">
								{isPanelSaving ? 'Saving...' : 'Save changes'}
							</button>
						</form>
					</ProtoCard>
				) : (
					<ProtoCard title="Selected annotation" meta="Reading-first workflow">
						<p className="text-sm leading-relaxed text-studio-muted">
							{isPublishedReadOnly ? 'Select a comment marker to read the published note. Feedback for this version is read-only.' : 'Comments are edited directly in the manuscript popup. Use this rail to review the full list and refine snippets when needed.'}
						</p>
					</ProtoCard>
				)}
			</aside>
			{isPublishModalOpen ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
					<div className="w-full max-w-lg rounded-lg border border-studio-line bg-studio-canvas p-5 shadow-none">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="text-xs uppercase tracking-[0.1em] text-studio-muted">
									Final step
								</p>
								<h2 className="literary-title mt-2 text-2xl text-studio-ink">
									Publish to writer
								</h2>
							</div>
							<button
								type="button"
								onClick={() => setIsPublishModalOpen(false)}
								className="rounded border border-studio-line px-3 py-1 text-sm text-studio-muted transition hover:border-studio-line hover:text-studio-ink">
								Close
							</button>
						</div>
						<p className="mt-3 text-sm leading-relaxed text-studio-muted">
							Add an optional overview note, then publish the anchored comments.
						</p>
						<p className="mt-2 rounded-md border border-burgundy-300/25 bg-studio-canvas px-3 py-2 text-sm text-studio-ink">
							Nothing new becomes visible to the writer until you confirm publish.
						</p>
						<form onSubmit={publishToWriter} className="mt-4 space-y-4">
							<label className="block">
								<span className="mb-2 block text-xs uppercase tracking-[0.1em] text-studio-muted">
									Overview note
								</span>
								<textarea
									ref={publishTextareaRef}
									name="summary"
									rows={5}
									value={publishSummary}
									onChange={(event) => setPublishSummary(event.target.value)}
									className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2 text-sm text-studio-ink"
									placeholder="Optional short overview for the writer"
								/>
							</label>
							{publishError ? (
								<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
									{publishError}
								</p>
							) : null}
							<button type="button" disabled={isPublishing} onClick={() => setIsWriterPreviewOpen(true)} className="studio-secondary">Preview writer view</button>
							<div className="flex items-center justify-between gap-3">
								<p className="text-xs uppercase tracking-[0.1em] text-studio-muted">
									{commentCount} anchored comments
								</p>
								<button
									type="submit"
									disabled={isPublishing}
									className="rounded border border-emerald-300/60 bg-emerald-300/15 px-4 py-2 text-xs uppercase tracking-[0.1em] text-emerald-800 transition hover:bg-emerald-300/25 disabled:cursor-not-allowed disabled:opacity-60">
									{isPublishing ? 'Publishing...' : 'Confirm publish'}
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}
		</div>
	)
}
