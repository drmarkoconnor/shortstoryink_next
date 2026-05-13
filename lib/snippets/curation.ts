import {
	normalizeSnippetStatus,
	normalizeSnippetUseFlags,
	type SnippetUseFlag,
} from '@/lib/snippets/workbench'

export type SnippetCurationInput = {
	categoryLabel: string
	status?: unknown
	useFlags?: SnippetUseFlag[] | unknown
}

export function isCuratedSnippet({
	categoryLabel,
	status,
	useFlags,
}: SnippetCurationInput) {
	const normalizedStatus = normalizeSnippetStatus(status)
	const normalizedUseFlags = normalizeSnippetUseFlags(useFlags)

	return (
		categoryLabel !== 'Uncategorised' ||
		normalizedStatus === 'reviewed' ||
		normalizedStatus === 'ready' ||
		normalizedStatus === 'favourite' ||
		normalizedUseFlags.length > 0
	)
}
