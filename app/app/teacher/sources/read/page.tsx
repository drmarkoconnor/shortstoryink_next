import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { SourceReadingWorkspace } from '@/components/teacher/source-reading-workspace'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { teacherTabs } from '@/lib/mock/teacher-prototype'

export default async function SourceReadingPage() {
	await requireTeacher()

	return (
		<section className="space-y-8">
			<MenuTabs
				tabs={teacherTabs}
				active="/app/teacher/sources/read"
				context={
					<Link
						href="/app/teacher-studio"
						className="rounded border border-studio-line px-3 py-1.5 text-sm text-studio-muted transition hover:border-studio-line hover:text-studio-ink">
						Return to Studio
					</Link>
				}
			/>

			<div className="studio-page-header">
				<p className="text-xs uppercase tracking-[0.12em] text-studio-muted">
					Reading library
				</p>
				<h1 className="studio-heading mt-3">
					Read with a pencil
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
