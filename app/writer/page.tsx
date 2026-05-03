import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { WriterSubmissionComposer } from '@/components/writer/writer-submission-composer'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { normalizeTeachingDocumentType } from '@/lib/teacher-documents/types'
import { isAbuWorkshopSlug } from '@/lib/workshop/access-groups'

const ABU_SUBMISSION_WORD_LIMIT = 2000

type SchemaMode = 'modern' | 'legacy'

type WriterWorkshop = {
	id: string
	title: string
	slug?: string | null
}

type WriterSubmission = {
	id: string
	title: string
	status: string
	createdAt: string
	workshopTitle?: string | null
	version?: number
	commentCount?: number
}

type WriterDocumentResource = {
	id: string
	title: string
	documentType: string
	updatedAt: string
}

type DocumentRow = {
	id: string
	title: string
	body: unknown
	updated_at: string
}

function toMessage(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object')
}

function groupIdsFromDocumentBody(body: unknown) {
	if (!isRecord(body) || !isRecord(body.metadata)) {
		return []
	}

	return Array.isArray(body.metadata.groupIds)
		? body.metadata.groupIds.map((id) => String(id).trim()).filter(Boolean)
		: []
}

function documentTypeFromBody(body: unknown) {
	if (!isRecord(body) || !isRecord(body.metadata)) {
		return 'Teaching note'
	}

	return normalizeTeachingDocumentType(body.metadata.documentType)
}

function isLegacySchemaError(message: string | null | undefined) {
	if (!message) {
		return false
	}

	const normalized = message.toLowerCase()
	return (
		normalized.includes('schema cache') ||
		normalized.includes('could not find the') ||
		(normalized.includes('column') && normalized.includes('does not exist')) ||
		(normalized.includes('relation') && normalized.includes('does not exist'))
	)
}

function encodeErrorMessage(message: string | null | undefined) {
	if (!message) {
		return 'Unknown+error'
	}

	return encodeURIComponent(message.slice(0, 140))
}

async function detectSchemaMode() {
	const supabase = await createServerSupabaseClient()
	const result = await supabase.from('submissions').select('author_id').limit(1)

	if (result.error && isLegacySchemaError(result.error.message)) {
		return 'legacy' as SchemaMode
	}

	return 'modern' as SchemaMode
}

async function createSubmissionAction(formData: FormData) {
	'use server'

	const user = await getCurrentUser()
	const supabase = await createServerSupabaseClient()
	const mode = await detectSchemaMode()

	const title = String(formData.get('title') ?? '').trim()
	const rawBody = String(formData.get('body') ?? '')
	const body = rawBody.trim()
	const workshopId = String(formData.get('workshopId') ?? '').trim()
	const wordCount = body.split(/\s+/).filter(Boolean).length

	if (!title || !body) {
		redirect('/app/writer?error=Please+complete+title+and+body.')
	}

	if (mode === 'modern') {
		if (!workshopId) {
			redirect('/app/writer?error=Please+select+a+group.')
		}

		const { data: membership, error: membershipError } = await supabase
			.from('workshop_members')
			.select('workshop_id')
			.eq('profile_id', user.id)
			.eq('workshop_id', workshopId)
			.maybeSingle()

		if (membershipError) {
			redirect('/app/writer?error=Unable+to+validate+group+membership.')
		}

		if (!membership) {
			redirect(
				'/app/writer?error=You+can+only+submit+to+your+assigned+groups.',
			)
		}

		const { data: workshop, error: workshopReadError } = await supabase
			.from('workshops')
			.select('slug, title')
			.eq('id', workshopId)
			.maybeSingle()

		if (workshopReadError) {
			redirect('/app/writer?error=Unable+to+validate+group+settings.')
		}

		const isAbuSubmission =
			isAbuWorkshopSlug(workshop?.slug as string | null | undefined) ||
			String(workshop?.title ?? '').trim().toLowerCase() ===
				'authorised basic user'

		if (isAbuSubmission && wordCount > ABU_SUBMISSION_WORD_LIMIT) {
			redirect(
				`/app/writer?error=Authorised+Basic+User+submissions+are+currently+limited+to+${ABU_SUBMISSION_WORD_LIMIT}+words.`,
			)
		}

		const { error: insertError } = await supabase.from('submissions').insert({
			author_id: user.id,
			workshop_id: workshopId,
			title,
			body: rawBody,
			status: 'submitted',
			version: 1,
		})

		if (insertError) {
			redirect(
				'/app/writer?error=Unable+to+save+submission.+Check+Layer+1+migration.',
			)
		}
	} else {
		const writerFirstName =
			(user.user_metadata?.first_name as string | undefined) ||
			(user.user_metadata?.name as string | undefined) ||
			String(user.email ?? 'Writer').split('@')[0]

		const { data: submissionRows, error: submissionInsertError } =
			await supabase
				.from('submissions')
				.insert({
					writer_id: user.id,
					writer_email: user.email ?? '',
					writer_first_name: writerFirstName,
					title,
					status: 'submitted',
					submitted_at: new Date().toISOString(),
				})
				.select('id')
				.single()

		if (submissionInsertError || !submissionRows?.id) {
			redirect(
				`/app/writer?error=Unable+to+save+submission+header:+${encodeErrorMessage(submissionInsertError?.message)}`,
			)
		}

		const submissionId = submissionRows.id as string

		const { data: versionRows, error: versionInsertError } = await supabase
			.from('submission_versions')
			.insert({
				submission_id: submissionId,
				version_number: 1,
				body: rawBody,
				word_count: wordCount,
				created_by: user.id,
			})
			.select('id')
			.single()

		if (versionInsertError || !versionRows?.id) {
			redirect(
				`/app/writer?error=Unable+to+save+submission+body+version:+${encodeErrorMessage(versionInsertError?.message)}`,
			)
		}

		const versionId = versionRows.id as string

		await supabase
			.from('submissions')
			.update({ latest_version_id: versionId })
			.eq('id', submissionId)

		const paragraphs = toManuscriptParagraphs(rawBody)
		if (paragraphs.length > 0) {
			let cursor = 0
			const paragraphRows = paragraphs.map((text, index) => {
				const paragraphText = text.text
				const startChar = cursor
				const endChar = startChar + paragraphText.length
				cursor = endChar + 2

				return {
					submission_version_id: versionId,
					pid: randomUUID(),
					position: index + 1,
					text: paragraphText,
					start_char: startChar,
					end_char: endChar,
				}
			})

			await supabase.from('submission_paragraphs').insert(paragraphRows)
		}
	}

	revalidatePath('/app/writer')
	revalidatePath('/app/teacher/review-desk')
	redirect('/app/writer?notice=Submission+saved+with+status+submitted.')
}

async function deleteSubmissionAction(formData: FormData) {
	'use server'

	const user = await getCurrentUser()
	const supabase = await createServerSupabaseClient()
	const mode = await detectSchemaMode()
	const submissionId = String(formData.get('submissionId') ?? '').trim()

	if (!submissionId) {
		redirect('/app/writer?error=Missing+submission+id.')
	}

	if (mode === 'modern') {
		const { data: row, error: readError } = await supabase
			.from('submissions')
			.select('id, status')
			.eq('id', submissionId)
			.eq('author_id', user.id)
			.maybeSingle()

		if (readError || !row) {
			redirect('/app/writer?error=Submission+not+found+for+delete.')
		}

		if (row.status !== 'submitted') {
			redirect('/app/writer?error=Only+submitted+drafts+can+be+deleted.')
		}

		const { error: deleteError } = await supabase
			.from('submissions')
			.delete()
			.eq('id', submissionId)
			.eq('author_id', user.id)

		if (deleteError) {
			redirect(
				`/app/writer?error=Unable+to+delete+submission:+${encodeErrorMessage(deleteError.message)}`,
			)
		}
	} else {
		const { data: row, error: readError } = await supabase
			.from('submissions')
			.select('id, status')
			.eq('id', submissionId)
			.eq('writer_id', user.id)
			.maybeSingle()

		if (readError || !row) {
			redirect('/app/writer?error=Submission+not+found+for+delete.')
		}

		if (row.status !== 'submitted') {
			redirect('/app/writer?error=Only+submitted+drafts+can+be+deleted.')
		}

		const { error: deleteError } = await supabase
			.from('submissions')
			.delete()
			.eq('id', submissionId)
			.eq('writer_id', user.id)

		if (deleteError) {
			redirect(
				`/app/writer?error=Unable+to+delete+submission:+${encodeErrorMessage(deleteError.message)}`,
			)
		}
	}

	revalidatePath('/app/writer')
	revalidatePath('/app/teacher/review-desk')
	redirect('/app/writer?notice=Submission+deleted.')
}

export default async function WriterPage({
	searchParams,
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	await requireWriter()
	const user = await getCurrentUser()
	const supabase = await createServerSupabaseClient()
	const mode = await detectSchemaMode()
	const params = searchParams ? await searchParams : {}

	const notice = toMessage(params.notice)
	const errorNotice = toMessage(params.error)

	let workshops: WriterWorkshop[] = []
	let workshopError: string | null = null
	let submissions: WriterSubmission[] = []
	let submissionsError: string | null = null
	let availableDocuments: WriterDocumentResource[] = []
	let documentsError: string | null = null
	let writerWorkshopIds: string[] = []

	if (mode === 'modern') {
		const { data: memberRows, error: membershipError } = await supabase
			.from('workshop_members')
			.select('workshop_id')
			.eq('profile_id', user.id)
		writerWorkshopIds = (memberRows ?? []).map(
			(row) => row.workshop_id as string,
		)

		if (membershipError) {
			workshopError = `Unable to load your workshops: ${membershipError.message}`
		} else if (writerWorkshopIds.length > 0) {
			const { data: workshopRows, error } = await supabase
				.from('workshops')
				.select('id, title, slug')
				.in('id', writerWorkshopIds)
				.order('title', { ascending: true })

			if (error) {
				workshopError = 'Unable to load group details.'
			} else {
				workshops = (workshopRows ?? []) as WriterWorkshop[]
			}
		}

		const { data: submissionRows, error } = await supabase
			.from('submissions')
			.select('id, title, status, created_at, workshop_id, version')
			.eq('author_id', user.id)
			.order('created_at', { ascending: false })

		if (error) {
			submissionsError =
				'Unable to load submissions. Check Layer 1 migration and RLS setup.'
		} else {
			const workshopTitleById = Object.fromEntries(
				workshops.map((workshop) => [workshop.id, workshop.title]),
			)

			submissions = (
				(submissionRows ?? []) as Array<{
					id: string
					title: string
					status: string
					created_at: string
					workshop_id: string
					version: number
				}>
			).map((submission) => ({
				id: submission.id,
				title: submission.title,
				status: submission.status,
				createdAt: submission.created_at,
				version: submission.version,
				workshopTitle:
					workshopTitleById[submission.workshop_id] ?? 'Group unknown',
			}))

			const submissionIds = submissions.map((submission) => submission.id)

			if (submissionIds.length > 0) {
				const { data: feedbackRows } = await supabase
					.from('feedback_items')
					.select('submission_id')
					.in('submission_id', submissionIds)

				const commentCountBySubmission = (feedbackRows ?? []).reduce(
					(acc, row) => {
						const key = row.submission_id as string
						acc[key] = (acc[key] ?? 0) + 1
						return acc
					},
					{} as Record<string, number>,
				)

				submissions = submissions.map((submission) => ({
					...submission,
					commentCount: commentCountBySubmission[submission.id] ?? 0,
				}))
			}
		}
	} else {
		const { data: submissionRows, error } = await supabase
			.from('submissions')
			.select('id, title, status, submitted_at, created_at')
			.eq('writer_id', user.id)
			.order('created_at', { ascending: false })

		if (error) {
			submissionsError =
				'Unable to load submissions in legacy mode. Check submissions table access.'
		} else {
			submissions = (
				(submissionRows ?? []) as Array<{
					id: string
					title: string
					status: string
					submitted_at: string | null
					created_at: string
				}>
			).map((submission) => ({
				id: submission.id,
				title: submission.title,
				status: submission.status,
				createdAt: submission.submitted_at ?? submission.created_at,
				workshopTitle: 'Default group queue',
				commentCount: 0,
			}))
		}
	}

	if (mode === 'modern') {
		writerWorkshopIds = workshops.map((workshop) => workshop.id)
	}

	if (mode === 'modern' && writerWorkshopIds.length > 0) {
		const adminSupabase = createAdminSupabaseClient()
		const { data: documentRows, error } = await adminSupabase
			.from('teacher_documents')
			.select('id, title, body, updated_at')
			.order('updated_at', { ascending: false })
			.limit(80)

		if (error) {
			documentsError = isLegacySchemaError(error.message)
				? 'Shared documents are not available until the teacher_documents migration has been applied.'
				: 'Unable to load shared documents.'
		} else {
			const writerWorkshopSet = new Set(writerWorkshopIds)
			availableDocuments = ((documentRows ?? []) as DocumentRow[])
				.filter((document) =>
					groupIdsFromDocumentBody(document.body).some((groupId) =>
						writerWorkshopSet.has(groupId),
					),
				)
				.map((document) => ({
					id: document.id,
					title: document.title,
					documentType: documentTypeFromBody(document.body),
					updatedAt: document.updated_at,
				}))
				.slice(0, 12)
		}
	}

	const isWorkshopRequired = mode === 'modern'
	const defaultWorkshopId =
		workshops.find((workshop) => isAbuWorkshopSlug(workshop.slug))?.id ??
		workshops.find(
			(workshop) =>
				workshop.title.trim().toLowerCase() === 'authorised basic user',
		)?.id ??
		workshops[0]?.id ??
		''
	const submittedCount = submissions.filter(
		(submission) => submission.status === 'submitted',
	).length
	const inReviewCount = submissions.filter(
		(submission) => submission.status === 'in_review',
	).length
	const publishedCount = submissions.filter(
		(submission) => submission.status === 'feedback_published',
	).length
	const composerWorkshops = workshops.map((workshop) => ({
		id: workshop.id,
		title: workshop.title,
		isAbu:
			isAbuWorkshopSlug(workshop.slug) ||
			workshop.title.trim().toLowerCase() === 'authorised basic user',
	}))

	return (
		<section className="space-y-5">
			<WriterSubmissionComposer
				writerName={
					(user.user_metadata?.first_name as string | undefined) ||
					(user.user_metadata?.name as string | undefined) ||
					String(user.email ?? 'Writer').split('@')[0]
				}
				createSubmissionAction={createSubmissionAction}
				deleteSubmissionAction={deleteSubmissionAction}
				workshops={composerWorkshops}
				isWorkshopRequired={isWorkshopRequired}
				defaultWorkshopId={defaultWorkshopId}
				submissions={submissions}
				submissionsError={submissionsError}
				notice={notice}
				errorNotice={errorNotice}
				workshopError={workshopError}
				submittedCount={submittedCount}
				inReviewCount={inReviewCount}
				publishedCount={publishedCount}
				abuSubmissionWordLimit={ABU_SUBMISSION_WORD_LIMIT}
				availableDocuments={availableDocuments}
				documentsError={documentsError}
			/>
		</section>
	)
}
