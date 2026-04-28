import type { SelectionRangeAnchor } from '@/lib/domain/core-flow'
import type { CreateSnippetInput, SnippetSourceType, SnippetVisibility } from '@/lib/snippets/types'

function normalizeSourceType(value: SnippetSourceType | undefined) {
	return value === 'feedback_item' ? 'feedback_item' : 'submission'
}

function normalizeVisibility(value: SnippetVisibility | undefined) {
	if (value === 'group' || value === 'shared') {
		return value
	}
	return 'private'
}

function normalizeAnchor(anchor: SelectionRangeAnchor): SelectionRangeAnchor {
	return {
		blockId: anchor.blockId,
		startOffset: anchor.startOffset,
		endOffset: anchor.endOffset,
		quote: anchor.quote,
		prefix: anchor.prefix ?? '',
		suffix: anchor.suffix ?? '',
		categoryLabel: anchor.categoryLabel,
		categorySlug: anchor.categorySlug,
		tags: anchor.tags ?? [],
	}
}

export function buildSnippetInsert(input: CreateSnippetInput) {
	const anchor = normalizeAnchor(input.anchor)

	return {
		saved_by: input.savedBy,
		captured_by: input.capturedBy ?? input.savedBy,
		source_type: normalizeSourceType(input.sourceType),
		source_submission_id: input.sourceSubmissionId ?? null,
		source_feedback_item_id: input.sourceFeedbackItemId ?? null,
		source_author_id: input.sourceAuthorId ?? null,
		snippet_category_id: input.snippetCategoryId ?? null,
		snippet_text: input.snippetText?.trim() || anchor.quote,
		anchor,
		note: input.note?.trim() || null,
		visibility: normalizeVisibility(input.visibility),
	}
}
