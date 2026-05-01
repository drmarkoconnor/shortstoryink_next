export function normalizeDisplayName(
	value: string | null | undefined,
	fallback: string,
) {
	const trimmed = value?.trim()

	if (!trimmed) {
		return fallback
	}

	return trimmed.replace(/\s+/g, ' ')
}

export function normalizeTeacherDisplayName(value: string | null | undefined) {
	return normalizeDisplayName(value, 'Teacher')
		.replace(/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?|miss)\s+/i, '')
		.trim() || 'Teacher'
}
