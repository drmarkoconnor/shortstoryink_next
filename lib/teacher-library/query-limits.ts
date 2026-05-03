export const teacherSnippetLibraryLimit = 2000
export const teacherLibraryItemLimit = 2000

export const teacherLibraryLimitWarningRatio = 0.9

export function teacherLibraryLimitWarningThreshold(limit: number) {
	return Math.floor(limit * teacherLibraryLimitWarningRatio)
}

export function isNearTeacherLibraryLimit(count: number, limit: number) {
	return count >= teacherLibraryLimitWarningThreshold(limit)
}
