import Link from 'next/link'
import { redirect } from 'next/navigation'
import { EditorWriterIntake, type EditorIntakeWriter } from '@/components/teacher/editor-writer-intake'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createAdminDataClient } from '@/lib/data/client'
import { sendPieceSharedNotification } from '@/lib/notifications/email'
import { isAbuWorkshopSlug } from '@/lib/workshop/access-groups'

type ProfileRow = { id: string; display_name: string | null; role: string }
type WorkshopRow = { id: string; title: string; slug: string | null }
type MembershipRow = { workshop_id: string; profile_id: string }
type SubmissionRow = {
	id: string
	author_id: string
	workshop_id: string
	title: string
	version: number
	status: string
	parent_submission_id: string | null
}

function label(profile: ProfileRow) {
	return profile.display_name?.trim() || 'Writer'
}

function isAbu(workshop: WorkshopRow) {
	return isAbuWorkshopSlug(workshop.slug) || workshop.title.trim().toLowerCase() === 'authorised basic user'
}

function encodeError(message: string) {
	return encodeURIComponent(message.slice(0, 180))
}

export default async function AddWriterPiecePage({
	searchParams,
}: {
	searchParams?: Promise<{ error?: string | string[] }>
}) {
	await requireTeacher()
	const params = searchParams ? await searchParams : {}
	const errorNotice = typeof params.error === 'string' ? params.error : null
	const data = createAdminDataClient()

	const [profilesResult, workshopsResult, membershipsResult, submissionsResult] = await Promise.all([
		data.from<ProfileRow>('profiles').select('id, display_name, role').order('display_name'),
		data.from<WorkshopRow>('workshops').select('id, title, slug').order('title'),
		data.from<MembershipRow>('workshop_members').select('workshop_id, profile_id'),
		data.from<SubmissionRow>('submissions')
			.select('id, author_id, workshop_id, title, version, status, parent_submission_id')
			.eq('status', 'feedback_published')
			.order('created_at', { ascending: false }),
	])

	if (profilesResult.error || workshopsResult.error || membershipsResult.error || submissionsResult.error) {
		throw new Error('Unable to prepare the editor intake desk.')
	}

	const profiles = profilesResult.data ?? []
	const writers = profiles.filter((profile) => profile.role === 'writer')
	const workshops = workshopsResult.data ?? []
	const memberships = membershipsResult.data ?? []
	const workshopById = Object.fromEntries(workshops.map((workshop) => [workshop.id, workshop]))
	const profileById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]))

	const membersByWorkshop = memberships.reduce<Record<string, Array<{ id: string; name: string }>>>((acc, row) => {
		const profile = profileById[row.profile_id]
		if (!profile || profile.role !== 'writer') return acc
		;(acc[row.workshop_id] ??= []).push({ id: profile.id, name: label(profile) })
		return acc
	}, {})

	const piecesByWriter = (submissionsResult.data ?? []).reduce<Record<string, SubmissionRow[]>>((acc, piece) => {
		;(acc[piece.author_id] ??= []).push(piece)
		return acc
	}, {})

	const intakeWriters: EditorIntakeWriter[] = writers.map((writer) => {
		const writerMemberships = memberships.filter((row) => row.profile_id === writer.id)
		return {
			id: writer.id,
			name: label(writer),
			groups: writerMemberships
				.map((membership) => workshopById[membership.workshop_id])
				.filter((workshop): workshop is WorkshopRow => Boolean(workshop))
				.sort((a, b) => Number(isAbu(a)) - Number(isAbu(b)) || a.title.localeCompare(b.title))
				.map((workshop) => ({
					id: workshop.id,
					title: workshop.title,
					isAbu: isAbu(workshop),
					members: (membersByWorkshop[workshop.id] ?? []).sort((a, b) => a.name.localeCompare(b.name)),
				})),
			publishedPieces: (piecesByWriter[writer.id] ?? []).map((piece) => ({
				id: piece.id,
				title: piece.title,
				version: piece.version,
				workshopId: piece.workshop_id,
			})),
		}
	}).filter((writer) => writer.groups.length > 0)

	async function addWriterPieceAction(formData: FormData) {
		'use server'
		const editor = await requireTeacher()
		const admin = createAdminDataClient()
		const writerId = String(formData.get('writerId') ?? '').trim()
		const workshopId = String(formData.get('workshopId') ?? '').trim()
		const requestId = String(formData.get('requestId') ?? '').trim()
		const sourceSubmissionId = String(formData.get('sourceSubmissionId') ?? '').trim() || null
		const title = String(formData.get('title') ?? '').trim()
		const body = String(formData.get('body') ?? '')
		const shareRequested = String(formData.get('shareRequested') ?? '') === 'yes'
		const recipientIds = [...new Set(formData.getAll('recipientIds').map(String).filter(Boolean))]

		const { data: created, error } = await admin.rpc('create_editor_assigned_submission', {
			p_editor_id: editor.user.id,
			p_author_id: writerId,
			p_request_id: requestId,
			p_title: title,
			p_body: body,
			p_workshop_id: workshopId,
			p_source_id: sourceSubmissionId,
		})
		if (error || !created?.id) {
			redirect(`/app/teacher/review-desk/add?error=${encodeError(error?.message ?? 'Unable to add the manuscript.')}`)
		}

		if (shareRequested) {
			if (recipientIds.length === 0) {
				redirect('/app/teacher/review-desk/add?error=Choose+at+least+one+writer+before+sharing.')
			}
			const sharing = await admin.rpc('set_submission_share_recipients', {
				p_actor_id: editor.user.id,
				p_submission_id: String(created.id),
				p_recipient_ids: recipientIds,
			})
			if (sharing.error) {
				// The manuscript was created safely but remains private if sharing validation fails.
				redirect(`/app/workshop/${created.id}?error=${encodeError('Piece added privately; sharing was not saved: ' + sharing.error.message)}`)
			}

			try {
				const { data: writerProfile } = await admin
					.from<ProfileRow>('profiles')
					.select('id, display_name, role')
					.eq('id', writerId)
					.maybeSingle()
				const writerName = writerProfile?.display_name?.trim() || 'A writer'
				await Promise.all(recipientIds.map(async (recipientId) => {
					const identity = await admin.auth.admin.getUserById(recipientId)
					const email = identity.data.user?.email
					if (email) {
						await sendPieceSharedNotification({
							email,
							writerName,
							title,
							submissionId: String(created.id),
						})
					}
				}))
			} catch (notificationError) {
				console.error('[editor-intake] sharing notification failed', notificationError)
			}
		}

		redirect(`/app/workshop/${created.id}?notice=Writer%27s+piece+added+to+the+editorial+desk.`)
	}

	return (
		<section className="mx-auto max-w-[1100px] space-y-6">
			<div>
				<Link href="/app/teacher/review-desk" className="studio-link">← Back to Editorial desk</Link>
			</div>
			{errorNotice ? (
				<p className="rounded border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-800">
					{errorNotice}
				</p>
			) : null}
			{intakeWriters.length > 0 ? (
				<EditorWriterIntake writers={intakeWriters} action={addWriterPieceAction} />
			) : (
				<div className="surface p-6">
					<p className="text-studio-muted">No writer with a writing-group membership is available yet.</p>
				</div>
			)}
		</section>
	)
}
