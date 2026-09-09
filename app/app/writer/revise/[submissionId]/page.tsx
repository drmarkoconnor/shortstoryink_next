import { saveWorkshopDraft } from '@/lib/workshop/save-draft'
import type { DraftSubmissionResult } from '@/lib/drafts/recovery'
import { revalidatePath } from 'next/cache'
import { redirect, notFound } from 'next/navigation'
import { RevisionDraftForm } from '@/components/writer/revision-draft-form'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createAdminDataClient } from '@/lib/data/client'
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
	const adminData = createAdminDataClient()
	const { submissionId } = await params
	const query = searchParams ? await searchParams : {}
	const notice = toMessage(query.notice)
	const errorNotice = toMessage(query.error)

	const submissionResult = await adminData
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
	const historyResult = await adminData
		.from('submissions')
		.select('id, version, status, created_at')
		.eq('author_id', user.id)
		.or(buildRevisionScopeFilter(rootSubmissionId))
		.order('version', { ascending: true })

	if (historyResult.error) throw new Error('Revision history could not be loaded. Please try again.')
	const revisionHistory = (historyResult.data ?? []) as RevisionHistoryItem[]
	const nextVersion =
		revisionHistory.reduce(
			(highestVersion, item) => Math.max(highestVersion, item.version),
			submission.version,
		) + 1
	const blockedReason = getRevisionBlockReason(submission, revisionHistory)

	const workshopResult = await adminData
		.from('workshops')
		.select('title, slug')
		.eq('id', submission.workshop_id)
		.maybeSingle()
	const workshop = workshopResult.data as RevisionWorkshop | null
	const isAbuRevision =
		isAbuWorkshopSlug(workshop?.slug) ||
		String(workshop?.title ?? '').trim().toLowerCase() ===
			'authorised basic user'

	async function submitRevisionAction(formData: FormData): Promise<DraftSubmissionResult> {
		'use server'
		const { user: revisionUser } = await requireWriter()
		const result = await saveWorkshopDraft(revisionUser.id, formData, submissionId)
		if ('error' in result) return result
		revalidatePath('/app/writer')
		revalidatePath('/app/writer/feedback')
		revalidatePath(`/app/writer/feedback/${submissionId}`)
		revalidatePath('/app/teacher/review-desk')
		revalidatePath('/app/teacher/archive')
		return { id: result.id, version: result.version }
	}

	return (
		<section>
			<RevisionDraftForm
				key={`${user.id}:${submission.id}`}
				writerId={user.id}
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
