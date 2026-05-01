'use client'

import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { StoryFolio } from '@/components/prototype/story-folio'
import { fixedFeedbackCategories } from '@/lib/feedback/categories'
import type { ManuscriptParagraph } from '@/lib/manuscript/paragraphs'
import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
import {
	type GutenbergSearchResult,
	mapGutenbergResultToSourceMetadata,
	sourceAuthorLabel,
} from '@/lib/source-providers/gutenberg'

const MAX_TEXT_FILE_BYTES = 3 * 1024 * 1024
const SOURCE_READING_SESSION_STORAGE_KEY = 'shortstoryink:source-reading-session:v1'

type SourceSnippet = {
	id: string
	text: string
	note: string
	createdAt: string
	categoryLabel: string
	tags: string[]
	sourceLabel: string
	sourceTitle: string
	sourceName: string
	sourceSection: string
	sourceLicenceNote?: string
}

type SelectedSourcePassage = {
	blockId: string
	quote: string
	composerTop: number
	composerLeft: number
}

type SourceSearchMatch = {
	index: number
	paragraphId: string
	start: number
	end: number
}

type StoredSourceReadingSession = {
	version: 1
	author: string
	title: string
	source: string
	sourceUrl: string
	sourceSection: string
	licenceNote: string
	sourceText: string
	loadedFileName: string
	gutenbergId: number | null
	sourceSearchQuery: string
	activeSourceMatchIndex: number
	gutendexQuery: string
	gutendexLanguage: string
	savedAt: string
}

function parseTags(value: string) {
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

function formatFileSize(bytes: number) {
	if (bytes < 1024 * 1024) {
		return `${Math.max(1, Math.round(bytes / 1024))} KB`
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function draftTitleFromFilename(filename: string) {
	return filename
		.replace(/\.txt$/i, '')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function formatNumber(value: number) {
	return new Intl.NumberFormat('en').format(value)
}

function wordCount(value: string) {
	return value.trim().split(/\s+/).filter(Boolean).length
}

function findSourceTextMatches(
	paragraphs: ManuscriptParagraph[],
	query: string,
): SourceSearchMatch[] {
	const normalizedQuery = query.trim().toLowerCase()
	if (!normalizedQuery) {
		return []
	}

	const matches: SourceSearchMatch[] = []

	for (const paragraph of paragraphs) {
		const text = paragraph.text
		const haystack = text.toLowerCase()
		let start = haystack.indexOf(normalizedQuery)

		while (start >= 0) {
			matches.push({
				index: matches.length,
				paragraphId: paragraph.id,
				start,
				end: start + normalizedQuery.length,
			})
			start = haystack.indexOf(normalizedQuery, start + normalizedQuery.length)
		}
	}

	return matches
}

function elementForSelectionNode(node: Node) {
	return node instanceof Element ? node : node.parentElement
}

function selectionNodeIsInside(container: HTMLElement, node: Node) {
	const element = elementForSelectionNode(node)
	return Boolean(element && container.contains(element))
}

function selectionPopupRect(range: Range) {
	const rects = Array.from(range.getClientRects()).filter(
		(rect) => rect.width > 0 || rect.height > 0,
	)
	return rects.at(-1) ?? range.getBoundingClientRect()
}

function safeStoredSession(value: string | null): StoredSourceReadingSession | null {
	if (!value) {
		return null
	}

	try {
		const parsed = JSON.parse(value) as Partial<StoredSourceReadingSession>
		if (parsed.version !== 1) {
			return null
		}

		return {
			version: 1,
			author: parsed.author ?? '',
			title: parsed.title ?? '',
			source: parsed.source ?? 'manual',
			sourceUrl: parsed.sourceUrl ?? '',
			sourceSection: parsed.sourceSection ?? '',
			licenceNote: parsed.licenceNote ?? '',
			sourceText: parsed.sourceText ?? '',
			loadedFileName: parsed.loadedFileName ?? '',
			gutenbergId:
				typeof parsed.gutenbergId === 'number' ? parsed.gutenbergId : null,
			sourceSearchQuery: parsed.sourceSearchQuery ?? '',
			activeSourceMatchIndex:
				typeof parsed.activeSourceMatchIndex === 'number'
					? parsed.activeSourceMatchIndex
					: 0,
			gutendexQuery: parsed.gutendexQuery ?? '',
			gutendexLanguage: parsed.gutendexLanguage ?? 'en',
			savedAt: parsed.savedAt ?? '',
		}
	} catch {
		return null
	}
}

export function SourceReadingWorkspace() {
	const mainRef = useRef<HTMLElement | null>(null)
	const sourceReaderRef = useRef<HTMLDivElement | null>(null)
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const [author, setAuthor] = useState('')
	const [title, setTitle] = useState('')
	const [source, setSource] = useState('manual')
	const [sourceUrl, setSourceUrl] = useState('')
	const [sourceSection, setSourceSection] = useState('')
	const [licenceNote, setLicenceNote] = useState('')
	const [sourceText, setSourceText] = useState('')
	const [selectedPassage, setSelectedPassage] = useState<SelectedSourcePassage | null>(null)
	const [categoryLabel, setCategoryLabel] = useState('')
	const [tags, setTags] = useState('')
	const [note, setNote] = useState('')
	const [isSaving, setIsSaving] = useState(false)
	const [isLoadingFile, setIsLoadingFile] = useState(false)
	const [isFinderOpen, setIsFinderOpen] = useState(false)
	const [isSearchingGutendex, setIsSearchingGutendex] = useState(false)
	const [isLoadingGutendexText, setIsLoadingGutendexText] = useState(false)
	const [savedSnippets, setSavedSnippets] = useState<SourceSnippet[]>([])
	const [isSnippetListOpen, setIsSnippetListOpen] = useState(true)
	const [notice, setNotice] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [loadedFileName, setLoadedFileName] = useState('')
	const [gutendexQuery, setGutendexQuery] = useState('')
	const [gutendexLanguage, setGutendexLanguage] = useState('en')
	const [gutendexResults, setGutendexResults] = useState<GutenbergSearchResult[]>([])
	const [gutendexCount, setGutendexCount] = useState(0)
	const [gutendexMessage, setGutendexMessage] = useState('')
	const [gutendexDiagnosticUrl, setGutendexDiagnosticUrl] = useState('')
	const [activeGutendexId, setActiveGutendexId] = useState<number | null>(null)
	const [loadedGutenbergId, setLoadedGutenbergId] = useState<number | null>(null)
	const [sourceSearchQuery, setSourceSearchQuery] = useState('')
	const [activeSourceMatchIndex, setActiveSourceMatchIndex] = useState(0)
	const [hasRestoredSession, setHasRestoredSession] = useState(false)
	const [hasCheckedStoredSession, setHasCheckedStoredSession] = useState(false)
	const paragraphs = useMemo(() => toManuscriptParagraphs(sourceText), [sourceText])
	const sourceSearchMatches = useMemo(
		() => findSourceTextMatches(paragraphs, sourceSearchQuery),
		[paragraphs, sourceSearchQuery],
	)
	const sourceSearchMatchesByParagraph = useMemo(() => {
		const matchesByParagraph = new Map<string, SourceSearchMatch[]>()
		for (const match of sourceSearchMatches) {
			matchesByParagraph.set(match.paragraphId, [
				...(matchesByParagraph.get(match.paragraphId) ?? []),
				match,
			])
		}
		return matchesByParagraph
	}, [sourceSearchMatches])
	const loadedSourceWordCount = useMemo(() => wordCount(sourceText), [sourceText])

	useEffect(() => {
		const storedSession = safeStoredSession(
			window.sessionStorage.getItem(SOURCE_READING_SESSION_STORAGE_KEY),
		)
		setHasCheckedStoredSession(true)

		if (!storedSession) {
			return
		}

		setAuthor(storedSession.author)
		setTitle(storedSession.title)
		setSource(storedSession.source)
		setSourceUrl(storedSession.sourceUrl)
		setSourceSection(storedSession.sourceSection)
		setLicenceNote(storedSession.licenceNote)
		setSourceText(storedSession.sourceText)
		setLoadedFileName(storedSession.loadedFileName)
		setLoadedGutenbergId(storedSession.gutenbergId)
		setSourceSearchQuery(storedSession.sourceSearchQuery)
		setActiveSourceMatchIndex(storedSession.activeSourceMatchIndex)
		setGutendexQuery(storedSession.gutendexQuery)
		setGutendexLanguage(storedSession.gutendexLanguage)
		setHasRestoredSession(Boolean(storedSession.sourceText.trim()))
		if (storedSession.sourceText.trim()) {
			setNotice('Restored source text from this browser session.')
			window.setTimeout(() => setNotice(null), 2200)
		}
	}, [])

	useEffect(() => {
		if (!hasCheckedStoredSession) {
			return
		}

		const hasSessionContent = Boolean(
			sourceText.trim() ||
				author.trim() ||
				title.trim() ||
				sourceUrl.trim() ||
				sourceSection.trim() ||
				licenceNote.trim(),
		)

		if (!hasSessionContent) {
			window.sessionStorage.removeItem(SOURCE_READING_SESSION_STORAGE_KEY)
			return
		}

		const storedSession: StoredSourceReadingSession = {
			version: 1,
			author,
			title,
			source,
			sourceUrl,
			sourceSection,
			licenceNote,
			sourceText,
			loadedFileName,
			gutenbergId: loadedGutenbergId,
			sourceSearchQuery,
			activeSourceMatchIndex,
			gutendexQuery,
			gutendexLanguage,
			savedAt: new Date().toISOString(),
		}

		window.sessionStorage.setItem(
			SOURCE_READING_SESSION_STORAGE_KEY,
			JSON.stringify(storedSession),
		)
	}, [
		activeSourceMatchIndex,
		author,
		gutendexLanguage,
		gutendexQuery,
		hasCheckedStoredSession,
		licenceNote,
		loadedFileName,
		loadedGutenbergId,
		source,
		sourceSearchQuery,
		sourceSection,
		sourceText,
		sourceUrl,
		title,
	])

	useEffect(() => {
		if (sourceSearchMatches.length === 0) {
			setActiveSourceMatchIndex(0)
			return
		}

		setActiveSourceMatchIndex((current) =>
			Math.min(Math.max(current, 0), sourceSearchMatches.length - 1),
		)
	}, [sourceSearchMatches.length])

	useEffect(() => {
		if (!sourceSearchMatches.length) {
			return
		}

		const activeMatch = sourceReaderRef.current?.querySelector(
			`[data-source-match-index="${activeSourceMatchIndex}"]`,
		)
		activeMatch?.scrollIntoView({ behavior: 'smooth', block: 'center' })
	}, [activeSourceMatchIndex, sourceSearchMatches.length])

	const clearMessages = () => {
		setNotice(null)
		setError(null)
	}

	const captureSelection = () => {
		const selection = window.getSelection()
		if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
			return
		}

		const range = selection.getRangeAt(0)
		const readerEl = sourceReaderRef.current
		const containerRect = mainRef.current?.getBoundingClientRect()

		if (
			!readerEl ||
			!selectionNodeIsInside(readerEl, range.startContainer) ||
			!selectionNodeIsInside(readerEl, range.endContainer) ||
			!containerRect
		) {
			return
		}

		const quote = selection.toString().trim()
		if (!quote) {
			return
		}

		const startParagraph = elementForSelectionNode(range.startContainer)?.closest(
			'p[data-source-paragraph="true"]',
		) as HTMLParagraphElement | null
		const selectionRect = selectionPopupRect(range)
		setSelectedPassage({
			blockId:
				startParagraph?.dataset.sourceId ?? `source-selection:${Date.now()}`,
			quote,
			composerTop: selectionRect.bottom - containerRect.top + 10,
			composerLeft: Math.min(
				Math.max(16, selectionRect.left - containerRect.left),
				Math.max(16, containerRect.width - 340),
			),
		})
		setCategoryLabel('')
		setTags('')
		setNote('')
		clearMessages()
	}

	const saveSelectedSnippet = async () => {
		if (!selectedPassage || isSaving) {
			return
		}

		setIsSaving(true)
		clearMessages()

		try {
			const response = await fetch('/api/teacher/source-excerpts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					author,
					title,
					source,
					sourceUrl,
					sourceSection,
					licenceNote,
					excerpt: selectedPassage.quote,
					categoryLabel,
					tags: parseTags(tags),
					note,
				}),
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string; snippet?: SourceSnippet }
				| undefined

			if (!response.ok || payload?.error || !payload?.snippet) {
				throw new Error(payload?.error ?? 'Unable to save snippet.')
			}

			setSavedSnippets((current) => [payload.snippet!, ...current])
			setSelectedPassage(null)
			setNotice(payload.notice ?? 'Snippet saved.')
			window.getSelection()?.removeAllRanges()
			window.setTimeout(() => setNotice(null), 1600)
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: 'Unable to save snippet.',
			)
		} finally {
			setIsSaving(false)
		}
	}

	const deleteSnippet = async (snippetId: string) => {
		clearMessages()
		const previous = savedSnippets
		setSavedSnippets((current) => current.filter((snippet) => snippet.id !== snippetId))

		try {
			const response = await fetch(`/api/teacher/snippets/${snippetId}`, {
				method: 'DELETE',
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string }
				| undefined
			if (!response.ok || payload?.error) {
				throw new Error(payload?.error ?? 'Unable to delete snippet.')
			}
			setNotice(payload?.notice ?? 'Snippet deleted.')
			window.setTimeout(() => setNotice(null), 1400)
		} catch (deleteError) {
			setSavedSnippets(previous)
			setError(
				deleteError instanceof Error
					? deleteError.message
					: 'Unable to delete snippet.',
			)
		}
	}

	const clearSourceText = () => {
		if (
			sourceText.trim() &&
			!window.confirm('Clear the pasted source text? Saved snippets will remain.')
		) {
			return
		}

		setSourceText('')
		setSelectedPassage(null)
		setSourceSearchQuery('')
		setActiveSourceMatchIndex(0)
		setLoadedFileName('')
		setLoadedGutenbergId(null)
		setHasRestoredSession(false)
		window.sessionStorage.removeItem(SOURCE_READING_SESSION_STORAGE_KEY)
		clearMessages()
	}

	const loadTextFile = async (event: ChangeEvent<HTMLInputElement>) => {
		const input = event.currentTarget
		const file = input.files?.[0]
		if (!file) {
			return
		}

		clearMessages()

		const hasTextExtension = file.name.toLowerCase().endsWith('.txt')
		const hasTextMimeType = file.type === 'text/plain' || file.type === ''
		if (!hasTextExtension || !hasTextMimeType) {
			setError('Choose a plain .txt file.')
			input.value = ''
			return
		}

		if (file.size > MAX_TEXT_FILE_BYTES) {
			setError(
				`That file is ${formatFileSize(file.size)}. For this first version, use a .txt file under ${formatFileSize(MAX_TEXT_FILE_BYTES)}.`,
			)
			input.value = ''
			return
		}

		setIsLoadingFile(true)

		try {
			const text = (await file.text()).replace(/\r\n?/g, '\n')
			if (text.includes('\u0000')) {
				throw new Error('That file does not look like plain text.')
			}

			setSourceText(text)
			setSelectedPassage(null)
			setSourceSearchQuery('')
			setActiveSourceMatchIndex(0)
			setLoadedFileName(file.name)
			setLoadedGutenbergId(null)
			if (!title.trim()) {
				setTitle(draftTitleFromFilename(file.name))
			}
			// TODO: Add Gutendex/Gutenberg metadata search and approved plain-text import.
			setNotice(`Loaded ${file.name}.`)
			window.setTimeout(() => setNotice(null), 1800)
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: 'Unable to load that text file.',
			)
		} finally {
			setIsLoadingFile(false)
			input.value = ''
		}
	}

	const searchGutendex = async (event?: FormEvent<HTMLFormElement>) => {
		event?.preventDefault()
		const query = gutendexQuery.trim()
		if (query.length < 2) {
			setGutendexMessage('Enter at least two characters to search.')
			return
		}

		clearMessages()
		setGutendexMessage('')
		setGutendexDiagnosticUrl('')
		setIsSearchingGutendex(true)

		try {
			const params = new URLSearchParams({ q: query })
			if (gutendexLanguage) {
				params.set('language', gutendexLanguage)
			}

			const response = await fetch(`/api/teacher/gutendex/search?${params}`)
			const payload = (await response.json()) as
				| {
						error?: string
						count?: number
						results?: GutenbergSearchResult[]
						diagnosticUrl?: string
				  }
				| undefined

			if (!response.ok || payload?.error) {
				setGutendexDiagnosticUrl(payload?.diagnosticUrl ?? '')
				throw new Error(payload?.error ?? 'Unable to search Gutendex.')
			}

			const results = payload?.results ?? []
			setGutendexResults(results)
			setGutendexCount(payload?.count ?? results.length)
			if (!results.length) {
				setGutendexMessage('No public-domain results found for that search.')
			}
		} catch (searchError) {
			setGutendexResults([])
			setGutendexCount(0)
			setGutendexMessage(
				searchError instanceof Error
					? searchError.message
					: 'Unable to search Gutendex.',
			)
		} finally {
			setIsSearchingGutendex(false)
		}
	}

	const metadataNeedsConfirmation = (result: GutenbergSearchResult) => {
		const metadata = mapGutenbergResultToSourceMetadata(result)
		return (
			(author.trim() && author.trim() !== metadata.author) ||
			(title.trim() && title.trim() !== metadata.title) ||
			(source.trim() &&
				source.trim() !== 'manual' &&
				source.trim() !== metadata.source) ||
			(sourceUrl.trim() && sourceUrl.trim() !== metadata.sourceUrl) ||
			(licenceNote.trim() && licenceNote.trim() !== metadata.licenceNote)
		)
	}

	const loadGutendexResult = async (result: GutenbergSearchResult) => {
		clearMessages()
		setGutendexMessage('')
		setGutendexDiagnosticUrl('')

		if (
			metadataNeedsConfirmation(result) &&
			!window.confirm(
				`Replace the current source metadata with "${result.title}"?`,
			)
		) {
			return
		}

		const metadata = mapGutenbergResultToSourceMetadata(result)
		setAuthor(metadata.author)
		setTitle(metadata.title)
		setSource(metadata.source)
		setSourceUrl(metadata.sourceUrl)
		setLicenceNote(metadata.licenceNote)

		if (!result.plainTextUrl) {
			setGutendexMessage(
				'No plain-text version was found for this result. You can still paste or upload text manually.',
			)
			return
		}

		setActiveGutendexId(result.id)
		setIsLoadingGutendexText(true)

		try {
			const params = new URLSearchParams({ url: result.plainTextUrl })
			const response = await fetch(`/api/teacher/gutendex/text?${params}`)
			const payload = (await response.json()) as
				| { error?: string; text?: string }
				| undefined

			if (!response.ok || payload?.error || !payload?.text) {
				throw new Error(payload?.error ?? 'Unable to load the plain text.')
			}

			setSourceText(payload.text)
			setSelectedPassage(null)
			setSourceSearchQuery('')
			setActiveSourceMatchIndex(0)
			setLoadedFileName(`Project Gutenberg #${result.id}`)
			setLoadedGutenbergId(result.id)
			setIsFinderOpen(false)
			setNotice(`Loaded ${result.title}.`)
			window.setTimeout(() => setNotice(null), 1800)
		} catch (loadError) {
			setGutendexMessage(
				loadError instanceof Error
					? loadError.message
					: 'Unable to load the plain text.',
			)
		} finally {
			setIsLoadingGutendexText(false)
			setActiveGutendexId(null)
		}
	}

	const goToPreviousSourceMatch = () => {
		if (!sourceSearchMatches.length) {
			return
		}
		setActiveSourceMatchIndex((current) =>
			current === 0 ? sourceSearchMatches.length - 1 : current - 1,
		)
	}

	const goToNextSourceMatch = () => {
		if (!sourceSearchMatches.length) {
			return
		}
		setActiveSourceMatchIndex((current) =>
			current === sourceSearchMatches.length - 1 ? 0 : current + 1,
		)
	}

	const clearSourceSearch = () => {
		setSourceSearchQuery('')
		setActiveSourceMatchIndex(0)
	}

	const renderHighlightedParagraph = (paragraph: ManuscriptParagraph) => {
		const matches = sourceSearchMatchesByParagraph.get(paragraph.id) ?? []
		if (!matches.length) {
			return paragraph.text
		}

		const parts: ReactNode[] = []
		let cursor = 0

		for (const match of matches) {
			if (match.start > cursor) {
				parts.push(paragraph.text.slice(cursor, match.start))
			}

			const isActive = match.index === activeSourceMatchIndex
			parts.push(
				<mark
					key={`${paragraph.id}-${match.index}`}
					data-source-match-index={match.index}
					className={`rounded px-0.5 ${
						isActive
							? 'bg-accent-300/85 text-ink-950 ring-2 ring-accent-500/40'
							: 'bg-amber-200/60 text-ink-950'
					}`}>
					{paragraph.text.slice(match.start, match.end)}
				</mark>,
			)
			cursor = match.end
		}

		if (cursor < paragraph.text.length) {
			parts.push(paragraph.text.slice(cursor))
		}

		return parts
	}

	return (
		<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
			<main ref={mainRef} className="relative min-w-0">
				{notice ? (
					<div className="pointer-events-none absolute right-4 top-3 z-30 rounded-full border border-emerald-300/40 bg-ink-950/95 px-3 py-1.5 text-xs text-emerald-100 shadow-lg">
						{notice}
					</div>
				) : null}
				{selectedPassage ? (
					<div
						style={{
							top: `${selectedPassage.composerTop}px`,
							left: `${selectedPassage.composerLeft}px`,
						}}
						className="absolute z-40 w-[min(330px,calc(100%-2rem))] rounded-2xl border border-white/12 bg-ink-950/95 p-3 shadow-[0_18px_40px_rgba(0,0,0,0.3)] backdrop-blur">
						<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
							Source snippet
						</p>
						<p className="mt-2 max-h-24 overflow-y-auto rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-silver-100">
							{selectedPassage.quote}
						</p>
						<label className="mt-3 block">
							<span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-silver-300">
								Category
							</span>
							<select
								value={categoryLabel}
								onChange={(event) => setCategoryLabel(event.target.value)}
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
								<option value="">Uncategorised</option>
								{fixedFeedbackCategories.map((category) => (
									<option key={category} value={category}>
										{category}
									</option>
								))}
							</select>
						</label>
						<input
							value={tags}
							onChange={(event) => setTags(event.target.value)}
							className="mt-2 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
							placeholder="Tags, comma separated"
						/>
						<textarea
							value={note}
							onChange={(event) => setNote(event.target.value)}
							rows={2}
							className="mt-2 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
							placeholder="Optional teacher note"
						/>
						{error ? <p className="mt-2 text-xs text-amber-100">{error}</p> : null}
						<div className="mt-3 flex flex-wrap items-center justify-between gap-2">
							<button
								type="button"
								disabled={isSaving}
								onClick={() => {
									void saveSelectedSnippet()
								}}
								className="rounded-full border border-accent-400/70 bg-accent-400/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
								{isSaving ? 'Saving...' : 'Save as snippet'}
							</button>
							<button
								type="button"
								disabled={isSaving}
								onClick={() => setSelectedPassage(null)}
								className="text-[11px] uppercase tracking-[0.1em] text-silver-300 transition hover:text-parchment-100">
								Close
							</button>
						</div>
					</div>
				) : null}
				<div
					ref={sourceReaderRef}
					onMouseUp={captureSelection}
					onKeyUp={captureSelection}
					className="xl:sticky xl:top-24 xl:max-h-[calc(100vh-7.5rem)] xl:overflow-y-auto xl:pr-2">
					<div className="pb-2">
						<StoryFolio
							title={title.trim() || 'Source reading session'}
							eyebrow="Source reading"
							footer={
								<div className="flex flex-wrap items-center justify-between gap-3">
									<p className="text-xs uppercase tracking-[0.12em] text-ink-900/45">
										{paragraphs.length} paragraphs
									</p>
									<button
										type="button"
										onClick={clearSourceText}
										className="rounded-full border border-ink-900/15 bg-white/55 px-4 py-2 text-xs uppercase tracking-[0.1em] text-ink-900/75 transition hover:bg-white">
										Clear source text
									</button>
								</div>
							}>
							{paragraphs.length === 0 ? (
								<p className="text-ink-900/55">
									Paste a longer passage in the right-hand panel, then select text here
									to save teaching snippets.
								</p>
							) : (
								paragraphs.map((paragraph) => (
									<p
										key={paragraph.id}
										data-source-paragraph="true"
										data-source-id={paragraph.id}
										className="scroll-mt-24">
										{renderHighlightedParagraph(paragraph)}
									</p>
								))
							)}
						</StoryFolio>
					</div>
				</div>
			</main>

			<aside className="space-y-4 xl:max-h-[calc(100vh-7.5rem)] xl:overflow-y-auto xl:sticky xl:top-24 xl:self-start xl:pr-2">
				<section className="surface space-y-3 p-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
								Reading session
							</p>
							<p className="mt-1 text-sm text-parchment-100">
								{savedSnippets.length === 1
									? '1 snippet saved'
									: `${savedSnippets.length} snippets saved`}
							</p>
						</div>
						<span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-sm font-semibold text-emerald-100">
							{savedSnippets.length}
						</span>
					</div>
					{notice ? (
						<p className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-50">
							{notice}
						</p>
					) : null}
					{error && !selectedPassage ? (
						<p className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-50">
							{error}
						</p>
					) : null}
					{hasRestoredSession ? (
						<p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-silver-100">
							Restored source text from this browser session.
						</p>
					) : null}
					{sourceText.trim() ? (
						<div className="rounded-2xl border border-white/10 bg-ink-950/45 p-3">
							<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
								Loaded source
							</p>
							<p className="mt-1 text-sm font-semibold text-parchment-100">
								{title.trim() || loadedFileName || 'Untitled source'}
							</p>
							<p className="mt-1 text-xs text-silver-300">
								{[author.trim(), source.trim()].filter(Boolean).join(' / ') ||
									'Metadata not set'}
							</p>
							<div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em] text-silver-400">
								<span>{formatNumber(loadedSourceWordCount)} words</span>
								<span>{formatNumber(paragraphs.length)} paragraphs</span>
							</div>
							{sourceUrl.trim() ? (
								<a
									href={sourceUrl}
									target="_blank"
									rel="noreferrer"
									className="mt-2 block truncate text-xs text-accent-100 underline-offset-4 hover:underline">
									{sourceUrl}
								</a>
							) : null}
						</div>
					) : null}
					<div className="space-y-2">
						<div className="flex items-center justify-between gap-3">
							<label
								htmlFor="source-reader-search"
								className="text-xs uppercase tracking-[0.12em] text-silver-300">
								Search text
							</label>
							<span className="text-xs text-silver-300">
								{sourceSearchQuery.trim()
									? `${sourceSearchMatches.length} matches`
									: 'No search'}
							</span>
						</div>
						<div className="flex gap-2">
							<input
								id="source-reader-search"
								value={sourceSearchQuery}
								onChange={(event) => {
									setSourceSearchQuery(event.target.value)
									setActiveSourceMatchIndex(0)
								}}
								disabled={!sourceText.trim()}
								className="min-w-0 flex-1 rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100 disabled:cursor-not-allowed disabled:opacity-55"
								placeholder="Find in loaded text"
							/>
							<button
								type="button"
								onClick={clearSourceSearch}
								disabled={!sourceSearchQuery}
								className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-parchment-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55">
								Clear
							</button>
						</div>
						<div className="flex items-center justify-between gap-2">
							<p className="text-xs text-silver-300">
								{sourceSearchMatches.length
									? `${activeSourceMatchIndex + 1} of ${sourceSearchMatches.length}`
									: 'Case-insensitive plain text search'}
							</p>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={goToPreviousSourceMatch}
									disabled={!sourceSearchMatches.length}
									className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-parchment-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55">
									Previous
								</button>
								<button
									type="button"
									onClick={goToNextSourceMatch}
									disabled={!sourceSearchMatches.length}
									className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-parchment-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55">
									Next
								</button>
							</div>
						</div>
					</div>
				</section>

				<section className="surface space-y-3 p-4">
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						Source metadata
					</p>
					<input
						value={author}
						onChange={(event) => setAuthor(event.target.value)}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
						placeholder="Author"
					/>
					<input
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
						placeholder="Title"
					/>
					<input
						value={source}
						onChange={(event) => setSource(event.target.value)}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
						placeholder="Source / collection"
					/>
					<input
						type="url"
						value={sourceUrl}
						onChange={(event) => setSourceUrl(event.target.value)}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
						placeholder="Source URL"
					/>
					<input
						value={sourceSection}
						onChange={(event) => setSourceSection(event.target.value)}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
						placeholder="Chapter / section"
					/>
					<textarea
						value={licenceNote}
						onChange={(event) => setLicenceNote(event.target.value)}
						rows={3}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
						placeholder="Licence / source note"
					/>
				</section>

				<section className="surface space-y-3 p-4">
					<div>
						<div className="mb-2 flex items-center justify-between gap-3">
							<span className="text-xs uppercase tracking-[0.12em] text-silver-300">
								Source text
							</span>
							<span className="flex flex-wrap justify-end gap-2">
								<button
									type="button"
									onClick={() => setIsFinderOpen((current) => !current)}
									className="rounded-full border border-accent-300/40 bg-accent-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-300/20">
									Find text
								</button>
								<button
									type="button"
									disabled={isLoadingFile}
									onClick={() => fileInputRef.current?.click()}
									className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
									{isLoadingFile ? 'Loading...' : 'Load text file'}
								</button>
							</span>
						</div>
						{isFinderOpen ? (
							<div className="mb-3 rounded-2xl border border-white/10 bg-ink-950/45 p-3">
								<form onSubmit={searchGutendex} className="space-y-2">
									<div className="flex gap-2">
										<input
											value={gutendexQuery}
											onChange={(event) => setGutendexQuery(event.target.value)}
											className="min-w-0 flex-1 rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
											placeholder="Author, title, keyword"
										/>
										<select
											value={gutendexLanguage}
											onChange={(event) =>
												setGutendexLanguage(event.target.value)
											}
											className="w-24 rounded-xl border border-white/15 bg-ink-900 px-2 py-2 text-sm text-parchment-100">
											<option value="en">English</option>
											<option value="">Any</option>
										</select>
									</div>
									<button
										type="submit"
										disabled={isSearchingGutendex}
										className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
										{isSearchingGutendex ? 'Searching...' : 'Search Gutendex'}
									</button>
								</form>
								{gutendexMessage ? (
									<p className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm text-amber-50">
										{gutendexMessage}
										{gutendexDiagnosticUrl ? (
											<a
												href={gutendexDiagnosticUrl}
												target="_blank"
												rel="noreferrer"
												className="mt-2 block text-xs text-amber-100 underline-offset-4 hover:underline">
												Open Gutendex query
											</a>
										) : null}
									</p>
								) : null}
								{gutendexResults.length ? (
									<div className="mt-3 space-y-2">
										<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
											{formatNumber(gutendexCount)} matches
										</p>
										{gutendexResults.map((result) => (
											<div
												key={result.id}
												className="rounded-xl border border-white/10 bg-ink-900/65 p-3">
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0">
														<p className="text-sm font-semibold text-parchment-100">
															{result.title}
														</p>
														<p className="mt-1 text-xs text-silver-300">
															{sourceAuthorLabel(result.authors)}
														</p>
														<p className="mt-2 text-[11px] uppercase tracking-[0.08em] text-silver-400">
															#{result.id} / {result.languages.join(', ') || 'language unknown'} /{' '}
															{formatNumber(result.downloadCount)} downloads
														</p>
													</div>
													<span
														className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] ${
															result.hasPlainText
																? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'
																: 'border-white/10 bg-white/5 text-silver-300'
														}`}>
														{result.hasPlainText ? 'Plain text' : 'No text'}
													</span>
												</div>
												{result.subjects.length ? (
													<p className="mt-2 line-clamp-2 text-xs text-silver-300">
														{result.subjects.join(' / ')}
													</p>
												) : null}
												<button
													type="button"
													disabled={isLoadingGutendexText}
													onClick={() => {
														void loadGutendexResult(result)
													}}
													className="mt-3 rounded-full border border-accent-300/40 bg-accent-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-300/20 disabled:cursor-not-allowed disabled:opacity-60">
													{isLoadingGutendexText && activeGutendexId === result.id
														? 'Loading...'
														: result.hasPlainText
															? 'Load text'
															: 'Use metadata'}
												</button>
											</div>
										))}
									</div>
								) : null}
							</div>
						) : null}
						<input
							ref={fileInputRef}
							type="file"
							accept=".txt,text/plain"
							onChange={(event) => {
								void loadTextFile(event)
							}}
							className="sr-only"
						/>
						<label className="sr-only" htmlFor="source-text">
							Source text
						</label>
						{loadedFileName ? (
							<p className="mb-2 text-xs text-silver-300">
								Loaded: {loadedFileName}
							</p>
						) : null}
						<textarea
							id="source-text"
							value={sourceText}
							onChange={(event) => {
								setSourceText(event.target.value)
								setSelectedPassage(null)
								setLoadedFileName('')
							}}
							rows={10}
							className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm leading-relaxed text-parchment-100"
							placeholder="Paste the longer passage for this reading session"
						/>
					</div>
				</section>

				<section className="surface p-4">
					<button
						type="button"
						onClick={() => setIsSnippetListOpen((current) => !current)}
						className="flex w-full items-center justify-between gap-3 text-left">
						<span className="text-xs uppercase tracking-[0.12em] text-silver-300">
							Session snippets
						</span>
						<span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-silver-300">
							{savedSnippets.length}
						</span>
					</button>
					{isSnippetListOpen ? (
						<div className="mt-3 space-y-2">
							{savedSnippets.length === 0 ? (
								<p className="text-sm text-silver-300">
									Snippets saved from this passage will appear here.
								</p>
							) : (
								savedSnippets.map((snippet) => (
									<div
										key={snippet.id}
										className="rounded-xl border border-white/10 bg-ink-950/55 px-3 py-3">
										<p className="text-[10px] uppercase tracking-[0.1em] text-silver-300">
											{snippet.categoryLabel}
										</p>
										<p className="mt-2 text-sm leading-relaxed text-parchment-100">
											{compactPreview(snippet.text)}
										</p>
										<p className="mt-2 text-[11px] uppercase tracking-[0.08em] text-silver-400">
											{[snippet.sourceLabel, snippet.sourceTitle]
												.filter(Boolean)
												.join(', ')}
										</p>
										{snippet.tags.length ? (
											<p className="mt-1 text-xs text-silver-300">
												{snippet.tags.join(', ')}
											</p>
										) : null}
										<button
											type="button"
											onClick={() => {
												void deleteSnippet(snippet.id)
											}}
											className="mt-2 text-[11px] uppercase tracking-[0.1em] text-silver-400 transition hover:text-amber-100">
											Delete
										</button>
									</div>
								))
							)}
						</div>
					) : null}
				</section>
			</aside>
		</div>
	)
}
