import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { ProjectsEntry } from '../components/projects/projects-entry'
import { sendPieceSharedNotification } from '../lib/notifications/email'

test('writer landing visibly explains sections and cards and links directly to projects', () => {
 const html = renderToStaticMarkup(React.createElement(ProjectsEntry, { enabled: true }))
 const dom = new JSDOM(html)
 const entry = dom.window.document.querySelector('section[aria-labelledby="writer-projects-heading"]')
 assert.ok(entry)
 assert.equal(entry.querySelector('h2')?.textContent, 'What would you like to work on?')
 const links = entry.querySelectorAll('a')
 assert.equal(links.length, 3)
 const link = links[0]
 assert.equal(link?.getAttribute('href'), '/app/writer/projects#existing-projects')
 assert.equal(link?.textContent, 'Continue a projectReturn to your documents, cards and snapshots.')
 assert.equal(link?.hasAttribute('target'), false)
 assert.equal(links[1]?.getAttribute('href'), '/app/writer/projects#new-project')
 assert.equal(links[2]?.getAttribute('href'), '#single-piece')
 assert.ok(entry.querySelector('#single-piece'))
 assert.match(entry.textContent ?? '', /documents.*cards.*snapshots.*compile/)
 assert.match(entry.textContent ?? '', /does not move or clear your single-piece draft/)
 dom.window.close()
})

test('disabled projects do not advertise an unavailable feature', () => {
 assert.equal(renderToStaticMarkup(React.createElement(ProjectsEntry, { enabled: false })), '')
})

test('writer shell keeps projects inside Writing and the signed-in writer account menu', async () => {
 const shell = await readFile('components/layout/app-frame.tsx', 'utf8')
 const landing = await readFile('app/app/writer/page.tsx', 'utf8')
 assert.match(shell, /label: 'Writing', matches: \['\/app\/writer\/projects'\]/)
 assert.match(shell, /isWriter && projectsEnabled\(\)/)
 assert.match(shell, /href="\/app\/writer\/projects">Your projects/)
 assert.ok(landing.indexOf('<ProjectsEntry') < landing.indexOf('<WriterPage'))
 assert.match(landing, /enabled=\{projectsEnabled\(\)\}/)
 assert.doesNotMatch(landing, /localStorage|removeItem|setItem/)
})

test('explicit preview email suppression works without a build CONTEXT', async () => {
 const names = ['CONTEXT', 'STUDIO_SUPPRESS_EMAIL'] as const
 const original = names.map(name => [name, process.env[name]] as const)
 const originalFetch = globalThis.fetch
 let calls = 0
 try {
  delete process.env.CONTEXT
  process.env.STUDIO_SUPPRESS_EMAIL = 'true'
  globalThis.fetch = async () => { calls++; throw new Error('Preview must not send email') }
  await sendPieceSharedNotification({ email: 'synthetic@example.invalid', writerLabel: 'Synthetic writer', title: 'Test only', submissionId: 'synthetic' })
  assert.equal(calls, 0)
 } finally {
  globalThis.fetch = originalFetch
  for (const [name, value] of original) {
   if (value === undefined) delete process.env[name]
   else process.env[name] = value
  }
 }
})
