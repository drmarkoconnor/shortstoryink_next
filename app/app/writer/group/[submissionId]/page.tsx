import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { createAdminDataClient, createServerDataClient } from '@/lib/data/client'
import { sendReaderResponseNotification } from '@/lib/notifications/email'

type SubmissionRow = {
	id: string
	author_id: string
	workshop_id: string
	title: string
	body: string
	version: number
	created_at: string
}
type ProfileRow = { id: string; display_name: string | null }
type WorkshopRow = { id: string; title: string }
type ResponseRow = { id: string; body: string; created_at: string; updated_at: string }

function encodeError(message: string) {
	return encodeURIComponent(message.slice(0, 180))
}

export default async function SharedGroupPiecePage({
	params,
	searchParams,
}: {
	params: Promise<{ submissionId: string }>
	searchParams?: Promise<{ notice?: string | string[]; error?: string | string[] }>
}) {
	const writer = await requireWriter()
	const { submissionId } = await params
	const query = searchParams ? await searchParams : {}
	const notice = typeof query.notice === 'string' ? query.notice : null
	const errorNotice = typeof query.error === 'string' ? query.error : null
	const server = await createServerDataClient()

	// This read deliberately uses the signed-in data client. RLS is the primary
	// permission gate for shared manuscripts.
	const { data: submission, error } = await server
		.from<SubmissionRow>('submissions')
		.select('id, author_id, workshop_id, title, body, version, created_at')
		.eq('id', submissionId)
		.maybeSingle()

	if (error || !submission) redirect('/app/writer?error=That+shared+piece+is+not+available.')
	if (submission.author_id === writer.user.id) redirect(`/app/writer/sharing/${submission.id}`)

	const admin = createAdminDataClient()
	const [{ data: author }, { data: workshop }, responseResult] = await Promise.all([
		admin.from<ProfileRow>('profiles').select('id, display_name').eq('id', submission.author_id).maybeSingle(),
		admin.from<WorkshopRow>('workshops').select('id, title').eq('id', submission.workshop_id).maybeSingle(),
		server.from<ResponseRow>('reader_responses').select('id, body, created_at, updated_at').eq('submission_id', submission.id).eq('author_id', writer.user.id).maybeSingle(),
	])
	const response = responseResult.data

	async function saveResponseAction(formData: FormData) {
		'use server'
		const actor = await requireWriter()
		const body = String(formData.get('body') ?? '').trim()
		const targetId = String(formData.get('submissionId') ?? '').trim()
		if (!body) redirect(`/app/writer/group/${targetId}?error=Write+a+response+before+saving.`)
		const data = createAdminDataClient()
		const result = await data.rpc('save_reader_response', {
			p_actor_id: actor.user.id,
			p_submission_id: targetId,
			p_body: body,
		})
		if (result.error) redirect(`/app/writer/group/${targetId}?error=${encodeError(result.error.message)}`)

		if (result.data?.created === true) {
			try {
				const { data: piece } = await data
					.from<SubmissionRow>('submissions')
					.select('id, author_id, title')
					.eq('id', targetId)
					.maybeSingle()
				if (piece) {
					const [{ data: ownerIdentity }, { data: responderProfile }] = await Promise.all([
						data.auth.admin.getUserById(piece.author_id),
						data.from<ProfileRow>('profiles').select('id, display_name').eq('id', actor.user.id).maybeSingle(),
					])
					const email = ownerIdentity.user?.email
					if (email) {
						await sendReaderResponseNotification({
							email,
							responderName: responderProfile?.display_name?.trim() || 'A writer',
							title: piece.title,
							submissionId: targetId,
						})
					}
				}
			} catch (notificationError) {
				console.error('[reader-response] notification failed', notificationError)
			}
		}

		revalidatePath(`/app/writer/group/${targetId}`)
		revalidatePath(`/app/writer/sharing/${targetId}`)
		redirect(`/app/writer/group/${targetId}?notice=Your+reader+response+has+been+saved.`)
	}

	async function deleteResponseAction(formData: FormData) {
		'use server'
		const actor = await requireWriter()
		const targetId = String(formData.get('submissionId') ?? '').trim()
		const data = createAdminDataClient()
		const result = await data.rpc('delete_reader_response', {
			p_actor_id: actor.user.id,
			p_submission_id: targetId,
		})
		if (result.error) redirect(`/app/writer/group/${targetId}?error=${encodeError(result.error.message)}`)
		revalidatePath(`/app/writer/group/${targetId}`)
		revalidatePath(`/app/writer/sharing/${targetId}`)
		redirect(`/app/writer/group/${targetId}?notice=Your+response+has+been+removed.`)
	}

	return (
		<section className="mx-auto max-w-[900px] space-y-6">
			<Link href="/app/writer" className="studio-link">← Back to Writing</Link>
			{notice ? <p className="rounded border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}
			{errorNotice ? <p className="rounded border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-800">{errorNotice}</p> : null}

			<article className="surface p-6 sm:p-9 lg:p-12">
				<p className="studio-eyebrow">From your group</p>
				<h1 className="studio-heading mt-3">{submission.title}</h1>
				<p className="mt-3 text-sm text-studio-muted">
					{author?.display_name?.trim() || 'Writer'} · {workshop?.title || 'Writing group'} · v{submission.version}
				</p>
				<div className="mt-9 whitespace-pre-wrap font-serif text-[1.08rem] leading-9 text-studio-ink">
					{submission.body}
				</div>
			</article>

			<section className="surface p-6 sm:p-8">
				<p className="studio-eyebrow">Respond as a reader</p>
				<h2 className="literary-title mt-3 text-3xl">
					{response ? 'Your response' : 'Leave a reader response'}
				</h2>
				<p className="mt-3 max-w-2xl text-sm leading-6 text-studio-muted">
					What stayed with you? Where were you most engaged? Was there anywhere you became uncertain or wanted more?
					Your response is visible to the writer and editor, not to the other readers.
				</p>
				<form action={saveResponseAction} className="mt-5">
					<input type="hidden" name="submissionId" value={submission.id} />
					<textarea
						name="body"
						defaultValue={response?.body ?? ''}
						rows={8}
						required
						className="w-full rounded border border-studio-line bg-studio-paper p-4 font-serif text-lg leading-8 text-studio-ink"
						placeholder="Write your response here."
					/>
					<button type="submit" className="studio-primary mt-4">
						{response ? 'Update response' : 'Send response'}
					</button>
				</form>
				{response ? (
					<form action={deleteResponseAction} className="mt-5 border-t border-studio-line pt-4">
						<input type="hidden" name="submissionId" value={submission.id} />
						<button type="submit" className="text-sm text-rose-800 underline underline-offset-4">
							Remove my response
						</button>
					</form>
				) : null}
			</section>
		</section>
	)
}
