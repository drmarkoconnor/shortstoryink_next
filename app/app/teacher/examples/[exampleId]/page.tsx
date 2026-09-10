import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { TeacherExampleAnnotationWorkspace } from '@/components/teacher/example-annotation-workspace'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
import { createAdminDataClient } from '@/lib/data/client'
import {
	exampleCategorySlug,
	normalizeExampleCategory,
	normalizeExampleTags,
	type ExampleAnnotation,
	type ExampleCopyrightStatus,
	type ExampleStatus,
} from '@/lib/teaching-examples/types'

type ExampleRow = {
	id: string
	title: string
	author_name: string | null
	source_label: string | null
	source_url: string | null
	copyright_status: ExampleCopyrightStatus | null
	editorial_note: string | null
	content_note: string | null
	body: string
	craft_tags: string[] | null
	status: ExampleStatus | null
	updated_at: string
	published_at: string | null
}

type AnnotationRow = {
	id: string
	comment: string
	category_label: string | null
	category_slug: string | null
	tags: string[] | null
	anchor: unknown
	created_at: string
}

type GroupRow = {
	id: string
	title: string
}

type HiddenGroupRow = {
	workshop_id: string
}

function toMessage(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
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

function normalizeCopyrightStatus(value: string): ExampleCopyrightStatus {
	if (
		value === 'public-domain' ||
		value === 'licensed' ||
		value === 'permission-needed'
	) {
		return value
	}
	return 'teacher-owned'
}

function toAnnotation(row: AnnotationRow): ExampleAnnotation {
	const categoryLabel = normalizeExampleCategory(row.category_label)
	return {
		id: row.id,
		comment: row.comment,
		categoryLabel,
		categorySlug: row.category_slug ?? exampleCategorySlug(categoryLabel),
		tags: normalizeExampleTags(row.tags),
		anchor: row.anchor as ExampleAnnotation['anchor'],
		createdAt: row.created_at,
	}
}

async function updateExampleMetadataAction(formData: FormData) {
	'use server'

	await requireTeacher()
	const adminData = createAdminDataClient()
	const exampleId = String(formData.get('exampleId') ?? '').trim()
	const title = String(formData.get('title') ?? '').trim()
	const authorName = String(formData.get('authorName') ?? '').trim()
	const sourceLabel = String(formData.get('sourceLabel') ?? '').trim()
	const sourceUrl = String(formData.get('sourceUrl') ?? '').trim()
	const copyrightStatus = normalizeCopyrightStatus(
		String(formData.get('copyrightStatus') ?? ''),
	)
	const editorialNote = String(formData.get('editorialNote') ?? '').trim()
	const contentNote = String(formData.get('contentNote') ?? '').trim()
	const body = String(formData.get('body') ?? '').trim()
	const craftTags = parseTags(String(formData.get('craftTags') ?? ''))

	if (!exampleId || !title) {
		redirect('/app/teacher/examples?error=Unable+to+save+example.')
	}

	const existingResult = await adminData
		.from('teaching_examples')
		.select('status')
		.eq('id', exampleId)
		.maybeSingle()

	if (existingResult.error || !existingResult.data) {
		redirect(`/app/teacher/examples/${exampleId}?error=Example+not+found.`)
	}

	const isDraft = existingResult.data.status !== 'published'
	if (isDraft && !body) {
		redirect(`/app/teacher/examples/${exampleId}?error=Story+text+is+required.`)
	}

	const { error } = await adminData
		.from('teaching_examples')
		.update({
			title,
			author_name: authorName,
			source_label: sourceLabel,
			source_url: sourceUrl || null,
			copyright_status: copyrightStatus,
			editorial_note: editorialNote,
			content_note: contentNote,
			...(isDraft ? { body } : {}),
			craft_tags: craftTags,
		})
		.eq('id', exampleId)

	if (error) {
		redirect(`/app/teacher/examples/${exampleId}?error=Unable+to+save+details.`)
	}

	redirect(`/app/teacher/examples/${exampleId}?notice=Details+saved.`)
}

async function updateExampleVisibilityAction(formData: FormData) {
	'use server'

	await requireTeacher()
	const adminData = createAdminDataClient()
	const exampleId = String(formData.get('exampleId') ?? '').trim()
	const visibleGroupIds = new Set(
		formData
			.getAll('visibleGroupIds')
			.map((value) => String(value).trim())
			.filter(Boolean),
	)

	if (!exampleId) {
		redirect('/app/teacher/examples?error=Unable+to+save+group+visibility.')
	}

	const { data: groups, error: groupError } = await adminData
		.from('workshops')
		.select('id')

	if (groupError) {
		redirect(
			`/app/teacher/examples/${exampleId}?error=Unable+to+load+groups+for+visibility.`,
		)
	}

	const hiddenRows = ((groups ?? []) as Array<{ id: string }>)
		.map((group) => group.id)
		.filter((groupId) => !visibleGroupIds.has(groupId))
		.map((groupId) => ({
			example_id: exampleId,
			workshop_id: groupId,
		}))

	const deleteResult = await adminData
		.from('teaching_example_hidden_groups')
		.delete()
		.eq('example_id', exampleId)

	if (deleteResult.error) {
		redirect(
			`/app/teacher/examples/${exampleId}?error=Unable+to+reset+group+visibility.`,
		)
	}

	if (hiddenRows.length > 0) {
		const insertResult = await adminData
			.from('teaching_example_hidden_groups')
			.insert(hiddenRows)

		if (insertResult.error) {
			redirect(
				`/app/teacher/examples/${exampleId}?error=Unable+to+save+group+visibility.`,
			)
		}
	}

	redirect(`/app/teacher/examples/${exampleId}?notice=Group+visibility+saved.`)
}

export default async function TeacherExampleDetailPage({
	params,
	searchParams,
}: {
	params: Promise<{ exampleId: string }>
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	await requireTeacher()
	const { exampleId } = await params
	const query = searchParams ? await searchParams : {}
	const notice = toMessage(query.notice)
	const errorNotice = toMessage(query.error)
	const adminData = createAdminDataClient()

	const exampleResult = await adminData
		.from('teaching_examples')
		.select(
			'id, title, author_name, source_label, source_url, copyright_status, editorial_note, content_note, body, craft_tags, status, updated_at, published_at',
		)
		.eq('id', exampleId)
		.maybeSingle()

	if (exampleResult.error || !exampleResult.data) {
		notFound()
	}

	const example = exampleResult.data as ExampleRow
	const annotationsResult = await adminData
		.from('teaching_example_annotations')
		.select('id, comment, category_label, category_slug, tags, anchor, created_at')
		.eq('example_id', example.id)
		.order('created_at', { ascending: true })

	const annotations = ((annotationsResult.data ?? []) as AnnotationRow[]).map(
		toAnnotation,
	)

	const groupsResult = await adminData
		.from('workshops')
		.select('id, title')
		.order('title', { ascending: true })
	const groups = (groupsResult.data ?? []) as GroupRow[]

	const hiddenGroupsResult = await adminData
		.from('teaching_example_hidden_groups')
		.select('workshop_id')
		.eq('example_id', example.id)
	const hiddenGroupIds = new Set(
		((hiddenGroupsResult.data ?? []) as HiddenGroupRow[]).map(
			(row) => row.workshop_id,
		),
	)

	return (
		<section className="mx-auto max-w-6xl space-y-6">
			<div className="border-b border-studio-line pb-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-xs uppercase tracking-[0.12em] text-studio-muted">
							Annotated example
						</p>
						<h1 className="literary-title mt-2 text-3xl text-studio-ink">
							{example.title}
						</h1>
						<p className="mt-2 text-sm text-studio-muted">
							{example.author_name || 'Unknown author'} {' · '}
							{example.status ?? 'draft'} {' · '} {annotations.length} notes
						</p>
					</div>
					<Link
						href="/app/teacher/examples"
						className="rounded border border-studio-line px-4 py-2 text-sm text-studio-muted transition hover:border-studio-line hover:text-studio-ink">
						Back to examples
					</Link>
				</div>
			</div>

			<details className="border-b border-studio-line pb-5"><summary className="cursor-pointer text-sm text-studio-muted">Reading details and group visibility</summary><div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
				<form action={updateExampleMetadataAction} className="surface p-5">
					<input type="hidden" name="exampleId" value={example.id} />
					<p className="text-xs uppercase tracking-[0.12em] text-studio-muted">
						Reader framing
					</p>
					<div className="mt-4 grid gap-3 md:grid-cols-2">
						<label className="block md:col-span-2">
							<span className="mb-1.5 block text-sm text-studio-muted">Title</span>
							<input
								name="title"
								defaultValue={example.title}
								required
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink"
							/>
						</label>
						<label className="block">
							<span className="mb-1.5 block text-sm text-studio-muted">
								Author
							</span>
							<input
								name="authorName"
								defaultValue={example.author_name ?? ''}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink"
							/>
						</label>
						<label className="block">
							<span className="mb-1.5 block text-sm text-studio-muted">
								Copyright
							</span>
							<select
								name="copyrightStatus"
								defaultValue={example.copyright_status ?? 'teacher-owned'}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink">
								<option value="teacher-owned">Teacher-owned</option>
								<option value="public-domain">Public domain</option>
								<option value="licensed">Licensed</option>
								<option value="permission-needed">Permission needed</option>
							</select>
						</label>
						<label className="block">
							<span className="mb-1.5 block text-sm text-studio-muted">
								Source label
							</span>
							<input
								name="sourceLabel"
								defaultValue={example.source_label ?? ''}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink"
							/>
						</label>
						<label className="block">
							<span className="mb-1.5 block text-sm text-studio-muted">
								Source URL
							</span>
							<input
								name="sourceUrl"
								defaultValue={example.source_url ?? ''}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink"
							/>
						</label>
						<label className="block md:col-span-2">
							<span className="mb-1.5 block text-sm text-studio-muted">
								Editorial introduction
							</span>
							<textarea
								name="editorialNote"
								rows={4}
								defaultValue={example.editorial_note ?? ''}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2 text-studio-ink"
							/>
						</label>
						<label className="block md:col-span-2">
							<span className="mb-1.5 block text-sm text-studio-muted">
								Content note
							</span>
							<textarea
								name="contentNote"
								rows={3}
								defaultValue={example.content_note ?? ''}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2 text-studio-ink"
							/>
						</label>
						<label className="block md:col-span-2">
							<span className="mb-1.5 block text-sm text-studio-muted">
								Craft tags
							</span>
							<input
								name="craftTags"
								defaultValue={(example.craft_tags ?? []).join(', ')}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink"
							/>
						</label>
						<label className="block md:col-span-2">
							<span className="mb-1.5 block text-sm text-studio-muted">
								Story text
							</span>
							<textarea
								name="body"
								rows={12}
								required={example.status !== 'published'}
								disabled={example.status === 'published'}
								defaultValue={example.body}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2 font-serif text-[16px] leading-7 text-studio-ink disabled:cursor-not-allowed disabled:opacity-55"
							/>
							<p className="mt-1.5 text-xs leading-5 text-studio-muted">
								{example.status === 'published'
									? 'Published examples keep their story text locked so reader anchors remain stable.'
									: 'Edit story text before publishing. Changing paragraph text may move or invalidate existing annotation anchors.'}
							</p>
						</label>
					</div>
					<button
						type="submit"
						className="studio-primary mt-4">
						Save details
					</button>
				</form>

				<form action={updateExampleVisibilityAction} className="surface p-5">
					<input type="hidden" name="exampleId" value={example.id} />
					<p className="text-xs uppercase tracking-[0.12em] text-studio-muted">
						Group visibility
					</p>
					<p className="mt-3 text-sm leading-relaxed text-studio-muted">
						Examples are available to all groups by default. Untick a group to
						hide this example from writers in that group.
					</p>
					<div className="mt-4 grid gap-2">
						{groups.length === 0 ? (
							<p className="rounded-md border border-studio-line bg-studio-tint px-3 py-2 text-sm text-studio-muted">
								No groups found.
							</p>
						) : null}
						{groups.map((group) => (
							<label
								key={group.id}
								className="flex items-center justify-between gap-3 rounded-md border border-studio-line bg-studio-tint px-3 py-2">
								<span className="text-sm text-studio-muted">{group.title}</span>
								<input
									type="checkbox"
									name="visibleGroupIds"
									value={group.id}
									defaultChecked={!hiddenGroupIds.has(group.id)}
									className="h-4 w-4 accent-burgundy-300"
								/>
							</label>
						))}
					</div>
					<button
						type="submit"
						className="studio-primary mt-4">
						Save visibility
					</button>
				</form>
			</div>

</details>
			<TeacherExampleAnnotationWorkspace
				exampleId={example.id}
				title={example.title}
				status={example.status ?? 'draft'}
				paragraphs={toManuscriptParagraphs(example.body)}
				annotations={annotations}
				notice={notice}
				errorNotice={errorNotice}
			/>
		</section>
	)
}
