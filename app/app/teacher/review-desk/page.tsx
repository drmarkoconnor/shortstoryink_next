import Link from 'next/link'
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

export default async function TeacherReviewDeskPage() {
	await requireTeacher()
	const supabase = await createServerSupabaseClient()

	let queue: QueueSubmission[] = []
	let queueError: string | null = null
	let schemaMode: 'modern' | 'legacy' = 'modern'

	let modernResult: {
		data:
			| Array<{
					id: string
					title: string
					author_id: string
					status: string
					created_at: string
					version: number
					source?: string
			  }>
			| null
		error: { message?: string } | null
	} = await supabase
		.from('submissions')
		.select('id, title, author_id, status, created_at, version, source')
		.in('status', ['submitted', 'in_review'])
		.order('created_at', { ascending: true })

	if (modernResult.error && isMissingSubmissionSource(modernResult.error.message)) {
		modernResult = await supabase
			.from('submissions')
			.select('id, title, author_id, status, created_at, version')
			.in('status', ['submitted', 'in_review'])
			.order('created_at', { ascending: true })
	}

	if (!modernResult.error) {
		const rows = (modernResult.data ?? []) as Array<{
			id: string
			title: string
			author_id: string
			status: string
			created_at: string
			version: number
			source?: string
		}>

		const authorIds = [...new Set(rows.map((item) => item.author_id))]
		let writerById: Record<string, string> = {}

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
		}

		queue = rows.map((item) => ({
			id: item.id,
			title: item.title,
			status: item.status,
			createdAt: item.created_at,
			writerLabel: writerById[item.author_id] ?? 'Writer',
			version: item.version,
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
			}))
		}
	} else {
		queueError = modernResult.error?.message ?? 'Unable to load review queue.'
	}

	const awaitingCount = queue.filter((item) => item.status === 'submitted').length
	const inReviewCount = queue.filter((item) => item.status === 'in_review').length
	const nextSubmission = queue[0] ?? null

	return (
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher/review-desk" />

			<div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
				<aside className="space-y-3">
					<ProtoCard title="Queue" meta={`${queue.length} active`}>
						<div className="mb-3 grid grid-cols-2 gap-2 text-xs text-silver-300">
							<div className="rounded-xl border border-white/10 bg-ink-900/35 px-3 py-2">
								<p className="uppercase tracking-[0.1em]">Awaiting</p>
								<p className="mt-1 text-lg text-parchment-100">
									{awaitingCount}
								</p>
							</div>
							<div className="rounded-xl border border-white/10 bg-ink-900/35 px-3 py-2">
								<p className="uppercase tracking-[0.1em]">In review</p>
								<p className="mt-1 text-lg text-parchment-100">
									{inReviewCount}
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
							<ul className="space-y-1.5">
								{queue.map((item) => (
									<li key={item.id}>
										<Link
											href={`/app/workshop/${item.id}`}
											className="block rounded-xl border border-white/10 bg-ink-900/40 px-3 py-3 transition hover:border-burgundy-300/50 hover:bg-ink-900/60">
											<p className="text-xs uppercase tracking-[0.09em] text-silver-300">
												{item.status.replaceAll('_', ' ')}
											</p>
											{item.version && item.version > 1 ? (
												<p className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-silver-200">
													Revision v{item.version}
												</p>
											) : null}
											<p className="mt-1 text-sm text-parchment-100">
												{item.title}
											</p>
											<p className="mt-1 text-xs text-silver-300">
												{item.writerLabel} {' · '}
												{new Date(item.createdAt).toLocaleDateString()}
											</p>
										</Link>
									</li>
								))}
							</ul>
						)}
					</ProtoCard>

					<ProtoCard title="Desk guide" meta="Operational note">
						<p className="text-sm text-silver-200">
							Submitted pieces are waiting for a first response. In review
							pieces already have notes started but are not yet published.
						</p>
						{nextSubmission ? (
							<Link
								href={`/app/workshop/${nextSubmission.id}`}
								className="mt-3 inline-block text-xs text-accent-200 hover:text-accent-100">
								Open oldest submission
							</Link>
						) : null}
					</ProtoCard>
				</aside>

				<main className="surface p-6 lg:p-8">
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						Workshop review desk
					</p>
					<h2 className="literary-title mt-2 text-2xl text-parchment-100">
						Read closely, annotate in place, publish when ready
					</h2>
					<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
						Open a piece from the queue to work inside the manuscript. Inline
						comments and summary feedback belong there, not on this landing
						page.
					</p>
					<p className="mt-4 text-xs text-silver-300">
						{nextSubmission
							? `Oldest waiting: ${nextSubmission.title} by ${nextSubmission.writerLabel}`
							: 'Queue currently clear.'}
					</p>
					<p className="mt-2 text-xs text-silver-300">
						Data mode: {schemaMode}
					</p>
				</main>
			</div>
		</section>
	)
}
