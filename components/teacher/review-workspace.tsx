'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { StoryFolio } from '@/components/prototype/story-folio'
import { ProtoCard } from '@/components/prototype/card'

type FeedbackAnchor = {
	blockId: string
	startOffset: number
	endOffset: number
	quote: string
	prefix?: string
	suffix?: string
	kind?: 'typo' | 'craft' | 'pacing' | 'structure'
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
	createFeedbackAction,
}: {
	title: string
	paragraphs: Array<{ id: string; text: string }>
	feedback: FeedbackItem[]
	notice: string | null
	errorNotice: string | null
	createFeedbackAction: (formData: FormData) => void
}) {
	const [selectedAnchor, setSelectedAnchor] = useState<SelectedAnchor | null>(
		null,
	)

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
		<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
			<main onMouseUp={captureSelection} onKeyUp={captureSelection}>
				<StoryFolio title={title}>
					{paragraphs.map((paragraph) => {
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

			<aside className="space-y-3">
				<ProtoCard title="Add comment" meta="Select text in reading panel">
					{notice ? (
						<p className="mb-3 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
							{notice}
						</p>
					) : null}
					{errorNotice ? (
						<p className="mb-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
							{errorNotice}
						</p>
					) : null}

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
									name="kind"
									defaultValue="craft"
									className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
									<option value="typo">Typo / Grammar</option>
									<option value="craft">Craft</option>
									<option value="pacing">Pacing</option>
									<option value="structure">Structure</option>
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
											{kindLabel(item.anchor?.kind)}
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
								</li>
							))}
						</ul>
					)}
				</ProtoCard>
			</aside>
		</div>
	)
}

