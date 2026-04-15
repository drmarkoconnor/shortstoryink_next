export const teacherTabs = [
	{ href: '/app/teacher', label: 'Overview' },
	{ href: '/app/teacher/review-desk', label: 'Review Desk' },
	{ href: '/app/teacher/snippets-desk', label: 'Snippets' },
	{ href: '/app/teacher/resources-desk', label: 'Resources' },
]

export const reviewQueue = [
	{
		id: 'sub-101',
		writer: 'A. Moore',
		title: 'The Orchard at Dusk',
		status: 'Awaiting review',
		submitted: '14 Apr',
	},
	{
		id: 'sub-102',
		writer: 'J. Clarke',
		title: 'The Narrow Street',
		status: 'In review',
		submitted: '13 Apr',
	},
	{
		id: 'sub-103',
		writer: 'S. Patel',
		title: 'After the Bell',
		status: 'Awaiting review',
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

