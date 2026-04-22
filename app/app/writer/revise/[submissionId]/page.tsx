import { revalidatePath } from 'next/cache'
import { redirect, notFound } from 'next/navigation'
import { RevisionDraftForm } from '@/components/writer/revision-draft-form'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isAbuWorkshopSlug } from '@/lib/workshop/access-groups'

const ABU_SUBMISSION_WORD_LIMIT = 2000

type RevisionSubmission = {
	id: string
	title: string
	body: string
	status: string
	created_at: string
	author_id: string
	workshop_id: string
	version: number
	parent_submission_id: string | null
}

type RevisionHistoryItem = {
	id: string
	version: number
	status: string
	created_at: string
}

type RevisionWorkshop = {
	title: string
	slug: string | null
}

function toMessage(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

function buildRevisionScopeFilter(rootSubmissionId: string) {
	return `id.eq.${rootSubmissionId},parent_submission_id.eq.${rootSubmissionId}`
}

function countWords(value: string) {
	return value.trim().split(/\s+/).filter(Boolean).length
}

function statusLabel(value: string) {
	return value.replaceAll('_', ' ')
}

function isActiveReviewStatus(value: string) {
	return value === 'submitted' || value === 'in_review'
}

function getRevisionBlockReason(
	submission: Pick<RevisionSubmission, 'version'>,
	revisionHistory: RevisionHistoryItem[],
) {
	const latestPublishedVersion = revisionHistory.reduce(
		(latestVersion, item) =>
			item.status === 'feedback_published'
				? Math.max(latestVersion, item.version)
				: latestVersion,
		submission.version,
	)
	const activeNewerVersion = revisionHistory
		.filter(
			(item) =>
				item.version > submission.version && isActiveReviewStatus(item.status),
		)
		.sort((a, b) => a.version - b.version)[0]

	if (activeNewerVersion) {
		return `Version ${activeNewerVersion.version} is already ${statusLabel(
			activeNewerVersion.status,
		)}. Wait for teacher feedback before starting another revision.`
	}

	if (submission.version < latestPublishedVersion) {
		return `Start from the latest published feedback, version ${latestPublishedVersion}, before making another revision.`
	}

	return null
}

export default async function WriterRevisionPage({
	params,
	searchParams,
}: {
	params: Promise<{ submissionId: string }>
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	await requireWriter()
	const user = await getCurrentUser()
	const supabase = await createServerSupabaseClient()
	const { submissionId } = await params
	const query = searchParams ? await searchParams : {}
	const notice = toMessage(query.notice)
	const errorNotice = toMessage(query.error)

	const submissionResult = await supabase
		.from('submissions')
		.select(
			'id, title, body, status, created_at, author_id, workshop_id, version, parent_submission_id',
		)
		.eq('id', submissionId)
		.eq('author_id', user.id)
		.maybeSingle()

	if (submissionResult.error || !submissionResult.data) {
		notFound()
	}

	const submission = submissionResult.data as RevisionSubmission

	if (submission.status !== 'feedback_published') {
		redirect('/app/writer?error=Only+published+feedback+can+start+a+revision.')
	}

	const rootSubmissionId = submission.parent_submission_id ?? submission.id
	const historyResult = await supabase
		.from('submissions')
		.select('id, version, status, created_at')
		.eq('author_id', user.id)
		.or(buildRevisionScopeFilter(rootSubmissionId))
		.order('version', { ascending: true })

	const revisionHistory = (historyResult.data ?? []) as RevisionHistoryItem[]
	const nextVersion =
		revisionHistory.reduce(
			(highestVersion, item) => Math.max(highestVersion, item.version),
			submission.version,
		) + 1
	const blockedReason = getRevisionBlockReason(submission, revisionHistory)

	const workshopResult = await supabase
		.from('workshops')
		.select('title, slug')
		.eq('id', submission.workshop_id)
		.maybeSingle()
	const workshop = workshopResult.data as RevisionWorkshop | null
	const isAbuRevision =
		isAbuWorkshopSlug(workshop?.slug) ||
		String(workshop?.title ?? '').trim().toLowerCase() ===
			'authorised basic user'

	async function submitRevisionAction(formData: FormData) {
		'use server'

		await requireWriter()
		const revisionUser = await getCurrentUser()
		const serverSupabase = await createServerSupabaseClient()
		const title = String(formData.get('title') ?? '').trim()
		const rawBody = String(formData.get('body') ?? '')
		const body = rawBody.trim()
		const wordCount = countWords(body)

		if (!title || !body) {
			redirect(
				`/app/writer/revise/${submissionId}?error=Please+complete+title+and+body.`,
			)
		}

		const currentResult = await serverSupabase
			.from('submissions')
			.select(
				'id, status, author_id, workshop_id, version, parent_submission_id',
			)
			.eq('id', submissionId)
			.eq('author_id', revisionUser.id)
			.maybeSingle()

		if (currentResult.error || !currentResult.data) {
			redirect(
				`/app/writer/revise/${submissionId}?error=Original+submission+could+not+be+loaded.`,
			)
		}

		const currentSubmission = currentResult.data as Omit<
			RevisionSubmission,
			'title' | 'body' | 'created_at'
		>

		if (currentSubmission.status !== 'feedback_published') {
			redirect(
				`/app/writer/revise/${submissionId}?error=Only+published+feedback+can+start+a+revision.`,
			)
		}

		const currentRootSubmissionId =
			currentSubmission.parent_submission_id ?? currentSubmission.id

		const currentHistoryResult = await serverSupabase
			.from('submissions')
			.select('id, version, status, created_at')
			.eq('author_id', revisionUser.id)
			.or(buildRevisionScopeFilter(currentRootSubmissionId))

		const currentHistory = (currentHistoryResult.data ?? []) as Array<{
			id: string
			version: number
			status: string
			created_at: string
		}>
		const currentBlockingReason = getRevisionBlockReason(
			{
				version: currentSubmission.version,
			},
			currentHistory.map((item) => ({
				id: item.id,
				version: item.version,
				status: item.status,
				created_at: item.created_at,
			})),
		)

		if (currentBlockingReason) {
			redirect(
				`/app/writer/revise/${submissionId}?error=${encodeURIComponent(currentBlockingReason)}`,
			)
		}

		const currentWorkshopResult = await serverSupabase
			.from('workshops')
			.select('title, slug')
			.eq('id', currentSubmission.workshop_id)
			.maybeSingle()
		const currentWorkshop = currentWorkshopResult.data as RevisionWorkshop | null
		const isCurrentAbuRevision =
			isAbuWorkshopSlug(currentWorkshop?.slug) ||
			String(currentWorkshop?.title ?? '').trim().toLowerCase() ===
				'authorised basic user'

		if (isCurrentAbuRevision && wordCount > ABU_SUBMISSION_WORD_LIMIT) {
			redirect(
				`/app/writer/revise/${submissionId}?error=Authorised+Basic+User+revisions+are+currently+limited+to+${ABU_SUBMISSION_WORD_LIMIT}+words.`,
			)
		}

		const currentNextVersion =
			currentHistory.reduce(
				(highestVersion, item) => Math.max(highestVersion, item.version),
				currentSubmission.version,
			) + 1

		const { error: insertError } = await serverSupabase.from('submissions').insert({
			author_id: revisionUser.id,
			workshop_id: currentSubmission.workshop_id,
			parent_submission_id: currentRootSubmissionId,
			title,
			body: rawBody,
			status: 'submitted',
			version: currentNextVersion,
		})

		if (insertError) {
			redirect(
				`/app/writer/revise/${submissionId}?error=Unable+to+submit+revision.`,
			)
		}

		revalidatePath('/app/writer')
		revalidatePath('/app/writer/feedback')
		revalidatePath(`/app/writer/feedback/${submissionId}`)
		revalidatePath('/app/teacher/review-desk')
		revalidatePath('/app/teacher/archive')
		redirect(
			`/app/writer?notice=${encodeURIComponent(`Revision submitted as version ${currentNextVersion}.`)}`,
		)
	}

	return (
		<section>
			<RevisionDraftForm
				title={submission.title}
				body={submission.body}
				status={submission.status}
				sourceVersion={submission.version}
				nextVersion={nextVersion}
				sourceCreatedAt={submission.created_at}
				submitRevisionAction={submitRevisionAction}
				canSubmitRevision={!blockedReason}
				blockedReason={blockedReason}
				isAbuRevision={isAbuRevision}
				abuSubmissionWordLimit={ABU_SUBMISSION_WORD_LIMIT}
				revisionHistory={revisionHistory.map((item) => ({
					id: item.id,
					version: item.version,
					status: item.status,
					createdAt: item.created_at,
				}))}
				currentSubmissionId={submission.id}
				notice={notice}
				errorNotice={errorNotice}
			/>
		</section>
	)
}
