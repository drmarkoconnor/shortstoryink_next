import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createAdminDataClient } from '@/lib/data/client'

export default async function EditorialReaderResponsesPage({
	params,
}: {
	params: Promise<{ submissionId: string }>
}) {
	const acting = await requireTeacher()
	const { submissionId } = await params
	const admin = createAdminDataClient()

	const { data: submission } = await admin
		.from('submissions')
		.select('id, title, author_id, version')
		.eq('id', submissionId)
		.maybeSingle()
	if (!submission) {
		redirect('/app/teacher/review-desk?error=Submission+not+found.')
	}

	const [{ data: author }, { data: responses }] = await Promise.all([
		admin
			.from('profiles')
			.select('display_name')
			.eq('id', String(submission.author_id))
			.maybeSingle(),
		admin
			.from('reader_responses')
			.select('id, author_id, body, created_at, updated_at')
			.eq('submission_id', submissionId)
			.order('created_at', { ascending: true }),
	])

	const responderIds = [...new Set((responses ?? []).map((row) => String(row.author_id)))]
	const { data: responderProfiles } = responderIds.length
		? await admin.from('profiles').select('id, display_name').in('id', responderIds)
		: { data: [] }
	const names = Object.fromEntries(
		(responderProfiles ?? []).map((row) => [
			String(row.id),
			String(row.display_name ?? 'Writer'),
		]),
	)

	async function removeResponse(formData: FormData) {
		'use server'
		const current = await requireTeacher()
		const responseId = String(formData.get('responseId') ?? '').trim()
		if (!responseId) return
		const data = createAdminDataClient()
		const { error } = await data.rpc('moderate_reader_response', {
			p_teacher_id: current.user.id,
			p_response_id: responseId,
		})
		if (error) {
			redirect(
				'/app/teacher/review-desk/responses/' +
					submissionId +
					'?error=' +
					encodeURIComponent(error.message),
			)
		}
		revalidatePath('/app/teacher/review-desk/responses/' + submissionId)
		revalidatePath('/app/writer/responses/' + submissionId)
		redirect(
			'/app/teacher/review-desk/responses/' +
				submissionId +
				'?notice=Reader+response+removed.',
		)
	}

	return (
		<section className="mx-auto max-w-[860px] space-y-7">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<header>
					<p className="studio-eyebrow">Group reader responses</p>
					<h1 className="studio-heading mt-3">{String(submission.title)}</h1>
					<p className="mt-3 text-sm text-studio-muted">
						{String(author?.display_name ?? 'Writer')} · v{Number(submission.version ?? 1)}
					</p>
				</header>
				<Link href={'/app/workshop/' + submissionId} className="studio-secondary">
					Back to editorial reading
				</Link>
			</div>

			<p className="text-sm leading-6 text-studio-muted">
				These whole-piece responses are private between the manuscript writer, each
				responder and the editor. They are kept separate from your inline editorial
				comments.
			</p>

			{(responses ?? []).length === 0 ? (
				<div className="surface p-6 text-sm text-studio-muted">
					No group responses have been left on this version.
				</div>
			) : (
				<div className="space-y-4">
					{(responses ?? []).map((response) => (
						<article key={String(response.id)} className="surface p-6">
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<h2 className="literary-title text-2xl text-studio-ink">
										{names[String(response.author_id)] ?? 'Writer'}
									</h2>
									<p className="mt-1 text-xs text-studio-muted">
										{new Date(String(response.updated_at ?? response.created_at)).toLocaleDateString('en-GB')}
									</p>
								</div>
								<form action={removeResponse}>
									<input type="hidden" name="responseId" value={String(response.id)} />
									<button
										type="submit"
										className="text-xs text-rose-800 underline underline-offset-2">
										Remove response
									</button>
								</form>
							</div>
							<p className="mt-4 whitespace-pre-wrap font-serif text-[1.02rem] leading-8 text-studio-ink">
								{String(response.body)}
							</p>
						</article>
					))}
				</div>
			)}
		</section>
	)
}
