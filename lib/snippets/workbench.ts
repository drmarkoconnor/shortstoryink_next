export const snippetStatuses = [
	'raw',
	'reviewed',
	'favourite',
	'ready',
	'needs-source-check',
] as const

export type SnippetStatus = (typeof snippetStatuses)[number]

export const snippetStatusLabels: Record<SnippetStatus, string> = {
	raw: 'Raw',
	reviewed: 'Reviewed',
	favourite: 'Favourite',
	ready: 'Ready',
	'needs-source-check': 'Needs source check',
}

export const snippetStatusRank: Record<SnippetStatus, number> = {
	favourite: 0,
	ready: 1,
	reviewed: 2,
	'needs-source-check': 3,
	raw: 4,
}

export const snippetUseFlags = [
	'handout',
	'class',
	'feedback',
	'exercise',
	'inspiration',
] as const

export type SnippetUseFlag = (typeof snippetUseFlags)[number]

export const snippetUseFlagLabels: Record<SnippetUseFlag, string> = {
	handout: 'Handout',
	class: 'Class',
	feedback: 'Feedback',
	exercise: 'Exercise',
	inspiration: 'Inspiration',
}

export function normalizeSnippetStatus(value: unknown): SnippetStatus {
	return snippetStatuses.includes(value as SnippetStatus)
		? (value as SnippetStatus)
		: 'raw'
}

export function normalizeSnippetUseFlags(value: unknown): SnippetUseFlag[] {
	if (!Array.isArray(value)) {
		return []
	}

	return [
		...new Set(
			value.filter((flag): flag is SnippetUseFlag =>
				snippetUseFlags.includes(flag as SnippetUseFlag),
			),
		),
	]
}
