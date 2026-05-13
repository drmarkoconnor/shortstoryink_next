'use client'

import Link from 'next/link'
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type FormEvent,
} from 'react'
import {
	fixedSnippetCategories,
	normalizeSnippetLabel,
} from '@/lib/feedback/categories'
import { cleanSnippetText } from '@/lib/snippets/text-cleanup'
import {
	normalizeSnippetStatus,
	snippetStatuses,
	snippetStatusLabels,
	snippetStatusRank,
	type SnippetStatus,
	snippetUseFlagLabels,
	snippetUseFlags,
	type SnippetUseFlag,
} from '@/lib/snippets/workbench'
import {
	isNearTeacherLibraryLimit,
	teacherSnippetLibraryLimit,
} from '@/lib/teacher-library/query-limits'

export type SnippetLibraryEntry = {
	id: string
	text: string
	note: string
	createdAt: string
	updatedAt: string
	categoryLabel: string
	categorySlug: string
	tags: string[]
	status: SnippetStatus
	useFlags: SnippetUseFlag[]
	sourceSubmissionId: string | null
	sourceType: string | null
	sourceLabel: string
	sourceTitle: string
	sourceName: string
	sourceUrl: string
	sourceSection: string
}

type SnippetUpdate = {
	text: string
	note: string
	categoryLabel: string
	tags: string[]
	status: SnippetStatus
	useFlags: SnippetUseFlag[]
}

type SavedSnippet = Omit<
	SnippetLibraryEntry,
	| 'sourceSubmissionId'
	| 'sourceType'
	| 'sourceLabel'
	| 'sourceTitle'
	| 'sourceName'
	| 'sourceUrl'
	| 'sourceSection'
>

type SortMode = 'status' | 'recent' | 'oldest' | 'category' | 'source'

type TriageSuggestion = {
	id: string
	recommendFavourite: boolean
	recommendedStatus: SnippetStatus
	categoryLabel: string
	useFlags: SnippetUseFlag[]
	tags: string[]
	confidence: 'low' | 'medium' | 'high'
	reason: string
}

function compactPreview(value: string, limit = 140) {
	const normalized = value.replace(/\s+/g, ' ').trim()
	if (normalized.length <= limit) {
		return normalized
	}
	return `${normalized.slice(0, limit - 1).trimEnd()}...`
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

function mergeTags(current: string[], additions: string[]) {
	return [...new Set([...current, ...additions])].slice(0, 12)
}

function sameStringList(left: string[], right: string[]) {
	if (left.length !== right.length) {
		return false
	}

	return left.every((item, index) => item === right[index])
}

function sourceFilterValue(snippet: SnippetLibraryEntry) {
	if (snippet.sourceType === 'external') {
		return 'external'
	}
	if (snippet.sourceType === 'feedback_item') {
		return 'feedback_item'
	}
	if (snippet.sourceType === 'submission') {
		return 'submission'
	}
	return 'no-source'
}

function sourceTypeLabel(value: string | null) {
	if (value === 'external') {
		return 'External'
	}
	if (value === 'feedback_item') {
		return 'Feedback'
	}
	if (value === 'submission') {
		return 'Submission'
	}
	return 'No source'
}

function sourceSummary(snippet: SnippetLibraryEntry) {
	return [
		snippet.sourceLabel,
		snippet.sourceTitle,
		snippet.sourceName,
		snippet.sourceSection,
	]
		.map((part) => part.trim())
		.filter(Boolean)
		.join(' / ')
}

function formatShortDate(value: string) {
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return ''
	}

	return parsed.toLocaleDateString(undefined, {
		day: '2-digit',
		month: 'short',
		year: '2-digit',
	})
}

function sortDate(value: string) {
	const parsed = Date.parse(value)
	return Number.isNaN(parsed) ? 0 : parsed
}

function loadLimitTitle(count: number, limit: number) {
	if (isNearTeacherLibraryLimit(count, limit)) {
		return `Approaching the temporary client load limit of ${limit}. Pagination and server-side search should come next if the library keeps growing.`
	}
	return `This client view currently loads up to ${limit} snippets.`
}

function responseToSnippet(
	current: SnippetLibraryEntry,
	saved: SavedSnippet,
): SnippetLibraryEntry {
	return {
		...current,
		...saved,
		status: normalizeSnippetStatus(saved.status),
		useFlags: saved.useFlags,
		sourceSubmissionId: current.sourceSubmissionId,
		sourceType: current.sourceType,
		sourceLabel: current.sourceLabel,
		sourceTitle: current.sourceTitle,
		sourceName: current.sourceName,
		sourceUrl: current.sourceUrl,
		sourceSection: current.sourceSection,
	}
}

function hasSnippetChanges(snippet: SnippetLibraryEntry, next: SnippetUpdate) {
	return (
		cleanSnippetText(snippet.text) !== next.text ||
		snippet.note.trim() !== next.note ||
		snippet.categoryLabel !== next.categoryLabel ||
		snippet.status !== next.status ||
		!sameStringList(snippet.tags, next.tags) ||
		!sameStringList(snippet.useFlags, next.useFlags)
	)
}

async function updateSnippetOnServer(
	snippet: SnippetLibraryEntry,
	next: SnippetUpdate,
) {
	const response = await fetch(`/api/teacher/snippets/${snippet.id}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(next),
	})
	const payload = (await response.json()) as
		| { error?: string; notice?: string; snippet?: SavedSnippet }
		| undefined

	if (!response.ok || payload?.error || !payload?.snippet) {
		throw new Error(payload?.error ?? 'Unable to save snippet.')
	}

	return payload
}

export function SnippetLibrary({
	initialSnippets,
}: {
	initialSnippets: SnippetLibraryEntry[]
}) {
	const [snippets, setSnippets] = useState(initialSnippets)
	const [searchQuery, setSearchQuery] = useState('')
	const [categoryFilter, setCategoryFilter] = useState('')
	const [statusFilter, setStatusFilter] = useState('')
	const [useFilter, setUseFilter] = useState('')
	const [sourceFilter, setSourceFilter] = useState('')
	const [noteFilter, setNoteFilter] = useState('')
	const [tagFilter, setTagFilter] = useState('')
	const [sortMode, setSortMode] = useState<SortMode>('status')
	const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null)
	const [draftText, setDraftText] = useState('')
	const [draftCategory, setDraftCategory] = useState('')
	const [draftTags, setDraftTags] = useState('')
	const [draftNote, setDraftNote] = useState('')
	const [draftStatus, setDraftStatus] = useState<SnippetStatus>('raw')
	const [draftUseFlags, setDraftUseFlags] = useState<SnippetUseFlag[]>([])
	const [bulkCategory, setBulkCategory] = useState('')
	const [bulkStatus, setBulkStatus] = useState('')
	const [bulkUseFlag, setBulkUseFlag] = useState('')
	const [bulkTags, setBulkTags] = useState('')
	const [aiSuggestions, setAiSuggestions] = useState<Record<string, TriageSuggestion>>({})
	const [selectedAiSuggestionIds, setSelectedAiSuggestionIds] = useState<string[]>([])
	const [focusedTableSnippetIds, setFocusedTableSnippetIds] = useState<string[]>([])
	const [lastFailedTriageIds, setLastFailedTriageIds] = useState<string[]>([])
	const [isTriaging, setIsTriaging] = useState(false)
	const [savingSnippetId, setSavingSnippetId] = useState<string | null>(null)
	const [deletingSnippetId, setDeletingSnippetId] = useState<string | null>(null)
	const [selectedSnippetIds, setSelectedSnippetIds] = useState<string[]>([])
	const [notice, setNotice] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const tableSectionRef = useRef<HTMLDivElement | null>(null)

	const clearMessages = useCallback(() => {
		setNotice(null)
		setError(null)
	}, [])

	const activeSnippet = useMemo(
		() => snippets.find((snippet) => snippet.id === activeSnippetId) ?? null,
		[activeSnippetId, snippets],
	)

	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = {
			Uncategorised: 0,
		}

		for (const category of fixedSnippetCategories) {
			counts[category] = 0
		}

		for (const snippet of snippets) {
			const label = fixedSnippetCategories.includes(snippet.categoryLabel)
				? snippet.categoryLabel
				: 'Uncategorised'
			counts[label] = (counts[label] ?? 0) + 1
		}

		return counts
	}, [snippets])

	const statusCounts = useMemo(() => {
		const counts = Object.fromEntries(
			snippetStatuses.map((status) => [status, 0]),
		) as Record<SnippetStatus, number>

		for (const snippet of snippets) {
			counts[snippet.status] = (counts[snippet.status] ?? 0) + 1
		}

		return counts
	}, [snippets])

	const useCounts = useMemo(() => {
		const counts = Object.fromEntries(
			snippetUseFlags.map((flag) => [flag, 0]),
		) as Record<SnippetUseFlag, number>

		for (const snippet of snippets) {
			for (const flag of snippet.useFlags) {
				counts[flag] = (counts[flag] ?? 0) + 1
			}
		}

		return counts
	}, [snippets])

	const sourceCounts = useMemo(() => {
		const counts: Record<string, number> = {
			external: 0,
			submission: 0,
			feedback_item: 0,
			'no-source': 0,
		}

		for (const snippet of snippets) {
			const source = sourceFilterValue(snippet)
			counts[source] = (counts[source] ?? 0) + 1
		}

		return counts
	}, [snippets])

	const noteCounts = useMemo(() => {
		return snippets.reduce(
			(counts, snippet) => {
				if (snippet.note.trim()) {
					counts.withNote += 1
				} else {
					counts.withoutNote += 1
				}
				return counts
			},
			{ withNote: 0, withoutNote: 0 },
		)
	}, [snippets])

	const filteredSnippets = useMemo(() => {
		const query = searchQuery.trim().toLowerCase()
		const tagQuery = tagFilter.trim().toLowerCase()
		const focusedSet = new Set(focusedTableSnippetIds)
		const source =
			focusedTableSnippetIds.length > 0
				? snippets.filter((snippet) => focusedSet.has(snippet.id))
				: snippets

		const filtered = source.filter((snippet) => {
			if (categoryFilter === 'uncategorised' && snippet.categoryLabel !== 'Uncategorised') {
				return false
			}
			if (
				categoryFilter &&
				categoryFilter !== 'uncategorised' &&
				snippet.categoryLabel !== categoryFilter
			) {
				return false
			}
			if (statusFilter && snippet.status !== statusFilter) {
				return false
			}
			if (useFilter && !snippet.useFlags.includes(useFilter as SnippetUseFlag)) {
				return false
			}
			if (sourceFilter && sourceFilterValue(snippet) !== sourceFilter) {
				return false
			}
			if (noteFilter === 'with-note' && !snippet.note.trim()) {
				return false
			}
			if (noteFilter === 'without-note' && snippet.note.trim()) {
				return false
			}
			if (
				tagQuery &&
				!snippet.tags.some((tag) => tag.toLowerCase().includes(tagQuery))
			) {
				return false
			}

			if (!query) {
				return true
			}

			const haystack = [
				snippet.text,
				snippet.note,
				snippet.categoryLabel,
				snippetStatusLabels[snippet.status],
				...snippet.useFlags.map((flag) => snippetUseFlagLabels[flag]),
				snippet.sourceLabel,
				snippet.sourceTitle,
				snippet.sourceName,
				snippet.sourceUrl,
				snippet.sourceSection,
				...snippet.tags,
			]
				.join(' ')
				.toLowerCase()

			return haystack.includes(query)
		})

		return filtered.sort((left, right) => {
			if (sortMode === 'recent') {
				return sortDate(right.createdAt) - sortDate(left.createdAt)
			}
			if (sortMode === 'oldest') {
				return sortDate(left.createdAt) - sortDate(right.createdAt)
			}
			if (sortMode === 'category') {
				return (
					left.categoryLabel.localeCompare(right.categoryLabel) ||
					sortDate(right.createdAt) - sortDate(left.createdAt)
				)
			}
			if (sortMode === 'source') {
				return (
					sourceSummary(left).localeCompare(sourceSummary(right)) ||
					sortDate(right.createdAt) - sortDate(left.createdAt)
				)
			}

			return (
				snippetStatusRank[left.status] - snippetStatusRank[right.status] ||
				sortDate(right.createdAt) - sortDate(left.createdAt)
			)
		})
	}, [
		categoryFilter,
		noteFilter,
		searchQuery,
		snippets,
		sortMode,
		sourceFilter,
		statusFilter,
		tagFilter,
		useFilter,
		focusedTableSnippetIds,
	])

	const visibleSnippetIds = useMemo(
		() => filteredSnippets.map((snippet) => snippet.id),
		[filteredSnippets],
	)
	const selectedVisibleSnippetIds = useMemo(
		() => selectedSnippetIds.filter((id) => visibleSnippetIds.includes(id)),
		[selectedSnippetIds, visibleSnippetIds],
	)
	const aiTargetSnippets = useMemo(() => {
		const selectedSet = new Set(selectedVisibleSnippetIds)
		const source =
			selectedVisibleSnippetIds.length > 0
				? filteredSnippets.filter((snippet) => selectedSet.has(snippet.id))
				: filteredSnippets

		return source
			.filter((snippet) => snippet.categoryLabel === 'Uncategorised')
			.slice(0, 30)
	}, [filteredSnippets, selectedVisibleSnippetIds])
	const aiSuggestionEntries = useMemo(() => {
		return Object.values(aiSuggestions)
			.map((suggestion) => {
				const snippet = snippets.find((item) => item.id === suggestion.id)
				return snippet ? { suggestion, snippet } : null
			})
			.filter(
				(entry): entry is { suggestion: TriageSuggestion; snippet: SnippetLibraryEntry } =>
					Boolean(entry),
			)
			.sort((left, right) => {
				const leftFavourite =
					left.suggestion.recommendFavourite ||
					left.suggestion.recommendedStatus === 'favourite'
						? 0
						: 1
				const rightFavourite =
					right.suggestion.recommendFavourite ||
					right.suggestion.recommendedStatus === 'favourite'
						? 0
						: 1
				return (
					leftFavourite - rightFavourite ||
					snippetStatusRank[left.suggestion.recommendedStatus] -
						snippetStatusRank[right.suggestion.recommendedStatus] ||
					left.snippet.text.localeCompare(right.snippet.text)
				)
			})
	}, [aiSuggestions, snippets])
	const selectedAiSuggestionCount = selectedAiSuggestionIds.filter((id) =>
		Boolean(aiSuggestions[id]),
	).length
	const allAiSuggestionsSelected =
		aiSuggestionEntries.length > 0 &&
		aiSuggestionEntries.every((entry) =>
			selectedAiSuggestionIds.includes(entry.suggestion.id),
		)
	const allVisibleSelected =
		visibleSnippetIds.length > 0 &&
		visibleSnippetIds.every((id) => selectedSnippetIds.includes(id))
	const isBulkSaving = savingSnippetId === 'bulk'
	const isBulkDeleting = deletingSnippetId === 'bulk'
	const isNearSnippetLoadLimit = isNearTeacherLibraryLimit(
		snippets.length,
		teacherSnippetLibraryLimit,
	)

	const currentDraft = useCallback((): SnippetUpdate | null => {
		const text = cleanSnippetText(draftText)
		if (!text) {
			return null
		}

		return {
			text,
			note: draftNote.trim(),
			categoryLabel: normalizeSnippetLabel(draftCategory),
			tags: parseTagsInput(draftTags),
			status: draftStatus,
			useFlags: draftUseFlags,
		}
	}, [draftCategory, draftNote, draftStatus, draftTags, draftText, draftUseFlags])

	const hasActiveDraftChanges = useMemo(() => {
		const next = currentDraft()
		return Boolean(activeSnippet && next && hasSnippetChanges(activeSnippet, next))
	}, [activeSnippet, currentDraft])

	useEffect(() => {
		setSelectedSnippetIds((current) =>
			current.filter((id) => snippets.some((snippet) => snippet.id === id)),
		)
		setSelectedAiSuggestionIds((current) =>
			current.filter((id) => snippets.some((snippet) => snippet.id === id)),
		)
		setFocusedTableSnippetIds((current) =>
			current.filter((id) => snippets.some((snippet) => snippet.id === id)),
		)
		setLastFailedTriageIds((current) =>
			current.filter((id) => snippets.some((snippet) => snippet.id === id)),
		)
		setAiSuggestions((current) => {
			const validIds = new Set(snippets.map((snippet) => snippet.id))
			return Object.fromEntries(
				Object.entries(current).filter(([id]) => validIds.has(id)),
			)
		})
	}, [snippets])

	useEffect(() => {
		if (!notice) {
			return
		}

		const timeout = window.setTimeout(() => {
			setNotice(null)
		}, 1800)

		return () => window.clearTimeout(timeout)
	}, [notice])

	const loadDraftFromSnippet = (snippet: SnippetLibraryEntry) => {
		setDraftText(cleanSnippetText(snippet.text))
		setDraftCategory(
			fixedSnippetCategories.includes(snippet.categoryLabel)
				? snippet.categoryLabel
				: '',
		)
		setDraftTags(snippet.tags.join(', '))
		setDraftNote(snippet.note)
		setDraftStatus(snippet.status)
		setDraftUseFlags(snippet.useFlags)
	}

	const openSnippet = (snippet: SnippetLibraryEntry) => {
		if (activeSnippetId === snippet.id) {
			return
		}
		if (
			hasActiveDraftChanges &&
			!window.confirm('Discard unsaved snippet edits?')
		) {
			return
		}

		loadDraftFromSnippet(snippet)
		setActiveSnippetId(snippet.id)
		clearMessages()
	}

	const closeActiveSnippet = () => {
		if (
			hasActiveDraftChanges &&
			!window.confirm('Close without saving this snippet?')
		) {
			return
		}

		setActiveSnippetId(null)
		clearMessages()
	}

	const saveActiveSnippet = useCallback(
		async (options: { keepalive?: boolean; silent?: boolean } = {}) => {
			if (!activeSnippet) {
				return
			}

			const next = currentDraft()
			if (!next) {
				setError('Snippet text cannot be empty.')
				return
			}

			if (!hasSnippetChanges(activeSnippet, next)) {
				if (!options.silent) {
					setNotice('No changes to save.')
				}
				return
			}

			if (!options.silent) {
				setSavingSnippetId(activeSnippet.id)
				clearMessages()
			}

			try {
				const response = await fetch(`/api/teacher/snippets/${activeSnippet.id}`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					keepalive: options.keepalive,
					body: JSON.stringify(next),
				})
				const payload = (await response.json()) as
					| { error?: string; notice?: string; snippet?: SavedSnippet }
					| undefined

				if (!response.ok || payload?.error || !payload?.snippet) {
					throw new Error(payload?.error ?? 'Unable to save snippet.')
				}

				setSnippets((current) =>
					current.map((item) =>
						item.id === activeSnippet.id
							? responseToSnippet(item, payload.snippet as SavedSnippet)
							: item,
					),
				)
				if (!options.silent) {
					setNotice(payload.notice ?? 'Snippet updated.')
				}
			} catch (saveError) {
				if (!options.silent) {
					setError(
						saveError instanceof Error
							? saveError.message
							: 'Unable to save snippet.',
					)
				}
			} finally {
				if (!options.silent) {
					setSavingSnippetId(null)
				}
			}
		},
		[activeSnippet, clearMessages, currentDraft],
	)

	const saveSnippet = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		await saveActiveSnippet()
	}

	useEffect(() => {
		const autosaveActiveSnippet = (keepalive = false) => {
			if (!activeSnippet || savingSnippetId === activeSnippet.id) {
				return
			}
			if (!hasActiveDraftChanges) {
				return
			}

			void saveActiveSnippet({
				keepalive,
				silent: true,
			})
		}

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'hidden') {
				autosaveActiveSnippet(true)
			}
		}

		const handlePageHide = () => autosaveActiveSnippet(true)
		const handleDocumentClick = (event: MouseEvent) => {
			const target = event.target
			if (!(target instanceof Element)) {
				return
			}

			const link = target.closest('a[href]')
			if (link) {
				autosaveActiveSnippet(true)
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)
		window.addEventListener('pagehide', handlePageHide)
		document.addEventListener('click', handleDocumentClick, { capture: true })

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
			window.removeEventListener('pagehide', handlePageHide)
			document.removeEventListener('click', handleDocumentClick, { capture: true })
		}
	}, [
		activeSnippet,
		hasActiveDraftChanges,
		saveActiveSnippet,
		savingSnippetId,
	])

	const deleteSnippet = async (snippet: SnippetLibraryEntry) => {
		if (!window.confirm('Delete this snippet? This cannot be undone.')) {
			return
		}

		const previousSnippets = snippets

		setDeletingSnippetId(snippet.id)
		clearMessages()
		setSnippets((current) => current.filter((item) => item.id !== snippet.id))

		try {
			const response = await fetch(`/api/teacher/snippets/${snippet.id}`, {
				method: 'DELETE',
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string; deletedId?: string }
				| undefined

			if (!response.ok || payload?.error) {
				throw new Error(payload?.error ?? 'Unable to delete snippet.')
			}

			setActiveSnippetId((current) => (current === snippet.id ? null : current))
			setSelectedSnippetIds((current) =>
				current.filter((id) => id !== snippet.id),
			)
			setNotice(payload?.notice ?? 'Snippet deleted.')
		} catch (deleteError) {
			setSnippets(previousSnippets)
			setError(
				deleteError instanceof Error
					? deleteError.message
					: 'Unable to delete snippet.',
			)
		} finally {
			setDeletingSnippetId(null)
		}
	}

	const toggleSnippetSelection = (snippetId: string) => {
		clearMessages()
		setSelectedSnippetIds((current) =>
			current.includes(snippetId)
				? current.filter((id) => id !== snippetId)
				: [...current, snippetId],
		)
	}

	const toggleAllVisibleSelections = () => {
		clearMessages()
		if (allVisibleSelected) {
			setSelectedSnippetIds((current) =>
				current.filter((id) => !visibleSnippetIds.includes(id)),
			)
			return
		}

		setSelectedSnippetIds((current) => [
			...current,
			...visibleSnippetIds.filter((id) => !current.includes(id)),
		])
	}

	const applyBulkUpdate = async () => {
		const selectedSet = new Set(selectedVisibleSnippetIds)
		const targets = snippets.filter((snippet) => selectedSet.has(snippet.id))
		const nextTags = parseTagsInput(bulkTags)
		const hasBulkChange = Boolean(
			bulkCategory || bulkStatus || bulkUseFlag || nextTags.length,
		)

		if (targets.length === 0) {
			setError('Select at least one visible snippet first.')
			return
		}
		if (!hasBulkChange) {
			setError('Choose a bulk category, status, use flag, or tag first.')
			return
		}

		setSavingSnippetId('bulk')
		clearMessages()

		try {
			const responses = await Promise.all(
				targets.map(async (snippet) => {
					const categoryLabel = bulkCategory
						? normalizeSnippetLabel(bulkCategory)
						: snippet.categoryLabel
					const status = bulkStatus
						? normalizeSnippetStatus(bulkStatus)
						: snippet.status
					const useFlags =
						bulkUseFlag && snippetUseFlags.includes(bulkUseFlag as SnippetUseFlag)
							? [
									...new Set([
										...snippet.useFlags,
										bulkUseFlag as SnippetUseFlag,
									]),
								]
							: snippet.useFlags
					const next: SnippetUpdate = {
						text: cleanSnippetText(snippet.text),
						note: snippet.note.trim(),
						categoryLabel,
						tags: nextTags.length ? mergeTags(snippet.tags, nextTags) : snippet.tags,
						status,
						useFlags,
					}

					const response = await updateSnippetOnServer(snippet, next)
					return { id: snippet.id, snippet: response.snippet as SavedSnippet }
				}),
			)

			const savedById = new Map(
				responses.map((response) => [response.id, response.snippet]),
			)
			setSnippets((current) =>
				current.map((snippet) => {
					const saved = savedById.get(snippet.id)
					return saved ? responseToSnippet(snippet, saved) : snippet
				}),
			)
			setSelectedSnippetIds((current) =>
				current.filter((id) => !selectedSet.has(id)),
			)
			setBulkCategory('')
			setBulkStatus('')
			setBulkUseFlag('')
			setBulkTags('')
			setNotice(
				responses.length === 1
					? 'Snippet updated.'
					: `${responses.length} snippets updated.`,
			)
		} catch (bulkError) {
			setError(
				bulkError instanceof Error
					? bulkError.message
					: 'Unable to update selected snippets.',
			)
		} finally {
			setSavingSnippetId(null)
		}
	}

	const runAiTriage = async (retrySnippetIds: string[] = []) => {
		const retrySet = new Set(retrySnippetIds)
		const targetSnippets =
			retrySnippetIds.length > 0
				? snippets.filter((snippet) => retrySet.has(snippet.id))
				: aiTargetSnippets

		if (targetSnippets.length === 0) {
			setError('No uncategorised snippets are visible for AI triage.')
			return
		}

		setIsTriaging(true)
		clearMessages()

		try {
			const response = await fetch('/api/teacher/snippets/triage', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					snippetIds: targetSnippets.map((snippet) => snippet.id),
				}),
			})
			const payload = (await response.json()) as
				| {
						error?: string
						notice?: string
						suggestions?: TriageSuggestion[]
				  }
				| undefined

			if (!response.ok || payload?.error || !payload?.suggestions) {
				throw new Error(payload?.error ?? 'Unable to triage snippets.')
			}

			const suggestions = payload.suggestions
			setAiSuggestions((current) => ({
				...current,
				...Object.fromEntries(
					suggestions.map((suggestion) => [suggestion.id, suggestion]),
				),
			}))
			setSelectedAiSuggestionIds((current) => [
				...current.filter(
					(id) => !suggestions.some((suggestion) => suggestion.id === id),
				),
				...suggestions
					.filter((suggestion) => suggestion.confidence === 'high')
					.map((suggestion) => suggestion.id),
			])
			setLastFailedTriageIds([])
			setNotice(payload.notice ?? 'AI triage suggestions ready.')
		} catch (triageError) {
			setLastFailedTriageIds(targetSnippets.map((snippet) => snippet.id))
			setError(
				triageError instanceof Error
					? triageError.message
					: 'Unable to triage snippets.',
			)
		} finally {
			setIsTriaging(false)
		}
	}

	const applySelectedAiSuggestions = async () => {
		const selectedSet = new Set(selectedAiSuggestionIds)
		const selectedSuggestions = Object.values(aiSuggestions).filter((suggestion) =>
			selectedSet.has(suggestion.id),
		)
		const suggestionsById = new Map(
			selectedSuggestions.map((suggestion) => [suggestion.id, suggestion]),
		)
		const targets = snippets.filter((snippet) => suggestionsById.has(snippet.id))

		if (targets.length === 0) {
			setError('Select at least one AI suggestion to apply.')
			return
		}

		setSavingSnippetId('ai-apply')
		clearMessages()

		try {
			const responses = await Promise.all(
				targets.map(async (snippet) => {
					const suggestion = suggestionsById.get(snippet.id)
					if (!suggestion) {
						throw new Error('Missing AI suggestion.')
					}

					const suggestedCategory = normalizeSnippetLabel(suggestion.categoryLabel)
					const next: SnippetUpdate = {
						text: cleanSnippetText(snippet.text),
						note: snippet.note.trim(),
						categoryLabel:
							suggestedCategory === 'Uncategorised'
								? snippet.categoryLabel
								: suggestedCategory,
						tags: mergeTags(snippet.tags, suggestion.tags),
						status:
							suggestion.recommendFavourite ||
							suggestion.recommendedStatus === 'favourite'
								? 'favourite'
								: suggestion.recommendedStatus,
						useFlags: [
							...new Set([...snippet.useFlags, ...suggestion.useFlags]),
						],
					}

					const response = await updateSnippetOnServer(snippet, next)
					return { id: snippet.id, snippet: response.snippet as SavedSnippet }
				}),
			)

			const savedById = new Map(
				responses.map((response) => [response.id, response.snippet]),
			)
			setSnippets((current) =>
				current.map((snippet) => {
					const saved = savedById.get(snippet.id)
					return saved ? responseToSnippet(snippet, saved) : snippet
				}),
			)
			setAiSuggestions((current) =>
				Object.fromEntries(
					Object.entries(current).filter(([id]) => !savedById.has(id)),
				),
			)
			setSelectedAiSuggestionIds((current) =>
				current.filter((id) => !savedById.has(id)),
			)
			setNotice(
				responses.length === 1
					? 'AI suggestion applied.'
					: `${responses.length} AI suggestions applied.`,
			)
		} catch (applyError) {
			setError(
				applyError instanceof Error
					? applyError.message
					: 'Unable to apply AI suggestions.',
			)
		} finally {
			setSavingSnippetId(null)
		}
	}

	const deleteAiReviewedSnippet = async (snippet: SnippetLibraryEntry) => {
		if (!window.confirm('Delete this snippet? This cannot be undone.')) {
			return
		}

		const previousSnippets = snippets
		const previousAiSuggestions = aiSuggestions
		const previousSelectedAiSuggestionIds = selectedAiSuggestionIds

		setDeletingSnippetId(snippet.id)
		clearMessages()
		setSnippets((current) => current.filter((item) => item.id !== snippet.id))
		setAiSuggestions((current) =>
			Object.fromEntries(Object.entries(current).filter(([id]) => id !== snippet.id)),
		)
		setSelectedAiSuggestionIds((current) =>
			current.filter((id) => id !== snippet.id),
		)

		try {
			const response = await fetch(`/api/teacher/snippets/${snippet.id}`, {
				method: 'DELETE',
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string; deletedId?: string }
				| undefined

			if (!response.ok || payload?.error) {
				throw new Error(payload?.error ?? 'Unable to delete snippet.')
			}

			setActiveSnippetId((current) => (current === snippet.id ? null : current))
			setSelectedSnippetIds((current) =>
				current.filter((id) => id !== snippet.id),
			)
			setNotice(payload?.notice ?? 'Snippet deleted.')
		} catch (deleteError) {
			setSnippets(previousSnippets)
			setAiSuggestions(previousAiSuggestions)
			setSelectedAiSuggestionIds(previousSelectedAiSuggestionIds)
			setError(
				deleteError instanceof Error
					? deleteError.message
					: 'Unable to delete snippet.',
			)
		} finally {
			setDeletingSnippetId(null)
		}
	}

	const deleteSelectedAiReviewedSnippets = async () => {
		const selectedSet = new Set(selectedAiSuggestionIds)
		const targets = snippets.filter(
			(snippet) => selectedSet.has(snippet.id) && aiSuggestions[snippet.id],
		)

		if (targets.length === 0) {
			setError('Select at least one AI reviewed snippet to delete.')
			return
		}

		if (
			!window.confirm(
				`Delete ${targets.length} selected AI reviewed snippets? This cannot be undone.`,
			)
		) {
			return
		}

		const idsToDelete = targets.map((snippet) => snippet.id)
		const previousSnippets = snippets
		const previousAiSuggestions = aiSuggestions
		const previousSelectedAiSuggestionIds = selectedAiSuggestionIds
		const previousSelectedSnippetIds = selectedSnippetIds

		setDeletingSnippetId('ai-bulk')
		clearMessages()
		setActiveSnippetId((current) =>
			current && idsToDelete.includes(current) ? null : current,
		)
		setSnippets((current) =>
			current.filter((item) => !idsToDelete.includes(item.id)),
		)
		setAiSuggestions((current) =>
			Object.fromEntries(
				Object.entries(current).filter(([id]) => !idsToDelete.includes(id)),
			),
		)
		setSelectedAiSuggestionIds((current) =>
			current.filter((id) => !idsToDelete.includes(id)),
		)
		setSelectedSnippetIds((current) =>
			current.filter((id) => !idsToDelete.includes(id)),
		)

		try {
			const responses = await Promise.all(
				idsToDelete.map(async (snippetId) => {
					const response = await fetch(`/api/teacher/snippets/${snippetId}`, {
						method: 'DELETE',
					})
					const payload = (await response.json()) as
						| { error?: string; notice?: string; deletedId?: string }
						| undefined

					if (!response.ok || payload?.error) {
						throw new Error(payload?.error ?? 'Unable to delete selected snippets.')
					}

					return payload
				}),
			)

			setNotice(
				responses.length === 1
					? 'Snippet deleted.'
					: `${responses.length} snippets deleted.`,
			)
		} catch (deleteError) {
			setSnippets(previousSnippets)
			setAiSuggestions(previousAiSuggestions)
			setSelectedAiSuggestionIds(previousSelectedAiSuggestionIds)
			setSelectedSnippetIds(previousSelectedSnippetIds)
			setError(
				deleteError instanceof Error
					? deleteError.message
					: 'Unable to delete selected snippets.',
			)
		} finally {
			setDeletingSnippetId(null)
		}
	}

	const deleteSelectedSnippets = async () => {
		if (selectedVisibleSnippetIds.length === 0) {
			return
		}

		if (
			!window.confirm(
				`Delete ${selectedVisibleSnippetIds.length} selected snippets? This cannot be undone.`,
			)
		) {
			return
		}

		const idsToDelete = selectedVisibleSnippetIds
		const previousSnippets = snippets
		const previousSelectedIds = selectedSnippetIds

		setDeletingSnippetId('bulk')
		clearMessages()
		setActiveSnippetId((current) =>
			current && idsToDelete.includes(current) ? null : current,
		)
		setSnippets((current) =>
			current.filter((item) => !idsToDelete.includes(item.id)),
		)
		setSelectedSnippetIds((current) =>
			current.filter((id) => !idsToDelete.includes(id)),
		)

		try {
			const responses = await Promise.all(
				idsToDelete.map(async (snippetId) => {
					const response = await fetch(`/api/teacher/snippets/${snippetId}`, {
						method: 'DELETE',
					})
					const payload = (await response.json()) as
						| { error?: string; notice?: string; deletedId?: string }
						| undefined

					if (!response.ok || payload?.error) {
						throw new Error(payload?.error ?? 'Unable to delete selected snippets.')
					}

					return payload
				}),
			)

			setNotice(
				responses.length === 1
					? 'Snippet deleted.'
					: `${responses.length} snippets deleted.`,
			)
		} catch (deleteError) {
			setSnippets(previousSnippets)
			setSelectedSnippetIds(previousSelectedIds)
			setError(
				deleteError instanceof Error
					? deleteError.message
					: 'Unable to delete selected snippets.',
			)
		} finally {
			setDeletingSnippetId(null)
		}
	}

	const toggleDraftUseFlag = (flag: SnippetUseFlag) => {
		clearMessages()
		setDraftUseFlags((current) =>
			current.includes(flag)
				? current.filter((item) => item !== flag)
				: [...current, flag],
		)
	}

	const toggleAiSuggestionSelection = (suggestionId: string) => {
		clearMessages()
		setSelectedAiSuggestionIds((current) =>
			current.includes(suggestionId)
				? current.filter((id) => id !== suggestionId)
				: [...current, suggestionId],
		)
	}

	const toggleAllAiSuggestionSelections = () => {
		clearMessages()
		if (allAiSuggestionsSelected) {
			setSelectedAiSuggestionIds((current) =>
				current.filter((id) => !aiSuggestions[id]),
			)
			return
		}

		setSelectedAiSuggestionIds((current) => [
			...current,
			...aiSuggestionEntries
				.map((entry) => entry.suggestion.id)
			.filter((id) => !current.includes(id)),
		])
	}

	const showAiSuggestionsInTable = () => {
		const suggestionIds = aiSuggestionEntries.map((entry) => entry.suggestion.id)
		if (suggestionIds.length === 0) {
			return
		}

		setSearchQuery('')
		setCategoryFilter('')
		setStatusFilter('')
		setUseFilter('')
		setSourceFilter('')
		setNoteFilter('')
		setTagFilter('')
		setFocusedTableSnippetIds(suggestionIds)
		setNotice(`${suggestionIds.length} AI reviewed rows shown in the table.`)
		setError(null)
		window.requestAnimationFrame(() => {
			tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		})
	}

	return (
		<div className="space-y-3">
			<section className="surface p-3">
				<div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(15rem,1.5fr)_repeat(7,minmax(0,1fr))]">
					<label className="block">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Search
						</span>
						<input
							id="snippet-search"
							type="search"
							value={searchQuery}
							onChange={(event) => {
								clearMessages()
								setSearchQuery(event.target.value)
							}}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
							placeholder="Text, note, author, source"
						/>
					</label>

					<label className="block">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Status
						</span>
						<select
							value={statusFilter}
							onChange={(event) => {
								clearMessages()
								setStatusFilter(event.target.value)
							}}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100">
							<option value="">Any status</option>
							{snippetStatuses.map((status) => (
								<option key={status} value={status}>
									{snippetStatusLabels[status]} ({statusCounts[status] ?? 0})
								</option>
							))}
						</select>
					</label>

					<label className="block">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Use
						</span>
						<select
							value={useFilter}
							onChange={(event) => {
								clearMessages()
								setUseFilter(event.target.value)
							}}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100">
							<option value="">Any use</option>
							{snippetUseFlags.map((flag) => (
								<option key={flag} value={flag}>
									{snippetUseFlagLabels[flag]} ({useCounts[flag] ?? 0})
								</option>
							))}
						</select>
					</label>

					<label className="block">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Category
						</span>
						<select
							value={categoryFilter}
							onChange={(event) => {
								clearMessages()
								setCategoryFilter(event.target.value)
							}}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100">
							<option value="">Any category</option>
							<option value="uncategorised">
								Uncategorised ({categoryCounts.Uncategorised})
							</option>
							{fixedSnippetCategories.map((category) => (
								<option key={category} value={category}>
									{category} ({categoryCounts[category] ?? 0})
								</option>
							))}
						</select>
					</label>

					<label className="block">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Source
						</span>
						<select
							value={sourceFilter}
							onChange={(event) => {
								clearMessages()
								setSourceFilter(event.target.value)
							}}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100">
							<option value="">Any source</option>
							<option value="external">External ({sourceCounts.external})</option>
							<option value="submission">
								Submission ({sourceCounts.submission})
							</option>
							<option value="feedback_item">
								Feedback ({sourceCounts.feedback_item})
							</option>
							<option value="no-source">
								No source ({sourceCounts['no-source']})
							</option>
						</select>
					</label>

					<label className="block">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Note
						</span>
						<select
							value={noteFilter}
							onChange={(event) => {
								clearMessages()
								setNoteFilter(event.target.value)
							}}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100">
							<option value="">Any note</option>
							<option value="with-note">With ({noteCounts.withNote})</option>
							<option value="without-note">
								None ({noteCounts.withoutNote})
							</option>
						</select>
					</label>

					<label className="block">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Tag
						</span>
						<input
							type="search"
							value={tagFilter}
							onChange={(event) => {
								clearMessages()
								setTagFilter(event.target.value)
							}}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
							placeholder="Tag contains"
						/>
					</label>

					<label className="block">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Sort
						</span>
						<select
							value={sortMode}
							onChange={(event) => setSortMode(event.target.value as SortMode)}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100">
							<option value="status">Best first</option>
							<option value="recent">Newest</option>
							<option value="oldest">Oldest</option>
							<option value="category">Category</option>
							<option value="source">Source</option>
						</select>
					</label>
				</div>

				<div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
					<p className="text-xs text-silver-300">
						<span
							title={loadLimitTitle(snippets.length, teacherSnippetLibraryLimit)}
							className={
								isNearSnippetLoadLimit
									? 'text-amber-100 underline decoration-amber-200/50 decoration-dotted underline-offset-4'
									: 'underline decoration-white/20 decoration-dotted underline-offset-4'
							}>
							{snippets.length} / {teacherSnippetLibraryLimit}
						</span>{' '}
						loaded. {filteredSnippets.length} shown.{' '}
						{categoryCounts.Uncategorised} uncategorised.
					</p>
					<div className="flex flex-wrap items-center gap-1.5">
						<button
							type="button"
							onClick={() => {
								void runAiTriage()
							}}
							disabled={isTriaging || aiTargetSnippets.length === 0}
							className="rounded-full border border-accent-300/50 bg-accent-300/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-300/20 disabled:cursor-not-allowed disabled:opacity-50">
							{isTriaging
								? 'AI triaging...'
								: `AI triage (${aiTargetSnippets.length})`}
						</button>
						{lastFailedTriageIds.length > 0 ? (
							<button
								type="button"
								onClick={() => {
									void runAiTriage(lastFailedTriageIds)
								}}
								disabled={isTriaging}
								className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-amber-100 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-50">
								Try again
							</button>
						) : null}
						{Object.keys(aiSuggestions).length > 0 ? (
							<button
								type="button"
								onClick={() => {
									setAiSuggestions({})
									setSelectedAiSuggestionIds([])
								}}
								className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
								Clear AI
							</button>
						) : null}
						<button
							type="button"
							onClick={toggleAllVisibleSelections}
							disabled={visibleSnippetIds.length === 0 || isBulkDeleting}
							className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100 disabled:cursor-not-allowed disabled:opacity-50">
							{allVisibleSelected ? 'Clear shown' : 'Select shown'}
						</button>
						<button
							type="button"
							onClick={() => {
								setSearchQuery('')
								setCategoryFilter('')
								setStatusFilter('')
								setUseFilter('')
								setSourceFilter('')
								setNoteFilter('')
								setTagFilter('')
								setFocusedTableSnippetIds([])
								clearMessages()
							}}
							className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
							Clear filters
						</button>
					</div>
				</div>
			</section>

			{selectedVisibleSnippetIds.length > 0 ? (
				<section className="surface flex flex-wrap items-end gap-2 p-3">
					<p className="mr-1 min-w-[8rem] text-xs uppercase tracking-[0.1em] text-silver-300">
						{selectedVisibleSnippetIds.length} selected
					</p>
					<label className="min-w-[11rem] flex-1">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Set category
						</span>
						<select
							value={bulkCategory}
							onChange={(event) => setBulkCategory(event.target.value)}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100">
							<option value="">Leave category</option>
							<option value="Uncategorised">Uncategorised</option>
							{fixedSnippetCategories.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					</label>
					<label className="min-w-[10rem] flex-1">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Set status
						</span>
						<select
							value={bulkStatus}
							onChange={(event) => setBulkStatus(event.target.value)}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100">
							<option value="">Leave status</option>
							{snippetStatuses.map((status) => (
								<option key={status} value={status}>
									{snippetStatusLabels[status]}
								</option>
							))}
						</select>
					</label>
					<label className="min-w-[10rem] flex-1">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Add use
						</span>
						<select
							value={bulkUseFlag}
							onChange={(event) => setBulkUseFlag(event.target.value)}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100">
							<option value="">No new use</option>
							{snippetUseFlags.map((flag) => (
								<option key={flag} value={flag}>
									{snippetUseFlagLabels[flag]}
								</option>
							))}
						</select>
					</label>
					<label className="min-w-[12rem] flex-[1.4]">
						<span className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
							Add tags
						</span>
						<input
							type="text"
							value={bulkTags}
							onChange={(event) => setBulkTags(event.target.value)}
							className="mt-1 w-full rounded-lg border border-white/15 bg-ink-900 px-2.5 py-2 text-sm text-parchment-100"
							placeholder="opening, dialogue"
						/>
					</label>
					<button
						type="button"
						onClick={() => {
							void applyBulkUpdate()
						}}
						disabled={isBulkSaving || isBulkDeleting}
						className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
						{isBulkSaving ? 'Applying...' : 'Apply'}
					</button>
					<button
						type="button"
						onClick={() => {
							void deleteSelectedSnippets()
						}}
						disabled={isBulkDeleting || isBulkSaving}
						className="rounded-full border border-amber-200/30 px-4 py-2 text-xs uppercase tracking-[0.1em] text-amber-100 transition hover:bg-amber-200/10 disabled:cursor-not-allowed disabled:opacity-60">
						{isBulkDeleting ? 'Deleting...' : 'Delete'}
					</button>
				</section>
			) : null}

			{aiSuggestionEntries.length > 0 ? (
				<section className="surface space-y-3 p-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div>
							<p className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
								AI Suggestions Review
							</p>
							<p className="mt-1 text-sm text-parchment-100">
								{aiSuggestionEntries.length} suggestions ready.{' '}
								{selectedAiSuggestionCount} selected to apply.
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-1.5">
							<button
								type="button"
								onClick={toggleAllAiSuggestionSelections}
								className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
								{allAiSuggestionsSelected ? 'Untick all' : 'Tick all'}
							</button>
							<button
								type="button"
								onClick={showAiSuggestionsInTable}
								className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
								Show in table
							</button>
							<button
								type="button"
								onClick={() => {
									void applySelectedAiSuggestions()
								}}
								disabled={
									savingSnippetId === 'ai-apply' ||
									selectedAiSuggestionCount === 0
								}
								className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-4 py-1.5 text-[10px] uppercase tracking-[0.1em] text-emerald-100 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-50">
								{savingSnippetId === 'ai-apply'
									? 'Applying...'
									: `Apply selected (${selectedAiSuggestionCount})`}
							</button>
							<button
								type="button"
								onClick={() => {
									void deleteSelectedAiReviewedSnippets()
								}}
								disabled={
									deletingSnippetId === 'ai-bulk' ||
									selectedAiSuggestionCount === 0
								}
								className="rounded-full border border-amber-200/30 px-4 py-1.5 text-[10px] uppercase tracking-[0.1em] text-amber-100 transition hover:bg-amber-200/10 disabled:cursor-not-allowed disabled:opacity-50">
								{deletingSnippetId === 'ai-bulk'
									? 'Deleting...'
									: `Delete selected (${selectedAiSuggestionCount})`}
							</button>
						</div>
					</div>

					<div className="grid gap-2 lg:grid-cols-2">
						{aiSuggestionEntries.map(({ suggestion, snippet }) => {
							const isSelected = selectedAiSuggestionIds.includes(suggestion.id)
							const suggestedCategory = normalizeSnippetLabel(suggestion.categoryLabel)
							const statusLabel =
								suggestion.recommendFavourite ||
								suggestion.recommendedStatus === 'favourite'
									? 'Favourite'
									: snippetStatusLabels[suggestion.recommendedStatus]

							return (
								<div
									key={suggestion.id}
									className={
										isSelected
											? 'block rounded-lg border border-accent-300/45 bg-accent-300/10 p-3'
											: 'block rounded-lg border border-white/10 bg-white/[0.03] p-3'
									}>
									<div className="flex items-start gap-3">
										<label className="mt-1 flex">
											<input
												type="checkbox"
												checked={isSelected}
												onChange={() => toggleAiSuggestionSelection(suggestion.id)}
												className="h-4 w-4 rounded border-white/20 bg-ink-900 accent-burgundy-400"
												aria-label="Select AI suggestion"
											/>
										</label>
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-1.5">
												<span className="rounded-full border border-accent-300/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-accent-100">
													AI: {statusLabel}
												</span>
												{suggestedCategory !== 'Uncategorised' ? (
													<span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-silver-200">
														{suggestedCategory}
													</span>
												) : null}
												{suggestion.useFlags.slice(0, 2).map((flag) => (
													<span
														key={flag}
														className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-silver-300">
														{snippetUseFlagLabels[flag]}
													</span>
												))}
												<span className="text-[10px] uppercase tracking-[0.08em] text-silver-400">
													{suggestion.confidence} confidence
												</span>
											</div>
											<p className="mt-2 line-clamp-2 text-sm leading-snug text-parchment-100">
												{compactPreview(snippet.text, 220)}
											</p>
											<p className="mt-1 text-xs leading-relaxed text-accent-100">
												{suggestion.reason}
											</p>
											{suggestion.tags.length > 0 ? (
												<p className="mt-1 text-[11px] text-silver-300">
													Tags: {suggestion.tags.join(', ')}
												</p>
											) : null}
											<div className="mt-2 flex flex-wrap items-center gap-2">
												<button
													type="button"
													onClick={(event) => {
														event.preventDefault()
														void deleteAiReviewedSnippet(snippet)
													}}
													disabled={deletingSnippetId === snippet.id}
													className="rounded-full border border-amber-200/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-amber-100 transition hover:bg-amber-200/10 disabled:cursor-not-allowed disabled:opacity-50">
													{deletingSnippetId === snippet.id ? 'Deleting...' : 'Delete'}
												</button>
											</div>
										</div>
									</div>
								</div>
							)
						})}
					</div>
				</section>
			) : null}

			{notice ? (
				<p className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
					{notice}
				</p>
			) : null}
			{error ? (
				<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
					{error}
				</p>
			) : null}

			<div
				className={
					activeSnippet
						? 'grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]'
						: ''
				}>
					<main ref={tableSectionRef} className="surface overflow-hidden">
						<div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
							<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
								{focusedTableSnippetIds.length > 0
									? 'AI reviewed rows'
									: 'Library rows'}
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<p className="text-xs text-silver-300">
									Click a text cell to edit. Best first uses favourite, ready, then
									reviewed.
								</p>
								{focusedTableSnippetIds.length > 0 ? (
									<button
										type="button"
										onClick={() => setFocusedTableSnippetIds([])}
										className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
										Show all
									</button>
								) : null}
							</div>
						</div>

					{filteredSnippets.length === 0 ? (
						<p className="px-3 py-6 text-sm text-silver-300">
							No snippets match these filters.
						</p>
					) : (
						<div className="max-h-[calc(100vh-18rem)] overflow-auto">
							<table className="w-full min-w-[1120px] table-fixed border-collapse text-left">
								<colgroup>
									<col className="w-[44px]" />
									<col className="w-[120px]" />
									<col className="w-[145px]" />
									<col className="w-[140px]" />
									<col />
									<col className="w-[160px]" />
									<col className="w-[150px]" />
									<col className="w-[70px]" />
									<col className="w-[86px]" />
								</colgroup>
								<thead className="sticky top-0 z-10 bg-ink-950/95 text-[10px] uppercase tracking-[0.1em] text-silver-300 backdrop-blur">
									<tr className="border-b border-white/10">
										<th className="px-2 py-2">
											<span className="sr-only">Select</span>
										</th>
										<th className="px-2 py-2">Status</th>
										<th className="px-2 py-2">Use</th>
										<th className="px-2 py-2">Category</th>
										<th className="px-2 py-2">Snippet</th>
										<th className="px-2 py-2">Source</th>
										<th className="px-2 py-2">Tags</th>
										<th className="px-2 py-2">Note</th>
										<th className="px-2 py-2">Date</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/10 text-sm">
									{filteredSnippets.map((snippet) => {
										const isActive = activeSnippetId === snippet.id
										const isSaving = savingSnippetId === snippet.id
										const isSelected = selectedSnippetIds.includes(snippet.id)
										const aiSuggestion = aiSuggestions[snippet.id]
										const source = sourceSummary(snippet)

										return (
											<tr
												key={snippet.id}
												className={
													isActive
														? 'bg-burgundy-500/14 text-parchment-100'
														: 'text-silver-200 transition hover:bg-white/[0.04]'
												}>
												<td className="px-2 py-2 align-top">
													<input
														type="checkbox"
														checked={isSelected}
														onChange={() => toggleSnippetSelection(snippet.id)}
														className="h-4 w-4 rounded border-white/20 bg-ink-900 accent-burgundy-400"
														aria-label="Select snippet"
													/>
												</td>
												<td className="px-2 py-2 align-top">
													<button
														type="button"
														onClick={() => openSnippet(snippet)}
														className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/30 hover:text-parchment-100">
														{snippetStatusLabels[snippet.status]}
													</button>
													{aiSuggestion ? (
														<span className="mt-1 block rounded-full border border-accent-300/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-accent-100">
															AI: {snippetStatusLabels[aiSuggestion.recommendedStatus]}
														</span>
													) : null}
												</td>
												<td className="px-2 py-2 align-top">
													<div className="flex flex-wrap gap-1">
														{snippet.useFlags.length > 0 ? (
															snippet.useFlags.slice(0, 2).map((flag) => (
																<span
																	key={flag}
																	className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-silver-300">
																	{snippetUseFlagLabels[flag]}
																</span>
															))
														) : (
															<span className="text-xs text-silver-500">-</span>
														)}
														{snippet.useFlags.length > 2 ? (
															<span className="text-xs text-silver-400">
																+{snippet.useFlags.length - 2}
															</span>
														) : null}
														{aiSuggestion?.useFlags.length ? (
															<span className="rounded-full border border-accent-300/35 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-accent-100">
																AI: {snippetUseFlagLabels[aiSuggestion.useFlags[0]]}
															</span>
														) : null}
													</div>
												</td>
												<td className="px-2 py-2 align-top">
													<span className="line-clamp-2 text-xs text-silver-300">
														{snippet.categoryLabel}
													</span>
													{aiSuggestion?.categoryLabel &&
													aiSuggestion.categoryLabel !== 'Uncategorised' ? (
														<span className="mt-1 block rounded-full border border-accent-300/35 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-accent-100">
															AI: {aiSuggestion.categoryLabel}
														</span>
													) : null}
												</td>
												<td className="px-2 py-2 align-top">
													<button
														type="button"
														onClick={() => openSnippet(snippet)}
														className="block w-full text-left text-sm leading-snug text-parchment-100 transition hover:text-white">
														<span className="line-clamp-2">
															{compactPreview(snippet.text)}
														</span>
													</button>
													{aiSuggestion ? (
														<p className="mt-1 line-clamp-2 text-xs leading-snug text-accent-100">
															{aiSuggestion.recommendFavourite
																? 'Favourite: '
																: 'AI: '}
															{aiSuggestion.reason}
														</p>
													) : null}
													{isSaving ? (
														<span className="mt-1 block text-[10px] uppercase tracking-[0.1em] text-accent-200">
															Saving
														</span>
													) : null}
												</td>
												<td className="px-2 py-2 align-top">
													<span className="line-clamp-2 text-xs text-silver-300">
														{source || sourceTypeLabel(snippet.sourceType)}
													</span>
												</td>
												<td className="px-2 py-2 align-top">
													<div className="flex flex-wrap gap-1">
														{snippet.tags.length > 0 ? (
															snippet.tags.slice(0, 2).map((tag) => (
																<span
																	key={tag}
																	className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-silver-300">
																	{tag}
																</span>
															))
														) : (
															<span className="text-xs text-silver-500">-</span>
														)}
														{snippet.tags.length > 2 ? (
															<span className="text-xs text-silver-400">
																+{snippet.tags.length - 2}
															</span>
														) : null}
													</div>
												</td>
												<td className="px-2 py-2 align-top">
													<span className="text-xs text-silver-300">
														{snippet.note.trim() ? 'Yes' : '-'}
													</span>
												</td>
												<td className="px-2 py-2 align-top">
													<span className="text-xs text-silver-400">
														{formatShortDate(snippet.createdAt)}
													</span>
												</td>
											</tr>
										)
									})}
								</tbody>
							</table>
						</div>
					)}
				</main>

				{activeSnippet ? (
					<aside className="surface space-y-3 p-3 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
						<div className="flex items-start justify-between gap-2">
							<div>
								<p className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
									Inspector
								</p>
								<h2 className="mt-1 text-lg font-semibold text-parchment-100">
									Edit snippet
								</h2>
							</div>
							<button
								type="button"
								onClick={closeActiveSnippet}
								className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-300 transition hover:border-white/25 hover:text-parchment-100">
								Close
							</button>
						</div>

						<form onSubmit={saveSnippet} className="space-y-3">
							<label className="block">
								<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
									Text
								</span>
								<textarea
									value={draftText}
									rows={6}
									onChange={(event) => {
										clearMessages()
										setDraftText(event.target.value)
									}}
									className="w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
								/>
							</label>

							<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
								<label className="block">
									<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
										Category
									</span>
									<select
										value={draftCategory}
										onChange={(event) => {
											clearMessages()
											setDraftCategory(event.target.value)
										}}
										className="w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
										<option value="">Uncategorised</option>
										{fixedSnippetCategories.map((category) => (
											<option key={category} value={category}>
												{category}
											</option>
										))}
									</select>
								</label>

								<label className="block">
									<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
										Status
									</span>
									<select
										value={draftStatus}
										onChange={(event) => {
											clearMessages()
											setDraftStatus(normalizeSnippetStatus(event.target.value))
										}}
										className="w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
										{snippetStatuses.map((status) => (
											<option key={status} value={status}>
												{snippetStatusLabels[status]}
											</option>
										))}
									</select>
								</label>
							</div>

							<fieldset>
								<legend className="mb-1 text-[10px] uppercase tracking-[0.1em] text-silver-300">
									Teaching use
								</legend>
								<div className="flex flex-wrap gap-1.5">
									{snippetUseFlags.map((flag) => {
										const isActive = draftUseFlags.includes(flag)
										return (
											<button
												key={flag}
												type="button"
												onClick={() => toggleDraftUseFlag(flag)}
												className={
													isActive
														? 'rounded-full border border-accent-300/70 bg-accent-300/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-parchment-100'
														: 'rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-300 transition hover:border-white/25 hover:text-parchment-100'
												}>
												{snippetUseFlagLabels[flag]}
											</button>
										)
									})}
								</div>
							</fieldset>

							<label className="block">
								<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
									Tags
								</span>
								<input
									type="text"
									value={draftTags}
									onChange={(event) => {
										clearMessages()
										setDraftTags(event.target.value)
									}}
									className="w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
									placeholder="image, opening, dialogue"
								/>
							</label>

							<label className="block">
								<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
									Private note
								</span>
								<textarea
									value={draftNote}
									rows={4}
									onChange={(event) => {
										clearMessages()
										setDraftNote(event.target.value)
									}}
									className="w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
									placeholder="Why this might be useful"
								/>
							</label>

							<div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs leading-relaxed text-silver-300">
								<p className="uppercase tracking-[0.1em] text-silver-400">
									Source
								</p>
								<p className="mt-1 text-parchment-100">
									{sourceSummary(activeSnippet) ||
										sourceTypeLabel(activeSnippet.sourceType)}
								</p>
								<div className="mt-2 flex flex-wrap gap-2">
									{activeSnippet.sourceSubmissionId ? (
										<Link
											href={`/app/workshop/${activeSnippet.sourceSubmissionId}`}
											className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
											View source
										</Link>
									) : null}
									{activeSnippet.sourceUrl ? (
										<a
											href={activeSnippet.sourceUrl}
											target="_blank"
											rel="noreferrer"
											className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
											Open source
										</a>
									) : null}
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<button
									type="submit"
									disabled={savingSnippetId === activeSnippet.id}
									className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
									{savingSnippetId === activeSnippet.id ? 'Saving...' : 'Save'}
								</button>
								<button
									type="button"
									disabled={deletingSnippetId === activeSnippet.id}
									onClick={() => {
										void deleteSnippet(activeSnippet)
									}}
									className="rounded-full border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-silver-300 transition hover:border-amber-200/40 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-60">
									{deletingSnippetId === activeSnippet.id ? 'Deleting...' : 'Delete'}
								</button>
								{hasActiveDraftChanges ? (
									<p className="text-xs text-amber-100">Unsaved changes</p>
								) : null}
							</div>
						</form>
					</aside>
				) : null}
			</div>
		</div>
	)
}
