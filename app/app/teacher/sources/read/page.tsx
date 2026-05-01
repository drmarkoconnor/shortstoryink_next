import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { SourceReadingWorkspace } from '@/components/teacher/source-reading-workspace'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { teacherTabs } from '@/lib/mock/teacher-prototype'

export default async function SourceReadingPage() {
	await requireTeacher()

	return (
		<section className="space-y-5">
			<MenuTabs
				tabs={teacherTabs}
				active="/app/teacher-studio"
				context={
					<div className="document-builder-controls flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
						<div className="min-w-0">
							<p className="text-[10px] uppercase tracking-[0.12em] text-silver-400">
								Teacher Studio
							</p>
							<p className="truncate text-sm text-parchment-100">
								Source Reading
							</p>
						</div>
						<Link
							href="/app/teacher/sources/new"
							className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-silver-300 transition hover:border-white/25 hover:text-parchment-100">
							Single excerpt
						</Link>
					</div>
				}
			/>

			<SourceReadingWorkspace />
		</section>
	)
}
