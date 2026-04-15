import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { LiteraryQuote } from '@/components/prototype/literary-quote'
import { ProtoCard } from '@/components/prototype/card'
import { teacherTabs } from '@/lib/mock/teacher-prototype'

export default function TeacherPage() {
	return (
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher" />

			<div className="grid gap-4 lg:grid-cols-3">
				<ProtoCard title="Prototype pack" meta="Teacher workspace">
					Three high-density desk mockups are now available for aesthetic review
					before core feature wiring.
				</ProtoCard>
				<ProtoCard title="Annotation model" meta="Linked side panel">
					Two-note system: typo/grammar and craft notes linked to highlighted
					story text.
				</ProtoCard>
				<ProtoCard title="Material style" meta="Literary luxe">
					Muted burgundy, classic serif rhythm, subtle paper texture, thin folio
					framing.
				</ProtoCard>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Link
					className="surface p-5 transition hover:border-burgundy-300/60"
					href="/app/teacher/review-desk">
					<h2 className="literary-title text-2xl">Review Desk</h2>
					<p className="muted mt-2 text-sm">
						3-column submission reading desk + linked feedback thread panel.
					</p>
				</Link>
				<Link
					className="surface p-5 transition hover:border-burgundy-300/60"
					href="/app/teacher/snippets-desk">
					<h2 className="literary-title text-2xl">Snippets Desk</h2>
					<p className="muted mt-2 text-sm">
						Teacher snippet capture cards, tags, and reusable craft prompts.
					</p>
				</Link>
				<Link
					className="surface p-5 transition hover:border-burgundy-300/60"
					href="/app/teacher/resources-desk">
					<h2 className="literary-title text-2xl">Resources Desk</h2>
					<p className="muted mt-2 text-sm">
						Beginner handouts, reading list cards, and simple Amazon link
						buttons.
					</p>
				</Link>
			</div>

			<LiteraryQuote
				quote="Can a writer arrive, submit, receive humane precision, and feel held by the system?"
				author="shortstory.ink prototype brief"
			/>
		</section>
	)
}

