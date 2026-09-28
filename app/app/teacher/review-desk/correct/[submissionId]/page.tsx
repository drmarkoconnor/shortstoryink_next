import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createAdminDataClient } from '@/lib/data/client'

function message(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

export default async function CorrectEditorImportPage({
	params,
	searchParams,
}: {
	params: Promise<{ submissionId: string }>
	searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
	const acting = await requireTeacher()
	const { submissionId } = await params
	const query = searchParams ? await searchParams : {}
	const admin = createAdminDataClient()
	const { data: submission } = await admin
		.from('submissions')
		.select('id, title, body, author_id, workshop_id, parent_submission_id, source, status, sharing_started_at')
		.eq('id', submissionId)
		.maybeSingle()

	if (!submission || String(submission.source) !== 'editor_import') {
		redirect('/app/teacher/review-desk?error=That+piece+is+not+an+editor+import.')
	}

	const [{ data: writer }, { data: workshop }, feedbackResult] = await Promise.all([
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
		admin
			.from('feedback_items')
			.select('id', { count: 'exact', head: true })
			.eq('submission_id', submissionId),
	])

	const locked =
		String(submission.status) !== 'submitted' ||
		Boolean(submission.sharing_started_at) ||
		(feedbackResult.count ?? 0) > 0

	if (locked) {
		redirect(
			'/app/workshop/' +
				submissionId +
				'?error=This+manuscript+is+already+in+use+and+can+no+longer+be+altered.',
		)
	}

	async function saveCorrection(formData: FormData) {
		'use server'
		const current = await requireTeacher()
		const title = String(formData.get('title') ?? '').trim()
		const body = String(formData.get('body') ?? '')
		if (!title || !body.trim()) {
			redirect(
				'/app/teacher/review-desk/correct/' +
					submissionId +
					'?error=Title+and+manuscript+are+required.',
			)
		}
		const data = createAdminDataClient()
		const { error } = await data.rpc('correct_editor_assigned_submission', {
			p_teacher_id: current.user.id,
			p_submission_id: submissionId,
			p_author_id: String(submission.author_id),
			p_workshop_id: String(submission.workshop_id),
			p_title: title,
			p_body: body,
		})
		if (error) {
			redirect(
				'/app/teacher/review-desk/correct/' +
					submissionId +
					'?error=' +
					encodeURIComponent(error.message),
			)
		}
		revalidatePath('/app/teacher/review-desk')
		revalidatePath('/app/workshop/' + submissionId)
		revalidatePath('/app/writer')
		redirect('/app/workshop/' + submissionId + '?notice=Imported+piece+corrected.')
	}

	const error = message(query.error)

	return (
		<section className="mx-auto max-w-[900px] space-y-7">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<header>
					<p className="studio-eyebrow">Editorial intake</p>
					<h1 className="studio-heading mt-3">Correct imported piece</h1>
					<p className="mt-3 text-sm text-studio-muted">
						{String(writer?.display_name ?? 'Writer')} · {String(workshop?.title ?? 'Writing group')}
					</p>
				</header>
				<Link href={'/app/workshop/' + submissionId} className="studio-secondary">
					Back to manuscript
				</Link>
			</div>

			<p className="rounded border border-studio-line bg-studio-tint px-4 py-3 text-sm leading-6 text-studio-muted">
				Use this only to correct the pasted manuscript before review or sharing begins.
				Once the first editorial comment or group share exists, this version is permanently
				locked so every response continues to refer to the text that was actually read.
			</p>
			{error ? <p className="rounded border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-800">{error}</p> : null}

			<form action={saveCorrection} className="surface space-y-5 p-6">
				<label className="block">
					<span className="mb-1.5 block text-sm text-studio-muted">Title</span>
					<input
						name="title"
						required
						defaultValue={String(submission.title)}
						className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink"
					/>
				</label>
				<label className="block">
					<span className="mb-1.5 block text-sm text-studio-muted">Manuscript</span>
					<textarea
						name="body"
						required
						rows={22}
						defaultValue={String(submission.body)}
						className="writing-manuscript writing-surface w-full p-5 sm:p-7"
					/>
				</label>
				<div className="flex justify-end">
					<button type="submit" className="studio-primary">Save correction</button>
				</div>
			</form>
		</section>
	)
}
