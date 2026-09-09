import { notFound } from 'next/navigation'
import { ExampleReadingWorkspace } from '@/components/writer/example-reading-workspace'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { toManuscriptParagraphs } from '@/lib/manuscript/paragraphs'
import { createServerDataClient } from '@/lib/data/client'
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
	const { exampleId } = await params
	const db = await createServerDataClient()

	const exampleResult = await db
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

	const annotationsResult = await db
		.from('teaching_example_annotations')
		.select('id, comment, category_label, category_slug, tags, anchor, created_at')
		.eq('example_id', exampleId)
		.order('created_at', { ascending: true })

	if (annotationsResult.error) throw new Error('Annotations could not be loaded. Please try again.')
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
