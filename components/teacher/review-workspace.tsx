'use client'

import { Children } from 'react'
import Link from 'next/link'
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
	tags?: string[]
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
		? 'border-accent-300/35 bg-ink-950 text-parchment-100'
		: 'border-burgundy-300/35 bg-ink-950 text-parchment-100'
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
			? 'bg-transparent text-ink-900/55 line-through decoration-2 decoration-ink-900/35 ring-2 ring-silver-500/35'
			: 'bg-transparent text-ink-900/58 line-through decoration-2 decoration-ink-900/30'
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
	snippetLibrary,
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
	paragraphs: Array<{ id: string; text: string }>
	feedback: FeedbackItem[]
	snippets: SnippetItem[]
	snippetLibrary: SnippetLibraryItem[]
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
	const [liveSubmissionStatus, setLiveSubmissionStatus] = useState(submissionStatus)
	const [publishSummary, setPublishSummary] = useState(initialSummary)
	const [summaryPublishedAt, setSummaryPublishedAt] = useState(
		initialSummaryPublishedAt,
	)
	const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)
	const [publishError, setPublishError] = useState<string | null>(null)
	const [isPublishing, setIsPublishing] = useState(false)
	const [showQueueReturnCue, setShowQueueReturnCue] = useState(false)
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
		}, 650)

		return () => window.clearTimeout(timeout)
	}, [notice])

	useEffect(() => {
		if (!sidePanelNotice) {
			return
		}

		const timeout = window.setTimeout(() => {
			setSidePanelNotice(null)
		}, 1400)

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
		if (isPublishModalOpen) {
			publishTextareaRef.current?.focus()
		}
	}, [isPublishModalOpen])

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
		if (isPublishedReadOnly) {
			setSelectedAnchor(null)
			return
		}

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
		setIsInlineEditingComment(false)
		setActiveAnnotationId((current) =>
			current === annotationId ? null : annotationId,
		)
	}

	const focusAnnotation = (annotationId: string) => {
		setSelectedAnchor(null)
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
		setSelectedAnchor(null)

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
	) => {
		if (isPanelSaving || isPublishedReadOnly) {
			return
		}

		const categoryLabel = normalizeFeedbackLabel(snippet.categoryLabel)
		const tempId = `temp-feedback-${Date.now()}`
		const optimisticCreatedAt = new Date().toISOString()
		const optimisticAnchor: FeedbackAnchor = {
			blockId: anchorSelection.blockId,
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
		setSelectedAnchor(null)
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
				throw new Error(payload?.error ?? 'Unable to insert snippet.')
			}

			setFeedbackItems((current) =>
				current.map((item) =>
					item.id === tempId ? savedFeedback : item,
				),
			)
			setActiveAnnotationId(`feedback:${savedFeedback.id}`)
			setSidePanelNotice(payload.notice ?? 'Snippet inserted as comment.')
		} catch (error) {
			setFeedbackItems((current) => current.filter((item) => item.id !== tempId))
			setSidePanelError(
				error instanceof Error ? error.message : 'Unable to insert snippet.',
			)
		} finally {
			setIsPanelSaving(false)
		}
	}

	const saveSnippetIntoExistingComment = async (
		annotation: AnnotationItem,
		nextText: string,
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
				throw new Error(payload?.error ?? 'Unable to insert snippet.')
			}

			setFeedbackItems((current) =>
				current.map((item) =>
					item.id === feedbackItemId ? savedFeedback : item,
				),
			)
			setCommentDraft(savedFeedback.comment)
			setIsInlineEditingComment(false)
			setSidePanelNotice('Snippet inserted into active comment.')
		} catch (error) {
			setFeedbackItems(previousItems)
			setSidePanelError(
				error instanceof Error ? error.message : 'Unable to insert snippet.',
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
			setShowQueueReturnCue(true)
			setIsPublishModalOpen(false)
			setFlashNotice(payload?.notice ?? 'Feedback published to writer.')
		} catch (error) {
			setPublishError(
				error instanceof Error ? error.message : 'Unable to publish feedback.',
			)
		} finally {
			setIsPublishing(false)
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
						<mark className={`${getMarkClass(item.type, item.anchor.kind, isActive, item.anchor.suggestedAction)} rounded px-1 transition`}>
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
					<div className="pointer-events-none absolute right-4 top-3 z-30 rounded-full border border-emerald-300/40 bg-ink-950/95 px-3 py-1.5 text-xs text-emerald-100 shadow-lg">
						{flashNotice}
					</div>
				) : null}
				{selectedAnchor && !isPublishedReadOnly ? (
					<form
						ref={composerFormRef}
						onSubmit={submitInlineAnnotation}
						style={{
							top: `${selectedAnchor.composerTop}px`,
							left: `${selectedAnchor.composerLeft}px`,
						}}
						className="absolute z-40 w-[min(300px,calc(100%-2rem))] rounded-2xl border border-white/12 bg-ink-950/95 p-3 shadow-[0_18px_40px_rgba(0,0,0,0.3)] backdrop-blur">
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
						<label className="mt-3 block">
							<span className="mb-1.5 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
								Category
							</span>
							<select
								value={composerCategoryLabel}
								onChange={(event) => setComposerCategoryLabel(event.target.value)}
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
								<option value="">Uncategorised</option>
								{fixedFeedbackCategories.map((category) => (
									<option key={category} value={category}>
										{category}
									</option>
								))}
							</select>
						</label>
						{composerError ? (
							<p className="mt-2 text-xs text-amber-100">{composerError}</p>
						) : null}
						<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									disabled={isComposerSaving}
									onClick={() => {
										void saveNewAnnotation('cut')
									}}
									className="rounded-full border border-silver-300/30 bg-silver-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-100 transition hover:bg-silver-300/15 disabled:cursor-not-allowed disabled:opacity-60">
									Cut
								</button>
								<p className="text-[11px] text-silver-300">
									{isComposerSaving
										? 'Saving...'
										: 'Enter saves. Shift+Enter adds a new line.'}
								</p>
							</div>
							<button
								type="button"
								disabled={isComposerSaving}
								onClick={() => setSelectedAnchor(null)}
								className="text-[11px] text-silver-200 transition hover:text-parchment-100">
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
														: liveSubmissionStatus === 'feedback_published'
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
														className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
													/>
													<label className="block">
														<span className="mb-1.5 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
															Category
														</span>
														<select
															value={commentCategoryId}
															onChange={(event) =>
																setCommentCategoryId(event.target.value)
															}
															className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
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
															className="rounded-full border border-silver-300/30 bg-silver-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-100 transition hover:bg-silver-300/15">
															Cut note
														</button>
														<button
															type="submit"
															disabled={isPanelSaving}
															className="rounded-full border border-accent-400/70 bg-accent-400/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
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
															className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
															Cancel
														</button>
													</div>
													<p className="text-[11px] text-current/80">
														Enter saves. Shift+Enter adds a new line.
													</p>
												</form>
											) : (
												<div className="mt-3">
													<p className="leading-relaxed text-parchment-100">
														{activeBlockItem.text.trim()
															? activeBlockItem.text
															: 'Draft comment'}
													</p>
													<div className="mt-3 flex flex-wrap items-center gap-2">
														{!isPublishedReadOnly ? (
															<button
																type="button"
																onClick={() => setIsInlineEditingComment(true)}
																className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
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
									className="rounded-full border border-silver-300/30 bg-silver-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-100 transition hover:bg-silver-300/15">
									Cut
								</button>
							) : null}
							{canDeleteFeedback && !isPublishedReadOnly ? (
								<button
																type="button"
																onClick={deleteActiveComment}
																disabled={isDeletingAnnotation}
																className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-amber-200/40 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-60">
																{isDeletingAnnotation ? 'Deleting...' : 'Delete'}
															</button>
														) : null}
													</div>
												</div>
											)
										) : (
											<div className="mt-3 space-y-3">
												<p className="leading-relaxed text-parchment-100">
													{activeBlockItem.text.trim()
														? activeBlockItem.text
														: 'Snippet saved without a note.'}
												</p>
												{!isPublishedReadOnly ? (
													<label className="block max-w-xs">
														<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
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
															className="w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-xs text-parchment-100">
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
							<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
								Feedback status
							</p>
							<p className="mt-1 text-sm text-silver-200">
								{isPublishedReadOnly
									? 'Use this view for reference after publication.'
									: canPublishFeedback
										? 'Keep reading private until you are ready to return the piece.'
										: 'Publish from the latest reviewable version in the chain.'}
							</p>
						</div>
						<div className="flex flex-wrap items-center justify-end gap-2">
							{canLiveExportFeedback ? (
								<Link
									href={`/app/workshop/${submissionId}/export`}
									className="inline-flex rounded-full border border-white/18 bg-white/6 px-3.5 py-2 text-[11px] uppercase tracking-[0.1em] text-silver-100 shadow-[0_6px_16px_rgba(0,0,0,0.14)] transition hover:border-white/28 hover:bg-white/10 hover:text-parchment-100">
									Feedback document
								</Link>
							) : null}
							{!isPublishedReadOnly && canPublishFeedback ? (
								<button
									type="button"
									onClick={() => {
										setPublishError(null)
										setIsPublishModalOpen(true)
									}}
									className="inline-flex rounded-full border border-emerald-300/55 bg-emerald-300/14 px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-emerald-100 shadow-[0_8px_18px_rgba(0,0,0,0.18)] transition hover:-translate-y-[1px] hover:bg-emerald-300/20 active:translate-y-0">
									Publish to writer
								</button>
							) : null}
						</div>
					</div>
					<p
						className={`mt-3 rounded-xl border px-3 py-2 text-sm leading-relaxed ${
							liveSubmissionStatus === 'feedback_published'
								? 'border-emerald-300/25 bg-ink-950 text-emerald-100'
								: 'border-burgundy-300/25 bg-ink-950 text-parchment-100'
						}`}>
						{isPublishedReadOnly
							? 'Feedback has been published for this version. It is now read-only. Use this view for reference; further feedback should happen on a new submission or revised version.'
							: canPublishFeedback
								? 'Draft comments and snippets stay private while you read.'
								: 'A newer version exists. Open that draft to continue active review or publish new feedback.'}
					</p>
					{summaryPublishedAt ? (
						<p className="mt-2 text-xs text-silver-300">
							Last published {new Date(summaryPublishedAt).toLocaleString()}
						</p>
					) : null}
					{!canLiveExportFeedback ? (
						<p className="mt-2 text-xs text-silver-300">
							Feedback must be published before export is available.
						</p>
					) : null}
					{showQueueReturnCue ? (
						<Link
							href="/app/teacher/review-desk"
							className="mt-3 inline-flex rounded-full border border-accent-300/50 bg-accent-300/12 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-accent-100 shadow-[0_0_18px_rgba(207,184,124,0.16)] animate-pulse">
							Back to queue
						</Link>
					) : null}
				</div>
				{Children.toArray(sidebarHeader)}
				{errorNotice ? (
					<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
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
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
								placeholder="Search snippets"
							/>
							<select
								value={snippetSearchCategory}
								onChange={(event) => setSnippetSearchCategory(event.target.value)}
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
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
								<p className="text-sm text-silver-300">
									No snippets found.
								</p>
							) : (
								<ul className="space-y-2">
									{filteredSnippetLibrary.map((snippet) => {
										const text = snippetText(snippet)

										return (
											<li key={snippet.id}>
												<div className="rounded-xl border border-white/10 bg-ink-900/35 px-3 py-3 text-silver-100">
													<div className="flex flex-wrap items-center gap-2">
														<p className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]">
															{snippet.categoryLabel}
														</p>
														<p className="text-[10px] uppercase tracking-[0.1em] text-silver-400">
															{new Date(snippet.createdAt).toLocaleDateString()}
														</p>
													</div>
													<p className="mt-2 text-sm leading-relaxed text-parchment-100">
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
														className="mt-3 rounded-full border border-accent-300/35 bg-accent-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-accent-100 transition hover:bg-accent-300/18 disabled:cursor-not-allowed disabled:opacity-60">
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

				<ProtoCard title="Marginalia" meta="Comments and snippets">
					<p
						className={`mb-3 rounded-xl border px-3 py-2 text-sm leading-relaxed ${
							liveSubmissionStatus === 'feedback_published'
								? 'border-emerald-300/25 bg-ink-950 text-emerald-100'
								: 'border-burgundy-300/25 bg-ink-950 text-parchment-100'
						}`}>
						{isPublishedReadOnly
							? 'Published comments are shown here for reference only.'
							: 'Draft comments and snippets stay private while you read.'}
					</p>
					<div className="mb-3 flex items-center justify-between gap-3">
						<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
							{commentCount} comments {' · '} {snippetCount} snippets
						</p>
						<button
							type="button"
							onClick={() => setIsPanelOpen((value) => !value)}
							className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
							{isPanelOpen ? 'Collapse' : 'Show'}
						</button>
					</div>
					<div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950 px-3 py-2">
						<p className="text-sm text-silver-100">
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
							className="rounded-full border border-accent-300/40 bg-accent-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-accent-100 transition hover:bg-accent-300/18">
							Review categories
						</button>
					</div>
					{sidePanelError ? (
						<p className="mb-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
							{sidePanelError}
						</p>
					) : null}
					{sidePanelNotice ? (
						<p className="mb-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
							{sidePanelNotice}
						</p>
					) : null}
					{!isPanelOpen ? (
						<p className="text-sm text-silver-200">
							Annotation list hidden. Markers remain in the manuscript.
						</p>
					) : annotations.length === 0 ? (
						<p className="text-sm text-silver-200">No annotations yet.</p>
					) : (
						<div className="max-h-[36vh] overflow-y-auto pr-1">
							<div className="space-y-4">
								<section>
									<div className="mb-2 flex items-center justify-between gap-2">
										<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
											{reviewUncategorisedOnly ? 'Uncategorised comments' : 'Comments'}
										</p>
										<button
											type="button"
											onClick={() =>
												setReviewUncategorisedOnly((value) => !value)
											}
											className="text-[10px] uppercase tracking-[0.1em] text-silver-300 transition hover:text-parchment-100">
											{reviewUncategorisedOnly ? 'Show all' : 'Only uncategorised'}
										</button>
									</div>
									{visibleCommentAnnotations.length === 0 ? (
										<p className="text-sm text-silver-300">No comments yet.</p>
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
															className={`rounded-xl border px-3 py-3 transition ${
																activeAnnotationId === item.id
																	? annotationBorderClass(item.type)
																	: 'border-white/10 bg-ink-900/35 text-silver-100 hover:border-white/20'
															}`}>
															<button
																type="button"
																onClick={() => focusAnnotation(item.id)}
																className="block w-full text-left">
																<div className="flex flex-wrap items-center gap-2">
																	<p className="text-[11px] uppercase tracking-[0.1em]">
																		Comment
																	</p>
																	<p className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]">
																		{item.label}
																	</p>
																</div>
																<p className="mt-2 text-sm italic text-parchment-100/90">
																	{formatQuote(item.anchor.quote)}
																</p>
																<p className="mt-2 text-sm leading-relaxed text-current">
																	{item.text.trim() ? item.text : 'Draft comment'}
																</p>
															</button>
															{!isPublishedReadOnly ? (
																<div className="mt-3 space-y-2 border-t border-white/10 pt-3">
																	<label className="block">
																		<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
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
																			className="w-full rounded-lg border border-white/15 bg-ink-950 px-2.5 py-2 text-xs text-parchment-100">
																			<option value="">Uncategorised</option>
																			{fixedFeedbackCategories.map((category) => (
																				<option key={category} value={category}>
																					{category}
																				</option>
																			))}
																		</select>
																	</label>
																	<label htmlFor={tagInputId} className="block">
																		<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
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
																			className="w-full rounded-lg border border-white/15 bg-ink-950 px-2.5 py-2 text-xs text-parchment-100"
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
																			className="rounded-full border border-accent-300/35 bg-accent-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-accent-100 transition hover:bg-accent-300/18 disabled:cursor-not-allowed disabled:opacity-60">
																			{isPromotingThis ? 'Saving...' : 'Save as snippet'}
																		</button>
																		{isSavingThis ? (
																			<p className="text-[11px] text-silver-300">
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
																			className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]">
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
										<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
											Snippets
										</p>
										<p className="text-[10px] uppercase tracking-[0.1em] text-silver-400">
											{snippetCount}
										</p>
									</div>
									{snippetAnnotations.length === 0 ? (
										<p className="text-sm text-silver-300">No snippets yet.</p>
									) : (
										<ul className="space-y-2">
											{snippetAnnotations.map((item) => {
												const snippetId = item.id.replace('snippet:', '')
												const isSavingThis = savingCommentId === snippetId

												return (
													<li key={item.id}>
														<div
															className={`rounded-xl border px-3 py-3 transition ${
																activeAnnotationId === item.id
																	? annotationBorderClass(item.type)
																	: 'border-white/10 bg-ink-900/35 text-silver-100 hover:border-white/20'
															}`}>
															<button
																type="button"
																onClick={() => focusAnnotation(item.id)}
																className="block w-full text-left">
																<div className="flex flex-wrap items-center gap-2">
																	<p className="text-[11px] uppercase tracking-[0.1em]">
																		Snippet
																	</p>
																	<p className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]">
																		{item.label}
																	</p>
																</div>
																<p className="mt-2 text-sm italic text-parchment-100/90">
																	{formatQuote(item.anchor.quote)}
																</p>
																<p className="mt-2 text-sm leading-relaxed text-current">
																	{item.text.trim()
																		? item.text
																		: 'Snippet saved without a note.'}
																</p>
															</button>
															{!isPublishedReadOnly ? (
																<label className="mt-3 block border-t border-white/10 pt-3">
																	<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
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
																		className="w-full rounded-lg border border-white/15 bg-ink-950 px-2.5 py-2 text-xs text-parchment-100">
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
							<p className="mb-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
								{sidePanelError}
							</p>
						) : null}
						<form onSubmit={saveActiveSnippet} className="space-y-3">
							<p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-silver-100">
								{formatQuote(activeAnnotation.anchor.quote)}
							</p>
							<textarea
								name="note"
								rows={4}
								value={snippetNoteDraft}
								onChange={(event) => setSnippetNoteDraft(event.target.value)}
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
								placeholder="Optional private note for this snippet"
							/>
							<div>
								<label className="mb-2 block text-xs uppercase tracking-[0.1em] text-silver-300">
									Category
								</label>
								<select
									name="snippetCategoryLabel"
									value={snippetCategoryIdDraft}
									onChange={(event) =>
										setSnippetCategoryIdDraft(event.target.value)
									}
									className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
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
								className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
								{isPanelSaving ? 'Saving...' : 'Save changes'}
							</button>
						</form>
					</ProtoCard>
				) : (
					<ProtoCard title="Selected annotation" meta="Reading-first workflow">
						<p className="text-sm leading-relaxed text-silver-200">
							Comments are edited directly in the manuscript popup. Use this rail
							to review the full list and refine snippets when needed.
						</p>
					</ProtoCard>
				)}
			</aside>
			{isPublishModalOpen ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/65 px-4 backdrop-blur-sm">
					<div className="w-full max-w-lg rounded-3xl border border-white/12 bg-ink-950 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
									Final step
								</p>
								<h2 className="literary-title mt-2 text-2xl text-parchment-100">
									Publish to writer
								</h2>
							</div>
							<button
								type="button"
								onClick={() => setIsPublishModalOpen(false)}
								className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
								Close
							</button>
						</div>
						<p className="mt-3 text-sm leading-relaxed text-silver-200">
							Add an optional overview note, then publish the anchored comments.
						</p>
						<p className="mt-2 rounded-xl border border-burgundy-300/25 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
							Nothing new becomes visible to the writer until you confirm publish.
						</p>
						<form onSubmit={publishToWriter} className="mt-4 space-y-4">
							<label className="block">
								<span className="mb-2 block text-xs uppercase tracking-[0.1em] text-silver-300">
									Overview note
								</span>
								<textarea
									ref={publishTextareaRef}
									name="summary"
									rows={5}
									value={publishSummary}
									onChange={(event) => setPublishSummary(event.target.value)}
									className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
									placeholder="Optional short overview for the writer"
								/>
							</label>
							{publishError ? (
								<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
									{publishError}
								</p>
							) : null}
							{/* TODO: later allow importing an earlier version summary into a new publish draft. */}
							<div className="flex items-center justify-between gap-3">
								<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
									{commentCount} anchored comments
								</p>
								<button
									type="submit"
									disabled={isPublishing}
									className="rounded-full border border-emerald-300/60 bg-emerald-300/15 px-4 py-2 text-xs uppercase tracking-[0.1em] text-emerald-100 transition hover:bg-emerald-300/25 disabled:cursor-not-allowed disabled:opacity-60">
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
