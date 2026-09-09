import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createAdminDataClient } from '@/lib/data/client'
import type {
	ExampleCopyrightStatus,
	ExampleStatus,
} from '@/lib/teaching-examples/types'

type ExampleRow = {
	id: string
	title: string
	author_name: string | null
	source_label: string | null
	copyright_status: ExampleCopyrightStatus | null
	editorial_note: string | null
	content_note: string | null
	craft_tags: string[] | null
	status: ExampleStatus | null
	updated_at: string
	published_at: string | null
}

type CountRow = {
	example_id: string
}

function toMessage(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

function isSchemaCacheMissing(message: string | null | undefined) {
	if (!message) {
		return false
	}

	const normalized = message.toLowerCase()
	return (
		normalized.includes('schema cache') ||
		normalized.includes('could not find the') ||
		(normalized.includes('relation') && normalized.includes('does not exist'))
	)
}

function parseTags(value: string) {
	return [
		...new Set(
			value
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
	].slice(0, 12)
}

async function createExampleAction(formData: FormData) {
	'use server'

	const profile = await requireTeacher()
	const adminData = createAdminDataClient()
	const title = String(formData.get('title') ?? '').trim()
	const authorName = String(formData.get('authorName') ?? '').trim()
	const body = String(formData.get('body') ?? '').trim()
	const editorialNote = String(formData.get('editorialNote') ?? '').trim()
	const contentNote = String(formData.get('contentNote') ?? '').trim()
	const sourceLabel = String(formData.get('sourceLabel') ?? '').trim()
	const copyrightStatus =
		String(formData.get('copyrightStatus') ?? '') || 'teacher-owned'
	const craftTags = parseTags(String(formData.get('craftTags') ?? ''))

	if (!title || !body) {
		redirect('/app/teacher/examples?error=Title+and+story+text+are+required.')
	}

	const insertResult = await adminData
		.from('teaching_examples')
		.insert({
			owner_id: profile.user.id,
			title,
			author_name: authorName,
			body,
			editorial_note: editorialNote,
			content_note: contentNote,
			source_label: sourceLabel,
			copyright_status: copyrightStatus,
			craft_tags: craftTags,
			status: 'draft',
			visible_to_all_groups: true,
		})
		.select('id')
		.single()

	if (insertResult.error || !insertResult.data) {
		redirect('/app/teacher/examples?error=Unable+to+create+example.')
	}

	redirect(`/app/teacher/examples/${insertResult.data.id}?notice=Draft+created.`)
}

export default async function TeacherExamplesPage({
	searchParams,
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	await requireTeacher()
	const params = searchParams ? await searchParams : {}
	const notice = toMessage(params.notice)
	const errorNotice = toMessage(params.error)
	const adminData = createAdminDataClient()
	let examples: ExampleRow[] = []
	let annotationCounts: Record<string, number> = {}
	let loadError: string | null = null

	const examplesResult = await adminData
		.from('teaching_examples')
		.select(
			'id, title, author_name, source_label, copyright_status, editorial_note, content_note, craft_tags, status, updated_at, published_at',
		)
		.order('updated_at', { ascending: false })
		.limit(80)

	if (examplesResult.error) {
		loadError = isSchemaCacheMissing(examplesResult.error.message)
			? 'Annotated examples need the teaching_examples migration before they can be saved.'
			: examplesResult.error.message
	} else {
		examples = (examplesResult.data ?? []) as ExampleRow[]
		const exampleIds = examples.map((example) => example.id)
		if (exampleIds.length > 0) {
			const countResult = await adminData
				.from('teaching_example_annotations')
				.select('example_id')
				.in('example_id', exampleIds)

			annotationCounts = ((countResult.data ?? []) as CountRow[]).reduce(
				(acc, row) => {
					acc[row.example_id] = (acc[row.example_id] ?? 0) + 1
					return acc
				},
				{} as Record<string, number>,
			)
		}
	}

	return (
		<section className="space-y-5">
			<div className="surface p-5 lg:p-6">
				<div>
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						Annotated examples
					</p>
					<h1 className="literary-title mt-2 text-3xl text-parchment-100">
						Close-reading library
					</h1>
					<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
						Create model readings, annotate them in place, and publish them to
						writer groups as craft exemplars. Open any story from the library
						below, or paste a new one to begin.
					</p>
				</div>
			</div>

			{notice ? (
				<p className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
					{notice}
				</p>
			) : null}
			{errorNotice || loadError ? (
				<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
					{errorNotice ?? loadError}
				</p>
			) : null}

			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
				<div className="space-y-3">
					{examples.length === 0 && !loadError ? (
						<div className="surface p-5 lg:p-6">
							<h2 className="literary-title text-2xl text-parchment-100">
								No examples yet
							</h2>
							<p className="muted mt-3 text-sm leading-relaxed">
								Paste a teacher-owned, licensed, or public-domain text to begin
								building the close-reading library.
							</p>
						</div>
					) : null}
					{examples.map((example) => (
						<article
							key={example.id}
							className="rounded-2xl border border-white/12 bg-white/[0.04] p-5">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<p className="text-xs uppercase tracking-[0.12em] text-accent-200">
									{example.status ?? 'draft'}
								</p>
								<p className="text-xs text-silver-300">
									{annotationCounts[example.id] ?? 0} notes
								</p>
							</div>
							<h2 className="literary-title mt-2 text-2xl text-parchment-100">
								{example.title}
							</h2>
							<p className="mt-1 text-sm text-silver-200">
								{example.author_name || 'Unknown author'} {' · '}
								{example.copyright_status ?? 'teacher-owned'}
							</p>
							<p className="mt-3 line-clamp-2 text-sm leading-relaxed text-silver-100">
								{example.editorial_note ||
									'No editorial introduction has been added yet.'}
							</p>
							<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
								<div className="flex flex-wrap gap-1.5">
									{(example.craft_tags ?? []).slice(0, 4).map((tag) => (
										<span
											key={tag}
											className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-silver-200">
											{tag}
										</span>
									))}
								</div>
								<Link
									href={`/app/teacher/examples/${example.id}`}
									className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-silver-100 transition hover:border-white/30 hover:text-parchment-100">
									Open
								</Link>
							</div>
						</article>
					))}
				</div>

				<form action={createExampleAction} className="surface p-5 lg:p-6">
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						Paste another story
					</p>
					<div className="mt-4 space-y-3">
						<label className="block">
							<span className="mb-1.5 block text-sm text-silver-100">Title</span>
							<input
								name="title"
								required
								placeholder="Story title"
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100"
							/>
						</label>
						<label className="block">
							<span className="mb-1.5 block text-sm text-silver-100">
								Author
							</span>
							<input
								name="authorName"
								placeholder="Author name"
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 placeholder:text-silver-400"
							/>
						</label>
						<label className="block">
							<span className="mb-1.5 block text-sm text-silver-100">
								Copyright status
							</span>
							<select
								name="copyrightStatus"
								defaultValue="teacher-owned"
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100">
								<option value="teacher-owned">Teacher-owned</option>
								<option value="public-domain">Public domain</option>
								<option value="licensed">Licensed</option>
								<option value="permission-needed">Permission needed</option>
							</select>
						</label>
						<label className="block">
							<span className="mb-1.5 block text-sm text-silver-100">
								Source label
							</span>
							<input
								name="sourceLabel"
								placeholder="Project Gutenberg, own story, anthology..."
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 placeholder:text-silver-400"
							/>
						</label>
						<label className="block">
							<span className="mb-1.5 block text-sm text-silver-100">
								Editorial introduction
							</span>
							<textarea
								name="editorialNote"
								rows={4}
								placeholder="What should readers notice before they begin?"
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 placeholder:text-silver-400"
							/>
						</label>
						<label className="block">
							<span className="mb-1.5 block text-sm text-silver-100">
								Content note
							</span>
							<textarea
								name="contentNote"
								rows={3}
								placeholder="Optional content note"
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 placeholder:text-silver-400"
							/>
						</label>
						<label className="block">
							<span className="mb-1.5 block text-sm text-silver-100">
								Craft tags
							</span>
							<input
								name="craftTags"
								placeholder="pacing, ending, point of view"
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 placeholder:text-silver-400"
							/>
						</label>
						<label className="block">
							<span className="mb-1.5 block text-sm text-silver-100">
								Story text
							</span>
							<textarea
								name="body"
								required
								rows={12}
								placeholder="Paste the full story text here. Blank lines become paragraphs for annotation."
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 font-serif text-[16px] leading-7 text-parchment-100 placeholder:text-silver-400"
							/>
						</label>
					</div>
					<button
						type="submit"
						className="mt-4 w-full rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30">
						Create draft from pasted story
					</button>
				</form>
			</div>
		</section>
	)
}
