import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { SharingPicker } from '@/components/writer/sharing-picker'
import { requireWriter } from '@/lib/auth/get-current-profile'
import {
	getSharingContext,
	setSubmissionSharing,
	stopSubmissionSharing,
} from '@/lib/workshop/sharing'

function textParam(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

export default async function WriterSharingPage({
	params,
	searchParams,
}: {
	params: Promise<{ submissionId: string }>
	searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
	const profile = await requireWriter()
	const { submissionId } = await params
	const query = searchParams ? await searchParams : {}
	const context = await getSharingContext(submissionId)

	if (!context || context.submission.authorId !== profile.user.id) {
		redirect('/app/writer?error=That+piece+is+not+available+for+sharing.')
	}

	async function saveSharing(formData: FormData) {
		'use server'
		const current = await requireWriter()
		const recipientIds = formData
			.getAll('recipientId')
			.map(String)
			.map((id) => id.trim())
			.filter(Boolean)
		if (!recipientIds.length) {
			redirect(
				'/app/writer/sharing/' +
					submissionId +
					'?error=Choose+at+least+one+writer,+or+stop+sharing.',
			)
		}
		try {
			await setSubmissionSharing(current.user.id, submissionId, recipientIds)
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unable to update sharing.'
			redirect(
				'/app/writer/sharing/' +
					submissionId +
					'?error=' +
					encodeURIComponent(message),
			)
		}
		revalidatePath('/app/writer')
		revalidatePath('/app/writer/sharing/' + submissionId)
		redirect(
			'/app/writer/sharing/' +
				submissionId +
				'?notice=Sharing+updated.',
		)
	}

	async function stopSharing() {
		'use server'
		const current = await requireWriter()
		try {
			await stopSubmissionSharing(current.user.id, submissionId)
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unable to stop sharing.'
			redirect(
				'/app/writer/sharing/' +
					submissionId +
					'?error=' +
					encodeURIComponent(message),
			)
		}
		revalidatePath('/app/writer')
		revalidatePath('/app/writer/sharing/' + submissionId)
		redirect(
			'/app/writer/sharing/' +
				submissionId +
				'?notice=This+version+is+private+again.',
		)
	}

	const notice = textParam(query.notice)
	const error = textParam(query.error)

	return (
		<section className="mx-auto max-w-[820px] space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="studio-eyebrow">Your writing</p>
					<h1 className="studio-heading mt-3">Choose your readers</h1>
				</div>
				<Link href="/app/writer" className="studio-secondary">
					Back to your writing
				</Link>
			</div>

			{notice ? (
				<p className="rounded border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-800">
					{notice}
				</p>
			) : null}
			{error ? (
				<p className="rounded border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-800">
					{error}
				</p>
			) : null}

			{!context.canShare ? (
				<div className="surface p-6">
					<h2 className="literary-title text-2xl text-studio-ink">
						No group readers are available for this piece
					</h2>
					<p className="mt-3 text-sm leading-6 text-studio-muted">
						Sharing is available only inside a genuine writing group with at least
						one other writer. Authorised Basic User is an access category, not a
						sharing group.
					</p>
				</div>
			) : (
				<div className="surface p-6 sm:p-8">
					<SharingPicker
						title={context.submission.title}
						groupTitle={context.workshop.title}
						readers={context.eligibleReaders}
						selectedRecipientIds={context.selectedRecipientIds}
						saveAction={saveSharing}
						stopAction={stopSharing}
					/>
				</div>
			)}
		</section>
	)
}
