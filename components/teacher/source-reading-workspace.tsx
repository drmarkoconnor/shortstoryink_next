'use client'

import type { ChangeEvent, FormEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import { StoryFolio } from '@/components/prototype/story-folio'
import { fixedFeedbackCategories } from '@/lib/feedback/categories'
import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'

const MAX_TEXT_FILE_BYTES = 3 * 1024 * 1024

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

type GutendexResult = {
	id: number
	title: string
	authors: string[]
	languages: string[]
	subjects: string[]
	downloadCount: number
	plainTextUrl: string
	hasPlainText: boolean
	gutenbergUrl: string
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

function authorLabel(authors: string[]) {
	return authors.length ? authors.join('; ') : 'Unknown author'
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
	const [gutendexResults, setGutendexResults] = useState<GutendexResult[]>([])
	const [gutendexCount, setGutendexCount] = useState(0)
	const [gutendexMessage, setGutendexMessage] = useState('')
	const [activeGutendexId, setActiveGutendexId] = useState<number | null>(null)
	const paragraphs = useMemo(() => toManuscriptParagraphs(sourceText), [sourceText])

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
			setLoadedFileName(file.name)
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
						results?: GutendexResult[]
				  }
				| undefined

			if (!response.ok || payload?.error) {
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

	const metadataNeedsConfirmation = (result: GutendexResult) => {
		const nextAuthor = authorLabel(result.authors)
		return (
			(author.trim() && author.trim() !== nextAuthor) ||
			(title.trim() && title.trim() !== result.title) ||
			(source.trim() && source.trim() !== 'manual' && source.trim() !== 'Project Gutenberg') ||
			(sourceUrl.trim() && sourceUrl.trim() !== result.gutenbergUrl) ||
			(licenceNote.trim() &&
				licenceNote.trim() !== 'Public domain text from Project Gutenberg.')
		)
	}

	const loadGutendexResult = async (result: GutendexResult) => {
		clearMessages()
		setGutendexMessage('')

		if (
			metadataNeedsConfirmation(result) &&
			!window.confirm(
				`Replace the current source metadata with "${result.title}"?`,
			)
		) {
			return
		}

		setAuthor(authorLabel(result.authors))
		setTitle(result.title)
		setSource('Project Gutenberg')
		setSourceUrl(result.gutenbergUrl)
		setLicenceNote('Public domain text from Project Gutenberg.')

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
			setLoadedFileName(`Project Gutenberg #${result.id}`)
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
					onKeyUp={captureSelection}>
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
									{paragraph.text}
								</p>
							))
						)}
					</StoryFolio>
				</div>
			</main>

			<aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
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
															{authorLabel(result.authors)}
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
