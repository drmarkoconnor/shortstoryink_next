export type ManuscriptParagraph = {
	id: string
	text: string
}

export function toManuscriptParagraphs(body: string): ManuscriptParagraph[] {
	const normalized = body.replace(/\r\n?/g, '\n')
	const lines = normalized.split('\n')

	const paragraphs: ManuscriptParagraph[] = []
	let index = 1

	for (const line of lines) {
		if (!line.trim()) {
			continue
		}

		paragraphs.push({
			id: `p-${index}`,
			text: line,
		})
		index += 1
	}

	if (paragraphs.length === 0 && normalized.trim()) {
		return [{ id: 'p-1', text: normalized }]
	}

	return paragraphs
}

