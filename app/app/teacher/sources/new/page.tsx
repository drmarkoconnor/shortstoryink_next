import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { SourceExcerptForm } from '@/components/teacher/source-excerpt-form'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { teacherTabs } from '@/lib/mock/teacher-prototype'

export default async function NewSourceExcerptPage() {
	await requireTeacher()

	return (
		<section className="space-y-8">
			<MenuTabs
				tabs={teacherTabs}
				active="/app/teacher/sources/new"
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
					Save a passage
				</h1>
				<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
					Add a selected literary example to your snippet library with enough
					attribution to reuse it in teaching documents. This does not ingest
					or store full texts.
				</p>
			</div>

			<SourceExcerptForm />
		</section>
	)
}
