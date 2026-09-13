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

function isWordCharacter(value: string | undefined) {
	return Boolean(value && /[\p{L}\p{N}]/u.test(value))
}

/**
 * Repair a stored single-paragraph annotation against the immutable manuscript
 * text without mutating the database.
 *
 * Older selections can be displaced by a character if the browser DOM used to
 * calculate an offset contained annotation controls that are absent from the
 * canonical manuscript. Newer anchors retain the literal browser selection;
 * older anchors are repaired only when the evidence is strong enough to avoid
 * changing the writer's manuscript history.
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

	const storedSlice = paragraph.text.slice(anchor.startOffset, anchor.endOffset)
	if (storedSlice === anchor.quote) {
		// Legacy signature for the reported bug: the stored quote begins in the
		// middle of a word and the immediately preceding manuscript character is
		// also a word character. A normal whole-word selection cannot legitimately
		// have that boundary, so expand the display highlight by one character.
		const previousCharacter = paragraph.text[anchor.startOffset - 1]
		const firstCharacter = anchor.quote[0]
		if (
			anchor.startOffset > 0 &&
			isWordCharacter(previousCharacter) &&
			isWordCharacter(firstCharacter) &&
			(!anchor.prefix || anchor.prefix.endsWith(previousCharacter))
		) {
			return {
				...anchor,
				startOffset: anchor.startOffset - 1,
			}
		}

		return anchor
	}

	// If the quote itself is intact but the stored coordinates have drifted,
	// find every nearby exact match and choose the one nearest the old start.
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
