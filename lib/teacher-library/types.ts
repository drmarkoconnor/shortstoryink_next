export const teachingLibraryItemTypes = ['note', 'reference'] as const

export type TeachingLibraryItemType = (typeof teachingLibraryItemTypes)[number]

export const teachingLibraryReferenceTypes = ['book', 'article', 'video'] as const

export type TeachingLibraryReferenceType =
	(typeof teachingLibraryReferenceTypes)[number]

export function normalizeTeachingLibraryItemType(
	value: unknown,
): TeachingLibraryItemType {
	return value === 'reference' ? 'reference' : 'note'
}

export function normalizeTeachingLibraryReferenceType(
	value: unknown,
): TeachingLibraryReferenceType {
	return value === 'article' || value === 'video' ? value : 'book'
}
