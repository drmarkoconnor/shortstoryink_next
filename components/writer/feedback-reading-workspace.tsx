'use client'

import { useMemo, useState, type ReactNode } from 'react'

type FeedbackKind = 'typo' | 'craft' | 'pacing' | 'structure'

type FeedbackAnchor = {
	blockId: string
	startOffset: number
	endOffset: number
	quote: string
	prefix?: string
	suffix?: string
	kind?: FeedbackKind
}

type FeedbackItem = {
	id: string
	comment: string
	anchor: FeedbackAnchor | null
	createdAt: string
}

type ActiveInlineComment = {
	id: string
	quote: string
	comment: string
	kind: FeedbackKind
	createdAt: string
}

function getMarkClass(kind: FeedbackKind) {
	if (kind === 'typo') {
		return 'mark-grammar'
	}
	if (kind === 'structure') {
		return 'mark-structure'
	}
	return 'mark-craft'
}

function kindLabel(kind: FeedbackKind) {
	if (kind === 'typo') {
		return 'Typo / Grammar'
	}
	if (kind === 'craft') {
		return 'Craft'
	}
	if (kind === 'pacing') {
		return 'Pacing'
	}
	return 'Structure'
}

function formatQuote(quote: string) {
	return quote.trim() ? `"${quote}"` : 'General note'
}

export function WriterFeedbackReadingWorkspace({
	title,
	paragraphs,
	feedback,
}: {
	title: string
	paragraphs: Array<{ id: string; text: string }>
	feedback: FeedbackItem[]
}) {
	const [activeCommentId, setActiveCommentId] = useState<string | null>(
		feedback[0]?.id ?? null,
	)
	const [isPanelOpen, setIsPanelOpen] = useState(false)

	const feedbackByBlock = useMemo(() => {
		const map: Record<string, FeedbackItem[]> = {}
		for (const item of feedback) {
			if (!item.anchor?.blockId) {
				continue
			}
			if (!map[item.anchor.blockId]) {
				map[item.anchor.blockId] = []
			}
			map[item.anchor.blockId].push(item)
		}
		for (const key of Object.keys(map)) {
			map[key].sort((a, b) => {
				const aStart = a.anchor?.startOffset ?? 0
				const bStart = b.anchor?.startOffset ?? 0
				return aStart - bStart
			})
		}
		return map
	}, [feedback])

	const activeComment = useMemo<ActiveInlineComment | null>(() => {
		if (!activeCommentId) {
			return null
		}
		const found = feedback.find((item) => item.id === activeCommentId)
		if (!found) {
			return null
		}
		const kind = found.anchor?.kind ?? 'craft'
		return {
			id: found.id,
			quote: found.anchor?.quote || 'General note',
			comment: found.comment,
			kind,
			createdAt: found.createdAt,
		}
	}, [activeCommentId, feedback])

	const renderParagraph = (paragraphId: string, text: string) => {
		const items = feedbackByBlock[paragraphId] ?? []
		if (items.length === 0) {
			return [text]
		}

		const nodes: ReactNode[] = []
		let cursor = 0

		for (const item of items) {
			if (!item.anchor) {
				continue
			}
			const start = Math.max(
				cursor,
				Math.min(item.anchor.startOffset, text.length),
			)
			const end = Math.max(start, Math.min(item.anchor.endOffset, text.length))

			if (start > cursor) {
				nodes.push(text.slice(cursor, start))
			}

			const markedText = text.slice(start, end)
			if (markedText) {
				const kind = item.anchor.kind ?? 'craft'
				nodes.push(
					<button
						type="button"
						key={item.id}
						onClick={() => setActiveCommentId(item.id)}
						onMouseEnter={() => setActiveCommentId(item.id)}
						onFocus={() => setActiveCommentId(item.id)}
						className={`group relative isolate ${getMarkClass(kind)} rounded px-1 transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300/70`}
						aria-label={`${kindLabel(kind)} comment: ${item.comment}`}>
						{markedText}
						<span className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 w-[240px] -translate-x-1/2 rounded-2xl border border-ink-900/20 bg-parchment-100 px-3 py-2 text-left text-[12px] leading-5 text-ink-900 opacity-0 shadow-[0_10px_30px_rgba(11,14,23,0.22)] transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
							<span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-900/65">
								{kindLabel(kind)}
							</span>
							<span>{item.comment}</span>
							<span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-ink-900/20 bg-parchment-100" />
						</span>
					</button>,
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
		<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
			<main className="space-y-3">
				{activeComment ? (
					<div className="surface border-burgundy-300/35 p-4">
						<div className="mb-3 flex items-start justify-between gap-3">
							<div className="space-y-2">
								<p className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-300">
									{kindLabel(activeComment.kind)}
								</p>
								<p className="max-w-[42ch] font-serif text-sm italic leading-relaxed text-parchment-100/90">
									{formatQuote(activeComment.quote)}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setActiveCommentId(null)}
								className="text-xs text-accent-200 hover:text-accent-100">
								Dismiss
							</button>
						</div>
						<p className="text-sm leading-relaxed text-silver-100">
							{activeComment.comment}
						</p>
						<p className="mt-2 text-xs text-silver-300">
							{new Date(activeComment.createdAt).toLocaleString()}
						</p>
					</div>
				) : null}

				<article className="folio-page p-8 lg:p-10">
					<header className="mb-8 border-b border-ink-900/10 pb-5">
						<p className="text-xs uppercase tracking-[0.14em] text-ink-900/55">
							Published feedback draft
						</p>
						<h2 className="literary-title mt-2 text-3xl leading-tight text-ink-900">
							{title}
						</h2>
					</header>
					<div className="max-w-[75ch] space-y-5 font-serif text-[18px] leading-8 text-ink-900/90">
						{paragraphs.map((paragraph) => {
							const isSceneBreak = paragraph.text.trim() === '**'

							return (
								<p
									key={paragraph.id}
									id={paragraph.id}
									className={
										isSceneBreak
											? 'text-center tracking-[0.22em] text-ink-900/60'
											: 'whitespace-pre-wrap'
									}>
									{isSceneBreak
										? '***'
										: renderParagraph(paragraph.id, paragraph.text)}
								</p>
							)
						})}
					</div>
				</article>
			</main>

			<aside className="space-y-3">
				<button
					type="button"
					onClick={() => setIsPanelOpen((value) => !value)}
					className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/30 hover:text-parchment-100">
					{isPanelOpen
						? 'Hide full comments panel'
						: 'Open full comments panel'}
				</button>

				{isPanelOpen ? (
					<div className="surface p-5">
						<h3 className="literary-title text-lg text-parchment-100">
							All comments
						</h3>
						{feedback.length === 0 ? (
							<p className="mt-3 text-sm text-silver-300">No comments found.</p>
						) : (
							<ul className="mt-3 space-y-2">
								{feedback.map((item) => {
									const kind = item.anchor?.kind ?? 'craft'
									return (
										<li
											key={item.id}
											className="rounded-xl border border-white/10 bg-ink-900/40 p-3">
											<div className="flex flex-wrap items-center gap-2">
												<p className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-300">
													{kindLabel(kind)}
												</p>
												<p className="font-serif text-sm italic text-parchment-100/90">
													{formatQuote(item.anchor?.quote ?? '')}
												</p>
											</div>
											<p className="mt-2 text-sm text-parchment-100">
												{item.comment}
											</p>
											<button
												type="button"
												onClick={() => setActiveCommentId(item.id)}
												className="mt-2 text-xs text-accent-200 hover:text-accent-100">
												Focus in reading panel
											</button>
										</li>
									)
								})}
							</ul>
						)}
					</div>
				) : (
					<p className="text-xs text-silver-300">
						Reading mode active. Inline popout stays above the folio while the
						full panel is hidden.
					</p>
				)}
			</aside>
		</div>
	)
}

