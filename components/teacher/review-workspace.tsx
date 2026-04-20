'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { StoryFolio } from '@/components/prototype/story-folio'
import { ProtoCard } from '@/components/prototype/card'
import { paginateManuscript } from '@/lib/manuscript/paging'

type FeedbackAnchor = {
	blockId: string
	startOffset: number
	endOffset: number
	quote: string
	prefix?: string
	suffix?: string
	kind?: 'typo' | 'craft' | 'pacing' | 'structure'
	categoryLabel?: string
	categorySlug?: string
}

type FeedbackItem = {
	id: string
	comment: string
	createdAt: string
	anchor: FeedbackAnchor | null
}

type SelectedAnchor = {
	blockId: string
	startOffset: number
	endOffset: number
	quote: string
	prefix: string
	suffix: string
}

function kindLabel(kind: FeedbackAnchor['kind']) {
	if (kind === 'typo') {
		return 'Typo / Grammar'
	}
	if (kind === 'pacing') {
		return 'Pacing'
	}
	if (kind === 'structure') {
		return 'Structure'
	}
	return 'Craft'
}

function feedbackLabel(anchor: FeedbackAnchor | null | undefined) {
	if (anchor?.categoryLabel?.trim()) {
		return anchor.categoryLabel
	}
	return kindLabel(anchor?.kind)
}

function formatQuote(quote: string | undefined) {
	return quote && quote.trim() ? `"${quote}"` : 'General note'
}

function renderParagraphWithAnchors(
	text: string,
	anchors: FeedbackAnchor[],
): ReactNode[] {
	if (anchors.length === 0) {
		return [text]
	}

	const sorted = [...anchors]
		.filter(
			(anchor) =>
				Number.isFinite(anchor.startOffset) &&
				Number.isFinite(anchor.endOffset),
		)
		.sort((a, b) => a.startOffset - b.startOffset)

	const nodes: ReactNode[] = []
	let cursor = 0

	sorted.forEach((anchor, index) => {
		const safeStart = Math.max(
			cursor,
			Math.min(anchor.startOffset, text.length),
		)
		const safeEnd = Math.max(safeStart, Math.min(anchor.endOffset, text.length))

		if (safeStart > cursor) {
			nodes.push(text.slice(cursor, safeStart))
		}

		const markedText = text.slice(safeStart, safeEnd)
		if (markedText) {
			const markClass =
				anchor.kind === 'typo'
					? 'mark-grammar'
					: anchor.kind === 'structure'
						? 'mark-structure'
						: 'mark-craft'

			nodes.push(
				<mark
					key={`${anchor.blockId}-${safeStart}-${index}`}
					className={`${markClass} rounded px-1`}>
					{markedText}
				</mark>,
			)
		}

		cursor = safeEnd
	})

	if (cursor < text.length) {
		nodes.push(text.slice(cursor))
	}

	return nodes
}

export function TeacherReviewWorkspace({
	title,
	paragraphs,
	feedback,
	notice,
	errorNotice,
	canSaveSnippets,
	snippetCategories,
	feedbackCategories,
	createFeedbackAction,
	createSnippetAction,
}: {
	title: string
	paragraphs: Array<{ id: string; text: string }>
	feedback: FeedbackItem[]
	notice: string | null
	errorNotice: string | null
	canSaveSnippets: boolean
	snippetCategories: Array<{ id: string; name: string }>
	feedbackCategories: Array<{
		id: string
		name: string
		tone: 'typo' | 'craft' | 'pacing' | 'structure'
	}>
	createFeedbackAction: (formData: FormData) => void
	createSnippetAction: (formData: FormData) => void
}) {
	const [selectedAnchor, setSelectedAnchor] = useState<SelectedAnchor | null>(
		null,
	)

	const pagedManuscript = useMemo(
		() => paginateManuscript(paragraphs),
		[paragraphs],
	)
	const [pageIndex, setPageIndex] = useState(0)

	const feedbackByBlock = useMemo(() => {
		const map: Record<string, FeedbackAnchor[]> = {}

		feedback.forEach((item) => {
			if (!item.anchor?.blockId) {
				return
			}

			if (!map[item.anchor.blockId]) {
				map[item.anchor.blockId] = []
			}

			map[item.anchor.blockId].push(item.anchor)
		})

		return map
	}, [feedback])

	const totalPages = pagedManuscript.pages.length
	const currentPage =
		pagedManuscript.pages[Math.min(pageIndex, totalPages - 1)] ??
		pagedManuscript.pages[0]

	const goToPage = (nextPage: number) => {
		if (totalPages === 0) {
			return
		}

		const clamped = Math.max(0, Math.min(nextPage, totalPages - 1))
		setSelectedAnchor(null)
		setPageIndex(clamped)
	}

	const focusFeedbackItem = (item: FeedbackItem) => {
		const blockId = item.anchor?.blockId
		if (blockId) {
			const targetPage = pagedManuscript.paragraphIdToPageIndex[blockId]
			if (Number.isFinite(targetPage)) {
				goToPage(targetPage)
			}
		}
	}

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

		if (
			!startParagraph ||
			!endParagraph ||
			startParagraph.id !== endParagraph.id
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

		const prefix = paragraphText.slice(
			Math.max(0, startOffset - 24),
			startOffset,
		)
		const suffix = paragraphText.slice(
			endOffset,
			Math.min(paragraphText.length, endOffset + 24),
		)

		setSelectedAnchor({
			blockId: startParagraph.id,
			startOffset,
			endOffset,
			quote,
			prefix,
			suffix,
		})
	}

	return (
		<div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_300px] 2xl:grid-cols-[minmax(0,1.65fr)_320px]">
			<main onMouseUp={captureSelection} onKeyUp={captureSelection}>
				<div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/25 px-4 py-3">
					<div>
						<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
							Reading pages
						</p>
						<p className="mt-1 text-sm text-silver-200">
							Page {Math.min(pageIndex + 1, totalPages)} of {totalPages}
						</p>
					</div>
				</div>
				<StoryFolio
					title={title}
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
						const blockId = paragraph.id
						const anchors = feedbackByBlock[blockId] ?? []
						const isSceneBreak = paragraph.text.trim() === '**'

						return (
							<p
								key={blockId}
								id={blockId}
								className={
									isSceneBreak
										? 'text-center tracking-[0.22em] text-ink-900/60'
										: 'whitespace-pre-wrap'
								}>
								{isSceneBreak
									? '***'
									: renderParagraphWithAnchors(paragraph.text, anchors)}
							</p>
						)
					})}
				</StoryFolio>
			</main>

			<aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
				{notice ? (
					<p className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
						{notice}
					</p>
				) : null}
				{errorNotice ? (
					<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						{errorNotice}
					</p>
				) : null}

				<ProtoCard title="Add comment" meta="Select text in reading panel">

					{selectedAnchor ? (
						<form action={createFeedbackAction} className="space-y-2">
							<input
								type="hidden"
								name="blockId"
								value={selectedAnchor.blockId}
							/>
							<input
								type="hidden"
								name="startOffset"
								value={String(selectedAnchor.startOffset)}
							/>
							<input
								type="hidden"
								name="endOffset"
								value={String(selectedAnchor.endOffset)}
							/>
							<input type="hidden" name="quote" value={selectedAnchor.quote} />
							<div className="grid gap-2">
								<label className="text-xs uppercase tracking-[0.1em] text-silver-300">
									Comment category
								</label>
								<select
									name="feedbackCategoryId"
									defaultValue=""
									className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
									{feedbackCategories.length === 0 ? (
										<>
											<option value="legacy:craft">Craft</option>
											<option value="legacy:typo">Typo / Grammar</option>
											<option value="legacy:pacing">Pacing</option>
											<option value="legacy:structure">Structure</option>
										</>
									) : (
										feedbackCategories.map((category) => (
											<option key={category.id} value={category.id}>
												{category.name}
											</option>
										))
									)}
								</select>
							</div>

							<input
								type="hidden"
								name="prefix"
								value={selectedAnchor.prefix}
							/>
							<input
								type="hidden"
								name="suffix"
								value={selectedAnchor.suffix}
							/>

							<p className="rounded-lg border border-white/10 bg-ink-900/40 px-3 py-2 text-xs text-silver-200">
								{selectedAnchor.quote}
							</p>
							<textarea
								name="comment"
								required
								rows={4}
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
								placeholder="Add comment for selected text"
							/>
							<button
								type="submit"
								className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs text-parchment-100 transition hover:bg-accent-400/30">
								Save comment
							</button>
						</form>
					) : (
						<p className="text-sm text-silver-300">
							Highlight a passage in the reading panel to start a comment.
						</p>
					)}
				</ProtoCard>

				<ProtoCard title="Save snippet" meta="Private by default">
					{!canSaveSnippets ? (
						<p className="text-sm text-silver-300">
							Snippet saving is only available in the modern submission schema.
						</p>
					) : selectedAnchor ? (
						<form action={createSnippetAction} className="space-y-2">
							<input
								type="hidden"
								name="blockId"
								value={selectedAnchor.blockId}
							/>
							<input
								type="hidden"
								name="startOffset"
								value={String(selectedAnchor.startOffset)}
							/>
							<input
								type="hidden"
								name="endOffset"
								value={String(selectedAnchor.endOffset)}
							/>
							<input type="hidden" name="quote" value={selectedAnchor.quote} />
							<input type="hidden" name="prefix" value={selectedAnchor.prefix} />
							<input type="hidden" name="suffix" value={selectedAnchor.suffix} />

							<p className="rounded-lg border border-white/10 bg-ink-900/40 px-3 py-2 text-xs text-silver-200">
								{selectedAnchor.quote}
							</p>
							<div className="grid gap-2">
								<label className="text-xs uppercase tracking-[0.1em] text-silver-300">
									Category
								</label>
								<select
									name="snippetCategoryId"
									defaultValue=""
									className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
									<option value="">Uncategorised</option>
									{snippetCategories.map((category) => (
										<option key={category.id} value={category.id}>
											{category.name}
										</option>
									))}
								</select>
							</div>
							<textarea
								name="note"
								rows={3}
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
								placeholder="Optional note about why this passage matters"
							/>
							<button
								type="submit"
								className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs text-parchment-100 transition hover:bg-accent-400/30">
								Save snippet
							</button>
						</form>
					) : (
						<p className="text-sm text-silver-300">
							Highlight a passage in the reading panel to save it as a snippet.
						</p>
					)}
				</ProtoCard>

				<ProtoCard title="Feedback items" meta="Teacher annotations">
					{feedback.length === 0 ? (
						<p className="text-sm text-silver-300">No comments yet.</p>
					) : (
						<ul className="space-y-2">
							{feedback.map((item) => (
								<li
									key={item.id}
									className="rounded-xl border border-white/10 bg-ink-900/40 p-3">
									<div className="flex flex-wrap items-center gap-2">
										<p className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-300">
											{feedbackLabel(item.anchor)}
										</p>
										<p className="font-serif text-sm italic text-parchment-100/90">
											{formatQuote(item.anchor?.quote)}
										</p>
									</div>
									<p className="mt-2 text-sm text-parchment-100">
										{item.comment}
									</p>
									<p className="mt-2 text-xs text-silver-300">
										{new Date(item.createdAt).toLocaleString()}
									</p>
									<button
										type="button"
										onClick={() => focusFeedbackItem(item)}
										className="mt-3 text-xs text-accent-200 hover:text-accent-100">
										Open in reading page
									</button>
								</li>
							))}
						</ul>
					)}
				</ProtoCard>
			</aside>
		</div>
	)
}
