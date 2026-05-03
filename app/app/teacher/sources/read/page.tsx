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
					<Link
						href="/app/teacher-studio"
						className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
						Return to Studio
					</Link>
				}
			/>

			<div className="surface p-5 lg:p-6">
				<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
					Sources v1
				</p>
				<h1 className="literary-title mt-2 text-3xl text-parchment-100">
					Create multi-snippets from long source
				</h1>
				<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
					Paste a longer source once, then select multiple passages to save as
					attributed teaching snippets.
				</p>
			</div>

			<SourceReadingWorkspace />
		</section>
	)
}
