import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createAdminDataClient } from '@/lib/data/client'

type SubmissionRow = { id: string; title: string; author_id: string; version: number }
type ProfileRow = { id: string; display_name: string | null }
type ResponseRow = { id: string; author_id: string; body: string; created_at: string; updated_at: string }

export default async function GroupResponsesPage({
	params,
	searchParams,
}: {
	params: Promise<{ submissionId: string }>
	searchParams?: Promise<{ notice?: string | string[]; error?: string | string[] }>
}) {
	await requireTeacher()
	const { submissionId } = await params
	const query = searchParams ? await searchParams : {}
	const notice = typeof query.notice === 'string' ? query.notice : null
	const errorNotice = typeof query.error === 'string' ? query.error : null
	const admin = createAdminDataClient()

	const { data: submission } = await admin
		.from<SubmissionRow>('submissions')
		.select('id, title, author_id, version')
		.eq('id', submissionId)
		.maybeSingle()

	if (!submission) redirect('/app/teacher/review-desk?error=Submission+not+found.')

	const { data: responses } = await admin
		.from<ResponseRow>('reader_responses')
		.select('id, author_id, body, created_at, updated_at')
		.eq('submission_id', submissionId)
		.order('created_at', { ascending: true })

	const responderIds = [...new Set((responses ?? []).map((response) => response.author_id))]
	const { data: profiles } = responderIds.length > 0
		? await admin.from<ProfileRow>('profiles').select('id, display_name').in('id', responderIds)
		: { data: [] as ProfileRow[], error: null, count: null }
	const names = Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile.display_name?.trim() || 'Writer']))

	async function removeResponseAction(formData: FormData) {
		'use server'
		await requireTeacher()
		const responseId = String(formData.get('responseId') ?? '').trim()
		if (!responseId) redirect(`/app/teacher/review-desk/responses/${submissionId}?error=Choose+a+response+to+remove.`)
		const data = createAdminDataClient()
		const { error } = await data
			.from('reader_responses')
			.delete()
			.eq('id', responseId)
			.eq('submission_id', submissionId)
		if (error) redirect(`/app/teacher/review-desk/responses/${submissionId}?error=Unable+to+remove+response.`)
		revalidatePath(`/app/teacher/review-desk/responses/${submissionId}`)
		revalidatePath(`/app/workshop/${submissionId}`)
		revalidatePath(`/app/writer/sharing/${submissionId}`)
		redirect(`/app/teacher/review-desk/responses/${submissionId}?notice=Reader+response+removed.`)
	}

	return (
		<section className="mx-auto max-w-[900px] space-y-6">
			<Link href={`/app/workshop/${submissionId}`} className="studio-link">← Back to manuscript</Link>
			<header>
				<p className="studio-eyebrow">Group responses</p>
				<h1 className="studio-heading mt-3">{submission.title}</h1>
				<p className="mt-3 text-sm text-studio-muted">Version {submission.version}. These whole-piece responses remain separate from your inline editorial feedback.</p>
			</header>
			{notice ? <p className="rounded border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}
			{errorNotice ? <p className="rounded border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-800">{errorNotice}</p> : null}
			{(responses ?? []).length === 0 ? (
				<div className="surface p-6 text-sm text-studio-muted">No group responses have been left on this version.</div>
			) : (
				<div className="space-y-4">
					{(responses ?? []).map((response) => (
						<article key={response.id} className="surface p-6">
							<p className="text-sm font-medium text-studio-ink">{names[response.author_id] ?? 'Writer'}</p>
							<p className="mt-4 whitespace-pre-wrap font-serif text-lg leading-8 text-studio-ink">{response.body}</p>
							<form action={removeResponseAction} className="mt-5 border-t border-studio-line pt-4">
								<input type="hidden" name="responseId" value={response.id} />
								<button type="submit" className="text-sm text-rose-800 underline underline-offset-4">Remove response</button>
							</form>
						</article>
					))}
				</div>
			)}
		</section>
	)
}
