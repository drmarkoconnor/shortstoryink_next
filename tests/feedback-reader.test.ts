import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'

// Exercise the real reader with a long manuscript; no live accounts or data.
test('reader dismissal and paging work; publication previews and stays for review', async () => {
 const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://example.test' })
 const globals = globalThis as unknown as Record<string, unknown>
 const replacements: Record<string, unknown> = { window: dom.window, self: dom.window, fetch: globalThis.fetch, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, React, IS_REACT_ACT_ENVIRONMENT: true, requestAnimationFrame: (callback: () => void) => { callback(); return 1 } }
 const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
 for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, writable: true, configurable: true })
 dom.window.HTMLElement.prototype.scrollIntoView = () => {}
 const { createRoot } = await import('react-dom/client')
 const { TeacherReviewWorkspace } = await import('../components/teacher/review-workspace')
 const { WriterFeedbackReadingWorkspace } = await import('../components/writer/feedback-reading-workspace')
 const { AppRouterContext } = await import('next/dist/shared/lib/app-router-context.shared-runtime')
 const errors: unknown[] = []
 dom.window.addEventListener('error', event => errors.push(event.error))
 const root = createRoot(dom.window.document.getElementById('root')!)
 const click = async (element: Element | null) => { assert.ok(element); await act(async () => { element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) }) }
 const marker = () => dom.window.document.querySelector('[aria-label="Craft comment"]') as HTMLButtonElement
 const note = () => dom.window.document.querySelector('[role="note"]')
 const assertClosed = () => { assert.equal(note(), null); assert.match(dom.window.document.body.textContent!, /1 shown \/ 2 total/) }
 try {
  await act(async () => root.render(React.createElement(WriterFeedbackReadingWorkspace, {
   submissionId: 'test', title: 'Test passage', status: 'feedback_published', version: 1,
   createdAt: '2026-01-01T00:00:00Z', summary: 'Original overview',
   paragraphs: Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, text: 'A passage to read. '.repeat(35) })),
   feedback: [{ id: 'craft', comment: 'A detailed comment. '.repeat(80), createdAt: '', anchor: { blockId: 'p0', startOffset: 0, endOffset: 9, quote: 'A passage', kind: 'craft' } }, { id: 'typo', comment: 'A quick fix', createdAt: '', anchor: { blockId: 'p0', startOffset: 10, endOffset: 12, quote: 'to', kind: 'typo' } }],
   preview: { reviewUrl: '/editor' },
  })))
  assert.equal(dom.window.document.querySelector('a[href*="revise"]'), null)
  await click(marker()); assert.ok(note());
  // The card follows its paragraph in normal flow, outside the manuscript text.
  assert.equal(note()!.previousElementSibling?.id, 'p0')
  assert.equal(dom.window.document.getElementById('p0')!.textContent?.replace('•', ''), 'A passage to read. '.repeat(35))
  await click(dom.window.document.querySelector('[aria-label="Close comment"]')); assertClosed()
  assert.equal(dom.window.document.activeElement, marker())
  await click(marker()); await act(async () => { dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) }); assertClosed()
  await click(marker()); await click(marker()); assertClosed()
  await click(marker()); await act(async () => { dom.window.document.body.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) }); assertClosed()
  await click(marker()); await click(dom.window.document.querySelector('[aria-label="Next section"]')); assertClosed()
  assert.match(dom.window.document.body.textContent!, /Section 2 of/)
  assert.equal(dom.window.document.activeElement?.getAttribute('aria-label'), 'Feedback reading section')
  await click(dom.window.document.querySelector('[aria-label="Previous section"]')); assertClosed()
  assert.match(dom.window.document.body.textContent!, /Section 1 of/)

  let publishedBody = ''
  let refreshes = 0
  let redirects = 0
  globals.fetch = async (_url: string, options: RequestInit) => {
   publishedBody = String(options.body)
   return { ok: true, json: async () => ({ status: 'feedback_published', publishedAt: '2026-01-02T00:00:00Z' }) }
  }
  const router = { back() {}, forward() {}, prefetch: async () => {}, push: () => { redirects++ }, replace: () => { redirects++ }, refresh: () => { refreshes++ } }
  await act(async () => root.render(React.createElement(AppRouterContext.Provider, { value: router },
   React.createElement(TeacherReviewWorkspace, {
    submissionId: 'test', title: 'Test passage', version: 1, createdAt: '2026-01-01T00:00:00Z',
    paragraphs: [{ id: 'p0', text: 'A passage to read.' }],
    feedback: [{ id: 'craft', comment: 'A saved editorial comment', createdAt: '', anchor: { blockId: 'p0', startOffset: 0, endOffset: 9, quote: 'A passage', kind: 'craft' } }],
    snippets: [], snippetLibrary: [], feedbackMemory: [], notice: null, errorNotice: null,
    submissionStatus: 'in_review', canDeleteFeedback: true, canPublishFeedback: true, canExportFeedback: false,
    initialSummary: 'My overview for this version', initialSummaryPublishedAt: null,
   }))))
  const button = (label: string) => [...dom.window.document.querySelectorAll('button')].find(element => element.textContent?.trim() === label) ?? null
  await click(button('Publish to writer'))
  await click(button('Preview writer view'))
  assert.match(dom.window.document.body.textContent!, /My overview for this version/)
  assert.equal(publishedBody, '')
  assert.equal(button('Start a new revision'), null)
  await click(button('Back to publication'))
  assert.equal(dom.window.document.querySelector<HTMLTextAreaElement>('[name="summary"]')?.value, 'My overview for this version')
  await click(button('Confirm publish'))
  assert.deepEqual(JSON.parse(publishedBody), { summary: 'My overview for this version' })
  assert.equal(redirects, 0)
  assert.equal(refreshes, 1)
  assert.match(dom.window.document.querySelector('[aria-label="Published overview"]')!.textContent!, /My overview for this version/)
  for (const label of ['View published feedback', 'Prepare feedback document', 'Back to editorial desk']) {
   assert.ok([...dom.window.document.querySelectorAll('a')].some(link => link.textContent?.trim() === label))
  }
  assert.equal(button('Publish to writer'), null)
  await click(dom.window.document.querySelector('[aria-label="Comment marker"]'))
  assert.ok(dom.window.document.querySelector('[data-editor-note]'))
  await act(async () => { dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
  assert.equal(dom.window.document.querySelector('[data-editor-note]'), null)
  await click(dom.window.document.querySelector('[aria-label="Comment marker"]'))
  await click(dom.window.document.querySelector('[aria-label="Published overview"]'))
  assert.equal(dom.window.document.querySelector('[data-editor-note]'), null)
  assert.deepEqual(errors, [])
 } finally {
  await act(async () => root.unmount())
  dom.window.close()
  for (const [key, original] of originals) { if (original) Object.defineProperty(globalThis, key, original); else delete globals[key] }
 }
})
