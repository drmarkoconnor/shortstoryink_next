import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { ArchivePieceSelect } from '@/components/teacher/archive-piece-select'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
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
	const supabase = await createServerSupabaseClient()
	const params = searchParams ? await searchParams : {}

	let rows: ArchivedSubmission[] = []
	let loadError: string | null = null

	const result = await supabase
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
		const profilesResult = await supabase
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
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher/archive" />

			<div className="surface p-6 lg:p-8">
				<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
					Archive
				</p>
				<h1 className="literary-title mt-2 text-3xl text-parchment-100">
					Published feedback archive
				</h1>
				<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
					Reopen published pieces, revisit prior feedback, and move back into the
					manuscript when a writer returns with a revision or follow-up.
				</p>
			</div>

			<div className="surface p-6 lg:p-8">
				<div className="flex items-center justify-between gap-3">
					<h2 className="literary-title text-2xl text-parchment-100">
						Published pieces
					</h2>
					<p className="text-xs uppercase tracking-[0.11em] text-silver-300">
						{rows.length} archived
					</p>
				</div>

				{loadError ? (
					<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						Unable to load archive: {loadError}
					</p>
				) : rows.length === 0 ? (
					<p className="mt-4 text-sm text-silver-300">
						No published pieces in the archive yet.
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
							<div className="rounded-2xl border border-white/10 bg-ink-900/35 p-4">
								<p className="text-sm font-medium text-parchment-100">
									{selectedArchive.title}
								</p>
								<p className="mt-1 text-sm text-silver-200">
									{writerById[selectedArchive.author_id] || selectedArchive.author_id}
								</p>
								<div className="mt-3 flex flex-wrap gap-2 text-[11px] text-silver-200">
									<p className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
										Published
									</p>
									<p className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
										v{selectedArchive.version}
									</p>
								</div>
								<p className="mt-3 text-xs text-silver-300">
									Published {new Date(selectedArchive.created_at).toLocaleString()}
								</p>
								<Link
									href={`/app/workshop/${selectedArchive.id}`}
									className="mt-4 inline-flex rounded-full border border-accent-300/45 bg-accent-300/12 px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-accent-100 transition hover:bg-accent-300/18">
									Open manuscript
								</Link>
							</div>
						) : null}
					</div>
				)}
			</div>
		</section>
	)
}
