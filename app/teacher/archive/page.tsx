import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
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

export default async function TeacherArchivePage() {
	await requireTeacher()
	const supabase = await createServerSupabaseClient()

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
					<ul className="mt-4 space-y-3">
						{rows.map((item) => (
							<li key={item.id}>
								<Link
									href={`/app/workshop/${item.id}`}
									className="block rounded-2xl border border-white/10 bg-ink-900/35 p-4 transition hover:border-burgundy-300/45 hover:bg-ink-900/50">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<p className="text-sm font-medium text-parchment-100">
												{item.title}
											</p>
											<p className="mt-1 text-sm text-silver-200">
												{writerById[item.author_id] || item.author_id}
											</p>
											<p className="mt-2 text-xs text-silver-300">
												Published feedback {' · '} Version {item.version} {' · '}
												{new Date(item.created_at).toLocaleString()}
											</p>
										</div>
										<p className="text-xs uppercase tracking-[0.1em] text-accent-200">
											Open manuscript
										</p>
									</div>
								</Link>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	)
}
