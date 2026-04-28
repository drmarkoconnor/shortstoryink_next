import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { fixedFeedbackCategories } from '@/lib/feedback/categories'
import { teacherTabs } from '@/lib/mock/teacher-prototype'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type SnippetMetricRow = {
	id: string
	anchor: unknown
}

type SelectionAnchor = {
	categoryLabel?: string
}

function isSelectionAnchor(value: unknown): value is SelectionAnchor {
	return Boolean(value && typeof value === 'object')
}

function categoryLabelFromAnchor(anchor: unknown) {
	if (!isSelectionAnchor(anchor)) {
		return 'Uncategorised'
	}

	const label = typeof anchor.categoryLabel === 'string'
		? anchor.categoryLabel.trim()
		: ''

	return fixedFeedbackCategories.includes(label) ? label : 'Uncategorised'
}

export default async function TeacherStudioPage() {
	const profile = await requireTeacher()
	const supabase = await createServerSupabaseClient()
	let snippets: SnippetMetricRow[] = []
	let loadError: string | null = null

	const snippetsResult = await supabase
		.from('snippets')
		.select('id, anchor')
		.eq('saved_by', profile.user.id)
		.limit(500)

	if (snippetsResult.error) {
		loadError = snippetsResult.error.message
	} else {
		snippets = (snippetsResult.data ?? []) as SnippetMetricRow[]
	}

	const totalSnippets = snippets.length
	const uncategorisedSnippets = snippets.filter(
		(snippet) => categoryLabelFromAnchor(snippet.anchor) === 'Uncategorised',
	).length
	const representedCategories = new Set(
		snippets
			.map((snippet) => categoryLabelFromAnchor(snippet.anchor))
			.filter((label) => label !== 'Uncategorised'),
	).size

	return (
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher-studio" />

			<div className="surface p-5 lg:p-6">
				<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
					Teacher Studio
				</p>
				<h1 className="literary-title mt-2 text-3xl text-parchment-100">
					Studio
				</h1>
				<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
					A quiet home for reusable teaching material. Snippet management now
					lives in the dedicated Snippets tab; future studio tools will gather
					here as they become real.
				</p>
			</div>

			{loadError ? (
				<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
					Unable to load studio metrics: {loadError}
				</p>
			) : (
				<div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
					<Link
						href="/app/teacher/snippets"
						className="surface block p-5 transition hover:border-white/20 hover:bg-white/[0.04]">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
									Active
								</p>
								<h2 className="mt-2 text-xl font-semibold text-parchment-100">
									Snippet Library
								</h2>
							</div>
							<p className="rounded-full border border-accent-300/35 bg-accent-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-accent-100">
								Open
							</p>
						</div>
						<p className="mt-3 text-sm leading-relaxed text-silver-200">
							Browse, search, categorise, tag, edit, and clean up saved
							snippets.
						</p>
						<div className="mt-4 grid gap-2 sm:grid-cols-3">
							<p className="rounded-xl border border-white/10 bg-ink-950/50 px-3 py-2 text-sm text-silver-100">
								<span className="block text-lg text-parchment-100">
									{totalSnippets}
								</span>
								snippets
							</p>
							<p className="rounded-xl border border-white/10 bg-ink-950/50 px-3 py-2 text-sm text-silver-100">
								<span className="block text-lg text-parchment-100">
									{uncategorisedSnippets}
								</span>
								uncategorised
							</p>
							<p className="rounded-xl border border-white/10 bg-ink-950/50 px-3 py-2 text-sm text-silver-100">
								<span className="block text-lg text-parchment-100">
									{representedCategories}
								</span>
								categories
							</p>
						</div>
					</Link>

					<div className="space-y-3">
						<section className="surface p-5 opacity-80">
							<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
								Future
							</p>
							<h2 className="mt-2 text-lg font-semibold text-parchment-100">
								Document Builder
							</h2>
							<p className="mt-2 text-sm leading-relaxed text-silver-300">
								Workshop handouts and composed teaching notes will live here
								later.
							</p>
						</section>
						<section className="surface p-5 opacity-80">
							<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
								Future
							</p>
							<h2 className="mt-2 text-lg font-semibold text-parchment-100">
								Teaching Resources
							</h2>
							<p className="mt-2 text-sm leading-relaxed text-silver-300">
								Resource collections are planned, but not part of this pass.
							</p>
						</section>
						<section className="surface p-5 opacity-80">
							<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
								Future
							</p>
							<h2 className="mt-2 text-lg font-semibold text-parchment-100">
								Imports / Public-domain Sources
							</h2>
							<p className="mt-2 text-sm leading-relaxed text-silver-300">
								External-source imports remain parked for a later ticket.
							</p>
						</section>
					</div>
				</div>
			)}
		</section>
	)
}
