import assert from 'node:assert/strict'
import test from 'node:test'
import { feedbackInReadingOrder } from '../lib/feedback/reading-order'

test('document comments follow manuscript position, preserving data and stable ties', () => {
 const late = { id: 'late', anchor: { blockId: 'last', startOffset: 0 } }
 const middle = { id: 'middle', anchor: { blockId: 'first', startOffset: 15 } }
 const first = { id: 'first', anchor: { blockId: 'first', startOffset: 0 } }
 const tie = { id: 'tie', anchor: { blockId: 'first', startOffset: 0 } }
 const general = { id: 'general', anchor: null }
 const unknown = { id: 'unknown', anchor: { blockId: 'missing', startOffset: 0 } }
 const input = [general, late, middle, first, tie, unknown]
 const before = structuredClone(input)
 const result = feedbackInReadingOrder(input, [{ id: 'first' }, { id: 'last' }])
 assert.deepEqual(result.map(item => item.id), ['first', 'tie', 'middle', 'late', 'general', 'unknown'])
 assert.deepEqual(input, before)
 assert.equal(result[0], first)
})
