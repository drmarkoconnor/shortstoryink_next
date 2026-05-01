'use client'

import { mergeAttributes, Node, type JSONContent } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
	fixedSnippetCategories,
	normalizeSnippetLabel,
} from '@/lib/feedback/categories'
import {
	normalizeTeachingDocumentType,
	teachingDocumentTypes,
	type TeachingDocumentType,
} from '@/lib/teacher-documents/types'

export type SnippetSourceMetadata = {
	sourceType?: string
	sourceSubmissionId?: string | null
	sourceFeedbackItemId?: string | null
	sourceAuthorId?: string | null
	sourceLabel?: string
	sourceKind?: string
	originalSource?: string
	createdByLabel?: string
	createdAt?: string | null
	sourceName?: string
	sourceUrl?: string
	sourceSection?: string
	sourceTypeLabel?: string
}

export type BuilderSnippet = {
	id: string
	text: string
	note: string
	categoryLabel: string
	tags: string[]
	sourceMetadata: SnippetSourceMetadata
}

export type SavedTeachingDocument = {
	id: string
	title: string
	documentType: TeachingDocumentType
	groupIds: string[]
	content: JSONContent
	createdAt: string
	updatedAt: string
}

export type TeacherDocumentGroup = {
	id: string
	title: string
}

type SnippetExampleAttrs = {
	snippetId: string
	text: string
	note: string
	includeNote: boolean
	category: string
	tags: string[]
	sourceMetadata: SnippetSourceMetadata
}

type SelectedSnippetExample = {
	position: number
	attrs: SnippetExampleAttrs
}

const defaultDocumentType: TeachingDocumentType = 'Teaching note'

const emptySourceMetadata: SnippetSourceMetadata = {}

const initialContent: JSONContent = {
	type: 'doc',
	content: [
		{
			type: 'heading',
			attrs: { level: 1 },
			content: [{ type: 'text', text: 'Teaching document' }],
		},
		{
			type: 'paragraph',
			content: [
				{
					type: 'text',
					text: 'Write a short introduction, then insert snippets as teaching examples.',
				},
			],
		},
	],
}

function parseJsonAttribute<T>(value: string | null, fallback: T): T {
	if (!value) {
		return fallback
	}

	try {
		return JSON.parse(value) as T
	} catch {
		return fallback
	}
}

const SnippetExampleNode = Node.create({
	name: 'snippetExample',
	group: 'block',
	atom: true,
	selectable: true,

	addAttributes() {
		return {
			snippetId: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-snippet-id') ?? '',
				renderHTML: (attributes: Record<string, unknown>) => ({
					'data-snippet-id': String(attributes.snippetId ?? ''),
				}),
			},
			text: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-snippet-text') ?? '',
				renderHTML: (attributes: Record<string, unknown>) => ({
					'data-snippet-text': String(attributes.text ?? ''),
				}),
			},
			note: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-snippet-note') ?? '',
				renderHTML: (attributes: Record<string, unknown>) => ({
					'data-snippet-note': String(attributes.note ?? ''),
				}),
			},
			includeNote: {
				default: true,
				parseHTML: (element) =>
					element.getAttribute('data-snippet-include-note') !== 'false',
				renderHTML: (attributes: Record<string, unknown>) => ({
					'data-snippet-include-note':
						attributes.includeNote === false ? 'false' : 'true',
				}),
			},
			category: {
				default: 'Uncategorised',
				parseHTML: (element) =>
					element.getAttribute('data-snippet-category') ?? 'Uncategorised',
				renderHTML: (attributes: Record<string, unknown>) => ({
					'data-snippet-category': String(attributes.category ?? 'Uncategorised'),
				}),
			},
			tags: {
				default: [],
				parseHTML: (element) =>
					parseJsonAttribute<string[]>(element.getAttribute('data-snippet-tags'), []),
				renderHTML: (attributes: Record<string, unknown>) => ({
					'data-snippet-tags': JSON.stringify(attributes.tags ?? []),
				}),
			},
			sourceMetadata: {
				default: emptySourceMetadata,
				parseHTML: (element) =>
					parseJsonAttribute<SnippetSourceMetadata>(
						element.getAttribute('data-snippet-source'),
						emptySourceMetadata,
					),
				renderHTML: (attributes: Record<string, unknown>) => ({
					'data-snippet-source': JSON.stringify(
						attributes.sourceMetadata ?? emptySourceMetadata,
					),
				}),
			},
		}
	},

	parseHTML() {
		return [{ tag: 'aside[data-type="snippet-example"]' }]
	},

	renderHTML({ HTMLAttributes, node }) {
		const attrs = snippetAttrsFromNode({ type: 'snippetExample', attrs: node.attrs })
		const attribution = snippetAttribution(attrs.sourceMetadata)

		return [
			'aside',
			mergeAttributes(HTMLAttributes, {
				'data-type': 'snippet-example',
				class: 'tiptap-snippet-example',
			}),
			['blockquote', { class: 'tiptap-snippet-example__text' }, attrs.text],
			attribution
				? ['p', { class: 'tiptap-snippet-example__source' }, attribution]
				: ['p', { class: 'tiptap-snippet-example__source' }, 'Teaching example'],
			attrs.includeNote && attrs.note
				? ['p', { class: 'tiptap-snippet-example__note' }, attrs.note]
				: ['p', { class: 'tiptap-snippet-example__note' }, ''],
		]
	},
})

function normalizeDocumentType(value: unknown): TeachingDocumentType {
	return normalizeTeachingDocumentType(value)
}

function compactPreview(value: string, limit = 150) {
	const normalized = value.replace(/\s+/g, ' ').trim()
	if (normalized.length <= limit) {
		return normalized
	}
	return `${normalized.slice(0, limit - 1).trimEnd()}...`
}

function todayStamp() {
	return new Date().toISOString().slice(0, 10)
}

function safeFilenamePart(value: string) {
	return value
		.trim()
		.replace(/[\\/:*?"<>|]+/g, '')
		.replace(/\s+/g, ' ')
		.slice(0, 90)
}

function printFilename(title: string) {
	const safeTitle = safeFilenamePart(title) || 'Teaching document'
	return `${safeTitle} - ${todayStamp()}`
}

function categoryForSnippet(snippet: BuilderSnippet) {
	return normalizeSnippetLabel(snippet.categoryLabel)
}

function snippetAttrsFromNode(node: JSONContent): SnippetExampleAttrs {
	const attrs = node.attrs ?? {}
	const tags = Array.isArray(attrs.tags)
		? attrs.tags.map((tag) => String(tag).trim()).filter(Boolean)
		: []
	const sourceMetadata =
		attrs.sourceMetadata && typeof attrs.sourceMetadata === 'object'
			? (attrs.sourceMetadata as SnippetSourceMetadata)
			: emptySourceMetadata

	return {
		snippetId: String(attrs.snippetId ?? ''),
		text: String(attrs.text ?? ''),
		note: String(attrs.note ?? ''),
		includeNote: attrs.includeNote !== false,
		category: normalizeSnippetLabel(String(attrs.category ?? 'Uncategorised')),
		tags,
		sourceMetadata,
	}
}

function snippetAttribution(source: SnippetSourceMetadata) {
	const label = source.sourceLabel || source.createdByLabel
	const kind = source.sourceKind || source.originalSource

	if (label && kind) {
		return `${label}, ${kind}`
	}
	if (label) {
		return label
	}
	if (kind) {
		return kind
	}
	return ''
}

function emptyParagraph(text = ''): JSONContent {
	return text
		? {
				type: 'paragraph',
				content: [{ type: 'text', text }],
			}
		: { type: 'paragraph' }
}

function sectionHeading(title = 'New section'): JSONContent {
	return {
		type: 'heading',
		attrs: { level: 2 },
		content: [{ type: 'text', text: title }],
	}
}

function nodeIsSectionHeading(node: JSONContent) {
	return node.type === 'heading' && Number(node.attrs?.level ?? 0) === 2
}

function sectionRanges(content: JSONContent[]) {
	const ranges: Array<{ start: number; end: number }> = []
	for (let index = 0; index < content.length; index += 1) {
		if (!nodeIsSectionHeading(content[index])) {
			continue
		}
		const nextHeading = content.findIndex(
			(node, nextIndex) => nextIndex > index && nodeIsSectionHeading(node),
		)
		ranges.push({
			start: index,
			end: nextHeading === -1 ? content.length : nextHeading,
		})
	}
	return ranges
}

function activeSectionIndex(content: JSONContent[], topLevelIndex = content.length - 1) {
	for (let index = Math.min(topLevelIndex, content.length - 1); index >= 0; index -= 1) {
		if (nodeIsSectionHeading(content[index])) {
			return index
		}
	}
	return -1
}

function currentTopLevelIndex(editor: Editor) {
	return editor.state.selection.$from.index(0)
}

function moveSection(
	content: JSONContent[],
	direction: 'up' | 'down',
	topLevelIndex?: number,
) {
	const ranges = sectionRanges(content)
	const currentStart = activeSectionIndex(content, topLevelIndex)
	const currentRangeIndex = ranges.findIndex((range) => range.start === currentStart)
	const targetRangeIndex =
		direction === 'up' ? currentRangeIndex - 1 : currentRangeIndex + 1

	if (
		currentRangeIndex < 0 ||
		targetRangeIndex < 0 ||
		targetRangeIndex >= ranges.length
	) {
		return content
	}

	const current = ranges[currentRangeIndex]
	const target = ranges[targetRangeIndex]
	const currentSlice = content.slice(current.start, current.end)
	const targetSlice = content.slice(target.start, target.end)

	if (direction === 'up') {
		return [
			...content.slice(0, target.start),
			...currentSlice,
			...targetSlice,
			...content.slice(current.end),
		]
	}

	return [
		...content.slice(0, current.start),
		...targetSlice,
		...currentSlice,
		...content.slice(target.end),
	]
}

function documentSectionDomId(topLevelIndex: number) {
	return `document-section-${topLevelIndex}`
}

function textFromNode(node: JSONContent | undefined): string {
	if (!node) {
		return ''
	}
	if (typeof node.text === 'string') {
		return node.text
	}
	return (node.content ?? []).map(textFromNode).join('')
}

function headingTitle(node: JSONContent, fallback: string) {
	return textFromNode(node).replace(/\s+/g, ' ').trim() || fallback
}

function outlineSections(content: JSONContent[] | undefined) {
	return (content ?? [])
		.map((node, topLevelIndex) => ({ node, topLevelIndex }))
		.filter(({ node }) => nodeIsSectionHeading(node))
		.map(({ node, topLevelIndex }) => ({
			id: documentSectionDomId(topLevelIndex),
			title: headingTitle(node, `Section ${topLevelIndex + 1}`),
			topLevelIndex,
		}))
}

function editorPositionForTopLevelIndex(editor: Editor, topLevelIndex: number) {
	let position = 1
	for (let index = 0; index < topLevelIndex; index += 1) {
		position += editor.state.doc.child(index).nodeSize
	}
	return Math.min(position + 1, editor.state.doc.content.size)
}

function selectedSnippetFromEditor(editor: Editor): SelectedSnippetExample | null {
	const { selection } = editor.state
	if (
		!(selection instanceof NodeSelection) ||
		selection.node.type.name !== 'snippetExample'
	) {
		return null
	}

	return {
		position: selection.from,
		attrs: snippetAttrsFromNode({
			type: 'snippetExample',
			attrs: selection.node.attrs,
		}),
	}
}

function renderInlineContent(nodes: JSONContent[] | undefined): ReactNode {
	return (nodes ?? []).map((node, index) => {
		if (node.type === 'text') {
			let content: ReactNode = node.text ?? ''
			for (const mark of node.marks ?? []) {
				if (mark.type === 'bold') {
					content = <strong key={`${index}-bold`}>{content}</strong>
				}
				if (mark.type === 'italic') {
					content = <em key={`${index}-italic`}>{content}</em>
				}
			}
			return <span key={index}>{content}</span>
		}

		if (node.type === 'hardBreak') {
			return <br key={index} />
		}

		return <span key={index}>{renderInlineContent(node.content)}</span>
	})
}

function renderListItem(node: JSONContent, index: number) {
	return (
		<li key={index}>
			{(node.content ?? []).map((child, childIndex) => (
				<span key={childIndex}>{renderInlineContent(child.content)}</span>
			))}
		</li>
	)
}

function renderPrintNode(node: JSONContent, index: number) {
	if (node.type === 'heading') {
		const level = Number(node.attrs?.level ?? 2)
		if (level === 1) {
			return (
				<h1 key={index} className="literary-title mt-7 text-4xl text-ink-900">
					{renderInlineContent(node.content)}
				</h1>
			)
		}
		if (level === 2) {
			return (
				<h2
					key={index}
					id={documentSectionDomId(index)}
					data-document-section-index={index}
					className="literary-title mt-6 scroll-mt-24 text-2xl text-ink-900">
					{renderInlineContent(node.content)}
				</h2>
			)
		}
		return (
			<h3 key={index} className="mt-5 text-lg font-semibold text-ink-900">
				{renderInlineContent(node.content)}
			</h3>
		)
	}

	if (node.type === 'bulletList') {
		return (
			<ul key={index} className="mt-3 list-disc space-y-1 pl-5 text-[15px] leading-7 text-ink-900/86">
				{(node.content ?? []).map(renderListItem)}
			</ul>
		)
	}

	if (node.type === 'orderedList') {
		return (
			<ol key={index} className="mt-3 list-decimal space-y-1 pl-5 text-[15px] leading-7 text-ink-900/86">
				{(node.content ?? []).map(renderListItem)}
			</ol>
		)
	}

	if (node.type === 'blockquote') {
		return (
			<blockquote key={index} className="mt-4 border-l-2 border-accent-700/35 px-4 py-2 text-[15px] leading-7 text-ink-900/78">
				{(node.content ?? []).map((child, childIndex) => (
					<p key={childIndex}>{renderInlineContent(child.content)}</p>
				))}
			</blockquote>
		)
	}

	if (node.type === 'snippetExample') {
		const attrs = snippetAttrsFromNode(node)
		const attribution = snippetAttribution(attrs.sourceMetadata)

		return (
			<aside
				key={index}
				className="print-break-avoid mt-5 border-l-2 border-accent-700/45 py-2 pl-5">
				<div className="relative">
					<span
						aria-hidden="true"
						className="absolute -left-4 -top-3 font-serif text-5xl leading-none text-accent-700/40">
						&ldquo;
					</span>
					<p className="whitespace-pre-wrap font-serif text-[17px] italic leading-8 text-ink-900/88">
						{attrs.text}
					</p>
					<span
						aria-hidden="true"
						className="mt-1 block text-right font-serif text-4xl leading-none text-accent-700/35">
						&rdquo;
					</span>
				</div>
				{attribution ? (
					<p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-ink-900/45">
						{attribution}
					</p>
				) : null}
				{attrs.includeNote && attrs.note ? (
					<p className="mt-3 border-l border-ink-900/15 pl-3 text-[14px] leading-6 text-ink-900/72">
						{attrs.note}
					</p>
				) : null}
			</aside>
		)
	}

	if (node.type === 'paragraph') {
		return (
			<p key={index} className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-ink-900/86">
				{renderInlineContent(node.content)}
			</p>
		)
	}

	return null
}

export function DocumentBuilder({
	initialSnippets,
	initialDocuments,
	initialGroups,
	persistenceNotice,
}: {
	initialSnippets: BuilderSnippet[]
	initialDocuments: SavedTeachingDocument[]
	initialGroups: TeacherDocumentGroup[]
	persistenceNotice?: string | null
}) {
	const previewRef = useRef<HTMLElement | null>(null)
	const [snippets] = useState(initialSnippets)
	const [groups] = useState(initialGroups)
	const [documents, setDocuments] = useState(initialDocuments)
	const [documentId, setDocumentId] = useState<string | null>(null)
	const [title, setTitle] = useState('Workshop notes')
	const [documentType, setDocumentType] = useState<TeachingDocumentType>(
		defaultDocumentType,
	)
	const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
	const [editorJson, setEditorJson] = useState<JSONContent>(initialContent)
	const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false)
	const [includeSnippetNotes, setIncludeSnippetNotes] = useState(true)
	const [selectedSnippet, setSelectedSnippet] =
		useState<SelectedSnippetExample | null>(null)
	const [editingSnippet, setEditingSnippet] =
		useState<SelectedSnippetExample | null>(null)
	const [snippetTextDraft, setSnippetTextDraft] = useState('')
	const [snippetNoteDraft, setSnippetNoteDraft] = useState('')
	const [snippetIncludeNoteDraft, setSnippetIncludeNoteDraft] = useState(true)
	const [snippetSearch, setSnippetSearch] = useState('')
	const [snippetCategory, setSnippetCategory] = useState('')
	const [isSaving, setIsSaving] = useState(false)
	const [notice, setNotice] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [activeSectionTopLevelIndex, setActiveSectionTopLevelIndex] = useState<
		number | null
	>(null)

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				codeBlock: false,
				horizontalRule: false,
				heading: {
					levels: [1, 2, 3],
				},
				strike: false,
			}),
			SnippetExampleNode,
		],
		content: editorJson,
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class:
					'tiptap-spike min-h-[520px] rounded-2xl border border-white/10 bg-ink-950 px-4 py-4 text-parchment-100 outline-none',
			},
		},
		onUpdate({ editor: activeEditor }) {
			setEditorJson(activeEditor.getJSON())
			setSelectedSnippet(selectedSnippetFromEditor(activeEditor))
			setNotice(null)
			setError(null)
		},
		onSelectionUpdate({ editor: activeEditor }) {
			setSelectedSnippet(selectedSnippetFromEditor(activeEditor))
		},
	})

	const categoryCounts = useMemo(() => {
		const counts: Record<string, number> = { Uncategorised: 0 }
		for (const category of fixedSnippetCategories) {
			counts[category] = 0
		}
		for (const snippet of snippets) {
			const label = categoryForSnippet(snippet)
			counts[label] = (counts[label] ?? 0) + 1
		}
		return counts
	}, [snippets])

	const filteredSnippets = useMemo(() => {
		const query = snippetSearch.trim().toLowerCase()
		return snippets
			.filter((snippet) => {
				const label = categoryForSnippet(snippet)
				if (snippetCategory === 'uncategorised' && label !== 'Uncategorised') {
					return false
				}
				if (
					snippetCategory &&
					snippetCategory !== 'uncategorised' &&
					label !== snippetCategory
				) {
					return false
				}
				if (!query) {
					return true
				}
				return [snippet.text, snippet.note, label, ...snippet.tags]
					.join(' ')
					.toLowerCase()
					.includes(query)
			})
			.slice(0, 40)
	}, [snippetCategory, snippetSearch, snippets])

	const documentsByType = useMemo(() => {
		return teachingDocumentTypes
			.map((type) => ({
				type,
				documents: documents.filter((document) => document.documentType === type),
			}))
			.filter((group) => group.documents.length > 0)
	}, [documents])
	const sections = useMemo(
		() => outlineSections(editorJson.content),
		[editorJson],
	)

	const buttonClass = (active = false) =>
		`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] transition ${
			active
				? 'border-accent-300/60 bg-accent-300/20 text-parchment-100'
				: 'border-white/15 text-silver-200 hover:border-white/25 hover:text-parchment-100'
		}`
	const utilityButtonClass =
		'rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/15 disabled:hover:text-silver-200'

	const clearMessages = () => {
		setNotice(null)
		setError(null)
	}

	const toggleGroup = (groupId: string) => {
		clearMessages()
		setSelectedGroupIds((current) =>
			current.includes(groupId)
				? current.filter((id) => id !== groupId)
				: [...current, groupId],
		)
	}

	const loadDocument = (id: string) => {
		clearMessages()
		setActiveSectionTopLevelIndex(null)
		if (!id) {
			setDocumentId(null)
			setTitle('Workshop notes')
			setDocumentType(defaultDocumentType)
			setSelectedGroupIds([])
			setEditorJson(initialContent)
			editor?.commands.setContent(initialContent)
			return
		}
		const document = documents.find((item) => item.id === id)
		if (!document) {
			return
		}
		setDocumentId(document.id)
		setTitle(document.title)
		setDocumentType(document.documentType)
		setSelectedGroupIds(document.groupIds)
		setEditorJson(document.content)
		editor?.commands.setContent(document.content)
	}

	const newDocument = () => {
		clearMessages()
		setActiveSectionTopLevelIndex(null)
		setDocumentId(null)
		setTitle('Workshop notes')
		setDocumentType(defaultDocumentType)
		setSelectedGroupIds([])
		setEditorJson(initialContent)
		editor?.commands.setContent(initialContent)
	}

	const printDocument = () => {
		const previousTitle = document.title
		document.title = printFilename(title)
		const restoreTitle = () => {
			document.title = previousTitle
			window.removeEventListener('afterprint', restoreTitle)
		}
		window.addEventListener('afterprint', restoreTitle, { once: true })
		window.print()
	}

	const insertSnippet = (snippet: BuilderSnippet) => {
		const category = categoryForSnippet(snippet)
		editor
			?.chain()
			.focus()
			.insertContent({
				type: 'snippetExample',
				attrs: {
					snippetId: snippet.id,
					text: snippet.text,
					note: snippet.note,
					includeNote: includeSnippetNotes,
					category,
					tags: snippet.tags,
					sourceMetadata: snippet.sourceMetadata,
				} satisfies SnippetExampleAttrs,
			})
			.run()
		setIsSnippetModalOpen(false)
		setSnippetSearch('')
		setSnippetCategory('')
		setNotice(`Inserted ${category} snippet.`)
	}

	const openSelectedSnippetEditor = () => {
		if (!selectedSnippet) {
			setError('Select a snippet example in the editor first.')
			return
		}
		setSnippetTextDraft(selectedSnippet.attrs.text)
		setSnippetNoteDraft(selectedSnippet.attrs.note)
		setSnippetIncludeNoteDraft(selectedSnippet.attrs.includeNote)
		setEditingSnippet(selectedSnippet)
		clearMessages()
	}

	const updateEditedSnippet = () => {
		if (!editor || !editingSnippet) {
			return
		}
		const text = snippetTextDraft.trim()
		if (!text) {
			setError('Snippet text cannot be empty.')
			return
		}
		editor
			.chain()
			.focus()
			.setNodeSelection(editingSnippet.position)
			.updateAttributes('snippetExample', {
				text,
				note: snippetNoteDraft.trim(),
				includeNote: snippetIncludeNoteDraft,
			})
			.run()
		const nextSelection = selectedSnippetFromEditor(editor)
		setSelectedSnippet(nextSelection)
		setEditingSnippet(null)
		setNotice('Snippet adjusted for this handout.')
	}

	const addSection = () => {
		editor
			?.chain()
			.focus()
			.insertContent([sectionHeading(), emptyParagraph('Add a brief section introduction.')])
			.run()
	}

	const moveCurrentSection = (direction: 'up' | 'down') => {
		if (!editor) {
			return
		}

		const content = editor.getJSON().content ?? []
		const movedContent = moveSection(content, direction, currentTopLevelIndex(editor))
		if (movedContent === content) {
			return
		}

		const nextContent: JSONContent = {
			type: 'doc',
			content: movedContent,
		}
		editor.commands.setContent(nextContent)
		setEditorJson(nextContent)
		setActiveSectionTopLevelIndex(null)
		setNotice(direction === 'up' ? 'Section moved up.' : 'Section moved down.')
	}

	const goToSection = (section: { id: string; topLevelIndex: number }) => {
		setActiveSectionTopLevelIndex(section.topLevelIndex)
		const previewSection = previewRef.current?.querySelector<HTMLElement>(
			`[data-document-section-index="${section.topLevelIndex}"]`,
		)
		previewSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		if (editor) {
			editor
				.chain()
				.focus()
				.setTextSelection(editorPositionForTopLevelIndex(editor, section.topLevelIndex))
				.run()
		}
	}

	const saveDocument = async () => {
		const nextTitle = title.trim()
		if (!nextTitle) {
			setError('Enter a document title.')
			return
		}
		if (!editor) {
			setError('Editor is still loading.')
			return
		}

		const content = editor.getJSON()
		setIsSaving(true)
		clearMessages()

		try {
			const response = await fetch('/api/teacher/documents', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: documentId,
					title: nextTitle,
					documentType,
					groupIds: selectedGroupIds,
					content,
				}),
			})
			const payload = (await response.json()) as
				| {
						error?: string
						notice?: string
						document?: SavedTeachingDocument
				  }
				| undefined
			const savedDocument = payload?.document
			if (!response.ok || payload?.error || !savedDocument) {
				throw new Error(payload?.error ?? 'Unable to save document.')
			}

			setDocumentId(savedDocument.id)
			setTitle(savedDocument.title)
			setDocumentType(normalizeDocumentType(savedDocument.documentType))
			setSelectedGroupIds(savedDocument.groupIds)
			setEditorJson(savedDocument.content)
			setDocuments((current) => {
				const exists = current.some((item) => item.id === savedDocument.id)
				if (exists) {
					return current.map((item) =>
						item.id === savedDocument.id ? savedDocument : item,
					)
				}
				return [savedDocument, ...current]
			})
			setNotice(payload.notice ?? 'Document saved.')
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: 'Unable to save document.',
			)
		} finally {
			setIsSaving(false)
		}
	}

	const deleteDocument = async () => {
		if (!documentId) {
			setError('Choose a saved document to delete.')
			return
		}

		const currentTitle = title.trim() || 'this document'
		if (!window.confirm(`Delete "${currentTitle}"? This cannot be undone.`)) {
			return
		}

		setIsSaving(true)
		clearMessages()

		try {
			const response = await fetch(
				`/api/teacher/documents?id=${encodeURIComponent(documentId)}`,
				{ method: 'DELETE' },
			)
			const payload = (await response.json()) as
				| { error?: string; notice?: string; documentId?: string }
				| undefined

			if (!response.ok || payload?.error) {
				throw new Error(payload?.error ?? 'Unable to delete document.')
			}

			const deletedId = payload?.documentId ?? documentId
			const remainingDocuments = documents.filter(
				(document) => document.id !== deletedId,
			)
			setDocuments(remainingDocuments)
			setActiveSectionTopLevelIndex(null)
			setDocumentId(null)
			setTitle('Workshop notes')
			setDocumentType(defaultDocumentType)
			setSelectedGroupIds([])
			setEditorJson(initialContent)
			editor?.commands.setContent(initialContent)
			setNotice(payload?.notice ?? 'Document deleted.')
		} catch (deleteError) {
			setError(
				deleteError instanceof Error
					? deleteError.message
					: 'Unable to delete document.',
			)
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<div className="space-y-4">
			<section className="document-builder-controls surface p-4">
				<div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_210px_260px_minmax(220px,0.9fr)_auto] xl:items-end">
					<label className="block">
						<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
							Document title
						</span>
						<input
							value={title}
							onChange={(event) => {
								clearMessages()
								setTitle(event.target.value)
							}}
							className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
						/>
					</label>
					<label className="block">
						<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
							Document type
						</span>
						<select
							value={documentType}
							onChange={(event) =>
								setDocumentType(normalizeDocumentType(event.target.value))
							}
							className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
							{teachingDocumentTypes.map((type) => (
								<option key={type} value={type}>
									{type}
								</option>
							))}
						</select>
					</label>
					<label className="block">
						<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
							Load saved
						</span>
						<select
							value={documentId ?? ''}
							onChange={(event) => loadDocument(event.target.value)}
							className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
							<option value="">New document</option>
							{documentsByType.map((group) => (
								<optgroup key={group.type} label={group.type}>
									{group.documents.map((document) => (
										<option key={document.id} value={document.id}>
											{document.title}
										</option>
									))}
								</optgroup>
							))}
						</select>
					</label>
					<div>
						<div className="mb-1 flex items-center justify-between gap-2">
							<span className="block text-[11px] uppercase tracking-[0.1em] text-silver-300">
								Available to
							</span>
							<span className="text-[11px] text-silver-400">
								{selectedGroupIds.length
									? `${selectedGroupIds.length} group${
											selectedGroupIds.length === 1 ? '' : 's'
										}`
									: 'No group'}
							</span>
						</div>
						<div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto rounded-xl border border-white/15 bg-ink-900 px-2 py-2">
							{groups.length ? (
								groups.map((group) => (
									<label
										key={group.id}
										className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-1 text-[11px] text-silver-100">
										<input
											type="checkbox"
											checked={selectedGroupIds.includes(group.id)}
											onChange={() => toggleGroup(group.id)}
											className="h-3 w-3 accent-burgundy-400"
										/>
										<span>{group.title}</span>
									</label>
								))
							) : (
								<p className="text-xs text-silver-400">
									No groups available yet.
								</p>
							)}
						</div>
					</div>
					<div className="flex flex-wrap gap-2 xl:justify-end">
						<button type="button" onClick={newDocument} className={buttonClass()}>
							New
						</button>
						<button type="button" onClick={printDocument} className={buttonClass()}>
							Print
						</button>
						<button
							type="button"
							onClick={deleteDocument}
							disabled={!documentId || isSaving}
							className="rounded-full border border-rose-300/35 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-rose-100 transition hover:border-rose-200/55 hover:bg-rose-300/10 disabled:cursor-not-allowed disabled:opacity-40">
							Delete
						</button>
						<button
							type="button"
							onClick={saveDocument}
							disabled={isSaving}
							className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-1.5 text-[11px] uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
							{isSaving ? 'Saving...' : 'Save'}
						</button>
					</div>
				</div>
				{persistenceNotice || notice || error ? (
					<div className="mt-3 grid gap-2 lg:grid-cols-3">
						{persistenceNotice ? (
							<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
								{persistenceNotice}
							</p>
						) : null}
						{notice ? (
							<p className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
								{notice}
							</p>
						) : null}
						{error ? (
							<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
								{error}
							</p>
						) : null}
					</div>
				) : null}
			</section>

			<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
				<main className="min-w-0 space-y-4">
					<article
						ref={previewRef}
						className="document-print print-shell rounded-[28px] bg-parchment-50 px-6 py-8 text-ink-900 shadow-[0_20px_60px_rgba(0,0,0,0.18)] lg:px-10">
						<div className="border-b border-ink-900/10 pb-5">
							<p className="text-xs uppercase tracking-[0.16em] text-ink-900/45">
								shortstory.ink teaching document
							</p>
							<p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-ink-900/45">
								{documentType}
							</p>
							<h1 className="literary-title mt-2 text-4xl text-ink-900">
								{title.trim() || 'Untitled document'}
							</h1>
						</div>
						<div className="mt-2">
							{(editorJson.content ?? []).map((node, index) =>
								renderPrintNode(node, index),
							)}
						</div>
					</article>
				</main>

				<aside className="document-builder-controls min-w-0 space-y-4">
					<section className="surface p-3 lg:p-4">
						<div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_132px]">
							<div className="min-w-0">
								<EditorContent editor={editor} />
							</div>

							<div className="space-y-3">
								<div>
									<div className="flex items-center justify-between gap-2">
										<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
											Outline
										</p>
										<span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-silver-300">
											H2
										</span>
									</div>
									{sections.length ? (
										<ol className="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1">
											{sections.map((section, index) => (
												<li key={section.id}>
													<button
														type="button"
														onClick={() => goToSection(section)}
														className={`block w-full rounded-lg border px-2 py-1.5 text-left text-[11px] leading-snug transition ${
															activeSectionTopLevelIndex === section.topLevelIndex
																? 'border-accent-300/45 bg-accent-300/12 text-parchment-100'
																: 'border-white/10 bg-white/5 text-silver-200 hover:border-white/20 hover:text-parchment-100'
														}`}>
														<span className="mr-1.5 text-silver-400">
															{index + 1}.
														</span>
														{section.title}
													</button>
												</li>
											))}
										</ol>
									) : (
										<p className="mt-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-silver-300">
											No H2 yet
										</p>
									)}
								</div>

								<div>
									<p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-silver-300">
										Tools
									</p>
									<div className="grid gap-1.5">
									<button
										type="button"
										onClick={() => editor?.chain().focus().undo().run()}
										disabled={!editor?.can().undo()}
										className={utilityButtonClass}>
										Undo
									</button>
									<button
										type="button"
										onClick={() => editor?.chain().focus().redo().run()}
										disabled={!editor?.can().redo()}
										className={utilityButtonClass}>
										Redo
									</button>
									<button
										type="button"
										onClick={() => moveCurrentSection('up')}
										className={utilityButtonClass}>
										Section up
									</button>
									<button
										type="button"
										onClick={() => moveCurrentSection('down')}
										className={utilityButtonClass}>
										Section down
									</button>
									<button type="button" onClick={addSection} className={buttonClass()}>
										Add section
									</button>
									<button
										type="button"
										onClick={() => setIsSnippetModalOpen(true)}
										className="rounded-full border border-accent-300/45 bg-accent-300/12 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-accent-100 transition hover:bg-accent-300/18">
										Insert snippet
									</button>
									<button
										type="button"
										onClick={openSelectedSnippetEditor}
										disabled={!selectedSnippet}
										className={utilityButtonClass}>
										Edit snippet
									</button>
									<button
										type="button"
										onClick={() => editor?.chain().focus().toggleBold().run()}
										className={buttonClass(editor?.isActive('bold'))}>
										B
									</button>
									<button
										type="button"
										onClick={() => editor?.chain().focus().toggleItalic().run()}
										className={buttonClass(editor?.isActive('italic'))}>
										I
									</button>
									<button
										type="button"
										onClick={() =>
											editor?.chain().focus().toggleHeading({ level: 1 }).run()
										}
										className={buttonClass(editor?.isActive('heading', { level: 1 }))}>
										H1
									</button>
									<button
										type="button"
										onClick={() =>
											editor?.chain().focus().toggleHeading({ level: 2 }).run()
										}
										className={buttonClass(editor?.isActive('heading', { level: 2 }))}>
										H2
									</button>
									<button
										type="button"
										onClick={() =>
											editor?.chain().focus().toggleHeading({ level: 3 }).run()
										}
										className={buttonClass(editor?.isActive('heading', { level: 3 }))}>
										H3
									</button>
									<button
										type="button"
										onClick={() => editor?.chain().focus().toggleBulletList().run()}
										className={buttonClass(editor?.isActive('bulletList'))}>
										Bullets
									</button>
									<button
										type="button"
										onClick={() => editor?.chain().focus().toggleOrderedList().run()}
										className={buttonClass(editor?.isActive('orderedList'))}>
										Numbers
									</button>
									<button
										type="button"
										onClick={() => editor?.chain().focus().toggleBlockquote().run()}
										className={buttonClass(editor?.isActive('blockquote'))}>
										Insight
									</button>
								</div>
							</div>
						</div>
						</div>
					</section>
				</aside>
			</div>

			{isSnippetModalOpen ? (
				<div className="document-builder-controls fixed inset-0 z-50 flex items-start justify-center bg-ink-950/80 px-4 py-10 backdrop-blur-sm">
					<div className="max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-ink-900 shadow-glow">
						<div className="border-b border-white/10 p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-[11px] uppercase tracking-[0.1em] text-silver-300">
										Snippet Library
									</p>
									<h2 className="literary-title mt-1 text-2xl text-parchment-100">
										Insert snippet
									</h2>
								</div>
								<button
									type="button"
									onClick={() => setIsSnippetModalOpen(false)}
									className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
									Close
								</button>
							</div>
							<div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
								<input
									type="search"
									value={snippetSearch}
									onChange={(event) => setSnippetSearch(event.target.value)}
									className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
									placeholder="Search snippet text, notes, or tags"
								/>
								<select
									value={snippetCategory}
									onChange={(event) => setSnippetCategory(event.target.value)}
									className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-2 text-sm text-parchment-100">
									<option value="">All snippets ({snippets.length})</option>
									<option value="uncategorised">
										Uncategorised ({categoryCounts.Uncategorised})
									</option>
									{fixedSnippetCategories.map((category) => (
										<option key={category} value={category}>
											{category} ({categoryCounts[category] ?? 0})
										</option>
									))}
								</select>
							</div>
							<label className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-silver-100">
								<input
									type="checkbox"
									checked={includeSnippetNotes}
									onChange={(event) =>
										setIncludeSnippetNotes(event.target.checked)
									}
									className="h-4 w-4 accent-burgundy-400"
								/>
								<span>Include the teacher note when inserting snippets</span>
							</label>
						</div>
						<div className="max-h-[56vh] overflow-y-auto p-4">
							{filteredSnippets.length === 0 ? (
								<p className="text-sm text-silver-300">No snippets found.</p>
							) : (
								<ul className="space-y-2">
									{filteredSnippets.map((snippet) => {
										const attribution = snippetAttribution(snippet.sourceMetadata)
										return (
											<li key={snippet.id}>
												<button
													type="button"
													onClick={() => insertSnippet(snippet)}
													className="block w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-3 text-left transition hover:border-accent-300/35 hover:bg-accent-300/8">
													<span className="inline-flex rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-silver-200">
														{categoryForSnippet(snippet)}
													</span>
													<span className="mt-2 block text-sm leading-relaxed text-parchment-100">
														{compactPreview(snippet.text)}
													</span>
													{attribution ? (
														<span className="mt-2 block text-[11px] uppercase tracking-[0.08em] text-silver-400">
															{attribution}
														</span>
													) : null}
												</button>
											</li>
										)
									})}
								</ul>
							)}
						</div>
					</div>
				</div>
			) : null}

			{editingSnippet ? (
				<div className="document-builder-controls fixed inset-0 z-50 flex items-start justify-center bg-ink-950/80 px-4 py-10 backdrop-blur-sm">
					<div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-ink-900 shadow-glow">
						<div className="border-b border-white/10 p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-[11px] uppercase tracking-[0.1em] text-silver-300">
										Handout-only edit
									</p>
									<h2 className="literary-title mt-1 text-2xl text-parchment-100">
										Adjust inserted snippet
									</h2>
								</div>
								<button
									type="button"
									onClick={() => setEditingSnippet(null)}
									className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
									Close
								</button>
							</div>
						</div>
						<div className="space-y-4 p-4">
							<label className="block">
								<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
									Snippet text
								</span>
								<textarea
									value={snippetTextDraft}
									onChange={(event) => setSnippetTextDraft(event.target.value)}
									rows={8}
									className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-3 text-sm leading-6 text-parchment-100 outline-none ring-accent-400 transition focus:ring"
								/>
							</label>
							<label className="block">
								<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
									Teacher note
								</span>
								<textarea
									value={snippetNoteDraft}
									onChange={(event) => setSnippetNoteDraft(event.target.value)}
									rows={4}
									className="w-full rounded-xl border border-white/15 bg-ink-950 px-3 py-3 text-sm leading-6 text-parchment-100 outline-none ring-accent-400 transition focus:ring"
								/>
							</label>
							<label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-silver-100">
								<input
									type="checkbox"
									checked={snippetIncludeNoteDraft}
									onChange={(event) =>
										setSnippetIncludeNoteDraft(event.target.checked)
									}
									className="h-4 w-4 accent-burgundy-400"
								/>
								<span>Show the teacher note in this handout</span>
							</label>
							<div className="flex flex-wrap justify-end gap-2">
								<button
									type="button"
									onClick={() => setEditingSnippet(null)}
									className={utilityButtonClass}>
									Cancel
								</button>
								<button
									type="button"
									onClick={updateEditedSnippet}
									className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-1.5 text-[11px] uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30">
									Update snippet
								</button>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	)
}
