import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { fixedSnippetCategories, normalizeSnippetLabel } from '@/lib/feedback/categories'
import {
	normalizeSnippetStatus,
	normalizeSnippetUseFlags,
	snippetStatuses,
	type SnippetStatus,
	snippetUseFlags,
	type SnippetUseFlag,
} from '@/lib/snippets/workbench'
import { createServerDataClient } from '@/lib/data/client'

const defaultTriageModel = 'gpt-5.4-mini'
const maxTriageSnippets = 30
const maxSnippetCharacters = 900

type TriagePayload = {
	snippetIds?: string[]
}

type SnippetRow = {
	id: string
	snippet_text: string
	note: string | null
	anchor: unknown
	source_type: string | null
}

type SelectionAnchor = {
	categoryLabel?: string
	categorySlug?: string
	tags?: unknown[]
	sourceLabel?: string
	sourceKind?: string
	originalSource?: string
	sourceAuthor?: string
	sourceTitle?: string
	sourceName?: string
	sourceSection?: string
	snippetStatus?: unknown
	snippetUseFlags?: unknown
}

type RawTriageSuggestion = {
	id: string
	recommendFavourite: boolean
	recommendedStatus: SnippetStatus
	categoryLabel: string
	useFlags: SnippetUseFlag[]
	tags: string[]
	confidence: 'low' | 'medium' | 'high'
	reason: string
}

function isSelectionAnchor(value: unknown): value is SelectionAnchor {
	return Boolean(value && typeof value === 'object')
}

function normalizeTags(value: unknown) {
	if (!Array.isArray(value)) {
		return []
	}

	return [
		...new Set(
			value
				.map((item) => String(item).trim().toLowerCase())
				.filter(Boolean)
				.slice(0, 6),
		),
	]
}

function normalizeSnippetIds(value: unknown) {
	if (!Array.isArray(value)) {
		return []
	}

	return [
		...new Set(
			value
				.map((item) => String(item).trim())
				.filter(Boolean)
				.slice(0, maxTriageSnippets),
		),
	]
}

function compactSnippetText(value: string) {
	const normalized = value.replace(/\s+/g, ' ').trim()
	if (normalized.length <= maxSnippetCharacters) {
		return normalized
	}
	return `${normalized.slice(0, maxSnippetCharacters - 3).trimEnd()}...`
}

function sourceSummary(anchor: SelectionAnchor | null, sourceType: string | null) {
	return [
		anchor?.sourceLabel,
		anchor?.sourceAuthor,
		anchor?.sourceTitle,
		anchor?.sourceKind,
		anchor?.sourceName,
		anchor?.originalSource,
		anchor?.sourceSection,
		sourceType ?? '',
	]
		.map((part) => String(part ?? '').trim())
		.filter(Boolean)
		.join(' / ')
}

function buildPromptInput(rows: SnippetRow[]) {
	return {
		categories: ['Uncategorised', ...fixedSnippetCategories],
		statuses: snippetStatuses,
		useFlags: snippetUseFlags,
		snippets: rows.map((row) => {
			const anchor = isSelectionAnchor(row.anchor) ? row.anchor : null
			return {
				id: row.id,
				text: compactSnippetText(row.snippet_text),
				note: row.note?.trim() ?? '',
				currentCategory: normalizeSnippetLabel(
					typeof anchor?.categoryLabel === 'string' ? anchor.categoryLabel : '',
				),
				currentTags: normalizeTags(anchor?.tags),
				currentStatus: normalizeSnippetStatus(anchor?.snippetStatus),
				currentUseFlags: normalizeSnippetUseFlags(anchor?.snippetUseFlags),
				source: sourceSummary(anchor, row.source_type),
			}
		}),
	}
}

function triageSchema() {
	return {
		type: 'object',
		additionalProperties: false,
		required: ['suggestions'],
		properties: {
			suggestions: {
				type: 'array',
				maxItems: maxTriageSnippets,
				items: {
					type: 'object',
					additionalProperties: false,
					required: [
						'id',
						'recommendFavourite',
						'recommendedStatus',
						'categoryLabel',
						'useFlags',
						'tags',
						'confidence',
						'reason',
					],
					properties: {
						id: { type: 'string' },
						recommendFavourite: { type: 'boolean' },
						recommendedStatus: {
							type: 'string',
							enum: snippetStatuses,
						},
						categoryLabel: {
							type: 'string',
							enum: ['Uncategorised', ...fixedSnippetCategories],
						},
						useFlags: {
							type: 'array',
							maxItems: 3,
							items: {
								type: 'string',
								enum: snippetUseFlags,
							},
						},
						tags: {
							type: 'array',
							maxItems: 4,
							items: {
								type: 'string',
							},
						},
						confidence: {
							type: 'string',
							enum: ['low', 'medium', 'high'],
						},
						reason: {
							type: 'string',
							maxLength: 180,
						},
					},
				},
			},
		},
	}
}

function extractResponseText(payload: unknown) {
	if (!payload || typeof payload !== 'object') {
		return ''
	}

	const response = payload as {
		output_text?: unknown
		output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }>
	}
	if (typeof response.output_text === 'string') {
		return response.output_text
	}

	return (response.output ?? [])
		.flatMap((item) => item.content ?? [])
		.filter((content) => content.type === 'output_text')
		.map((content) => (typeof content.text === 'string' ? content.text : ''))
		.join('')
}

function normalizeSuggestion(
	value: RawTriageSuggestion,
	validIds: Set<string>,
): RawTriageSuggestion | null {
	if (!validIds.has(value.id)) {
		return null
	}

	const categoryLabel = normalizeSnippetLabel(value.categoryLabel)
	const recommendedStatus = normalizeSnippetStatus(value.recommendedStatus)

	return {
		id: value.id,
		recommendFavourite: Boolean(value.recommendFavourite),
		recommendedStatus,
		categoryLabel,
		useFlags: normalizeSnippetUseFlags(value.useFlags),
		tags: normalizeTags(value.tags),
		confidence: ['low', 'medium', 'high'].includes(value.confidence)
			? value.confidence
			: 'medium',
		reason: String(value.reason ?? '').replace(/\s+/g, ' ').trim().slice(0, 180),
	}
}

export async function POST(request: Request) {
	const profile = await requireTeacher()

	const apiKey = process.env.OPENAI_API_KEY
	if (!apiKey) {
		return NextResponse.json(
			{ error: 'Set OPENAI_API_KEY before using AI snippet triage.' },
			{ status: 503 },
		)
	}

	const payload = (await request.json().catch(() => ({}))) as TriagePayload
	const snippetIds = normalizeSnippetIds(payload.snippetIds)

	if (snippetIds.length === 0) {
		return NextResponse.json(
			{ error: 'Choose uncategorised snippets to triage first.' },
			{ status: 400 },
		)
	}

	const dataClient = await createServerDataClient()

	const snippetsResult = await dataClient
		.from('snippets')
		.select('id, snippet_text, note, anchor, source_type')
		.eq('saved_by', profile.user.id)
		.in('id', snippetIds)

	if (snippetsResult.error) {
		return NextResponse.json(
			{ error: 'Unable to load snippets for triage.' },
			{ status: 500 },
		)
	}

	const rows = ((snippetsResult.data ?? []) as SnippetRow[]).filter((row) => {
		const anchor = isSelectionAnchor(row.anchor) ? row.anchor : null
		const categoryLabel = normalizeSnippetLabel(
			typeof anchor?.categoryLabel === 'string' ? anchor.categoryLabel : '',
		)
		return categoryLabel === 'Uncategorised'
	})

	if (rows.length === 0) {
		return NextResponse.json(
			{ error: 'No uncategorised snippets were found in that selection.' },
			{ status: 400 },
		)
	}

	const model = process.env.OPENAI_SNIPPET_TRIAGE_MODEL ?? defaultTriageModel
	const promptInput = buildPromptInput(rows)

	const response = await fetch('https://api.openai.com/v1/responses', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model,
			input: [
				{
					role: 'system',
					content: [
						{
							type: 'input_text',
							text: [
								'You are helping a short-story teacher triage saved literary snippets.',
								'Do not rewrite any snippet text. Do not invent teaching prose.',
								'Judge each snippet only for teaching usefulness and craft clarity.',
								'Recommend Favourite sparingly: a favourite should show a strong, reusable craft move such as compressed characterisation, tonal control, subtext, voice, image/detail, pacing, opening, ending, or structural turn.',
								'Use Ready for teachable snippets that are useful but not exceptional, Reviewed for modestly useful snippets, Raw when there is too little to judge, and Needs source check when provenance seems unclear.',
								'Choose categories only from the provided category list. If no fit is honest, use Uncategorised.',
								'Use short lowercase tags. Give one concise reason grounded in the extract.',
							].join(' '),
						},
					],
				},
				{
					role: 'user',
					content: [
						{
							type: 'input_text',
							text: JSON.stringify(promptInput),
						},
					],
				},
			],
			text: {
				format: {
					type: 'json_schema',
					name: 'snippet_triage_suggestions',
					strict: true,
					schema: triageSchema(),
				},
			},
		}),
	})

	const openAiPayload = (await response.json().catch(() => null)) as unknown

	if (!response.ok) {
		const message =
			openAiPayload &&
			typeof openAiPayload === 'object' &&
			'error' in openAiPayload &&
			openAiPayload.error &&
			typeof openAiPayload.error === 'object' &&
			'message' in openAiPayload.error
				? String(openAiPayload.error.message)
				: 'OpenAI could not triage those snippets.'
		return NextResponse.json({ error: message }, { status: 502 })
	}

	const outputText = extractResponseText(openAiPayload)
	if (!outputText) {
		return NextResponse.json(
			{ error: 'OpenAI returned no triage suggestions.' },
			{ status: 502 },
		)
	}

	let parsed: { suggestions?: RawTriageSuggestion[] }
	try {
		parsed = JSON.parse(outputText) as { suggestions?: RawTriageSuggestion[] }
	} catch {
		return NextResponse.json(
			{ error: 'OpenAI returned triage suggestions in an unreadable format.' },
			{ status: 502 },
		)
	}

	const validIds = new Set(rows.map((row) => row.id))
	const suggestions = (parsed.suggestions ?? [])
		.map((suggestion) => normalizeSuggestion(suggestion, validIds))
		.filter((suggestion): suggestion is RawTriageSuggestion => Boolean(suggestion))

	return NextResponse.json({
		notice:
			suggestions.length === 1
				? 'AI suggested one snippet triage.'
				: `AI suggested ${suggestions.length} snippet triages.`,
		model,
		count: suggestions.length,
		suggestions,
	})
}
