import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { SubmissionSharingManager } from '@/components/writer/submission-sharing-manager'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { createAdminDataClient } from '@/lib/data/client'
import { sendPieceSharedNotification } from '@/lib/notifications/email'
import { isAbuWorkshopSlug } from '@/lib/workshop/access-groups'

type SubmissionRow = {
	id: string
	author_id: string
	workshop_id: string
	title: string
	version: number
	source: string
}
type WorkshopRow = { id: string; title: string; slug: string | null }
type MembershipRow = { profile_id: string; workshop_id: string }
type ProfileRow = { id: string; display_name: string | null; role: string }
type ResponseRow = { id: string; author_id: string; body: string; created_at: string; updated_at: string }

function encodeError(message: string) {
	return encodeURIComponent(message.slice(0, 180))
}

export default async function WriterSharingPage({
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
	const admin = createAdminDataClient()

	const { data: submission, error } = await admin
		.from<SubmissionRow>('submissions')
		.select('id, author_id, workshop_id, title, version, source')
		.eq('id', submissionId)
		.eq('author_id', writer.user.id)
		.maybeSingle()

	if (error || !submission) redirect('/app/writer?error=That+piece+is+not+available.')

	const { data: workshop } = await admin
		.from<WorkshopRow>('workshops')
		.select('id, title, slug')
		.eq('id', submission.workshop_id)
		.maybeSingle()

	if (!workshop) redirect('/app/writer?error=Writing+group+not+found.')

	const isAbu = isAbuWorkshopSlug(workshop.slug) || workshop.title.trim().toLowerCase() === 'authorised basic user'
	const { data: memberships } = await admin
		.from<MembershipRow>('workshop_members')
		.select('profile_id, workshop_id')
		.eq('workshop_id', workshop.id)

	const memberIds = (memberships ?? []).map((row) => row.profile_id).filter((id) => id !== writer.user.id)
	let profiles: ProfileRow[] = []
	if (memberIds.length > 0) {
		const profileResult = await admin
			.from<ProfileRow>('profiles')
			.select('id, display_name, role')
			.in('id', memberIds)
		profiles = profileResult.data ?? []
	}

	const eligibleRecipients = isAbu ? [] : profiles
		.filter((profile) => profile.role === 'writer')
		.map((profile) => ({ id: profile.id, name: profile.display_name?.trim() || 'Writer' }))
		.sort((a, b) => a.name.localeCompare(b.name))

	const { data: existingShares } = await admin
		.from('submission_share_recipients')
		.select('recipient_id')
		.eq('submission_id', submissionId)
	const existingRecipientIds = (existingShares ?? []).map((row) => String(row.recipient_id))

	const { data: responses } = await admin
		.from<ResponseRow>('reader_responses')
		.select('id, author_id, body, created_at, updated_at')
		.eq('submission_id', submissionId)
		.order('created_at', { ascending: true })
	const responderIds = [...new Set((responses ?? []).map((response) => response.author_id))]
	let responderProfiles: ProfileRow[] = []
	if (responderIds.length > 0) {
		const responderProfileResult = await admin
			.from<ProfileRow>('profiles')
			.select('id, display_name, role')
			.in('id', responderIds)
		responderProfiles = responderProfileResult.data ?? []
	}
	const responderNames = Object.fromEntries(responderProfiles.map((profile) => [profile.id, profile.display_name?.trim() || 'Writer']))

	async function saveSharingAction(formData: FormData) {
		'use server'
		const actor = await requireWriter()
		const targetId = String(formData.get('submissionId') ?? '').trim()
		const recipientIds = [...new Set(formData.getAll('recipientIds').map(String).filter(Boolean))]
		if (!targetId || recipientIds.length === 0) {
			redirect(`/app/writer/sharing/${submissionId}?error=Choose+at+least+one+writer.`)
		}
		const data = createAdminDataClient()
		const owned = await data.from<SubmissionRow>('submissions').select('id, title').eq('id', targetId).eq('author_id', actor.user.id).maybeSingle()
		if (!owned.data) redirect('/app/writer?error=That+piece+is+not+available.')

		const result = await data.rpc('set_submission_share_recipients', {
			p_actor_id: actor.user.id,
			p_submission_id: targetId,
			p_recipient_ids: recipientIds,
		})
		if (result.error) {
			redirect(`/app/writer/sharing/${targetId}?error=${encodeError(result.error.message)}`)
		}

		const addedIds = Array.isArray(result.data?.addedRecipientIds)
			? result.data.addedRecipientIds.map(String)
			: []
		const writerName = actor.displayName || actor.user.email?.split('@')[0] || 'A writer'
		await Promise.all(addedIds.map(async (recipientId) => {
			try {
				const userResult = await data.auth.admin.getUserById(recipientId)
				const email = userResult.data.user?.email
				if (email) await sendPieceSharedNotification({
					email,
					writerName,
					title: String(owned.data?.title ?? 'Shared writing'),
					submissionId: targetId,
				})
			} catch (notificationError) {
				console.error('[sharing] notification failed', { recipientId, notificationError })
			}
		}))

		revalidatePath('/app/writer')
		revalidatePath(`/app/writer/sharing/${targetId}`)
		redirect(`/app/writer/sharing/${targetId}?notice=Sharing+updated.`)
	}

	async function stopSharingAction(formData: FormData) {
		'use server'
		const actor = await requireWriter()
		const targetId = String(formData.get('submissionId') ?? '').trim()
		const data = createAdminDataClient()
		const owned = await data.from('submissions').select('id').eq('id', targetId).eq('author_id', actor.user.id).maybeSingle()
		if (!owned.data) redirect('/app/writer?error=That+piece+is+not+available.')
		const result = await data.rpc('stop_submission_sharing', {
			p_actor_id: actor.user.id,
			p_submission_id: targetId,
		})
		if (result.error) redirect(`/app/writer/sharing/${targetId}?error=${encodeError(result.error.message)}`)
		revalidatePath('/app/writer')
		revalidatePath(`/app/writer/sharing/${targetId}`)
		redirect(`/app/writer/sharing/${targetId}?notice=This+version+is+private+again.`)
	}

	return (
		<section className="mx-auto max-w-[1000px] space-y-6">
			<Link href="/app/writer" className="studio-link">← Back to your writing</Link>
			{notice ? <p className="rounded border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}
			{errorNotice ? <p className="rounded border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-800">{errorNotice}</p> : null}
			<SubmissionSharingManager
				submissionId={submission.id}
				title={submission.title}
				groupTitle={workshop.title}
				eligibleRecipients={eligibleRecipients}
				existingRecipientIds={existingRecipientIds}
				saveAction={saveSharingAction}
				stopAction={stopSharingAction}
			/>
			<section className="surface p-6 lg:p-8">
				<p className="studio-eyebrow">Responses from your group</p>
				<h2 className="literary-title mt-3 text-3xl">
					{(responses ?? []).length === 0 ? 'No reader responses yet' : `${(responses ?? []).length} reader response${(responses ?? []).length === 1 ? '' : 's'}`}
				</h2>
				{(responses ?? []).length > 0 ? (
					<div className="mt-6 space-y-5">
						{(responses ?? []).map((response) => (
							<article key={response.id} className="border-t border-studio-line pt-5 first:border-t-0 first:pt-0">
								<p className="text-sm font-medium text-studio-ink">{responderNames[response.author_id] ?? 'Writer'}</p>
								<p className="mt-3 whitespace-pre-wrap font-serif text-lg leading-8 text-studio-ink">{response.body}</p>
							</article>
						))}
					</div>
				) : (
					<p className="mt-4 max-w-2xl text-sm leading-6 text-studio-muted">
						When a selected writer responds, their response appears here. Other readers do not see one another&apos;s responses.
					</p>
				)}
			</section>
		</section>
	)
}
