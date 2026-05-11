export const exampleCraftCategories = [
	'Structure',
	'Pace',
	'Character',
	'Point of View',
	'Dialogue',
	'Imagery / motif',
	'Ending',
	'Emotional restraint',
	'Theme',
	'Teacher favourite',
	'Things to try',
	'Opening',
	'Symbolism',
	'Uncategorised',
] as const

export type ExampleCraftCategory = (typeof exampleCraftCategories)[number]

export type ExampleStatus = 'draft' | 'published'

export type ExampleCopyrightStatus =
	| 'teacher-owned'
	| 'public-domain'
	| 'licensed'
	| 'permission-needed'

export type ExampleAnchor = {
	blockId: string
	endBlockId?: string
	startOffset: number
	endOffset: number
	quote: string
	prefix?: string
	suffix?: string
	categoryLabel?: string
	categorySlug?: string
	tags?: string[]
}

export type ExampleAnnotation = {
	id: string
	comment: string
	categoryLabel: ExampleCraftCategory
	categorySlug: string
	tags: string[]
	anchor: ExampleAnchor
	createdAt: string
}

export function exampleCategorySlug(label: string) {
	return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function normalizeExampleCategory(value: unknown): ExampleCraftCategory {
	const label = typeof value === 'string' ? value.trim() : ''
	return exampleCraftCategories.includes(label as ExampleCraftCategory)
		? (label as ExampleCraftCategory)
		: 'Uncategorised'
}

export function normalizeExampleTags(value: unknown) {
	if (!Array.isArray(value)) {
		return []
	}

	return [
		...new Set(
			value
				.map((item) => String(item).trim())
				.filter(Boolean)
				.slice(0, 12),
		),
	]
}

export function parseExampleTagsInput(value: string) {
	return [
		...new Set(
			value
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
	].slice(0, 12)
}
