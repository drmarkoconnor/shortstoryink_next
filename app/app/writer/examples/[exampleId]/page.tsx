import { notFound } from 'next/navigation'
import { ExampleReadingWorkspace } from '@/components/writer/example-reading-workspace'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import {
	exampleCategorySlug,
	normalizeExampleCategory,
	normalizeExampleTags,
	type ExampleAnnotation,
	type ExampleCopyrightStatus,
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
	status: string | null
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

type HiddenGroupRow = {
	workshop_id: string
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

export default async function WriterExampleReaderPage({
	params,
}: {
	params: Promise<{ exampleId: string }>
}) {
	await requireWriter()
	const user = await getCurrentUser()
	const { exampleId } = await params
	const adminSupabase = createAdminSupabaseClient()

	const { data: memberRows, error: membershipError } = await adminSupabase
		.from('workshop_members')
		.select('workshop_id')
		.eq('profile_id', user.id)

	if (membershipError) {
		notFound()
	}

	const writerGroupIds = [
		...new Set((memberRows ?? []).map((row) => row.workshop_id as string)),
	]
	if (writerGroupIds.length === 0) {
		notFound()
	}

	const exampleResult = await adminSupabase
		.from('teaching_examples')
		.select(
			'id, title, author_name, copyright_status, editorial_note, content_note, body, craft_tags, status',
		)
		.eq('id', exampleId)
		.eq('status', 'published')
		.maybeSingle()

	if (exampleResult.error || !exampleResult.data) {
		notFound()
	}

	const hiddenGroupsResult = await adminSupabase
		.from('teaching_example_hidden_groups')
		.select('workshop_id')
		.eq('example_id', exampleId)
	const hiddenGroupIds = new Set(
		((hiddenGroupsResult.data ?? []) as HiddenGroupRow[]).map(
			(row) => row.workshop_id,
		),
	)
	const canRead = writerGroupIds.some((groupId) => !hiddenGroupIds.has(groupId))
	if (!canRead) {
		notFound()
	}

	const annotationsResult = await adminSupabase
		.from('teaching_example_annotations')
		.select('id, comment, category_label, category_slug, tags, anchor, created_at')
		.eq('example_id', exampleId)
		.order('created_at', { ascending: true })

	const example = exampleResult.data as ExampleRow
	const annotations = ((annotationsResult.data ?? []) as AnnotationRow[]).map(
		toAnnotation,
	)

	return (
		<ExampleReadingWorkspace
			title={example.title}
			authorName={example.author_name ?? ''}
			editorialNote={example.editorial_note ?? ''}
			contentNote={example.content_note ?? ''}
			craftTags={example.craft_tags ?? []}
			paragraphs={toManuscriptParagraphs(example.body)}
			annotations={annotations}
		/>
	)
}
