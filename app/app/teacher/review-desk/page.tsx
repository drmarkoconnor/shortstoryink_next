import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { ProtoCard } from '@/components/prototype/card'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { teacherTabs } from '@/lib/mock/teacher-prototype'

type QueueSubmission = {
	id: string
	title: string
	status: string
	createdAt: string
	writerLabel: string
	version?: number
	parentSubmissionId?: string | null
	newerRevisionId?: string | null
	newerRevisionVersion?: number | null
	newerRevisionStatus?: string | null
	isLatestVersion?: boolean
	feedbackDraftCount?: number
}

type ModernQueueRow = {
	id: string
	title: string
	author_id: string
	status: string
	created_at: string
	version: number
	parent_submission_id?: string | null
	source?: string
}

type RevisionChainRow = {
	id: string
	author_id: string
	parent_submission_id: string | null
	status: string
	created_at: string
	version: number
}

function isSchemaCacheMissing(message: string | null | undefined) {
	if (!message) {
		return false
	}

	const normalized = message.toLowerCase()
	return (
		normalized.includes('schema cache') ||
		normalized.includes('could not find the') ||
		(normalized.includes('column') && normalized.includes('does not exist')) ||
		(normalized.includes('relation') && normalized.includes('does not exist'))
	)
}

function isMissingSubmissionSource(message: string | null | undefined) {
	if (!message) {
		return false
	}

	const normalized = message.toLowerCase()
	return normalized.includes('source') && normalized.includes('does not exist')
}

function statusLabel(status: string) {
	if (status === 'submitted') {
		return 'Waiting'
	}
	if (status === 'in_review') {
		return 'In review'
	}
	if (status === 'feedback_published') {
		return 'Published'
	}
	return status.replaceAll('_', ' ')
}

function statusClass(status: string) {
	if (status === 'submitted') {
		return 'border-accent-300/45 bg-accent-300/10 text-accent-100'
	}
	if (status === 'in_review') {
		return 'border-burgundy-300/50 bg-burgundy-500/20 text-parchment-100'
	}
	return 'border-white/10 bg-white/5 text-silver-200'
}

function rootSubmissionId(item: {
	id: string
	parentSubmissionId?: string | null
	parent_submission_id?: string | null
}) {
	return item.parentSubmissionId ?? item.parent_submission_id ?? item.id
}

function formatQueueDate(value: string) {
	return new Date(value).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})
}

export default async function TeacherReviewDeskPage() {
	await requireTeacher()
	const supabase = await createServerSupabaseClient()

	let queue: QueueSubmission[] = []
	let queueError: string | null = null
	let schemaMode: 'modern' | 'legacy' = 'modern'
	let publishedCount = 0

	let modernResult: {
		data: ModernQueueRow[] | null
		error: { message?: string } | null
	} = await supabase
		.from('submissions')
		.select(
			'id, title, author_id, status, created_at, version, parent_submission_id, source',
		)
		.in('status', ['submitted', 'in_review'])
		.order('created_at', { ascending: true })

	if (modernResult.error && isMissingSubmissionSource(modernResult.error.message)) {
		modernResult = await supabase
			.from('submissions')
			.select('id, title, author_id, status, created_at, version, parent_submission_id')
			.in('status', ['submitted', 'in_review'])
			.order('created_at', { ascending: true })
	}

	if (!modernResult.error) {
		const rows = (modernResult.data ?? []) as ModernQueueRow[]

		const authorIds = [...new Set(rows.map((item) => item.author_id))]
		const submissionIds = rows.map((item) => item.id)
		let writerById: Record<string, string> = {}
		let feedbackDraftCountBySubmission: Record<string, number> = {}
		const revisionChainByRootId: Record<string, RevisionChainRow[]> = {}

		if (authorIds.length > 0) {
			const { data: profileRows } = await supabase
				.from('profiles')
				.select('id, display_name')
				.in('id', authorIds)

			writerById = Object.fromEntries(
				(profileRows ?? []).map((profile) => [
					profile.id as string,
					(profile.display_name as string | null) ?? 'Writer',
				]),
			)

			const { data: chainRows } = await supabase
				.from('submissions')
				.select('id, author_id, parent_submission_id, status, created_at, version')
				.in('author_id', authorIds)

			for (const row of (chainRows ?? []) as RevisionChainRow[]) {
				const rootId = row.parent_submission_id ?? row.id
				if (!revisionChainByRootId[rootId]) {
					revisionChainByRootId[rootId] = []
				}
				revisionChainByRootId[rootId].push(row)
			}
		}

		if (submissionIds.length > 0) {
			const { data: feedbackRows } = await supabase
				.from('feedback_items')
				.select('submission_id')
				.in('submission_id', submissionIds)

			feedbackDraftCountBySubmission = (feedbackRows ?? []).reduce(
				(acc, row) => {
					const key = row.submission_id as string
					acc[key] = (acc[key] ?? 0) + 1
					return acc
				},
				{} as Record<string, number>,
			)
		}

		const publishedCountResult = await supabase
			.from('submissions')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'feedback_published')

		if (!publishedCountResult.error) {
			publishedCount = publishedCountResult.count ?? 0
		}

		queue = rows.map((item) => ({
			...(() => {
				const rootId = rootSubmissionId(item)
				const chain = [...(revisionChainByRootId[rootId] ?? [])].sort(
					(a, b) => a.version - b.version,
				)
				const latestVersion = chain[chain.length - 1] ?? null
				const newerRevision =
					chain.find((revision) => revision.version > item.version) ?? null

				return {
					id: item.id,
					title: item.title,
					status: item.status,
					createdAt: item.created_at,
					writerLabel: writerById[item.author_id] ?? 'Writer',
					version: item.version,
					parentSubmissionId: item.parent_submission_id ?? null,
					newerRevisionId: newerRevision?.id ?? null,
					newerRevisionVersion: newerRevision?.version ?? null,
					newerRevisionStatus: newerRevision?.status ?? null,
					isLatestVersion: latestVersion ? latestVersion.id === item.id : true,
					feedbackDraftCount: feedbackDraftCountBySubmission[item.id] ?? 0,
				}
			})(),
		}))
	} else if (isSchemaCacheMissing(modernResult.error.message)) {
		schemaMode = 'legacy'

		const legacyResult = await supabase
			.from('submissions')
			.select(
				'id, title, writer_first_name, writer_email, status, submitted_at, created_at',
			)
			.in('status', ['submitted', 'in_review'])
			.order('created_at', { ascending: true })

		if (legacyResult.error) {
			queueError = legacyResult.error.message
		} else {
			const rows = (legacyResult.data ?? []) as Array<{
				id: string
				title: string
				writer_first_name: string | null
				writer_email: string | null
				status: string
				submitted_at: string | null
				created_at: string
			}>

			queue = rows.map((item) => ({
				id: item.id,
				title: item.title,
				status: item.status,
				createdAt: item.submitted_at ?? item.created_at,
				writerLabel: item.writer_first_name || item.writer_email || 'Writer',
				feedbackDraftCount: 0,
			}))
		}
	} else {
		queueError = modernResult.error?.message ?? 'Unable to load review queue.'
	}

	const awaitingCount = queue.filter((item) => item.status === 'submitted').length
	const inReviewCount = queue.filter((item) => item.status === 'in_review').length
	const waitingQueue = queue.filter((item) => item.status === 'submitted')
	const inReviewQueue = queue.filter((item) => item.status === 'in_review')
	const oldestWaitingSubmission = waitingQueue[0] ?? null
	const hasNewerRevisionFlags = queue.some((item) => item.newerRevisionId)

	async function openWaitingSubmissionAction(formData: FormData) {
		'use server'

		const submissionId = String(formData.get('submissionId') ?? '').trim()
		if (!submissionId) {
			return
		}

		redirect(`/app/workshop/${submissionId}`)
	}

	function renderQueueItem(item: QueueSubmission, options?: { oldest?: boolean }) {
		return (
			<Link
				href={`/app/workshop/${item.id}`}
				className={`block rounded-xl border px-3 py-3 transition hover:border-burgundy-300/50 hover:bg-ink-900/60 ${
					options?.oldest
						? 'border-accent-300/40 bg-accent-300/10'
						: 'border-white/10 bg-ink-900/40'
				}`}>
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div>
						<p className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${statusClass(item.status)}`}>
							{statusLabel(item.status)}
						</p>
						{options?.oldest ? (
							<p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-accent-200">
								Waiting the longest
							</p>
						) : null}
					</div>
					<p className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-silver-200">
						v{item.version ?? 1}
					</p>
				</div>
				<p className="mt-2 text-sm font-medium text-parchment-100">
					{item.title}
				</p>
				<p className="mt-1 text-xs text-silver-300">
					{item.writerLabel} {' · '}
					{formatQueueDate(item.createdAt)}
				</p>
				{item.version && item.version > 1 ? (
					<p className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-silver-200">
						Revision
					</p>
				) : null}
				{item.status === 'in_review' ? (
					<p className="mt-2 inline-flex rounded-full border border-burgundy-300/30 bg-burgundy-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-burgundy-100">
						{item.feedbackDraftCount ?? 0} draft comments
					</p>
				) : null}
				{item.newerRevisionId ? (
					<p className="mt-2 rounded-lg border border-amber-300/25 bg-amber-300/10 px-2.5 py-1.5 text-xs leading-relaxed text-amber-100">
						Newer v{item.newerRevisionVersion} exists ({statusLabel(
							item.newerRevisionStatus ?? '',
						)}).
					</p>
				) : null}
			</Link>
		)
	}

	return (
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher/review-desk" />

			<div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
				<aside className="space-y-3">
					<ProtoCard title="Editorial queue" meta={`${queue.length} active`}>
						<div className="mb-3 grid grid-cols-3 gap-1.5 text-xs text-silver-300">
							<div className="rounded-xl border border-white/10 bg-ink-900/35 px-2.5 py-2">
								<p className="text-[10px] uppercase tracking-[0.08em] leading-tight">
									Waiting
								</p>
								<p className="mt-1 text-base text-parchment-100 sm:text-lg">
									{awaitingCount}
								</p>
							</div>
							<div className="rounded-xl border border-white/10 bg-ink-900/35 px-2.5 py-2">
								<p className="text-[10px] uppercase tracking-[0.08em] leading-tight">
									In review
								</p>
								<p className="mt-1 text-base text-parchment-100 sm:text-lg">
									{inReviewCount}
								</p>
							</div>
							<div className="rounded-xl border border-white/10 bg-ink-900/35 px-2.5 py-2">
								<p className="text-[10px] uppercase tracking-[0.08em] leading-tight">
									Published
								</p>
								<p className="mt-1 text-base text-parchment-100 sm:text-lg">
									{publishedCount}
								</p>
							</div>
						</div>
						{queueError ? (
							<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
								Unable to load queue: {queueError}
							</p>
						) : queue.length === 0 ? (
							<p className="text-sm text-silver-300">
								No submissions are waiting for review.
							</p>
						) : (
							<div className="space-y-4">
								{waitingQueue.length > 0 ? (
									<section className="rounded-xl border border-accent-300/25 bg-accent-300/10 p-3">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<p className="text-[11px] uppercase tracking-[0.12em] text-accent-300">
												Waiting
											</p>
											<p className="text-[10px] uppercase tracking-[0.1em] text-accent-100">
												Waiting the longest first
											</p>
										</div>
										<form
											action={openWaitingSubmissionAction}
											className="mt-2 space-y-2">
											<select
												name="submissionId"
												defaultValue={oldestWaitingSubmission?.id ?? ''}
												className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition focus:ring">
												{waitingQueue.map((item, index) => (
													<option key={item.id} value={item.id}>
														{index === 0 ? 'Waiting the longest - ' : ''}
														v{item.version ?? 1} - {item.title} -{' '}
														{item.writerLabel}
														{item.newerRevisionVersion
															? ` - newer v${item.newerRevisionVersion}`
															: ''}
													</option>
												))}
											</select>
											<button
												type="submit"
												className="w-full rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30">
												Open selected
											</button>
										</form>
									</section>
								) : null}
								{inReviewQueue.length > 0 ? (
									<section>
										<p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-burgundy-200">
											In review
										</p>
										<ul className="space-y-1.5">
											{inReviewQueue.map((item) => (
												<li key={item.id}>{renderQueueItem(item)}</li>
											))}
										</ul>
									</section>
								) : null}
							</div>
						)}
					</ProtoCard>

					<ProtoCard title="Desk guide" meta="Operational note">
						<p className="text-sm text-silver-200">
							Waiting pieces have not yet had a teacher response. In review
							pieces already have notes started but are not yet published.
						</p>
						{oldestWaitingSubmission ? (
							<Link
								href={`/app/workshop/${oldestWaitingSubmission.id}`}
							className="mt-3 inline-block text-xs text-accent-200 hover:text-accent-100">
								Open the piece waiting the longest
							</Link>
						) : null}
					</ProtoCard>
				</aside>

				<main className="surface p-6 lg:p-8">
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						Workshop review desk
					</p>
					<h2 className="literary-title mt-2 text-2xl text-parchment-100">
						The next piece to read is kept at the front
					</h2>
					<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
						Open a piece from the queue to work inside the manuscript. Inline
						comments and summary feedback belong there, not on this landing
						page.
					</p>
					{inReviewQueue.length > 0 ? (
						<div className="mt-5 rounded-2xl border border-burgundy-300/25 bg-burgundy-500/10 p-4">
							<p className="text-[11px] uppercase tracking-[0.12em] text-burgundy-100">
								Drafts in progress
							</p>
							<p className="mt-2 text-sm leading-relaxed text-silver-100">
								{inReviewQueue.length} draft
								{inReviewQueue.length === 1 ? '' : 's'} currently have
								unpublished feedback in progress.
							</p>
						</div>
					) : null}
					{oldestWaitingSubmission ? (
						<Link
							href={`/app/workshop/${oldestWaitingSubmission.id}`}
							className="mt-5 block rounded-2xl border border-accent-300/30 bg-accent-300/10 p-5 transition hover:border-accent-300/50 hover:bg-accent-300/15">
							<p className="text-[11px] uppercase tracking-[0.12em] text-accent-200">
								Waiting the longest
							</p>
							<h3 className="literary-title mt-2 text-2xl text-parchment-100">
								{oldestWaitingSubmission.title}
							</h3>
							<p className="mt-2 text-sm text-silver-200">
								{oldestWaitingSubmission.writerLabel} {' · '} v
								{oldestWaitingSubmission.version ?? 1} {' · '}
								{formatQueueDate(oldestWaitingSubmission.createdAt)}
							</p>
							{oldestWaitingSubmission.newerRevisionId ? (
								<p className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
									Newer v{oldestWaitingSubmission.newerRevisionVersion} exists.
								</p>
							) : null}
						</Link>
					) : inReviewQueue.length > 0 ? (
						<p className="mt-5 rounded-2xl border border-white/10 bg-ink-900/35 p-5 text-sm text-silver-200">
							No waiting pieces. Continue the drafts already in review.
						</p>
					) : (
						<p className="mt-5 rounded-2xl border border-white/10 bg-ink-900/35 p-5 text-sm text-silver-200">
							Queue currently clear.
						</p>
					)}
					{hasNewerRevisionFlags ? (
						<p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
							Some queued items have a newer revision in the same chain. Open the
							latest version before publishing feedback where possible.
						</p>
					) : null}
					<p className="mt-2 text-xs text-silver-300">
						Data mode: {schemaMode}
					</p>
				</main>
			</div>
		</section>
	)
}
