import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect, notFound } from 'next/navigation'
import { TeacherReviewWorkspace } from '@/components/teacher/review-workspace'
import { sendFeedbackPublishedNotification } from '@/lib/notifications/email'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
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

	const latestVersionEntry =
		versionHistory.length > 0 ? versionHistory[versionHistory.length - 1] : null

	async function createFeedbackItemAction(formData: FormData) {
		'use server'

		const profile = await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()

		const comment = String(formData.get('comment') ?? '').trim()
		const blockId = String(formData.get('blockId') ?? '').trim()
		const quote = String(formData.get('quote') ?? '').trim()
		const kindInput = String(formData.get('kind') ?? '').trim()
		const prefix = String(formData.get('prefix') ?? '').trim()
		const suffix = String(formData.get('suffix') ?? '').trim()
		const startOffset = Number(formData.get('startOffset') ?? -1)
		const endOffset = Number(formData.get('endOffset') ?? -1)
		const kind: 'typo' | 'craft' | 'pacing' | 'structure' =
			kindInput === 'typo' ||
			kindInput === 'craft' ||
			kindInput === 'pacing' ||
			kindInput === 'structure'
				? kindInput
				: 'craft'

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
					publishNotice = 'Feedback published. Email notification could not be sent.'
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
		<section className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="text-xs uppercase tracking-[0.11em] text-silver-300">
						Review detail
					</p>
					<h1 className="literary-title mt-1 text-3xl text-parchment-100">
						{submissionTitle}
					</h1>
					<p className="mt-1 text-xs text-silver-300">
						{writerName} {' · '} {new Date(createdAt).toLocaleString()} {' · '}
						Version {currentVersion} {' · '}
						{submissionStatus.replaceAll('_', ' ')} {' · '}
						{submissionSource === 'try_writing' ? 'try writing' : 'workshop'} {' · '}
						mode: {schemaMode}
					</p>
				</div>
				<Link
					href="/app/teacher/review-desk"
					className="text-sm text-accent-200 hover:text-accent-100">
					Back to queue
				</Link>
			</div>

			{schemaMode === 'modern' && versionHistory.length > 1 ? (
				<div className="rounded-xl border border-white/10 bg-ink-900/30 p-4">
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

			<form
				action={publishFeedbackAction}
				className="rounded-xl border border-white/10 bg-ink-900/30 p-4">
				<label className="block">
					<span className="mb-2 block text-xs uppercase tracking-[0.1em] text-silver-300">
						Publish summary for writer
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
					className="mt-3 rounded-full border border-emerald-300/60 bg-emerald-300/15 px-4 py-2 text-xs uppercase tracking-[0.1em] text-emerald-100 transition hover:bg-emerald-300/25">
					{submissionStatus === 'feedback_published'
						? 'Update published feedback'
						: 'Publish feedback to writer'}
				</button>
			</form>

			<TeacherReviewWorkspace
				title={submissionTitle}
				paragraphs={paragraphs}
				feedback={feedback}
				notice={notice}
				errorNotice={errorNotice}
				createFeedbackAction={createFeedbackItemAction}
			/>
		</section>
	)
}

