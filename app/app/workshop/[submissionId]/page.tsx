import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TeacherReviewWorkspace } from '@/components/teacher/review-workspace'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type SchemaMode = 'modern' | 'legacy'

type SelectionAnchor = {
	blockId?: string
	startOffset?: number
	endOffset?: number
	quote?: string
	prefix?: string
	suffix?: string
	kind?: 'typo' | 'craft' | 'pacing' | 'structure'
	categoryLabel?: string
	categorySlug?: string
	suggestedAction?: 'cut'
}

function isSelectionAnchor(value: unknown): value is SelectionAnchor {
	if (!value || typeof value !== 'object') {
		return false
	}

	return 'blockId' in value || 'quote' in value
}

function toMessage(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

function isMissingSubmissionSource(message: string | null | undefined) {
	if (!message) {
		return false
	}

	const normalized = message.toLowerCase()
	return normalized.includes('source') && normalized.includes('does not exist')
}

function isMissingRelation(message: string | null | undefined, relation: string) {
	if (!message) {
		return false
	}

	const normalized = message.toLowerCase()
	return normalized.includes('relation') && normalized.includes(relation)
}

function reviewStatusLabel(status: string) {
	if (status === 'submitted') {
		return 'Waiting'
	}
	if (status === 'in_review') {
		return 'In review'
	}
	if (status === 'feedback_published') {
		return 'Published'
	}
	return status.replaceAll('_', ' ')
}

function unpackLegacyCommentBody(body: string) {
	const match = body.match(/^\[\[anchor:(\d+):(\d+):([^\]]+)\]\]\s*/)
	if (!match) {
		return {
			comment: body,
			startOffset: null,
			endOffset: null,
			quote: null,
		}
	}

	const startOffset = Number(match[1])
	const endOffset = Number(match[2])
	let quote: string | null = null

	try {
		quote = Buffer.from(match[3], 'base64url').toString('utf8')
	} catch {
		quote = null
	}

	return {
		comment: body.slice(match[0].length),
		startOffset: Number.isFinite(startOffset) ? startOffset : null,
		endOffset: Number.isFinite(endOffset) ? endOffset : null,
		quote,
	}
}

export default async function WorkshopSubmissionPage({
	params,
	searchParams,
}: {
	params: Promise<{ submissionId: string }>
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	await requireTeacher()
	const { submissionId } = await params
	const query = searchParams ? await searchParams : {}
	const notice = toMessage(query.notice)
	const errorNotice = toMessage(query.error)
	const supabase = await createServerSupabaseClient()

	let schemaMode: SchemaMode = 'modern'
	let submissionTitle = ''
	let submissionStatus = 'submitted'
	let createdAt = new Date().toISOString()
	let currentVersion = 1
	let writerName = 'Writer'
	let submissionSource = 'workshop'
	let latestVersionId: string | null = null
	let rootSubmissionId: string | null = null
	let currentAuthorId: string | null = null
	let existingSummary = ''
	let summaryPublishedAt: string | null = null
	let snippetCategories: Array<{ id: string; name: string }> = []
	let feedbackCategories: Array<{ id: string; name: string }> = []
	let paragraphs: Array<{ id: string; text: string }> = []
	let versionHistory: Array<{
		id: string
		version: number
		status: string
		createdAt: string
	}> = []
	let feedback: Array<{
		id: string
		comment: string
		createdAt: string
		anchor: {
			blockId: string
			startOffset: number
			endOffset: number
			quote: string
			prefix?: string
			suffix?: string
			kind?: 'typo' | 'craft' | 'pacing' | 'structure'
			suggestedAction?: 'cut'
		} | null
	}> = []
	let snippets: Array<{
		id: string
		note: string
		createdAt: string
		snippetCategoryId: string | null
		anchor: {
			blockId: string
			startOffset: number
			endOffset: number
			quote: string
			prefix?: string
			suffix?: string
		} | null
	}> = []

	let modernSubmissionResult = await supabase
		.from('submissions')
		.select(
			'id, title, body, status, created_at, author_id, source, version, parent_submission_id',
		)
		.eq('id', submissionId)
		.maybeSingle()

	if (
		modernSubmissionResult.error &&
		isMissingSubmissionSource(modernSubmissionResult.error.message)
	) {
		modernSubmissionResult = await supabase
			.from('submissions')
			.select(
				'id, title, body, status, created_at, author_id, version, parent_submission_id',
			)
			.eq('id', submissionId)
			.maybeSingle()
	}

	if (!modernSubmissionResult.error && modernSubmissionResult.data) {
		const submission = modernSubmissionResult.data as {
			id: string
			title: string
			body: string
			status: string
			created_at: string
			author_id: string
			version: number
			parent_submission_id: string | null
			source?: string
		}

		submissionTitle = submission.title
		submissionStatus = submission.status
		createdAt = submission.created_at
		currentVersion = submission.version
		currentAuthorId = submission.author_id
		rootSubmissionId = submission.parent_submission_id ?? submission.id
		submissionSource = 'workshop'

		const { data: profileData } = await supabase
			.from('profiles')
			.select('display_name')
			.eq('id', submission.author_id)
			.maybeSingle()

		writerName =
			(profileData?.display_name as string | null | undefined) ?? 'Writer'

		paragraphs = toManuscriptParagraphs(submission.body)

		const { data: feedbackRows } = await supabase
			.from('feedback_items')
			.select('id, comment, anchor, created_at')
			.eq('submission_id', submission.id)
			.order('created_at', { ascending: true })

		feedback = (
			(feedbackRows ?? []) as Array<{
				id: string
				comment: string
				anchor: unknown
				created_at: string
			}>
		).map((item) => ({
			id: item.id,
			comment: item.comment,
			createdAt: item.created_at,
			anchor: isSelectionAnchor(item.anchor)
				? {
						blockId: item.anchor.blockId ?? '',
						startOffset: Number(item.anchor.startOffset ?? -1),
					endOffset: Number(item.anchor.endOffset ?? -1),
					quote: item.anchor.quote ?? '',
					prefix: item.anchor.prefix,
					suffix: item.anchor.suffix,
					categoryLabel:
						typeof item.anchor.categoryLabel === 'string'
							? item.anchor.categoryLabel
							: undefined,
					categorySlug:
						typeof item.anchor.categorySlug === 'string'
							? item.anchor.categorySlug
							: undefined,
					suggestedAction:
						item.anchor.suggestedAction === 'cut'
							? 'cut'
							: undefined,
					kind:
						item.anchor.kind === 'typo' ||
							item.anchor.kind === 'craft' ||
							item.anchor.kind === 'pacing' ||
							item.anchor.kind === 'structure'
								? item.anchor.kind
								: 'craft',
					}
				: null,
		}))

		const { data: summaryRow } = await supabase
			.from('feedback_summaries')
			.select('summary, published_at')
			.eq('submission_id', submission.id)
			.maybeSingle()

		existingSummary = String(summaryRow?.summary ?? '').trim()
		summaryPublishedAt =
			(summaryRow?.published_at as string | null | undefined) ?? null

		const { data: snippetRows } = await supabase
			.from('snippets')
			.select('id, note, created_at, anchor, snippet_category_id')
			.eq('source_submission_id', submission.id)
			.order('created_at', { ascending: true })

		snippets = (
			(snippetRows ?? []) as Array<{
				id: string
				note: string | null
				created_at: string
				anchor: unknown
				snippet_category_id: string | null
			}>
		)
			.map((item) => ({
				id: item.id,
				note: item.note ?? '',
				createdAt: item.created_at,
				snippetCategoryId: item.snippet_category_id ?? null,
				anchor: isSelectionAnchor(item.anchor)
					? {
							blockId: item.anchor.blockId ?? '',
							startOffset: Number(item.anchor.startOffset ?? -1),
							endOffset: Number(item.anchor.endOffset ?? -1),
							quote: item.anchor.quote ?? '',
							prefix: item.anchor.prefix,
							suffix: item.anchor.suffix,
						}
					: null,
			}))
			.filter((item) => item.anchor !== null)
	} else {
		schemaMode = 'legacy'

		const legacyResult = await supabase
			.from('submissions')
			.select(
				'id, title, status, created_at, writer_first_name, writer_email, latest_version_id',
			)
			.eq('id', submissionId)
			.maybeSingle()

		if (legacyResult.error || !legacyResult.data) {
			notFound()
		}

		const submission = legacyResult.data as {
			id: string
			title: string
			status: string
			created_at: string
			writer_first_name: string | null
			writer_email: string | null
			latest_version_id: string | null
		}

		submissionTitle = submission.title
		submissionStatus = submission.status
		createdAt = submission.created_at
		writerName =
			submission.writer_first_name || submission.writer_email || 'Writer'
		latestVersionId = submission.latest_version_id

		let body = ''
		if (latestVersionId) {
			const { data: versionRow } = await supabase
				.from('submission_versions')
				.select('body')
				.eq('id', latestVersionId)
				.maybeSingle()
			body = (versionRow?.body as string | undefined) ?? ''
		}

		const { data: paragraphRows } = await supabase
			.from('submission_paragraphs')
			.select('pid, text, position')
			.eq('submission_version_id', latestVersionId ?? '')
			.order('position', { ascending: true })

		if ((paragraphRows ?? []).length > 0) {
			paragraphs = (paragraphRows ?? []).map((item) => ({
				id: String(item.pid),
				text: String(item.text ?? ''),
			}))
		} else {
			paragraphs = toManuscriptParagraphs(body)
		}

		const { data: commentRows } = await supabase
			.from('comments')
			.select('id, body, paragraph_id, created_at')
			.eq('submission_id', submission.id)
			.order('created_at', { ascending: true })

		feedback = (
			(commentRows ?? []) as Array<{
				id: string
				body: string
				paragraph_id: string | null
				created_at: string
			}>
		).map((item) => {
			const parsed = unpackLegacyCommentBody(item.body)
			return {
				id: item.id,
				comment: parsed.comment,
				createdAt: item.created_at,
				anchor:
					item.paragraph_id &&
					parsed.startOffset !== null &&
					parsed.endOffset !== null
						? {
								blockId: item.paragraph_id,
								startOffset: parsed.startOffset,
								endOffset: parsed.endOffset,
								quote: parsed.quote ?? '',
							}
						: null,
			}
		})
	}

	if (schemaMode === 'modern' && currentAuthorId && rootSubmissionId) {
		const versionHistoryResult = await supabase
			.from('submissions')
			.select('id, version, status, created_at')
			.eq('author_id', currentAuthorId)
			.or(`id.eq.${rootSubmissionId},parent_submission_id.eq.${rootSubmissionId}`)
			.order('version', { ascending: true })

		versionHistory = ((versionHistoryResult.data ?? []) as Array<{
			id: string
			version: number
			status: string
			created_at: string
		}>).map((item) => ({
			id: item.id,
			version: item.version,
			status: item.status,
			createdAt: item.created_at,
		}))
	}

	if (schemaMode === 'modern') {
		const categoriesResult = await supabase
			.from('snippet_categories')
			.select('id, name')
			.order('name', { ascending: true })

		if (
			!categoriesResult.error ||
			!isMissingRelation(categoriesResult.error.message, 'snippet_categories')
		) {
			snippetCategories = (
				(categoriesResult.data ?? []) as Array<{ id: string; name: string }>
			).map((item) => ({
				id: item.id,
				name: item.name,
			}))
		}
	}

	if (schemaMode === 'modern') {
		const feedbackCategoriesResult = await supabase
			.from('feedback_categories')
			.select('id, name')
			.order('name', { ascending: true })

		if (
			!feedbackCategoriesResult.error ||
			!isMissingRelation(
				feedbackCategoriesResult.error.message,
				'feedback_categories',
			)
		) {
			feedbackCategories = (
				(feedbackCategoriesResult.data ?? []) as Array<{ id: string; name: string }>
			).map((item) => ({
				id: item.id,
				name: item.name,
			}))
		}
	}

	const latestVersionEntry =
		versionHistory.length > 0 ? versionHistory[versionHistory.length - 1] : null

	return (
		<section className="space-y-4">
			<TeacherReviewWorkspace
				key={submissionId}
				submissionId={submissionId}
				title={submissionTitle}
				paragraphs={paragraphs}
				feedback={feedback}
				snippets={snippets}
				notice={notice}
				errorNotice={errorNotice}
				initialActiveAnnotationId={toMessage(query.focus)}
				sidebarHeader={
					<div className="rounded-2xl border border-white/10 bg-ink-900/35 p-4">
						<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
							Review detail
						</p>
						<h1 className="literary-title mt-2 text-2xl text-parchment-100">
							{submissionTitle}
						</h1>
						<div className="mt-3 flex flex-wrap gap-2 text-[11px] text-silver-200">
							<p className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
								{writerName}
							</p>
							<p className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
								v{currentVersion}
							</p>
							<p className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
								{reviewStatusLabel(submissionStatus)}
							</p>
							<p className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
								{submissionSource}
							</p>
						</div>
						<p className="mt-3 text-xs leading-relaxed text-silver-300">
							{new Date(createdAt).toLocaleString()}
						</p>
						<p
							className={`mt-3 rounded-xl border px-3 py-2 text-sm leading-relaxed ${
								submissionStatus === 'feedback_published'
									? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100'
									: 'border-burgundy-300/20 bg-burgundy-500/10 text-burgundy-100'
							}`}>
							{submissionStatus === 'feedback_published'
								? 'Feedback has been published for this version. It is now read-only. Use this view for reference; further feedback should happen on a new submission or revised version.'
								: 'All comments remain private until you publish them.'}
						</p>
						<div className="mt-4 flex flex-wrap gap-2">
							<Link
								href="/app/teacher/review-desk"
								className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
								Back to queue
							</Link>
							{submissionStatus === 'feedback_published' ? (
								<Link
									href={`/app/workshop/${submissionId}/export`}
									className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
									Feedback document
								</Link>
							) : (
								<p className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-silver-300">
									Feedback must be published before export is available.
								</p>
							)}
						</div>
						{latestVersionEntry && latestVersionEntry.id !== submissionId ? (
							<div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
								A newer revision exists in this chain.
								<Link
									href={`/app/workshop/${latestVersionEntry.id}`}
									className="ml-1 text-amber-50 underline underline-offset-2">
									Open latest version
								</Link>
							</div>
						) : null}
						{schemaMode === 'modern' && versionHistory.length > 1 ? (
							<div className="mt-4 border-t border-white/10 pt-4">
								<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
									Version history
								</p>
								<p className="mt-1 text-xs leading-relaxed text-silver-300">
									Open earlier drafts in the same reading workspace.
								</p>
								<ul className="mt-3 flex flex-wrap gap-2">
									{versionHistory.map((item) => (
										<li key={item.id}>
											<Link
												href={`/app/workshop/${item.id}`}
												className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.09em] transition ${
													item.id === submissionId
														? 'border-accent-300/50 bg-accent-300/10 text-accent-100'
														: 'border-white/10 bg-white/5 text-silver-300 hover:border-white/20 hover:text-parchment-100'
												}`}>
												V{item.version} {' · '}
												{reviewStatusLabel(item.status)}
											</Link>
										</li>
									))}
								</ul>
							</div>
						) : null}
					</div>
				}
				submissionStatus={submissionStatus}
				canDeleteFeedback={submissionStatus !== 'feedback_published'}
				canPublishFeedback={
					!latestVersionEntry || latestVersionEntry.id === submissionId
				}
				canExportFeedback={submissionStatus === 'feedback_published'}
				snippetCategories={snippetCategories}
				feedbackCategories={feedbackCategories}
				initialSummary={existingSummary}
				initialSummaryPublishedAt={summaryPublishedAt}
			/>
		</section>
	)
}
