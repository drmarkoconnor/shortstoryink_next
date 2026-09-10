import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync } from 'node:fs'
import { illustrations, getIllustration, normalizeIllustrationAttrs } from '../lib/illustrations/catalog'
test('saved illustration IDs resolve to existing local assets, never arbitrary URLs', () => {
 assert.equal(new Set(illustrations.map(item => item.id)).size, 6)
 for (const item of illustrations) {
  assert.ok(existsSync(`public${item.src}`))
  assert.equal(getIllustration(item.id)?.src, item.src)
  const attrs = normalizeIllustrationAttrs({illustrationId:item.id, caption:'A pause.\nA choice.',size:'compact', src:'https://untrusted.example/tracker'})
  assert.deepEqual(JSON.parse(JSON.stringify(attrs)), {illustrationId:item.id,caption:'A pause.\nA choice.',size:'compact'})
 }
 assert.equal(normalizeIllustrationAttrs({illustrationId:'https://untrusted.example/image'}), null)
 assert.equal(getIllustration('../../.env.local'), undefined)
 assert.equal(normalizeIllustrationAttrs({illustrationId:'park',caption:'x'.repeat(900),size:'malformed'})?.caption.length, 500)
 assert.equal(normalizeIllustrationAttrs({illustrationId:'park',size:'malformed'})?.size, 'wide')
})
