import type { SelectionRangeAnchor } from '@/lib/domain/core-flow'

export const snippetSourceTypes = ['submission', 'feedback_item'] as const
export type SnippetSourceType = (typeof snippetSourceTypes)[number]

export const snippetVisibilities = ['private', 'group', 'shared'] as const
export type SnippetVisibility = (typeof snippetVisibilities)[number]

export type SnippetRecord = {
	id: string
	saved_by: string
	captured_by: string | null
	source_type: SnippetSourceType
	source_submission_id: string | null
	source_feedback_item_id: string | null
	source_author_id: string | null
	snippet_category_id: string | null
	snippet_text: string
	anchor: SelectionRangeAnchor
	note: string | null
	visibility: SnippetVisibility
	created_at: string
	updated_at: string
}

export type CreateSnippetInput = {
	savedBy: string
	capturedBy?: string | null
	sourceType?: SnippetSourceType
	sourceSubmissionId?: string | null
	sourceFeedbackItemId?: string | null
	sourceAuthorId?: string | null
	snippetCategoryId?: string | null
	snippetText?: string | null
	anchor: SelectionRangeAnchor
	note?: string | null
	visibility?: SnippetVisibility
}

export type SnippetCategoryRecord = {
	id: string
	owner_id: string
	name: string
	slug: string
	created_at: string
	updated_at: string
}
