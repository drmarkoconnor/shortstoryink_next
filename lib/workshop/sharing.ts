import 'server-only'

import { createAdminDataClient } from '@/lib/data/client'
import {
	sendPieceSharedNotification,
	sendReaderResponseNotification,
} from '@/lib/notifications/email'

export type SharingReader = {
	id: string
	displayName: string
	selected: boolean
}

export type SharingContext = {
	submission: {
		id: string
		authorId: string
		title: string
		workshopId: string
		source: string
		status: string
		sharingStartedAt: string | null
	}
	workshop: { id: string; title: string; slug: string | null }
	eligibleReaders: SharingReader[]
	selectedRecipientIds: string[]
	responseCount: number
	canShare: boolean
}

export function isAbuWorkshop(workshop: { title: string; slug?: string | null }) {
	return (
		workshop.slug === 'authorised-basic-user' ||
		workshop.title.trim().toLowerCase() === 'authorised basic user'
	)
}

function stringArray(value: unknown) {
	return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

export async function getSharingContext(submissionId: string): Promise<SharingContext | null> {
	const admin = createAdminDataClient()
	const { data: submission, error } = await admin
		.from('submissions')
		.select('id, author_id, title, workshop_id, source, status, sharing_started_at')
		.eq('id', submissionId)
		.maybeSingle()
	if (error || !submission) return null

	const { data: workshop } = await admin
		.from('workshops')
		.select('id, title, slug')
		.eq('id', submission.workshop_id as string)
		.maybeSingle()
	if (!workshop) return null

	const { data: members } = await admin
		.from('workshop_members')
		.select('profile_id')
		.eq('workshop_id', submission.workshop_id as string)
	const memberIds = (members ?? []).map((row) => String(row.profile_id)).filter(Boolean)

	let writers: Array<{ id: string; display_name: string | null; role: string }> = []
	if (memberIds.length) {
		const result = await admin
			.from('profiles')
			.select('id, display_name, role')
			.in('id', memberIds)
		writers = (result.data ?? []) as typeof writers
	}

	const { data: shares } = await admin
		.from('submission_share_recipients')
		.select('recipient_id')
		.eq('submission_id', submissionId)
	const selectedRecipientIds = (shares ?? []).map((row) => String(row.recipient_id))
	const selectedSet = new Set(selectedRecipientIds)

	const { count: responseCount } = await admin
		.from('reader_responses')
		.select('id', { count: 'exact', head: true })
		.eq('submission_id', submissionId)

	const authorId = String(submission.author_id)
	const authorIsCurrentMember = memberIds.includes(authorId)
	const eligibleReaders = writers
		.filter((profile) => profile.role === 'writer' && profile.id !== authorId)
		.map((profile) => ({
			id: profile.id,
			displayName: profile.display_name?.trim() || 'Writer',
			selected: selectedSet.has(profile.id),
		}))
		.sort((a, b) => a.displayName.localeCompare(b.displayName))

	const typedWorkshop = {
		id: String(workshop.id),
		title: String(workshop.title),
		slug: workshop.slug ? String(workshop.slug) : null,
	}

	return {
		submission: {
			id: String(submission.id),
			authorId,
			title: String(submission.title),
			workshopId: String(submission.workshop_id),
			source: String(submission.source ?? 'workshop'),
			status: String(submission.status),
			sharingStartedAt: submission.sharing_started_at
				? String(submission.sharing_started_at)
				: null,
		},
		workshop: typedWorkshop,
		eligibleReaders,
		selectedRecipientIds,
		responseCount: responseCount ?? 0,
		canShare:
			authorIsCurrentMember &&
			!isAbuWorkshop(typedWorkshop) &&
			eligibleReaders.length > 0,
	}
}

async function notifyNewRecipients(submissionId: string, recipientIds: string[]) {
	if (!recipientIds.length) return
	const admin = createAdminDataClient()
	const { data: submission } = await admin
		.from('submissions')
		.select('title, author_id')
		.eq('id', submissionId)
		.maybeSingle()
	if (!submission) return
	const { data: author } = await admin
		.from('profiles')
		.select('display_name')
		.eq('id', String(submission.author_id))
		.maybeSingle()
	const writerLabel = String(author?.display_name ?? 'A writer')

	const results = await Promise.allSettled(
		recipientIds.map(async (recipientId) => {
			const email = await admin.auth.admin
				.getUserById(recipientId)
				.then((result) => result.data.user?.email?.trim().toLowerCase() ?? null)
				.catch(() => null)
			if (!email) return
			await sendPieceSharedNotification({
				email,
				writerLabel,
				title: String(submission.title),
				submissionId,
			})
		}),
	)
	results.forEach((result, index) => {
		if (result.status === 'rejected') {
			console.error('[notifyNewRecipients] Notification failed:', {
				submissionId,
				recipientId: recipientIds[index],
				error: result.reason,
			})
		}
	})
}

export async function setSubmissionSharing(
	actorId: string,
	submissionId: string,
	recipientIds: string[],
) {
	const admin = createAdminDataClient()
	const { data, error } = await admin.rpc('set_submission_sharing', {
		p_actor_id: actorId,
		p_submission_id: submissionId,
		p_recipient_ids: recipientIds,
	})
	if (error || !data) throw new Error(error?.message ?? 'Unable to update sharing.')
	const addedRecipientIds = stringArray(data.addedRecipientIds)
	await notifyNewRecipients(submissionId, addedRecipientIds)
	return {
		recipientIds: stringArray(data.recipientIds),
		addedRecipientIds,
		removedRecipientIds: stringArray(data.removedRecipientIds),
	}
}

export async function stopSubmissionSharing(actorId: string, submissionId: string) {
	const admin = createAdminDataClient()
	const { data, error } = await admin.rpc('stop_submission_sharing', {
		p_actor_id: actorId,
		p_submission_id: submissionId,
	})
	if (error) throw new Error(error.message)
	return { removedRecipientIds: stringArray(data?.removedRecipientIds) }
}

export async function saveReaderResponse(
	actorId: string,
	submissionId: string,
	body: string,
) {
	const admin = createAdminDataClient()
	const { data, error } = await admin.rpc('save_reader_response', {
		p_actor_id: actorId,
		p_submission_id: submissionId,
		p_body: body,
	})
	if (error || !data) throw new Error(error?.message ?? 'Unable to save your response.')

	if (data.created === true) {
		const { data: submission } = await admin
			.from('submissions')
			.select('title, author_id')
			.eq('id', submissionId)
			.maybeSingle()
		const { data: responder } = await admin
			.from('profiles')
			.select('display_name')
			.eq('id', actorId)
			.maybeSingle()
		if (submission) {
			const email = await admin.auth.admin
				.getUserById(String(submission.author_id))
				.then((result) => result.data.user?.email?.trim().toLowerCase() ?? null)
				.catch(() => null)
			if (email) {
				try {
					await sendReaderResponseNotification({
						email,
						responderLabel: String(responder?.display_name ?? 'A writer'),
						title: String(submission.title),
						submissionId,
					})
				} catch (notificationError) {
					console.error('[saveReaderResponse] Notification failed:', notificationError)
				}
			}
		}
	}

	return { id: String(data.id), created: data.created === true }
}

export async function removeReaderResponse(actorId: string, submissionId: string) {
	const admin = createAdminDataClient()
	const { error } = await admin.rpc('remove_reader_response', {
		p_actor_id: actorId,
		p_submission_id: submissionId,
	})
	if (error) throw new Error(error.message)
}
