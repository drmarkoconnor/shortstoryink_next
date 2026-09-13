export type RepairableAnchor = {
	blockId: string
	endBlockId?: string
	startOffset: number
	endOffset: number
	quote: string
	prefix?: string
	suffix?: string
}

type ManuscriptParagraph = {
	id: string
	text: string
}

/**
 * Repair a stored single-paragraph annotation against the immutable manuscript
 * text without mutating the database.
 *
 * Older selections can be displaced by a character if the browser DOM used to
 * calculate an offset contained annotation controls that are absent from the
 * canonical manuscript. The stored quote is the safest evidence of what the
 * editor originally selected, so if the recorded offsets no longer slice to
 * that quote we re-locate the nearest exact occurrence.
 */
export function repairSingleBlockAnchor<T extends RepairableAnchor>(
	anchor: T,
	paragraphs: ManuscriptParagraph[],
): T {
	if (!anchor.quote || (anchor.endBlockId && anchor.endBlockId !== anchor.blockId)) {
		return anchor
	}

	const paragraph = paragraphs.find((item) => item.id === anchor.blockId)
	if (!paragraph) {
		return anchor
	}

	if (paragraph.text.slice(anchor.startOffset, anchor.endOffset) === anchor.quote) {
		return anchor
	}

	const nearStart = Math.max(0, anchor.startOffset - 64)
	const nearEnd = Math.min(paragraph.text.length, anchor.endOffset + 64)
	const nearText = paragraph.text.slice(nearStart, nearEnd)
	const matches: number[] = []
	let searchFrom = 0

	while (searchFrom <= nearText.length - anchor.quote.length) {
		const match = nearText.indexOf(anchor.quote, searchFrom)
		if (match < 0) break
		matches.push(nearStart + match)
		searchFrom = match + 1
	}

	if (matches.length === 0) {
		return anchor
	}

	const repairedStart = matches.reduce((closest, candidate) =>
		Math.abs(candidate - anchor.startOffset) < Math.abs(closest - anchor.startOffset)
			? candidate
			: closest,
	)

	return {
		...anchor,
		startOffset: repairedStart,
		endOffset: repairedStart + anchor.quote.length,
	}
}
