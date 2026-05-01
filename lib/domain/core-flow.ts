export const submissionStatuses = [
	'submitted',
	'in_review',
	'feedback_published',
] as const

export type SubmissionStatus = (typeof submissionStatuses)[number]

export type SelectionRangeAnchor = {
	blockId: string
	startOffset: number
	endOffset: number
	quote: string
	prefix: string
	suffix: string
	categoryLabel?: string
	categorySlug?: string
	tags?: string[]
	sourceLabel?: string
	sourceKind?: string
	originalSource?: string
	createdByLabel?: string
	sourceAuthor?: string
	sourceTitle?: string
	sourceName?: string
	sourceUrl?: string
	sourceSection?: string
	sourceLicenceNote?: string
	sourceTypeLabel?: string
	snippetType?: string
}
