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

export function paginateManuscript(
	paragraphs: ManuscriptParagraph[],
	options?: {
		targetCharacters?: number
		maxParagraphs?: number
	},
): PagedManuscript {
	const targetCharacters = options?.targetCharacters ?? 1400
	const maxParagraphs = options?.maxParagraphs ?? 4

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
	}

	for (const paragraph of paragraphs) {
		const paragraphLength = paragraph.text.length
		const shouldBreak =
			currentPage.length > 0 &&
			(currentPage.length >= maxParagraphs ||
				currentCharacters + paragraphLength > targetCharacters)

		if (shouldBreak) {
			pushPage()
		}

		currentPage.push(paragraph)
		currentCharacters += paragraphLength
	}

	if (currentPage.length > 0) {
		pushPage()
	}

	return {
		pages,
		paragraphIdToPageIndex,
	}
}
