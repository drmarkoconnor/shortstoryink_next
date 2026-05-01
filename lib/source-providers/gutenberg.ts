export type SourceMetadataFields = {
	author: string
	title: string
	source: string
	sourceUrl: string
	licenceNote: string
}

export type GutendexPerson = {
	name?: string
	birth_year?: number | null
	death_year?: number | null
}

export type GutendexBook = {
	id?: number
	title?: string
	authors?: GutendexPerson[]
	subjects?: string[]
	languages?: string[]
	formats?: Record<string, string>
	download_count?: number
}

export type GutenbergSearchResult = {
	provider: 'gutenberg'
	id: number
	title: string
	authors: string[]
	languages: string[]
	subjects: string[]
	downloadCount: number
	plainTextUrl: string
	hasPlainText: boolean
	sourceUrl: string
}

export const GUTENBERG_SOURCE_NAME = 'Project Gutenberg'
export const GUTENBERG_LICENCE_NOTE = 'Public domain text from Project Gutenberg.'

export function sourceAuthorLabel(authors: string[]) {
	return authors.length ? authors.join('; ') : 'Unknown author'
}

export function gutenbergLandingUrl(id: number) {
	return `https://www.gutenberg.org/ebooks/${id}`
}

export function findPlainTextFormat(formats: Record<string, string> | undefined) {
	if (!formats) {
		return ''
	}

	const plainTextEntries = Object.entries(formats).filter(([mimeType, url]) => {
		return mimeType.toLowerCase().startsWith('text/plain') && Boolean(url)
	})

	return (
		plainTextEntries.find(([mimeType]) => mimeType.toLowerCase().includes('utf-8'))?.[1] ??
		plainTextEntries[0]?.[1] ??
		''
	)
}

export function mapGutendexBook(book: GutendexBook): GutenbergSearchResult | null {
	if (!book.id || !book.title) {
		return null
	}

	const authors = (book.authors ?? [])
		.map((author) => author.name?.trim())
		.filter(Boolean) as string[]
	const plainTextUrl = findPlainTextFormat(book.formats)

	return {
		provider: 'gutenberg',
		id: book.id,
		title: book.title,
		authors,
		languages: book.languages ?? [],
		subjects: (book.subjects ?? []).slice(0, 4),
		downloadCount: book.download_count ?? 0,
		plainTextUrl,
		hasPlainText: Boolean(plainTextUrl),
		sourceUrl: gutenbergLandingUrl(book.id),
	}
}

export function mapGutenbergResultToSourceMetadata(
	result: GutenbergSearchResult,
): SourceMetadataFields {
	return {
		author: sourceAuthorLabel(result.authors),
		title: result.title,
		source: GUTENBERG_SOURCE_NAME,
		sourceUrl: result.sourceUrl,
		licenceNote: GUTENBERG_LICENCE_NOTE,
	}
}

export function isAllowedGutenbergTextUrl(value: string) {
	try {
		const url = new URL(value)
		return (
			url.protocol === 'https:' &&
			(url.hostname === 'www.gutenberg.org' ||
				url.hostname === 'gutenberg.org' ||
				url.hostname.endsWith('.gutenberg.org')) &&
			(url.pathname.includes('.txt') || url.pathname.includes('/cache/epub/'))
		)
	} catch {
		return false
	}
}

export function trimGutenbergBoilerplate(text: string) {
	const startPatterns = [
		/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK .*?\*\*\*/i,
		/\*\*\*\s*START OF .*?\*\*\*/i,
	]
	const endPatterns = [
		/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK .*?\*\*\*/i,
		/\*\*\*\s*END OF .*?\*\*\*/i,
	]

	let trimmed = text.replace(/\r\n?/g, '\n')

	for (const pattern of startPatterns) {
		const match = pattern.exec(trimmed)
		if (match?.index !== undefined) {
			trimmed = trimmed.slice(match.index + match[0].length).trimStart()
			break
		}
	}

	for (const pattern of endPatterns) {
		const match = pattern.exec(trimmed)
		if (match?.index !== undefined) {
			trimmed = trimmed.slice(0, match.index).trimEnd()
			break
		}
	}

	return trimmed
}
