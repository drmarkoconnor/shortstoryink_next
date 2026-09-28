import Link from 'next/link'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { EditorIntakeForm } from '@/components/teacher/editor-intake-form'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createAdminDataClient } from '@/lib/data/client'
import { setSubmissionSharing } from '@/lib/workshop/sharing'

type ProfileRow = { id: string; display_name: string | null; role: string }
type WorkshopRow = { id: string; title: string; slug: string | null }
type MembershipRow = { profile_id: string; workshop_id: string }
type RevisionRow = {
	id: string
	author_id: string
	title: string
	version: number
	workshop_id: string
}

export default async function AddWriterPiecePage() {
	await requireTeacher()
	const admin = createAdminDataClient()

	const [profilesResult, workshopsResult, membershipsResult, revisionsResult] =
		await Promise.all([
			admin.from('profiles').select('id, display_name, role').order('display_name'),
			admin.from('workshops').select('id, title, slug').order('title'),
			admin.from('workshop_members').select('profile_id, workshop_id'),
			admin
				.from('submissions')
				.select('id, author_id, title, version, workshop_id')
				.eq('status', 'feedback_published')
				.order('created_at', { ascending: false }),
		])

	const profiles = (profilesResult.data ?? []) as ProfileRow[]
	const workshops = (workshopsResult.data ?? []) as WorkshopRow[]
	const memberships = (membershipsResult.data ?? []) as MembershipRow[]
	const writerProfiles = profiles.filter((profile) => profile.role === 'writer')
	const writerIds = new Set(writerProfiles.map((profile) => profile.id))

	const groupIdsByWriter = memberships.reduce<Record<string, string[]>>((acc, membership) => {
		if (!writerIds.has(membership.profile_id)) return acc
		;(acc[membership.profile_id] ??= []).push(membership.workshop_id)
		return acc
	}, {})

	const membersByGroup = memberships.reduce<Record<string, Array<{ id: string; displayName: string }>>>(
		(acc, membership) => {
			const profile = writerProfiles.find((item) => item.id === membership.profile_id)
			if (!profile) return acc
			;(acc[membership.workshop_id] ??= []).push({
				id: profile.id,
				displayName: profile.display_name?.trim() || 'Writer',
			})
			return acc
		},
		{},
	)
	for (const members of Object.values(membersByGroup)) {
		members.sort((a, b) => a.displayName.localeCompare(b.displayName))
	}

	async function createAssignedPiece(formData: FormData) {
		'use server'
		const acting = await requireTeacher()
		const writerId = String(formData.get('writerId') ?? '').trim()
		const workshopId = String(formData.get('workshopId') ?? '').trim()
		const sourceId = String(formData.get('sourceId') ?? '').trim()
		const requestId = String(formData.get('requestId') ?? '').trim()
		const title = String(formData.get('title') ?? '').trim()
		const body = String(formData.get('body') ?? '')
		const share = formData.get('share') === 'yes'
		const recipientIds = formData
			.getAll('recipientId')
			.map(String)
			.map((id) => id.trim())
			.filter(Boolean)

		if (!writerId || !workshopId || !requestId || !title || !body.trim()) {
			return { error: 'Choose the writer and group, then complete the title and manuscript.' }
		}
		if (share && recipientIds.length === 0) {
			return { error: 'Choose at least one reader, or keep the piece private.' }
		}

		const adminData = createAdminDataClient()
		const { data, error } = await adminData.rpc('create_editor_assigned_submission', {
			p_teacher_id: acting.user.id,
			p_author_id: writerId,
			p_request_id: requestId,
			p_title: title,
			p_body: body,
			p_workshop_id: workshopId,
			p_source_id: sourceId || null,
		})
		if (error || !data?.id) {
			return {
				error:
					error?.code === '22023' || error?.code === '42501'
						? error.message
						: 'Unable to add this manuscript. Please try again.',
			}
		}

		let warning: string | undefined
		if (share) {
			try {
				await setSubmissionSharing(
					acting.user.id,
					String(data.id),
					recipientIds,
				)
			} catch (sharingError) {
				console.error('[createAssignedPiece] Sharing failed:', sharingError)
				warning =
					'The piece was added privately, but the requested group sharing could not be applied. You can share it separately.'
			}
		}

		revalidatePath('/app/teacher/review-desk')
		revalidatePath('/app/writer')
		return { id: String(data.id), warning }
	}

	return (
		<section className="mx-auto max-w-[980px] space-y-7">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<header>
					<p className="studio-eyebrow">Editorial intake</p>
					<h1 className="studio-heading mt-3">Add a writer&apos;s piece</h1>
					<p className="mt-4 max-w-2xl leading-7 text-studio-muted">
						Use this when a writer has sent work by email, message or another route.
						The manuscript will belong to that writer and enter the normal editorial
						feedback and revision history.
					</p>
				</header>
				<Link href="/app/teacher/review-desk" className="studio-secondary">
					Back to editorial desk
				</Link>
			</div>

			<div className="surface p-5 sm:p-7">
				<EditorIntakeForm
					requestId={randomUUID()}
					writers={writerProfiles.map((profile) => ({
						id: profile.id,
						displayName: profile.display_name?.trim() || 'Writer',
						groupIds: groupIdsByWriter[profile.id] ?? [],
					}))}
					groups={workshops}
					membersByGroup={membersByGroup}
					revisionSources={((revisionsResult.data ?? []) as RevisionRow[]).map(
						(row) => ({
							id: row.id,
							authorId: row.author_id,
							title: row.title,
							version: row.version,
							workshopId: row.workshop_id,
						}),
					)}
					createAction={createAssignedPiece}
				/>
			</div>
		</section>
	)
}
