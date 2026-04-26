import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type FeedbackKind = 'typo' | 'craft' | 'pacing' | 'structure'

export type ExportAnchor = {
	blockId: string
	startOffset: number
	endOffset: number
	quote: string
	prefix?: string
	suffix?: string
	kind?: FeedbackKind
	categoryLabel?: string
	categorySlug?: string
	suggestedAction?: 'cut'
}

export type ExportFeedbackItem = {
	id: string
	number: number
	comment: string
	createdAt: string
	authorId: string
	authorName: string
	label: string
	slug: string
	anchor: ExportAnchor | null
}

export type FeedbackExportTheme = {
	label: string
	slug: string
	commentCount: number
}

export type FeedbackExportCommentGroup = {
	label: string
	slug: string
	comments: ExportFeedbackItem[]
}

export type FeedbackExportPacket = {
	template: 'feedback_packet_v1'
	submissionId: string
	reviewUrl: string
	cover: {
		title: string
		writerName: string
		teacherName: string
		date: string
		versionLabel: string
		wordCount: number
		workshopTitle: string
		status: string
	}
	editorialLetter: {
		summary: string
		publishedAt: string | null
		teacherName: string
	}
	exportState: {
		copyVersion: number
		copyUpdatedAt: string | null
		lastExportedAt: string | null
		lastExportedCopyVersion: number | null
		hasUnexportedChanges: boolean
	}
	exportHistory: Array<{
		id: string
		createdAt: string
		exportedBy: string
		exportCopyVersion: number
		note: string | null
		packetTemplate: string
	}>
	teacherAdditions: {
		personalNote: string | null
	}
	keyRevisionThemes: FeedbackExportTheme[]
	annotatedManuscript: {
		paragraphs: Array<{
			id: string
			text: string
			comments: ExportFeedbackItem[]
		}>
		commentCount: number
	}
	groupedComments: FeedbackExportCommentGroup[]
	nextSteps: {
		title: string
		items: string[]
		readingSuggestions: string[]
		isPlaceholder: boolean
	}
}

type FeedbackExportOverrides = {
	personalNote?: string | null
	nextSteps?: string[]
	readingSuggestions?: string[]
}

function normalizeDisplayName(
	value: string | null | undefined,
	fallback: string,
) {
	const trimmed = value?.trim()

	if (!trimmed) {
		return fallback
	}

	return trimmed
}

function normalizeTeacherDisplayName(value: string | null | undefined) {
	const trimmed = normalizeDisplayName(value, 'Teacher')

	return trimmed.replace(/^dr\.?\s+/i, '').trim() || 'Teacher'
}

function isAnchor(value: unknown): value is ExportAnchor {
	if (!value || typeof value !== 'object') {
		return false
	}

	return (
		'blockId' in value &&
		'startOffset' in value &&
		'endOffset' in value &&
		'quote' in value
	)
}

function normalizeAnchor(value: unknown): ExportAnchor | null {
	if (!isAnchor(value)) {
		return null
	}

	return {
		blockId: String(value.blockId),
		startOffset: Number(value.startOffset),
		endOffset: Number(value.endOffset),
		quote: String(value.quote ?? ''),
		prefix: typeof value.prefix === 'string' ? value.prefix : undefined,
		suffix: typeof value.suffix === 'string' ? value.suffix : undefined,
		categoryLabel:
			typeof value.categoryLabel === 'string' ? value.categoryLabel : undefined,
		categorySlug:
			typeof value.categorySlug === 'string' ? value.categorySlug : undefined,
		suggestedAction:
			value.suggestedAction === 'cut' ? value.suggestedAction : undefined,
		kind:
			value.kind === 'typo' ||
			value.kind === 'craft' ||
			value.kind === 'pacing' ||
			value.kind === 'structure'
				? value.kind
				: 'craft',
	}
}

function kindLabel(kind: FeedbackKind | undefined) {
	if (kind === 'typo') {
		return 'Typo / Grammar'
	}
	if (kind === 'pacing') {
		return 'Pacing'
	}
	if (kind === 'structure') {
		return 'Structure'
	}
	return 'Craft'
}

function fallbackCategory(anchor: ExportAnchor | null) {
	const label = anchor?.categoryLabel?.trim() || kindLabel(anchor?.kind)
	const slug =
		anchor?.categorySlug?.trim() ||
		anchor?.suggestedAction ||
		anchor?.kind ||
		'uncategorised'

	return {
		label,
		slug,
	}
}

function countWords(value: string) {
	return value.trim() ? value.trim().split(/\s+/).length : 0
}

function formatDateOnly(value: string | null | undefined) {
	if (!value) {
		return 'Date pending'
	}

	return new Date(value).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})
}

function buildNextStepsPlaceholder(title: string) {
	return [
		`Re-read "${title}" with the revision themes in mind before making line edits.`,
		'Choose one structural or craft change to carry through the whole piece first.',
		'Return to the annotated manuscript after revising to check which comments have now been answered on the page.',
	]
}

export async function getFeedbackExportPacket(
	submissionId: string,
	currentTeacherId: string,
	overrides: FeedbackExportOverrides = {},
) {
	const supabase = await createServerSupabaseClient()

	const submissionResult = await supabase
		.from('submissions')
		.select(
			'id, title, body, status, created_at, author_id, version, workshop_id',
		)
		.eq('id', submissionId)
		.eq('status', 'feedback_published')
		.maybeSingle()

	if (submissionResult.error || !submissionResult.data) {
		return null
	}

	const submission = submissionResult.data as {
		id: string
		title: string
		body: string
		status: string
		created_at: string
		author_id: string
		version: number
		workshop_id: string
	}

	const [writerResult, workshopResult, feedbackResult, summaryResult, teacherResult] =
		await Promise.all([
			supabase
				.from('profiles')
				.select('display_name')
				.eq('id', submission.author_id)
				.maybeSingle(),
			supabase
				.from('workshops')
				.select('title')
				.eq('id', submission.workshop_id)
				.maybeSingle(),
			supabase
				.from('feedback_items')
				.select('id, comment, anchor, created_at, author_id')
				.eq('submission_id', submission.id)
				.order('created_at', { ascending: true }),
			supabase
				.from('feedback_summaries')
				.select(
					'id, summary, published_at, author_id, personal_note, next_steps, reading_suggestions, export_copy_version, export_copy_updated_at, last_exported_at, last_exported_copy_version',
				)
				.eq('submission_id', submission.id)
				.maybeSingle(),
			supabase
				.from('profiles')
				.select('display_name')
				.eq('id', currentTeacherId)
				.maybeSingle(),
		])

	const feedbackRows = (feedbackResult.data ?? []) as Array<{
		id: string
		comment: string
		anchor: unknown
		created_at: string
		author_id: string
	}>

	const feedbackAuthorIds = [
		...new Set(feedbackRows.map((item) => item.author_id).filter(Boolean)),
	]
	const summaryAuthorId =
		(summaryResult.data?.author_id as string | undefined) ?? null
	const summaryId =
		(summaryResult.data?.id as string | undefined) ?? null
	const authorIds = [
		...new Set(
			[...feedbackAuthorIds, summaryAuthorId, currentTeacherId].filter(
				(value): value is string => Boolean(value),
			),
		),
	]

	let authorNameById: Record<string, string> = {}
	if (authorIds.length > 0) {
		const authorLookup = await supabase
			.from('profiles')
			.select('id, display_name')
			.in('id', authorIds)

		authorNameById = Object.fromEntries(
			(authorLookup.data ?? []).map((item) => [
				item.id as string,
				normalizeTeacherDisplayName(
					item.display_name as string | null | undefined,
				),
			]),
		)
	}

	const exportEventsResult = summaryId
		? await supabase
				.from('feedback_export_events')
				.select(
					'id, created_at, exported_by, export_copy_version, note, packet_template',
				)
				.eq('summary_id', summaryId)
				.order('created_at', { ascending: false })
		: { data: [], error: null }

	const exportHistory = ((exportEventsResult.data ?? []) as Array<{
		id: string
		created_at: string
		exported_by: string
		export_copy_version: number
		note: string | null
		packet_template: string
	}>).map((item) => ({
		id: item.id,
		createdAt: item.created_at,
		exportedBy: authorNameById[item.exported_by] ?? 'Teacher',
		exportCopyVersion: Number(item.export_copy_version) || 1,
		note: item.note,
		packetTemplate: item.packet_template,
	}))

	const feedback: ExportFeedbackItem[] = feedbackRows.map((item, index) => {
		const anchor = normalizeAnchor(item.anchor)
		const category = fallbackCategory(anchor)

		return {
			id: item.id,
			number: index + 1,
			comment: item.comment,
			createdAt: item.created_at,
			authorId: item.author_id,
			authorName: authorNameById[item.author_id] ?? 'Teacher',
			label: category.label,
			slug: category.slug,
			anchor,
		}
	})

	const groupedCommentsMap = feedback.reduce(
		(acc, item) => {
			const key = item.slug || 'uncategorised'
			if (!acc[key]) {
				acc[key] = {
					label: item.label || 'Uncategorised',
					slug: key,
					comments: [],
				}
			}
			acc[key].comments.push(item)
			return acc
		},
		{} as Record<string, FeedbackExportCommentGroup>,
	)

	const groupedComments = Object.values(groupedCommentsMap).sort(
		(a, b) => b.comments.length - a.comments.length || a.label.localeCompare(b.label),
	)

	const keyRevisionThemes = groupedComments.slice(0, 5).map((group) => ({
		label: group.label,
		slug: group.slug,
		commentCount: group.comments.length,
	}))

	const paragraphs = toManuscriptParagraphs(submission.body).map((paragraph) => ({
		id: paragraph.id,
		text: paragraph.text,
		comments: feedback.filter((item) => item.anchor?.blockId === paragraph.id),
	}))

	const summaryText = (summaryResult.data?.summary as string | null | undefined) ?? ''
	const storedPersonalNote =
		(summaryResult.data?.personal_note as string | null | undefined) ?? null
	const exportCopyVersion = Math.max(
		1,
		Number(summaryResult.data?.export_copy_version ?? 1) || 1,
	)
	const exportCopyUpdatedAt =
		(summaryResult.data?.export_copy_updated_at as string | null | undefined) ??
		null
	const lastExportedAt =
		(summaryResult.data?.last_exported_at as string | null | undefined) ?? null
	const lastExportedCopyVersionRaw = Number(
		summaryResult.data?.last_exported_copy_version ?? 0,
	)
	const lastExportedCopyVersion =
		Number.isFinite(lastExportedCopyVersionRaw) &&
		lastExportedCopyVersionRaw >= 1
			? lastExportedCopyVersionRaw
			: null
	const storedNextSteps = Array.isArray(summaryResult.data?.next_steps)
		? (summaryResult.data?.next_steps as unknown[]).filter(
				(item): item is string => typeof item === 'string' && item.trim().length > 0,
			)
		: []
	const storedReadingSuggestions = Array.isArray(
		summaryResult.data?.reading_suggestions,
	)
		? (summaryResult.data?.reading_suggestions as unknown[]).filter(
				(item): item is string => typeof item === 'string' && item.trim().length > 0,
			)
		: []
	const summaryAuthorName =
		authorNameById[summaryAuthorId ?? ''] ||
		authorNameById[currentTeacherId] ||
		normalizeTeacherDisplayName(
			teacherResult.data?.display_name as string | null | undefined,
		)

	return {
		template: 'feedback_packet_v1',
		submissionId: submission.id,
		reviewUrl: `/app/workshop/${submission.id}`,
		cover: {
			title: submission.title,
			writerName: normalizeDisplayName(
				writerResult.data?.display_name as string | null | undefined,
				'Writer',
			),
			teacherName: summaryAuthorName,
			date: formatDateOnly(
				(summaryResult.data?.published_at as string | null | undefined) ??
					submission.created_at,
			),
			versionLabel: `Version ${submission.version}`,
			wordCount: countWords(submission.body),
			workshopTitle:
				(workshopResult.data?.title as string | null | undefined) ??
				'Workshop group',
			status: submission.status,
		},
		editorialLetter: {
			summary: summaryText || 'No overall note was published for this draft.',
			publishedAt:
				(summaryResult.data?.published_at as string | null | undefined) ?? null,
			teacherName: summaryAuthorName,
		},
		exportState: {
			copyVersion: exportCopyVersion,
			copyUpdatedAt: exportCopyUpdatedAt,
			lastExportedAt,
			lastExportedCopyVersion,
			hasUnexportedChanges:
				lastExportedCopyVersion === null ||
				exportCopyVersion > lastExportedCopyVersion,
		},
		exportHistory,
		teacherAdditions: {
			personalNote: overrides.personalNote?.trim() || storedPersonalNote,
		},
		keyRevisionThemes,
		annotatedManuscript: {
			paragraphs,
			commentCount: feedback.length,
		},
		groupedComments,
		nextSteps: {
			title: 'Suggested reading / next steps',
			items:
				overrides.nextSteps && overrides.nextSteps.length > 0
					? overrides.nextSteps
					: storedNextSteps.length > 0
						? storedNextSteps
						: buildNextStepsPlaceholder(submission.title),
			readingSuggestions:
				overrides.readingSuggestions && overrides.readingSuggestions.length > 0
					? overrides.readingSuggestions
					: storedReadingSuggestions,
			isPlaceholder: !(
				(overrides.nextSteps && overrides.nextSteps.length > 0) ||
				(overrides.readingSuggestions && overrides.readingSuggestions.length > 0) ||
				storedNextSteps.length > 0 ||
				storedReadingSuggestions.length > 0
			),
		},
	} satisfies FeedbackExportPacket
}
