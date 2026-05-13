import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import {
	FeedbackMemoryWorkbench,
	type FeedbackMemoryEntry,
} from '@/components/teacher/feedback-memory-workbench'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import {
	fixedFeedbackCategories,
	normalizeFeedbackLabel,
} from '@/lib/feedback/categories'
import { teacherTabs } from '@/lib/mock/teacher-prototype'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { teacherFeedbackMemoryLimit } from '@/lib/teacher-library/query-limits'

type FeedbackRow = {
	id: string
	submission_id: string
	comment: string
	anchor: unknown
	created_at: string
}

type SubmissionRow = {
	id: string
	title: string
	author_id: string
	status: string
	version: number | null
	created_at: string
}

type ProfileRow = {
	id: string
	display_name: string | null
}

type FeedbackAnchor = {
	quote?: string
	categoryLabel?: string
	tags?: unknown[]
	suggestedAction?: 'cut'
}

function isFeedbackAnchor(value: unknown): value is FeedbackAnchor {
	return Boolean(value && typeof value === 'object')
}

function tagsFromAnchor(anchor: FeedbackAnchor | null) {
	return Array.isArray(anchor?.tags)
		? anchor.tags.map((tag) => String(tag).trim()).filter(Boolean)
		: []
}

function categoryFromAnchor(anchor: FeedbackAnchor | null) {
	const label =
		typeof anchor?.categoryLabel === 'string' ? anchor.categoryLabel.trim() : ''
	return fixedFeedbackCategories.includes(label)
		? label
		: normalizeFeedbackLabel(label, anchor?.suggestedAction)
}

export default async function TeacherFeedbackMemoryPage() {
	const profile = await requireTeacher()
	const supabase = await createServerSupabaseClient()
	let entries: FeedbackMemoryEntry[] = []
	let loadError: string | null = null

	const feedbackResult = await supabase
		.from('feedback_items')
		.select('id, submission_id, comment, anchor, created_at')
		.eq('author_id', profile.user.id)
		.order('created_at', { ascending: false })
		.limit(teacherFeedbackMemoryLimit)

	if (feedbackResult.error) {
		loadError = feedbackResult.error.message
	} else {
		const feedbackRows = (feedbackResult.data ?? []) as FeedbackRow[]
		const submissionIds = [
			...new Set(feedbackRows.map((row) => row.submission_id).filter(Boolean)),
		]
		let submissionsById: Record<string, SubmissionRow> = {}
		let writersById: Record<string, string> = {}

		if (submissionIds.length > 0) {
			const submissionsResult = await supabase
				.from('submissions')
				.select('id, title, author_id, status, version, created_at')
				.in('id', submissionIds)

			const submissionRows = (submissionsResult.data ?? []) as SubmissionRow[]
			submissionsById = Object.fromEntries(
				submissionRows.map((submission) => [submission.id, submission]),
			)

			const writerIds = [
				...new Set(submissionRows.map((submission) => submission.author_id)),
			]
			if (writerIds.length > 0) {
				const profilesResult = await supabase
					.from('profiles')
					.select('id, display_name')
					.in('id', writerIds)

				writersById = Object.fromEntries(
					((profilesResult.data ?? []) as ProfileRow[]).map((writer) => [
						writer.id,
						writer.display_name?.trim() || 'Writer',
					]),
				)
			}
		}

		entries = feedbackRows
			.map((row) => {
				const submission = submissionsById[row.submission_id]
				if (!submission) {
					return null
				}
				const anchor = isFeedbackAnchor(row.anchor) ? row.anchor : null
				return {
					id: row.id,
					submissionId: row.submission_id,
					submissionTitle: submission.title || 'Untitled',
					writerId: submission.author_id,
					writerLabel: writersById[submission.author_id] ?? 'Writer',
					version: submission.version,
					status: submission.status,
					comment: row.comment,
					quote: typeof anchor?.quote === 'string' ? anchor.quote : '',
					categoryLabel: categoryFromAnchor(anchor),
					tags: tagsFromAnchor(anchor),
					createdAt: row.created_at,
				}
			})
			.filter((entry): entry is FeedbackMemoryEntry => Boolean(entry))
	}

	return (
		<section className="space-y-5">
			<MenuTabs
				tabs={teacherTabs}
				active="/app/teacher/feedback-memory"
				context={
					<Link
						href="/app/teacher-studio"
						className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
						Return to Studio
					</Link>
				}
			/>

			<div className="surface p-5 lg:p-6">
				<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
					Feedback Memory
				</p>
				<h1 className="literary-title mt-2 text-3xl text-parchment-100">
					Comments and writer examples
				</h1>
				<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
					Saved feedback, anchored quotes, and writer-specific patterns for close
					reuse in future readings.
				</p>
			</div>

			{loadError ? (
				<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
					Unable to load feedback memory: {loadError}
				</p>
			) : (
				<FeedbackMemoryWorkbench initialEntries={entries} />
			)}
		</section>
	)
}
