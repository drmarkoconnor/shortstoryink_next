export const teachingDocumentTypes = [
	'Feedback resource',
	'Workshop handout',
	'Close reading note',
	'Revision exercise',
	'Teaching note',
] as const

export type TeachingDocumentType = (typeof teachingDocumentTypes)[number]

export function normalizeTeachingDocumentType(value: unknown): TeachingDocumentType {
	return teachingDocumentTypes.includes(value as TeachingDocumentType)
		? (value as TeachingDocumentType)
		: 'Teaching note'
}
