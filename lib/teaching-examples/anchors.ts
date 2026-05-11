import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
import {
	exampleCategorySlug,
	normalizeExampleCategory,
	type ExampleAnnotation,
	type ExampleAnchor,
	type ExampleCraftCategory,
} from '@/lib/teaching-examples/types'

export type ExampleTemplateAnnotationSpec = {
	quote: string
	comment: string
	categoryLabel: ExampleCraftCategory
	tags?: string[]
}

function buildAnchor({
	blockId,
	text,
	startOffset,
	endOffset,
	quote,
}: {
	blockId: string
	text: string
	startOffset: number
	endOffset: number
	quote: string
}): ExampleAnchor {
	return {
		blockId,
		startOffset,
		endOffset,
		quote,
		prefix: text.slice(Math.max(0, startOffset - 24), startOffset),
		suffix: text.slice(endOffset, Math.min(text.length, endOffset + 24)),
	}
}

export function findAnchorForQuote(
	body: string,
	quote: string,
): ExampleAnchor | null {
	const normalizedQuote = quote.replace(/\s+/g, ' ').trim()
	if (!normalizedQuote) {
		return null
	}

	for (const paragraph of toManuscriptParagraphs(body)) {
		const normalizedParagraph = paragraph.text.replace(/\s+/g, ' ')
		const normalizedStart = normalizedParagraph.indexOf(normalizedQuote)
		if (normalizedStart === -1) {
			continue
		}

		let sourceStart = 0
		let normalizedCursor = 0
		while (
			sourceStart < paragraph.text.length &&
			normalizedCursor < normalizedStart
		) {
			const character = paragraph.text[sourceStart]
			if (/\s/.test(character)) {
				while (
					sourceStart < paragraph.text.length &&
					/\s/.test(paragraph.text[sourceStart])
				) {
					sourceStart += 1
				}
				normalizedCursor += 1
			} else {
				sourceStart += 1
				normalizedCursor += 1
			}
		}

		const sourceQuote = paragraph.text
			.slice(sourceStart)
			.replace(/\s+/g, ' ')
			.slice(0, normalizedQuote.length)
		const endOffset =
			sourceQuote === normalizedQuote
				? sourceStart + quote.length
				: sourceStart + normalizedQuote.length

		return buildAnchor({
			blockId: paragraph.id,
			text: paragraph.text,
			startOffset: sourceStart,
			endOffset: Math.min(endOffset, paragraph.text.length),
			quote,
		})
	}

	return null
}

export function buildTemplateAnnotations(
	body: string,
	specs: ExampleTemplateAnnotationSpec[],
): Omit<ExampleAnnotation, 'id' | 'createdAt'>[] {
	return specs.map((spec) => {
		const categoryLabel = normalizeExampleCategory(spec.categoryLabel)
		const anchor = findAnchorForQuote(body, spec.quote)

		if (!anchor) {
			throw new Error(`Unable to anchor exemplar note: ${spec.quote}`)
		}

		return {
			comment: spec.comment,
			categoryLabel,
			categorySlug: exampleCategorySlug(categoryLabel),
			tags: spec.tags ?? [],
			anchor: {
				...anchor,
				categoryLabel,
				categorySlug: exampleCategorySlug(categoryLabel),
				tags: spec.tags ?? [],
			},
		}
	})
}
