import assert from 'node:assert/strict'
import test from 'node:test'
import { repairSingleBlockAnchor } from '../lib/manuscript/anchor-repair'

const paragraphs = [
	{
		id: 'p-1',
		text: 'The orchard opened like a chapel at dusk.',
	},
]

test('keeps a correctly anchored whole-word quote unchanged', () => {
	const anchor = {
		blockId: 'p-1',
		startOffset: 4,
		endOffset: 11,
		quote: 'orchard',
		prefix: 'The ',
		suffix: ' opened',
	}

	assert.deepEqual(repairSingleBlockAnchor(anchor, paragraphs), anchor)
})

test('repairs the legacy one-character mid-word highlight drift', () => {
	const anchor = {
		blockId: 'p-1',
		startOffset: 5,
		endOffset: 11,
		quote: 'rchard',
		prefix: 'The o',
		suffix: ' opened',
	}

	const repaired = repairSingleBlockAnchor(anchor, paragraphs)
	assert.equal(repaired.startOffset, 4)
	assert.equal(repaired.endOffset, 11)
	assert.equal(repaired.quote, 'orchard')
})

test('relocates an intact quote whose stored coordinates drifted', () => {
	const anchor = {
		blockId: 'p-1',
		startOffset: 6,
		endOffset: 13,
		quote: 'orchard',
	}

	const repaired = repairSingleBlockAnchor(anchor, paragraphs)
	assert.equal(repaired.startOffset, 4)
	assert.equal(repaired.endOffset, 11)
	assert.equal(repaired.quote, 'orchard')
})
