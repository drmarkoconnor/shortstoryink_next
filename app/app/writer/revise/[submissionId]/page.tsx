import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect, notFound } from 'next/navigation'
import { ManuscriptTextarea } from '@/components/writer/manuscript-textarea'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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

function toMessage(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

function buildRevisionScopeFilter(rootSubmissionId: string) {
	return `id.eq.${rootSubmissionId},parent_submission_id.eq.${rootSubmissionId}`
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

	async function submitRevisionAction(formData: FormData) {
		'use server'

		await requireWriter()
		const revisionUser = await getCurrentUser()
		const serverSupabase = await createServerSupabaseClient()
		const title = String(formData.get('title') ?? '').trim()
		const rawBody = String(formData.get('body') ?? '')
		const body = rawBody.trim()

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
			.select('version')
			.eq('author_id', revisionUser.id)
			.or(buildRevisionScopeFilter(currentRootSubmissionId))

		const currentHistory = (currentHistoryResult.data ?? []) as Array<{
			version: number
		}>
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
		<section className="space-y-5">
			<div className="surface p-5 lg:p-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
							Revision workspace
						</p>
						<h1 className="literary-title mt-2 text-3xl text-parchment-100">
							{submission.title}
						</h1>
					</div>
					<Link
						href={`/app/writer/feedback/${submission.id}`}
						className="text-sm text-accent-200 hover:text-accent-100">
						Back to published feedback
					</Link>
				</div>
				<div className="mt-3 flex flex-wrap gap-2 text-xs text-silver-200">
					<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
						Revising from version {submission.version}
					</p>
					<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
						New draft becomes version {nextVersion}
					</p>
					<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
						Current status {submission.status.replaceAll('_', ' ')}
					</p>
					<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
						Published draft date {new Date(submission.created_at).toLocaleString()}
					</p>
				</div>
				<p className="muted mt-3 max-w-[52rem] text-sm leading-relaxed">
					Revise directly from the published draft. When you submit, the new
					version returns to the review queue as a fresh `submitted` draft while
					this published version remains preserved with its feedback.
				</p>

				{notice ? (
					<p className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
						{notice}
					</p>
				) : null}
				{errorNotice ? (
					<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						{errorNotice}
					</p>
				) : null}
			</div>

			{revisionHistory.length > 0 ? (
				<div className="surface p-5 lg:p-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="literary-title text-xl text-parchment-100">
								Version history
							</h2>
							<p className="mt-1 text-sm text-silver-300">
								Open earlier published feedback without losing your current revision source.
							</p>
						</div>
						<p className="text-xs uppercase tracking-[0.11em] text-silver-300">
							{revisionHistory.length} versions
						</p>
					</div>
					<ul className="mt-4 flex flex-wrap gap-2.5">
						{revisionHistory.map((item) => (
							<li
								key={item.id}
								className={`rounded-2xl border px-3 py-2.5 ${
									item.id === submission.id
										? 'border-accent-300/40 bg-accent-300/10'
										: 'border-white/10 bg-ink-900/30'
								}`}>
								<div className="flex flex-wrap items-center gap-2">
									<p className="text-[11px] uppercase tracking-[0.11em] text-silver-300">
										Version {item.version}
									</p>
									<p className="text-xs text-parchment-100">
										{item.status.replaceAll('_', ' ')}
									</p>
									<p className="text-xs text-silver-300">
										{new Date(item.created_at).toLocaleDateString()}
									</p>
								</div>
								<div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
									{item.status === 'feedback_published' ? (
										<Link
											href={`/app/writer/feedback/${item.id}`}
											className="text-accent-200 hover:text-accent-100">
											Open feedback
										</Link>
									) : (
										<p className="text-silver-300">
											Feedback not published
										</p>
									)}
									{item.id === submission.id ? (
										<p className="rounded-full border border-accent-300/50 bg-accent-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-accent-100">
											Current source
										</p>
									) : null}
								</div>
							</li>
						))}
					</ul>
				</div>
			) : null}

			<div className="surface p-5 lg:p-6">
				<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
					<div className="max-w-[42rem]">
						<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
							New revision draft
						</p>
						<p className="mt-2 text-sm leading-relaxed text-silver-200">
							Make the next version here. This draft does not overwrite the
							published source version you are revising from.
						</p>
					</div>
					<p className="rounded-2xl border border-white/10 bg-ink-900/35 px-4 py-3 text-right">
						<span className="block text-[11px] uppercase tracking-[0.1em] text-silver-300">
							Next review state
						</span>
						<span className="mt-1 block text-sm text-parchment-100">
							Submitted for teacher review
						</span>
					</p>
				</div>
				<form action={submitRevisionAction} className="space-y-4">
					<label className="block">
						<span className="mb-2 block text-sm text-silver-200">Title</span>
						<input
							name="title"
							required
							defaultValue={submission.title}
							className="w-full rounded-xl border border-white/15 bg-ink-900 px-4 py-2.5 text-parchment-100 outline-none ring-accent-400 transition focus:ring"
							placeholder="Draft title"
						/>
					</label>

					<label className="block">
						<span className="mb-2 block text-sm text-silver-200">
							Revised body text
						</span>
						<div className="folio-page p-5">
							<ManuscriptTextarea
								name="body"
								required
								defaultValue={submission.body}
								rows={14}
								className="w-full resize-y border-none bg-transparent font-serif text-[18px] leading-8 text-ink-900/90 outline-none"
								placeholder="Revise your draft here"
							/>
						</div>
					</label>

					<button
						type="submit"
						className="rounded-full border border-accent-400/70 bg-accent-400/20 px-5 py-2.5 text-sm text-parchment-100 transition hover:bg-accent-400/30">
						Submit revision
					</button>
				</form>
			</div>
		</section>
	)
}
