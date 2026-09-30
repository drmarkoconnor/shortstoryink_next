import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createAdminDataClient } from '@/lib/data/client'

type SubmissionRow = {
	id: string
	author_id: string
	workshop_id: string
	title: string
	body: string
	status: string
	source: string
	parent_submission_id: string | null
}
type ProfileRow = { id: string; display_name: string | null; role: string }
type WorkshopRow = { id: string; title: string }
type MembershipRow = { workshop_id: string; profile_id: string }

function encodeError(message: string) {
	return encodeURIComponent(message.slice(0, 180))
}

export default async function CorrectImportedPiecePage({
	params,
	searchParams,
}: {
	params: Promise<{ submissionId: string }>
	searchParams?: Promise<{ error?: string | string[] }>
}) {
	await requireTeacher()
	const { submissionId } = await params
	const query = searchParams ? await searchParams : {}
	const errorNotice = typeof query.error === 'string' ? query.error : null
	const admin = createAdminDataClient()

	const { data: submission } = await admin
		.from<SubmissionRow>('submissions')
		.select('id, author_id, workshop_id, title, body, status, source, parent_submission_id')
		.eq('id', submissionId)
		.maybeSingle()

	if (!submission || submission.source !== 'editor_import') {
		redirect('/app/teacher/review-desk?error=Imported+piece+not+found.')
	}

	const [profilesResult, workshopsResult, membershipsResult, feedbackResult, sharesResult] = await Promise.all([
		admin.from<ProfileRow>('profiles').select('id, display_name, role').order('display_name'),
		admin.from<WorkshopRow>('workshops').select('id, title').order('title'),
		admin.from<MembershipRow>('workshop_members').select('workshop_id, profile_id'),
		admin.from('feedback_items').select('id', { count: 'exact', head: true }).eq('submission_id', submissionId),
		admin.from('submission_share_recipients').select('submission_id', { count: 'exact', head: true }).eq('submission_id', submissionId),
	])

	const locked =
		submission.status !== 'submitted' ||
		(feedbackResult.count ?? 0) > 0 ||
		(sharesResult.count ?? 0) > 0

	const writers = (profilesResult.data ?? []).filter((profile) => profile.role === 'writer')
	const workshops = workshopsResult.data ?? []
	const memberships = membershipsResult.data ?? []
	const workshopById = Object.fromEntries(workshops.map((workshop) => [workshop.id, workshop]))

	async function correctAction(formData: FormData) {
		'use server'
		const editor = await requireTeacher()
		const writerId = String(formData.get('writerId') ?? '').trim()
		const workshopId = String(formData.get('workshopId') ?? '').trim()
		const title = String(formData.get('title') ?? '').trim()
		const body = String(formData.get('body') ?? '')
		const data = createAdminDataClient()
		const result = await data.rpc('correct_editor_assigned_submission', {
			p_editor_id: editor.user.id,
			p_submission_id: submissionId,
			p_author_id: writerId,
			p_workshop_id: workshopId,
			p_title: title,
			p_body: body,
		})
		if (result.error) {
			redirect(\`/app/teacher/review-desk/add/\${submissionId}?error=\${encodeError(result.error.message)}\`)
		}
		revalidatePath(\`/app/workshop/\${submissionId}\`)
		revalidatePath('/app/teacher/review-desk')
		revalidatePath('/app/writer')
		redirect(\`/app/workshop/\${submissionId}?notice=Imported+piece+corrected.\`)
	}

	return (
		<section className="mx-auto max-w-[950px] space-y-6">
			<Link href={\`/app/workshop/\${submissionId}\`} className="studio-link">← Back to manuscript</Link>
			<header>
				<p className="studio-eyebrow">Imported manuscript</p>
				<h1 className="studio-heading mt-3">Correct the writer&apos;s piece</h1>
				<p className="mt-4 max-w-2xl leading-7 text-studio-muted">
					This correction window exists only before reading, sharing or editorial commenting begins.
				</p>
			</header>
			{errorNotice ? <p className="rounded border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-800">{errorNotice}</p> : null}
			{locked ? (
				<div className="surface p-6">
					<p className="text-studio-muted">
						This manuscript is now locked because reading, sharing or feedback has begun. Create a new version rather than altering the manuscript of record.
					</p>
				</div>
			) : (
				<form action={correctAction} className="surface space-y-5 p-6 lg:p-8">
					<label className="block">
						<span className="mb-1.5 block text-sm text-studio-muted">Writer</span>
						<select name="writerId" defaultValue={submission.author_id} disabled={Boolean(submission.parent_submission_id)} className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink">
							{writers.map((writer) => <option key={writer.id} value={writer.id}>{writer.display_name?.trim() || 'Writer'}</option>)}
						</select>
					</label>
					<label className="block">
						<span className="mb-1.5 block text-sm text-studio-muted">Writing group</span>
						<select name="workshopId" defaultValue={submission.workshop_id} disabled={Boolean(submission.parent_submission_id)} className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink">
							{memberships
								.filter((membership) => membership.profile_id === submission.author_id)
								.map((membership) => workshopById[membership.workshop_id])
								.filter((workshop): workshop is WorkshopRow => Boolean(workshop))
								.map((workshop) => <option key={workshop.id} value={workshop.id}>{workshop.title}</option>)}
						</select>
					</label>
					<label className="block">
						<span className="mb-1.5 block text-sm text-studio-muted">Title</span>
						<input name="title" defaultValue={submission.title} required className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink" />
					</label>
					<label className="block">
						<span className="mb-1.5 block text-sm text-studio-muted">Manuscript</span>
						<textarea name="body" defaultValue={submission.body} required rows={22} className="writing-manuscript min-h-[30rem] w-full rounded border border-studio-line bg-studio-paper p-5" />
					</label>
					<button type="submit" className="studio-primary">Save correction</button>
				</form>
			)}
		</section>
	)
}
