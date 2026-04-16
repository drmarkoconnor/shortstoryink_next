import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { ProtoCard } from '@/components/prototype/card'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { teacherTabs } from '@/lib/mock/teacher-prototype'
import { createServerSupabaseClient } from '@/lib/supabase/server'

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

	let writerById: Record<string, string> = {}
	if (!loadError && rows.length > 0) {
		const ids = [...new Set(rows.map((item) => item.author_id))]
		const profilesResult = await supabase
			.from('profiles')
			.select('id, display_name')
			.in('id', ids)

		writerById = Object.fromEntries(
			(profilesResult.data ?? []).map((profile) => [
				profile.id as string,
				(profile.display_name as string | null) ?? 'Writer',
			]),
		)
	}

	return (
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher/archive" />

			<ProtoCard
				title="Published feedback archive"
				meta={`${rows.length} pieces`}>
				{loadError ? (
					<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						Unable to load archive: {loadError}
					</p>
				) : rows.length === 0 ? (
					<p className="text-sm text-silver-300">No published feedback yet.</p>
				) : (
					<ul className="space-y-2.5">
						{rows.map((item) => (
							<li
								key={item.id}
								className="rounded-2xl border border-white/10 bg-ink-900/40 p-4 transition hover:border-white/15 hover:bg-ink-900/50">
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div>
										<p className="text-sm font-medium text-parchment-100">
											{item.title}
										</p>
										{item.version > 1 ? (
											<p className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-300">
												Revision v{item.version}
											</p>
										) : null}
										<p className="mt-1 text-xs text-silver-300">
											{writerById[item.author_id] ?? 'Writer'} {' · '}
											{new Date(item.created_at).toLocaleString()}
										</p>
									</div>
									<Link
										href={`/app/workshop/${item.id}`}
										className="text-xs text-accent-200 hover:text-accent-100">
										Open detail
									</Link>
								</div>
							</li>
						))}
					</ul>
				)}
			</ProtoCard>
		</section>
	)
}

