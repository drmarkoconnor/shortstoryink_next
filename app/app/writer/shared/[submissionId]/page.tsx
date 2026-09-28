import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { createAdminDataClient, createServerDataClient } from '@/lib/data/client'
import { removeReaderResponse, saveReaderResponse } from '@/lib/workshop/sharing'

function textParam(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

export default async function SharedManuscriptPage({
	params,
	searchParams,
}: {
	params: Promise<{ submissionId: string }>
	searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
	const profile = await requireWriter()
	const { submissionId } = await params
	const query = searchParams ? await searchParams : {}
	const scoped = await createServerDataClient()
	const { data: submission, error } = await scoped
		.from('submissions')
		.select('id, title, body, author_id, workshop_id, version, created_at')
		.eq('id', submissionId)
		.maybeSingle()

	if (error || !submission) {
		redirect('/app/writer?error=That+shared+piece+is+no+longer+available.')
	}
	if (String(submission.author_id) === profile.user.id) {
		redirect('/app/writer')
	}

	const admin = createAdminDataClient()
	const [{ data: author }, { data: workshop }, responseResult] = await Promise.all([
		admin
			.from('profiles')
			.select('display_name')
			.eq('id', String(submission.author_id))
			.maybeSingle(),
		admin
			.from('workshops')
			.select('title')
			.eq('id', String(submission.workshop_id))
			.maybeSingle(),
		scoped
			.from('reader_responses')
			.select('id, body, created_at, updated_at')
			.eq('submission_id', submissionId)
			.eq('author_id', profile.user.id)
			.maybeSingle(),
	])
	const response = responseResult.data
	const notice = textParam(query.notice)
	const errorNotice = textParam(query.error)

	async function saveResponse(formData: FormData) {
		'use server'
		const current = await requireWriter()
		const body = String(formData.get('body') ?? '').trim()
		if (!body) {
			redirect(
				'/app/writer/shared/' +
					submissionId +
					'?error=Write+a+response+before+saving.',
			)
		}
		try {
			await saveReaderResponse(current.user.id, submissionId, body)
		} catch (saveError) {
			const message =
				saveError instanceof Error ? saveError.message : 'Unable to save your response.'
			redirect(
				'/app/writer/shared/' +
					submissionId +
					'?error=' +
					encodeURIComponent(message),
			)
		}
		revalidatePath('/app/writer')
		revalidatePath('/app/writer/shared/' + submissionId)
		revalidatePath('/app/writer/responses/' + submissionId)
		redirect(
			'/app/writer/shared/' +
				submissionId +
				'?notice=Your+reader+response+has+been+saved.',
		)
	}

	async function removeResponse() {
		'use server'
		const current = await requireWriter()
		try {
			await removeReaderResponse(current.user.id, submissionId)
		} catch (removeError) {
			const message =
				removeError instanceof Error
					? removeError.message
					: 'Unable to remove your response.'
			redirect(
				'/app/writer/shared/' +
					submissionId +
					'?error=' +
					encodeURIComponent(message),
			)
		}
		revalidatePath('/app/writer')
		revalidatePath('/app/writer/shared/' + submissionId)
		revalidatePath('/app/writer/responses/' + submissionId)
		redirect(
			'/app/writer/shared/' +
				submissionId +
				'?notice=Your+reader+response+has+been+removed.',
		)
	}

	return (
		<section className="mx-auto max-w-[900px] space-y-7">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<header>
					<p className="studio-eyebrow">From your group</p>
					<h1 className="studio-heading mt-3">{String(submission.title)}</h1>
					<p className="mt-3 text-sm text-studio-muted">
						{String(author?.display_name ?? 'Writer')} · {String(workshop?.title ?? 'Writing group')} · v{Number(submission.version ?? 1)}
					</p>
				</header>
				<Link href="/app/writer" className="studio-secondary">Back to your writing</Link>
			</div>

			{notice ? <p className="rounded border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}
			{errorNotice ? <p className="rounded border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-800">{errorNotice}</p> : null}

			<article className="writing-surface p-6 sm:p-9">
				<div className="whitespace-pre-wrap font-serif text-[1.06rem] leading-8 text-studio-ink">
					{String(submission.body)}
				</div>
			</article>

			<section className="surface p-6 sm:p-8">
				<p className="studio-eyebrow">Respond as a reader</p>
				<h2 className="literary-title mt-3 text-2xl text-studio-ink">
					What stayed with you?
				</h2>
				<p className="mt-3 max-w-2xl text-sm leading-6 text-studio-muted">
					Where were you most engaged? Was there anywhere you became uncertain or wanted
					more? This is a response to the piece as a whole, not line-by-line editing.
				</p>
				<p className="mt-2 max-w-2xl text-xs leading-5 text-studio-muted">
					Your response becomes part of the writer&apos;s record for this version. While the piece remains shared with you, you can return here to edit or remove it.
				</p>
				<form action={saveResponse} className="mt-5 space-y-4">
					<textarea
						name="body"
						rows={7}
						required
						defaultValue={response ? String(response.body) : ''}
						className="w-full rounded border border-studio-line bg-studio-paper px-4 py-3 text-sm leading-7 text-studio-ink"
						placeholder="Leave your response here…"
					/>
					<button type="submit" className="studio-primary">
						{response ? 'Update your response' : 'Save your response'}
					</button>
				</form>
				{response ? (
					<form action={removeResponse} className="mt-4 border-t border-studio-line pt-4">
						<button type="submit" className="text-sm text-rose-800 underline underline-offset-2">
							Remove your response
						</button>
					</form>
				) : null}
			</section>
		</section>
	)
}
