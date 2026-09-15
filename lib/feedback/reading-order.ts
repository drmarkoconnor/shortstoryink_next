type AnchoredFeedback = {
	anchor: { blockId: string; startOffset: number } | null
}

/** Presentation order only: never change stored anchors, IDs, or comment text. */
export function feedbackInReadingOrder<T extends AnchoredFeedback>(
	feedback: readonly T[],
	paragraphs: ReadonlyArray<{ id: string }>,
): T[] {
	const positions = new Map(paragraphs.map((paragraph, index) => [paragraph.id, index]))
	const position = (item: T) => item.anchor ? positions.get(item.anchor.blockId) ?? Infinity : Infinity
	return [...feedback].sort((a, b) => {
		const aPosition = position(a)
		const bPosition = position(b)
		if (aPosition !== bPosition) return aPosition - bPosition
		// Unknown anchors keep their existing order at the end.
		if (!Number.isFinite(aPosition)) return 0
		return (a.anchor?.startOffset ?? 0) - (b.anchor?.startOffset ?? 0)
	})
}
