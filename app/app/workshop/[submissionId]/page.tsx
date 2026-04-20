import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect, notFound } from 'next/navigation'
import { TeacherReviewWorkspace } from '@/components/teacher/review-workspace'
import { sendFeedbackPublishedNotification } from '@/lib/notifications/email'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
import { buildSnippetInsert } from '@/lib/snippets/build-snippet-insert'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
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

function packLegacyCommentBody(
	comment: string,
	startOffset: number,
	endOffset: number,
	quote: string,
) {
	const quoteEncoded = Buffer.from(quote, 'utf8').toString('base64url')
	return `[[anchor:${startOffset}:${endOffset}:${quoteEncoded}]] ${comment}`
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
	let submissionSource: 'workshop' | 'try_writing' = 'workshop'
	let latestVersionId: string | null = null
	let rootSubmissionId: string | null = null
	let currentAuthorId: string | null = null
	let snippetCategories: Array<{ id: string; name: string }> = []
	let feedbackCategories: Array<{
		id: string
		name: string
		tone: 'typo' | 'craft' | 'pacing' | 'structure'
	}> = []
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
		submissionSource =
			submission.source === 'try_writing' ? 'try_writing' : 'workshop'

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
			.select('id, name, tone')
			.order('name', { ascending: true })

		if (
			!feedbackCategoriesResult.error ||
			!isMissingRelation(
				feedbackCategoriesResult.error.message,
				'feedback_categories',
			)
		) {
			feedbackCategories = (
				(feedbackCategoriesResult.data ?? []) as Array<{
					id: string
					name: string
					tone: 'typo' | 'craft' | 'pacing' | 'structure'
				}>
			).map((item) => ({
				id: item.id,
				name: item.name,
				tone:
					item.tone === 'typo' ||
					item.tone === 'craft' ||
					item.tone === 'pacing' ||
					item.tone === 'structure'
						? item.tone
						: 'craft',
			}))
		}
	}

	const latestVersionEntry =
		versionHistory.length > 0 ? versionHistory[versionHistory.length - 1] : null

	async function createFeedbackItemAction(formData: FormData) {
		'use server'

		const profile = await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()

		const comment = String(formData.get('comment') ?? '').trim()
		const blockId = String(formData.get('blockId') ?? '').trim()
		const quote = String(formData.get('quote') ?? '').trim()
		const feedbackCategoryIdInput = String(
			formData.get('feedbackCategoryId') ?? '',
		).trim()
		const prefix = String(formData.get('prefix') ?? '').trim()
		const suffix = String(formData.get('suffix') ?? '').trim()
		const startOffset = Number(formData.get('startOffset') ?? -1)
		const endOffset = Number(formData.get('endOffset') ?? -1)
		let kind: 'typo' | 'craft' | 'pacing' | 'structure' = 'craft'
		let categoryLabel: string | undefined
		let categorySlug: string | undefined

		if (feedbackCategoryIdInput.startsWith('legacy:')) {
			const legacyKind = feedbackCategoryIdInput.replace('legacy:', '')
			kind =
				legacyKind === 'typo' ||
				legacyKind === 'craft' ||
				legacyKind === 'pacing' ||
				legacyKind === 'structure'
					? legacyKind
					: 'craft'
		} else if (feedbackCategoryIdInput) {
			const categoryResult = await serverSupabase
				.from('feedback_categories')
				.select('name, slug, tone')
				.eq('id', feedbackCategoryIdInput)
				.eq('owner_id', profile.user.id)
				.maybeSingle()

			if (categoryResult.data) {
				categoryLabel = String(categoryResult.data.name ?? '').trim() || undefined
				categorySlug = String(categoryResult.data.slug ?? '').trim() || undefined
				const toneInput = String(categoryResult.data.tone ?? '').trim()
				kind =
					toneInput === 'typo' ||
					toneInput === 'craft' ||
					toneInput === 'pacing' ||
					toneInput === 'structure'
						? toneInput
						: 'craft'
			}
		}

		if (!comment || !blockId || !quote) {
			redirect(
				`/app/workshop/${submissionId}?error=Select+a+valid+range+and+add+a+comment.`,
			)
		}

		if (schemaMode === 'modern') {
			if (
				!Number.isFinite(startOffset) ||
				!Number.isFinite(endOffset) ||
				startOffset < 0 ||
				endOffset <= startOffset
			) {
				redirect(
					`/app/workshop/${submissionId}?error=Select+a+valid+range+and+add+a+comment.`,
				)
			}

			const anchor = {
				blockId,
				startOffset,
				endOffset,
				quote,
				prefix,
				suffix,
				kind,
				categoryLabel,
				categorySlug,
			}

			const { error: insertError } = await serverSupabase
				.from('feedback_items')
				.insert({
					submission_id: submissionId,
					author_id: profile.user.id,
					comment,
					anchor,
				})

			if (insertError) {
				redirect(`/app/workshop/${submissionId}?error=Unable+to+save+comment.`)
			}
		} else {
			if (!latestVersionId) {
				redirect(
					`/app/workshop/${submissionId}?error=Missing+submission+version+for+commenting.`,
				)
			}

			const packedBody =
				Number.isFinite(startOffset) && Number.isFinite(endOffset)
					? packLegacyCommentBody(comment, startOffset, endOffset, quote)
					: comment

			const { error: insertError } = await serverSupabase
				.from('comments')
				.insert({
					submission_id: submissionId,
					submission_version_id: latestVersionId,
					paragraph_id: blockId,
					author_id: profile.user.id,
					body: packedBody,
					visibility: 'writer',
					status: 'open',
				})

			if (insertError) {
				redirect(`/app/workshop/${submissionId}?error=Unable+to+save+comment.`)
			}
		}

		await serverSupabase
			.from('submissions')
			.update({ status: 'in_review' })
			.eq('id', submissionId)
			.eq('status', 'submitted')

		revalidatePath(`/app/workshop/${submissionId}`)
		revalidatePath('/app/teacher/review-desk')
		redirect(`/app/workshop/${submissionId}?notice=Comment+saved.`)
	}

	async function createSnippetAction(formData: FormData) {
		'use server'

		const profile = await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()

		if (schemaMode !== 'modern' || !currentAuthorId) {
			redirect(
				`/app/workshop/${submissionId}?error=Snippet+save+is+only+available+in+modern+schema+mode.`,
			)
		}

		const blockId = String(formData.get('blockId') ?? '').trim()
		const quote = String(formData.get('quote') ?? '').trim()
		const prefix = String(formData.get('prefix') ?? '').trim()
		const suffix = String(formData.get('suffix') ?? '').trim()
		const note = String(formData.get('note') ?? '').trim()
		const snippetCategoryIdInput = String(
			formData.get('snippetCategoryId') ?? '',
		).trim()
		const startOffset = Number(formData.get('startOffset') ?? -1)
		const endOffset = Number(formData.get('endOffset') ?? -1)

		if (
			!blockId ||
			!quote ||
			!Number.isFinite(startOffset) ||
			!Number.isFinite(endOffset) ||
			startOffset < 0 ||
			endOffset <= startOffset
		) {
			redirect(
				`/app/workshop/${submissionId}?error=Select+a+valid+passage+before+saving+a+snippet.`,
			)
		}

		let snippetCategoryId: string | null = null

		if (snippetCategoryIdInput) {
			const categoryResult = await serverSupabase
				.from('snippet_categories')
				.select('id')
				.eq('id', snippetCategoryIdInput)
				.eq('owner_id', profile.user.id)
				.maybeSingle()

			if (categoryResult.data?.id) {
				snippetCategoryId = categoryResult.data.id as string
			}
		}

		const snippetInsert = buildSnippetInsert({
			savedBy: profile.user.id,
			capturedBy: profile.user.id,
			sourceType: 'submission',
			sourceSubmissionId: submissionId,
			sourceAuthorId: currentAuthorId,
			snippetCategoryId,
			anchor: {
				blockId,
				startOffset,
				endOffset,
				quote,
				prefix,
				suffix,
			},
			note,
			visibility: 'private',
		})

		const { error: insertError } = await serverSupabase
			.from('snippets')
			.insert(snippetInsert)

		if (insertError) {
			redirect(`/app/workshop/${submissionId}?error=Unable+to+save+snippet.`)
		}

		revalidatePath(`/app/workshop/${submissionId}`)
		revalidatePath('/app/teacher-studio')
		redirect(`/app/workshop/${submissionId}?notice=Snippet+saved.`)
	}

	async function publishFeedbackAction(formData: FormData) {
		'use server'

		const profile = await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const adminSupabase = createAdminSupabaseClient()
		const summary = String(formData.get('summary') ?? '').trim()

		if (schemaMode !== 'modern') {
			redirect(
				`/app/workshop/${submissionId}?error=Publish+is+only+supported+in+modern+schema+mode.`,
			)
		}

		const { count, error: countError } = await serverSupabase
			.from('feedback_items')
			.select('id', { count: 'exact', head: true })
			.eq('submission_id', submissionId)

		if (countError) {
			redirect(
				`/app/workshop/${submissionId}?error=Unable+to+validate+feedback+items+before+publish.`,
			)
		}

		if (!count || count < 1) {
			redirect(
				`/app/workshop/${submissionId}?error=Add+at+least+one+feedback+comment+before+publish.`,
			)
		}

		const { error: upsertError } = await serverSupabase
			.from('feedback_summaries')
			.upsert(
				{
					submission_id: submissionId,
					author_id: profile.user.id,
					summary:
						summary || 'Feedback published. See inline comments for detail.',
					published_at: new Date().toISOString(),
				},
				{ onConflict: 'submission_id' },
			)

		if (upsertError) {
			redirect(
				`/app/workshop/${submissionId}?error=Unable+to+save+feedback+summary.`,
			)
		}

		const { error: statusError } = await serverSupabase
			.from('submissions')
			.update({ status: 'feedback_published' })
			.eq('id', submissionId)

		if (statusError) {
			redirect(
				`/app/workshop/${submissionId}?error=Unable+to+update+submission+status+to+published.`,
			)
		}

		let publishNotice = 'Feedback published to writer.'
		const { data: submissionRow } = await serverSupabase
			.from('submissions')
			.select('author_id, title, source')
			.eq('id', submissionId)
			.maybeSingle()

		const authorId = submissionRow?.author_id as string | undefined
		const submissionTitleForEmail =
			(submissionRow?.title as string | undefined) ?? submissionTitle
		const sourceForEmail =
			submissionRow?.source === 'try_writing' ? 'try_writing' : 'workshop'

		if (authorId) {
			const { data: userData, error: userError } =
				await adminSupabase.auth.admin.getUserById(authorId)

			const email = userData?.user?.email?.trim().toLowerCase()

			if (!userError && email) {
				try {
					await sendFeedbackPublishedNotification({
						email,
						title: submissionTitleForEmail,
						submissionId,
						useMagicLink: sourceForEmail === 'try_writing',
					})
				} catch {
					publishNotice =
						'Feedback published. Email notification could not be sent.'
				}
			}
		}

		revalidatePath(`/app/workshop/${submissionId}`)
		revalidatePath('/app/teacher/review-desk')
		revalidatePath('/app/teacher/archive')
		revalidatePath('/app/writer')
		revalidatePath('/app/writer/feedback')
		redirect(
			`/app/workshop/${submissionId}?notice=${encodeURIComponent(publishNotice)}`,
		)
	}

	return (
		<section className="space-y-5">
			<div className="surface p-4 lg:p-5">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="max-w-[56rem]">
						<p className="text-xs uppercase tracking-[0.11em] text-silver-300">
							Review detail
						</p>
						<h1 className="literary-title mt-1 text-3xl text-parchment-100">
							{submissionTitle}
						</h1>
					</div>
					<Link
						href="/app/teacher/review-desk"
						className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
						Back to queue
					</Link>
					<Link
						href={`/app/workshop/${submissionId}/export`}
						className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
						Export view
					</Link>
				</div>
				<div className="mt-3 flex flex-wrap gap-2 text-xs text-silver-200">
					<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
						Writer: {writerName}
					</p>
					<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
						Version {currentVersion}
					</p>
					<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
						{submissionStatus.replaceAll('_', ' ')}
					</p>
					<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
						{submissionSource === 'try_writing' ? 'try writing' : 'workshop'}
					</p>
					<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
						{new Date(createdAt).toLocaleString()}
					</p>
				</div>
			</div>

			{schemaMode === 'modern' && versionHistory.length > 1 ? (
				<div className="rounded-2xl border border-white/10 bg-ink-900/30 p-5">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
								Version history
							</p>
							<p className="mt-1 text-sm text-silver-200">
								Open earlier drafts without losing access to the latest revision.
							</p>
						</div>
						{latestVersionEntry && latestVersionEntry.id !== submissionId ? (
							<Link
								href={`/app/workshop/${latestVersionEntry.id}`}
								className="text-xs text-accent-200 hover:text-accent-100">
								Open latest version
							</Link>
						) : null}
					</div>
					<ul className="mt-3 flex flex-wrap gap-2">
						{versionHistory.map((item) => (
							<li key={item.id}>
								<Link
									href={`/app/workshop/${item.id}`}
									className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.09em] transition ${
										item.id === submissionId
											? 'border-accent-300/50 bg-accent-300/10 text-accent-100'
											: 'border-white/10 bg-white/5 text-silver-300 hover:border-white/20 hover:text-parchment-100'
									}`}>
									V{item.version} {' · '}
									{item.status.replaceAll('_', ' ')}
								</Link>
							</li>
						))}
					</ul>
				</div>
			) : null}

			<TeacherReviewWorkspace
				title={submissionTitle}
				paragraphs={paragraphs}
				feedback={feedback}
				notice={notice}
				errorNotice={errorNotice}
				canSaveSnippets={schemaMode === 'modern' && Boolean(currentAuthorId)}
				snippetCategories={snippetCategories}
				feedbackCategories={feedbackCategories}
				createFeedbackAction={createFeedbackItemAction}
				createSnippetAction={createSnippetAction}
			/>

			<form
				action={publishFeedbackAction}
				className="surface p-5 lg:p-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="max-w-[44rem]">
						<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
							Publish feedback
						</p>
						<h2 className="literary-title mt-2 text-2xl text-parchment-100">
							Writer-facing summary
						</h2>
						<p className="mt-2 text-sm leading-relaxed text-silver-200">
							Add this after your inline comments are complete. It sits above the
							published annotations in the writer view.
						</p>
					</div>
					<div className="rounded-2xl border border-white/10 bg-ink-900/35 px-4 py-3 text-right">
						<p className="text-[11px] uppercase tracking-[0.1em] text-silver-300">
							Comment set
						</p>
						<p className="mt-1 text-lg text-parchment-100">{feedback.length}</p>
						<p className="text-xs text-silver-300">
							{submissionStatus === 'feedback_published'
								? 'Published and editable'
								: 'Ready to publish'}
						</p>
					</div>
				</div>
				<label className="mt-5 block">
					<span className="mb-2 block text-xs uppercase tracking-[0.1em] text-silver-300">
						Summary note
					</span>
					<textarea
						name="summary"
						rows={3}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
						placeholder="Optional overview note to accompany inline comments"
					/>
				</label>
				<button
					type="submit"
					className="mt-4 rounded-full border border-emerald-300/60 bg-emerald-300/15 px-4 py-2 text-xs uppercase tracking-[0.1em] text-emerald-100 transition hover:bg-emerald-300/25">
					{submissionStatus === 'feedback_published'
						? 'Update published feedback'
						: 'Publish feedback to writer'}
				</button>
			</form>
		</section>
	)
}
