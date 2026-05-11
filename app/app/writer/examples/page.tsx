import Link from 'next/link'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import type {
	ExampleCopyrightStatus,
	ExampleStatus,
} from '@/lib/teaching-examples/types'

type ExampleRow = {
	id: string
	title: string
	author_name: string | null
	copyright_status: ExampleCopyrightStatus | null
	editorial_note: string | null
	content_note: string | null
	body: string
	craft_tags: string[] | null
	status: ExampleStatus | null
	updated_at: string
}

type HiddenGroupRow = {
	example_id: string
	workshop_id: string
}

function previewFromBody(body: string) {
	const paragraphs = toManuscriptParagraphs(body)
	const firstLines = paragraphs
		.filter((paragraph) => paragraph.text.trim() !== '**')
		.slice(0, 3)
		.map((paragraph) => paragraph.text.replace(/\s+/g, ' ').trim())
	return firstLines
}

function formatUpdatedDate(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return 'Recently updated'
	}

	return new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	}).format(date)
}

export default async function WriterExamplesPage() {
	await requireWriter()
	const user = await getCurrentUser()
	const adminSupabase = createAdminSupabaseClient()
	let examples: ExampleRow[] = []
	let loadError: string | null = null

	const { data: memberRows, error: membershipError } = await adminSupabase
		.from('workshop_members')
		.select('workshop_id')
		.eq('profile_id', user.id)

	if (membershipError) {
		loadError = 'Unable to load your group memberships.'
	}

	const writerGroupIds = [
		...new Set((memberRows ?? []).map((row) => row.workshop_id as string)),
	]

	if (!loadError && writerGroupIds.length > 0) {
		const examplesResult = await adminSupabase
			.from('teaching_examples')
			.select(
				'id, title, author_name, copyright_status, editorial_note, content_note, body, craft_tags, status, updated_at',
			)
			.eq('status', 'published')
			.order('updated_at', { ascending: false })
			.limit(80)

		if (examplesResult.error) {
			loadError = 'Unable to load annotated examples.'
		} else {
			const rows = (examplesResult.data ?? []) as ExampleRow[]
			const exampleIds = rows.map((example) => example.id)
			const hiddenResult =
				exampleIds.length > 0
					? await adminSupabase
							.from('teaching_example_hidden_groups')
							.select('example_id, workshop_id')
							.in('example_id', exampleIds)
					: { data: [] as HiddenGroupRow[] }
			const hiddenByExample = ((hiddenResult.data ?? []) as HiddenGroupRow[]).reduce(
				(acc, row) => {
					if (!acc[row.example_id]) {
						acc[row.example_id] = new Set<string>()
					}
					acc[row.example_id].add(row.workshop_id)
					return acc
				},
				{} as Record<string, Set<string>>,
			)

			examples = rows.filter((example) => {
				const hiddenGroups = hiddenByExample[example.id] ?? new Set<string>()
				return writerGroupIds.some((groupId) => !hiddenGroups.has(groupId))
			})
		}
	}

	return (
		<section className="space-y-5">
			<div className="surface p-5 lg:p-6">
				<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
					Annotated examples
				</p>
				<h1 className="literary-title mt-2 text-3xl text-parchment-100">
					Close-reading library
				</h1>
				<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
					Read stories with optional craft commentary, then return to your own
					work with a sharper sense of what to try.
				</p>
			</div>

			{loadError ? (
				<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
					{loadError}
				</p>
			) : null}

			{!loadError && examples.length === 0 ? (
				<div className="surface p-5 lg:p-6">
					<h2 className="literary-title text-2xl text-parchment-100">
						No examples yet
					</h2>
					<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
						Published annotated readings will appear here when they are shared
						with your group.
					</p>
				</div>
			) : null}

			{examples.length > 0 ? (
				<div className="grid gap-4 md:grid-cols-2">
					{examples.map((example) => (
						<article
							key={example.id}
							className="rounded-2xl border border-white/12 bg-white/[0.04] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.16)]">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<p className="text-xs uppercase tracking-[0.12em] text-accent-200">
									Annotated reading
								</p>
								<p className="text-xs text-silver-300">
									{formatUpdatedDate(example.updated_at)}
								</p>
							</div>
							<h2 className="literary-title mt-3 line-clamp-2 text-2xl text-parchment-100">
								{example.title}
							</h2>
							<p className="mt-1 text-sm text-silver-300">
								{example.author_name || 'Unknown author'}
							</p>
							<div className="mt-3 min-h-[4.5rem] space-y-1 text-sm leading-6 text-silver-100">
								{previewFromBody(example.body).map((line, index) => (
									<p key={`${example.id}-${index}`} className="line-clamp-1">
										{line}
									</p>
								))}
							</div>
							<div className="mt-4 flex flex-wrap gap-1.5">
								{(example.craft_tags ?? []).slice(0, 5).map((tag) => (
									<span
										key={tag}
										className="rounded-full border border-accent-300/25 bg-accent-300/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-accent-100">
										{tag}
									</span>
								))}
							</div>
							<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
								<p className="text-xs text-silver-300">
									{example.copyright_status ?? 'teacher-owned'}
								</p>
								<Link
									href={`/app/writer/examples/${example.id}`}
									className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30">
									Read example
								</Link>
							</div>
						</article>
					))}
				</div>
			) : null}
		</section>
	)
}
