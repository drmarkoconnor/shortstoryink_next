import type { ManuscriptParagraph } from '@/lib/manuscript/paragraphs'

export type ManuscriptPage = {
	index: number
	paragraphs: ManuscriptParagraph[]
}

export type PagedManuscript = {
	pages: ManuscriptPage[]
	paragraphIdToPageIndex: Record<string, number>
}

export const readingPageOptions = {
	targetCharacters: 2600,
	maxParagraphs: 7,
}

export const bookReadingPageOptions = {
	targetLines: 14,
	charactersPerLine: 58,
	paragraphGapLines: 0.55,
	sceneBreakLines: 1,
	maxParagraphs: 8,
}

type PagingOptions = {
	targetCharacters?: number
	maxParagraphs?: number
	targetLines?: number
	charactersPerLine?: number
	paragraphGapLines?: number
	sceneBreakLines?: number
}

function estimateParagraphLines(
	paragraph: ManuscriptParagraph,
	options: Required<
		Pick<
			PagingOptions,
			'charactersPerLine' | 'paragraphGapLines' | 'sceneBreakLines'
		>
	>,
) {
	const text = paragraph.text.trim()
	if (!text) {
		return 1
	}

	if (text === '**') {
		return options.sceneBreakLines
	}

	return paragraph.text.split(/\r?\n/).reduce((total, line) => {
		return total + Math.max(1, Math.ceil(line.length / options.charactersPerLine))
	}, 0)
}

export function paginateManuscript(
	paragraphs: ManuscriptParagraph[],
	options?: PagingOptions,
): PagedManuscript {
	const targetCharacters = options?.targetCharacters ?? 1400
	const maxParagraphs = options?.maxParagraphs ?? 4
	const targetLines = options?.targetLines
	const lineOptions = {
		charactersPerLine: options?.charactersPerLine ?? 58,
		paragraphGapLines: options?.paragraphGapLines ?? 0.55,
		sceneBreakLines: options?.sceneBreakLines ?? 1,
	}

	if (paragraphs.length === 0) {
		return {
			pages: [{ index: 0, paragraphs: [] }],
			paragraphIdToPageIndex: {},
		}
	}

	const pages: ManuscriptPage[] = []
	const paragraphIdToPageIndex: Record<string, number> = {}
	let currentPage: ManuscriptParagraph[] = []
	let currentCharacters = 0
	let currentLines = 0

	const pushPage = () => {
		const pageIndex = pages.length
		const pageParagraphs = currentPage
		pages.push({
			index: pageIndex,
			paragraphs: pageParagraphs,
		})

		for (const paragraph of pageParagraphs) {
			paragraphIdToPageIndex[paragraph.id] = pageIndex
		}

		currentPage = []
		currentCharacters = 0
		currentLines = 0
	}

	for (const paragraph of paragraphs) {
		const paragraphLength = paragraph.text.length
		const paragraphLines =
			estimateParagraphLines(paragraph, lineOptions) +
			(currentPage.length > 0 ? lineOptions.paragraphGapLines : 0)
		const shouldBreak =
			currentPage.length > 0 &&
			(targetLines
				? currentPage.length >= maxParagraphs ||
					currentLines + paragraphLines > targetLines
				: currentPage.length >= maxParagraphs ||
					currentCharacters + paragraphLength > targetCharacters)

		if (shouldBreak) {
			pushPage()
		}

		currentPage.push(paragraph)
		currentCharacters += paragraphLength
		currentLines +=
			estimateParagraphLines(paragraph, lineOptions) +
			(currentPage.length > 1 ? lineOptions.paragraphGapLines : 0)
	}

	if (currentPage.length > 0) {
		pushPage()
	}

	return {
		pages,
		paragraphIdToPageIndex,
	}
}
