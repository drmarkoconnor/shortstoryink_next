type ManuscriptParagraph = {
	id: string
	text: string
}

export type ManuscriptSelectionAnchor = {
	blockId: string
	endBlockId?: string
	startOffset: number
	endOffset: number
	quote: string
	prefix: string
	suffix: string
	selectionRect: DOMRect
}

const ignoredSelectionSelector =
	'button, input, select, textarea, [data-selection-ignore="true"]'

function elementForSelectionNode(node: Node) {
	return node instanceof Element ? node : node.parentElement
}

function textContentWithoutIgnoredControls(fragment: DocumentFragment) {
	fragment.querySelectorAll(ignoredSelectionSelector).forEach((element) => {
		element.remove()
	})
	return fragment.textContent ?? ''
}

function selectionPopupRect(range: Range) {
	const rects = Array.from(range.getClientRects()).filter(
		(rect) => rect.width > 0 || rect.height > 0,
	)
	return rects.at(-1) ?? range.getBoundingClientRect()
}

function paragraphOffsetForBoundary(
	paragraphElement: HTMLParagraphElement,
	container: Node,
	offset: number,
) {
	const range = document.createRange()
	range.selectNodeContents(paragraphElement)
	range.setEnd(container, offset)
	const measuredOffset = textContentWithoutIgnoredControls(range.cloneContents()).length
	range.detach()
	return measuredOffset
}

function repairSingleParagraphOffsets({
	paragraphText,
	startOffset,
	endOffset,
	selectedText,
}: {
	paragraphText: string
	startOffset: number
	endOffset: number
	selectedText: string
}) {
	const quote = paragraphText.slice(startOffset, endOffset)
	if (!selectedText || quote === selectedText || quote.trim() === selectedText.trim()) {
		return { startOffset, endOffset, quote }
	}

	const nearStart = Math.max(0, startOffset - 16)
	const nearEnd = Math.min(paragraphText.length, endOffset + 16)
	const nearMatch = paragraphText.slice(nearStart, nearEnd).indexOf(selectedText)
	if (nearMatch >= 0) {
		const repairedStart = nearStart + nearMatch
		const repairedEnd = repairedStart + selectedText.length
		return {
			startOffset: repairedStart,
			endOffset: repairedEnd,
			quote: paragraphText.slice(repairedStart, repairedEnd),
		}
	}

	const globalMatch = paragraphText.indexOf(selectedText)
	if (globalMatch >= 0) {
		const repairedEnd = globalMatch + selectedText.length
		return {
			startOffset: globalMatch,
			endOffset: repairedEnd,
			quote: paragraphText.slice(globalMatch, repairedEnd),
		}
	}

	return { startOffset, endOffset, quote }
}

function buildCanonicalQuote({
	paragraphs,
	startIndex,
	endIndex,
	startOffset,
	endOffset,
}: {
	paragraphs: ManuscriptParagraph[]
	startIndex: number
	endIndex: number
	startOffset: number
	endOffset: number
}) {
	if (startIndex === endIndex) {
		const paragraphText = paragraphs[startIndex]?.text ?? ''
		return paragraphText.slice(startOffset, endOffset)
	}

	const parts: string[] = []
	for (let index = startIndex; index <= endIndex; index += 1) {
		const paragraphText = paragraphs[index]?.text ?? ''
		if (index === startIndex) {
			parts.push(paragraphText.slice(startOffset))
		} else if (index === endIndex) {
			parts.push(paragraphText.slice(0, endOffset))
		} else {
			parts.push(paragraphText)
		}
	}

	return parts.join('\n\n')
}

export function shouldIgnoreSelectionTarget(target: EventTarget | null) {
	if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
		return false
	}

	return Boolean(target.closest(ignoredSelectionSelector))
}

export function clearBrowserSelection() {
	window.getSelection()?.removeAllRanges()
}

export function captureManuscriptSelection(
	paragraphs: ManuscriptParagraph[],
): ManuscriptSelectionAnchor | null {
	const selection = window.getSelection()
	if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
		return null
	}

	const range = selection.getRangeAt(0)
	const startParagraphElement = elementForSelectionNode(
		range.startContainer,
	)?.closest('p[id^="p-"]') as HTMLParagraphElement | null
	const endParagraphElement = elementForSelectionNode(range.endContainer)?.closest(
		'p[id^="p-"]',
	) as HTMLParagraphElement | null

	if (!startParagraphElement || !endParagraphElement) {
		return null
	}

	const paragraphIndexById = Object.fromEntries(
		paragraphs.map((paragraph, index) => [paragraph.id, index]),
	) as Record<string, number>
	const startIndex = paragraphIndexById[startParagraphElement.id]
	const endIndex = paragraphIndexById[endParagraphElement.id]
	if (
		startIndex === undefined ||
		endIndex === undefined ||
		startIndex > endIndex
	) {
		return null
	}

	let startOffset = paragraphOffsetForBoundary(
		startParagraphElement,
		range.startContainer,
		range.startOffset,
	)
	let endOffset = paragraphOffsetForBoundary(
		endParagraphElement,
		range.endContainer,
		range.endOffset,
	)
	const isMultiBlockSelection = startParagraphElement.id !== endParagraphElement.id

	if (
		(!isMultiBlockSelection && endOffset <= startOffset) ||
		(isMultiBlockSelection && endOffset < 0)
	) {
		return null
	}

	let quote = buildCanonicalQuote({
		paragraphs,
		startIndex,
		endIndex,
		startOffset,
		endOffset,
	})

	if (!isMultiBlockSelection) {
		const selectedText = textContentWithoutIgnoredControls(range.cloneContents())
		const repaired = repairSingleParagraphOffsets({
			paragraphText: paragraphs[startIndex]?.text ?? '',
			startOffset,
			endOffset,
			selectedText,
		})
		startOffset = repaired.startOffset
		endOffset = repaired.endOffset
		quote = repaired.quote
	}

	if (!quote.trim()) {
		return null
	}

	const startParagraphText = paragraphs[startIndex]?.text ?? ''
	const endParagraphText = paragraphs[endIndex]?.text ?? ''

	return {
		blockId: startParagraphElement.id,
		...(isMultiBlockSelection ? { endBlockId: endParagraphElement.id } : {}),
		startOffset,
		endOffset,
		quote,
		prefix: startParagraphText.slice(Math.max(0, startOffset - 24), startOffset),
		suffix: endParagraphText.slice(
			endOffset,
			Math.min(endParagraphText.length, endOffset + 24),
		),
		selectionRect: selectionPopupRect(range),
	}
}
