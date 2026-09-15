import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { ArchivePieceSelect } from '@/components/teacher/archive-piece-select'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createServerDataClient } from '@/lib/data/client'
import { teacherTabs } from '@/lib/mock/teacher-prototype'

type ArchivedSubmission = {
	id: string
	title: string
	status: string
	created_at: string
	author_id: string
	version: number
}

export default async function TeacherArchivePage({
	searchParams,
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	await requireTeacher()
	const dataClient = await createServerDataClient()
	const params = searchParams ? await searchParams : {}

	let rows: ArchivedSubmission[] = []
	let loadError: string | null = null

	const result = await dataClient
		.from('submissions')
		.select('id, title, status, created_at, author_id, version')
		.eq('status', 'feedback_published')
		.order('created_at', { ascending: false })

	if (result.error) {
		loadError = result.error.message
	} else {
		rows = (result.data ?? []) as ArchivedSubmission[]
	}

	const writerById: Record<string, string> = {}
	if (!loadError && rows.length > 0) {
		const ids = [...new Set(rows.map((item) => item.author_id))]
		const profilesResult = await dataClient
			.from('profiles')
			.select('id, display_name')
			.in('id', ids)
		if (!profilesResult.error && profilesResult.data) {
			for (const p of profilesResult.data) {
				writerById[p.id] = p.display_name || p.id
			}
		}
	}

	const selectedArchiveId =
		typeof params.submission === 'string' ? params.submission : rows[0]?.id ?? ''
	const selectedArchive =
		rows.find((item) => item.id === selectedArchiveId) ?? rows[0] ?? null

	return (
		<section className="space-y-8">
			<MenuTabs tabs={teacherTabs} active="/app/teacher/archive" />

			<div className="studio-page-header">
				<p className="text-xs uppercase tracking-[0.12em] text-studio-muted">
					Editorial desk
				</p>
				<h1 className="studio-heading mt-3">
					Published feedback
				</h1>
				<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
					Reopen published pieces, revisit prior feedback, and move back into the
					manuscript when a writer returns with a revision or follow-up.
				</p>
			</div>

			<div className="surface p-6 lg:p-8">
				<div className="flex items-center justify-between gap-3">
					<h2 className="literary-title text-2xl text-studio-ink">
						Published pieces
					</h2>
					<p className="text-xs uppercase tracking-[0.11em] text-studio-muted">
						{rows.length} published
					</p>
				</div>

				{loadError ? (
					<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
						Unable to load published feedback: {loadError}
					</p>
				) : rows.length === 0 ? (
					<p className="mt-4 text-sm text-studio-muted">
						No feedback has been published yet.
					</p>
				) : (
					<div className="mt-4 space-y-4">
						<ArchivePieceSelect
							selectedId={selectedArchive?.id ?? ''}
							options={rows.map((item) => ({
								id: item.id,
								label: `v${item.version} - ${item.title} - ${
									writerById[item.author_id] || item.author_id
								}`,
							}))}
						/>
						{selectedArchive ? (
							<div className="rounded-md border border-studio-line bg-studio-canvas p-4">
								<p className="text-sm font-medium text-studio-ink">
									{selectedArchive.title}
								</p>
								<p className="mt-1 text-sm text-studio-muted">
									{writerById[selectedArchive.author_id] || selectedArchive.author_id}
								</p>
								<div className="mt-3 flex flex-wrap gap-2 text-xs text-studio-muted">
									<p className="rounded border border-studio-line bg-studio-tint px-2.5 py-1">
										Published
									</p>
									<p className="rounded border border-studio-line bg-studio-tint px-2.5 py-1">
										v{selectedArchive.version}
									</p>
								</div>
								<p className="mt-3 text-xs text-studio-muted">
									Submitted {new Date(selectedArchive.created_at).toLocaleString('en-GB', { timeZone: 'Europe/London' })}
								</p>
								<Link
									href={`/app/workshop/${selectedArchive.id}`}
									className="mt-4 inline-flex rounded border border-accent-300/45 bg-accent-300/12 px-4 py-2 text-xs uppercase tracking-[0.1em] text-studio-accent transition hover:bg-accent-300/18">
									Open editorial view
								</Link>
								<div className="mt-3 flex flex-wrap gap-2">
									<Link href={`/app/workshop/${selectedArchive.id}?view=writer`} className="studio-secondary">View published feedback</Link>
									<Link href={`/app/workshop/${selectedArchive.id}/export`} className="studio-secondary">Prepare feedback document</Link>
								</div>
							</div>
						) : null}
					</div>
				)}
			</div>
		</section>
	)
}
