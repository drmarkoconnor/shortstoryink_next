export const fixedFeedbackCategories = [
	'Character',
	'Setting',
	'Plot',
	'Structure',
	'Pace',
	'Point of View',
	'Voice',
	'Dialogue',
	'Image/detail',
	'Opening',
	'Ending',
	'Sentence style',
	'Theme',
	'Clarity',
	'Cut/tighten',
	'Praise/strength',
]

export function feedbackSlug(label: string) {
	return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function normalizeFeedbackLabel(value: string, suggestedAction?: 'cut' | null) {
	if (suggestedAction === 'cut') {
		return 'Cut/tighten'
	}

	return fixedFeedbackCategories.includes(value) ? value : 'Uncategorised'
}

export function normalizeFeedbackCategoryLabel(
	value: unknown,
	suggestedAction?: 'cut',
) {
	if (suggestedAction === 'cut') {
		return 'Cut/tighten'
	}

	const label = typeof value === 'string' ? value.trim() : ''
	return fixedFeedbackCategories.includes(label) ? label : 'Uncategorised'
}
