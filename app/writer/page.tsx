import Link from 'next/link'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ManuscriptTextarea } from '@/components/writer/manuscript-textarea'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type SchemaMode = 'modern' | 'legacy'

type WriterWorkshop = {
	id: string
	title: string
}

type WriterSubmission = {
	id: string
	title: string
	status: string
	createdAt: string
	workshopTitle?: string | null
	version?: number
}

function toMessage(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

function statusLabel(value: string) {
	return value.replaceAll('_', ' ')
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
		const words = body.trim().split(/\s+/).filter(Boolean)
		const wordCount = words.length

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

	if (mode === 'modern') {
		const { data: memberRows, error: membershipError } = await supabase
			.from('workshop_members')
			.select('workshop_id')
			.eq('profile_id', user.id)
		const workshopIds = (memberRows ?? []).map(
			(row) => row.workshop_id as string,
		)

		if (membershipError) {
			workshopError = `Unable to load your workshops: ${membershipError.message}`
		} else if (workshopIds.length > 0) {
			const { data: workshopRows, error } = await supabase
				.from('workshops')
				.select('id, title')
				.in('id', workshopIds)
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
			}))
		}
	}

	const isWorkshopRequired = mode === 'modern'
	const submittedCount = submissions.filter(
		(submission) => submission.status === 'submitted',
	).length
	const inReviewCount = submissions.filter(
		(submission) => submission.status === 'in_review',
	).length
	const publishedCount = submissions.filter(
		(submission) => submission.status === 'feedback_published',
	).length

	return (
		<section className="space-y-5">
			<div className="surface p-4 lg:p-5">
				<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
					Writer home
				</p>
				<div className="mt-2 flex flex-wrap items-end justify-between gap-3">
					<div>
						<h1 className="literary-title text-3xl text-parchment-100">
							Groups
						</h1>
						<p className="muted mt-2 max-w-[42rem] text-sm leading-relaxed">
							Start a new piece, choose the right group, and keep the draft in
							view while you track the review loop.
						</p>
					</div>
					<div className="flex flex-wrap gap-2 text-xs text-silver-200">
						<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
							Awaiting reply: {submittedCount}
						</p>
						<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
							In review: {inReviewCount}
						</p>
						<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
							Published feedback: {publishedCount}
						</p>
					</div>
				</div>
			</div>

			<div className="surface p-6 lg:p-8">
				<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
					New submission
				</p>
				<h2 className="literary-title mt-2 text-3xl text-parchment-100">
					Submit a draft
				</h2>
				<p className="muted mt-2 max-w-prose text-sm leading-relaxed">
					Paste the piece as you want it read. Formatting is preserved.
				</p>

				{notice && (
					<p className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
						{notice}
					</p>
				)}
				{errorNotice && (
					<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						{errorNotice}
					</p>
				)}
				{workshopError && (
					<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						{workshopError}
					</p>
				)}
				{isWorkshopRequired && !workshopError && workshops.length === 0 && (
					<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						No group membership found yet. Your baseline group may still be
						loading, or a teacher/admin may need to assign an additional group.
					</p>
				)}
				{!isWorkshopRequired && (
					<p className="mt-4 rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-sm text-sky-100">
						Legacy schema detected. Submissions currently route through a
						default queue until group tables are migrated.
					</p>
				)}

				<form action={createSubmissionAction} className="mt-6 space-y-3">
					<div className="grid gap-3 md:grid-cols-2">
						<label className="block">
							<span className="mb-2 block text-sm text-silver-200">Title</span>
							<input
								name="title"
								required
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-4 py-2.5 text-parchment-100 outline-none ring-accent-400 transition focus:ring"
								placeholder="Draft title"
							/>
						</label>

						{isWorkshopRequired ? (
							<label className="block">
								<span className="mb-2 block text-sm text-silver-200">
									Group
								</span>
								<select
									name="workshopId"
									required
									disabled={workshops.length === 0}
									className="w-full rounded-xl border border-white/15 bg-ink-900 px-4 py-2.5 text-parchment-100 outline-none ring-accent-400 transition focus:ring disabled:opacity-60">
									<option value="">
										{workshops.length === 0
											? 'No group membership found'
											: 'Select group'}
									</option>
									{workshops.map((workshop) => (
										<option key={workshop.id} value={workshop.id}>
											{workshop.title}
										</option>
									))}
								</select>
							</label>
						) : (
							<div className="rounded-xl border border-white/10 bg-ink-900/35 px-4 py-2.5 text-sm text-silver-200">
								Default queue (no group selection in legacy mode)
							</div>
						)}
					</div>

					<label className="block">
						<span className="mb-2 block text-sm text-silver-200">
							Body text
						</span>
						<div className="folio-page p-5">
							<ManuscriptTextarea
								name="body"
								required
								rows={12}
								className="w-full resize-y border-none bg-transparent font-serif text-[18px] leading-8 text-ink-900/90 outline-none"
								placeholder="Paste your draft text here"
							/>
						</div>
					</label>

					<button
						type="submit"
						disabled={isWorkshopRequired && workshops.length === 0}
						className="rounded-full border border-accent-400/70 bg-accent-400/20 px-5 py-2.5 text-sm text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
						Save submission
					</button>
				</form>
			</div>

			<div className="surface p-6 lg:p-8">
				<div className="flex items-center justify-between gap-3">
					<h2 className="literary-title text-2xl text-parchment-100">
						Submission history
					</h2>
					<p className="text-xs uppercase tracking-[0.11em] text-silver-300">
						{submissions.length} total
					</p>
				</div>

				{submissionsError ? (
					<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						{submissionsError}
					</p>
				) : submissions.length === 0 ? (
					<p className="muted mt-4 text-sm">No submissions yet.</p>
				) : (
					<ul className="mt-4 space-y-2.5">
						{submissions.map((submission) => (
							<li
								key={submission.id}
								className="rounded-2xl border border-white/10 bg-ink-900/35 p-4 transition hover:border-white/15 hover:bg-ink-900/45">
								<div className="flex flex-wrap items-start justify-between gap-2">
									<p className="text-sm font-medium text-parchment-100">
										{submission.title}
									</p>
									<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
										{statusLabel(submission.status)}
									</p>
								</div>
								<p className="mt-2 text-xs text-silver-300">
									{submission.workshopTitle ?? 'Default group queue'} {' · '}
									{submission.createdAt
										? new Date(submission.createdAt).toLocaleString()
										: 'Unknown date'}
									{submission.version ? ` · Version ${submission.version}` : ''}
								</p>
								<div className="mt-3 flex flex-wrap gap-3 text-xs">
									{submission.status === 'feedback_published' ? (
										<Link
											href={`/app/writer/feedback/${submission.id}`}
											className="text-accent-200 hover:text-accent-100">
											Open feedback
										</Link>
									) : null}
									{submission.status === 'submitted' ? (
										<form action={deleteSubmissionAction}>
											<input
												type="hidden"
												name="submissionId"
												value={submission.id}
											/>
											<button
												type="submit"
												className="rounded-full border border-rose-300/50 bg-rose-300/10 px-3 py-1.5 uppercase tracking-[0.09em] text-rose-100 transition hover:bg-rose-300/20">
												Delete draft
											</button>
										</form>
									) : null}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	)
}
