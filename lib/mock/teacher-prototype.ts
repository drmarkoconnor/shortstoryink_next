import type {
	SelectionRangeAnchor,
	SubmissionStatus,
} from '@/lib/domain/core-flow'

export const teacherTabs = [
	{ href: '/app/teacher', label: 'Home' },
	{ href: '/app/teacher/review-desk', label: 'Workshop' },
	{ href: '/app/teacher/archive', label: 'Archive' },
]

export type SubmissionFeedbackItem = {
	id: string
	submissionId: string
	type: 'grammar' | 'craft'
	title: string
	note: string
	anchor: SelectionRangeAnchor
}

export type SubmissionBlock = {
	id: string
	text: string
}

export type SubmissionDetail = {
	id: string
	title: string
	writer: string
	status: SubmissionStatus
	submitted: string
	body: SubmissionBlock[]
	feedback: SubmissionFeedbackItem[]
}

export const reviewQueue = [
	{
		id: 'sub-101',
		writer: 'A. Moore',
		title: 'The Orchard at Dusk',
		status: 'submitted' as SubmissionStatus,
		submitted: '14 Apr',
	},
	{
		id: 'sub-102',
		writer: 'J. Clarke',
		title: 'The Narrow Street',
		status: 'in_review' as SubmissionStatus,
		submitted: '13 Apr',
	},
	{
		id: 'sub-103',
		writer: 'S. Patel',
		title: 'After the Bell',
		status: 'submitted' as SubmissionStatus,
		submitted: '12 Apr',
	},
]

export const linkedFeedback = [
	{
		id: 'c1',
		type: 'grammar',
		anchor: 'para-1',
		title: 'Typo / Grammar',
		note: 'Tense shift in this sentence. Keep past tense for consistency.',
	},
	{
		id: 'c2',
		type: 'craft',
		anchor: 'para-2',
		title: 'Craft note',
		note: 'Excellent sensory image. Consider one more concrete detail to sharpen setting.',
	},
	{
		id: 'c3',
		type: 'craft',
		anchor: 'para-3',
		title: 'Craft note',
		note: 'Strong final beat. You might trim one clause for cleaner cadence.',
	},
]

export const submissionDetails: Record<string, SubmissionDetail> = {
	'sub-101': {
		id: 'sub-101',
		title: 'The Orchard at Dusk',
		writer: 'A. Moore',
		status: 'in_review',
		submitted: '14 Apr',
		body: [
			{
				id: 'para-1',
				text: 'We walked down the lane before evening had properly arrived, each hedge holding the last small light and a smell of wet leaves. He don’t notice the frost glazing the gate, only the dog waiting on the far side.',
			},
			{
				id: 'para-2',
				text: "At the bend, the orchard opened like a chapel: branches arched, apples gone to windfall, and a hush so full I could hear my own sleeve brush against itself. I thought of my mother's hands, red from washing pears in a bowl too small for the season.",
			},
			{
				id: 'para-3',
				text: 'We stood there longer than the weather allowed. Then he said the one sentence I had rehearsed never hearing, and the air seemed to tilt, not violently, but with the quiet certainty of a page turned for good.',
			},
		],
		feedback: [
			{
				id: 'c1',
				submissionId: 'sub-101',
				type: 'grammar',
				title: 'Typo / Grammar',
				note: 'Tense shift in this sentence. Keep past tense for consistency.',
				anchor: {
					blockId: 'para-1',
					startOffset: 128,
					endOffset: 142,
					quote: "He don't notice",
					prefix: 'a smell of wet leaves. ',
					suffix: ' the frost glazing the gate',
				},
			},
			{
				id: 'c2',
				submissionId: 'sub-101',
				type: 'craft',
				title: 'Craft note',
				note: 'Excellent sensory image. Consider one more concrete detail to sharpen setting.',
				anchor: {
					blockId: 'para-2',
					startOffset: 153,
					endOffset: 181,
					quote: "I thought of my mother's hands",
					prefix: 'sleeve brush against itself. ',
					suffix: ', red from washing pears',
				},
			},
			{
				id: 'c3',
				submissionId: 'sub-101',
				type: 'craft',
				title: 'Craft note',
				note: 'Strong final beat. You might trim one clause for cleaner cadence.',
				anchor: {
					blockId: 'para-3',
					startOffset: 182,
					endOffset: 201,
					quote: 'page turned for good',
					prefix: 'quiet certainty of a ',
					suffix: '.',
				},
			},
		],
	},
}

export const snippetCards = [
	{
		id: 'sn-1',
		title: 'Scene anchoring prompt',
		topic: 'Setting',
		body: 'Name the place, weather texture, and one sound inside the first five lines.',
	},
	{
		id: 'sn-2',
		title: 'Dialogue pressure test',
		topic: 'Dialogue',
		body: 'What is each character avoiding in this exchange? Mark it under each line.',
	},
	{
		id: 'sn-3',
		title: 'Sentence rhythm pass',
		topic: 'Prose',
		body: 'Read aloud and circle any sentence with two commas and no full stop break.',
	},
]

export const handouts = [
	{
		id: 'h-1',
		title: 'Beginner mistakes: exposition',
		note: 'Replace summary blocks with one scene, one action, one image.',
	},
	{
		id: 'h-2',
		title: 'Beginner mistakes: weak verbs',
		note: 'Trade forms of “to be” for concrete action verbs in revision pass one.',
	},
	{
		id: 'h-3',
		title: 'Beginner mistakes: point of view drift',
		note: 'Track each paragraph by viewpoint owner before editing language.',
	},
]

export const bookLinks = [
	{
		id: 'b-1',
		label: 'Steering the Craft — Le Guin',
		note: 'Sentence and narrative exercise collection for practical workshops.',
		url: 'https://www.amazon.co.uk/',
	},
	{
		id: 'b-2',
		label: 'Bird by Bird — Anne Lamott',
		note: 'Mindset and process support for emerging writers.',
		url: 'https://www.amazon.co.uk/',
	},
	{
		id: 'b-3',
		label: 'The Art of Fiction — John Gardner',
		note: 'Craft principles helpful for close feedback sessions.',
		url: 'https://www.amazon.co.uk/',
	},
]

