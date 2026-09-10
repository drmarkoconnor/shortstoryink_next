import type { Metadata } from 'next'
import Link from 'next/link'
import { Figure, GuideHero, GuideShell } from './guide-content'

export const metadata: Metadata = { title: 'New Writer Guide | shortstory.ink', description: 'A spacious walkthrough of writing, feedback and revision in shortstory.ink.' }
const chapters = [
 { number: '01', title: 'Make yourself at home', body: 'Create your account, confirm your email and find your way back to the studio.', href: 'getting-started', link: 'Getting started' },
 { number: '02', title: 'Bring one draft', body: 'Write or paste your piece, check its title and group, then submit it for a close read.', href: 'submitting', link: 'Submitting' },
 { number: '03', title: 'Read the response', body: 'Begin with the overview, then follow comments beside the words they refer to.', href: 'feedback', link: 'Reading feedback' },
 { number: '04', title: 'Return to the work', body: 'Start a new version while keeping the earlier manuscript and its feedback intact.', href: 'revising', link: 'Revising' },
]
export default function Page() {
 return <GuideShell activeHref="/guide/new-writers">
  <GuideHero kicker="Your writing companion" title="One draft. A close reading. A new beginning." body="You do not need to learn everything at once. Follow the four chapters in order, or return to the part you need. Each step has a current screenshot you can open at full size." />
  <section aria-label="The four guide chapters" className="pb-14">{chapters.map(chapter => <article key={chapter.number} className="guide-chapter-row">
   <p className="studio-eyebrow pt-2">{chapter.number}</p><div><h2 className="literary-title text-3xl">{chapter.title}</h2><p className="mt-4 max-w-[55ch] text-base leading-8 text-studio-muted">{chapter.body}</p></div><Link className="studio-secondary" href={`/guide/new-writers/${chapter.href}`}>{chapter.link} →</Link>
  </article>)}</section>
  <section className="border-t border-studio-line py-14"><div className="mb-8 max-w-[65ch]"><p className="studio-eyebrow">A place for the writing life</p><h2 className="literary-title mt-4 text-3xl">There is room to take your time.</h2><p className="mt-5 text-base leading-8 text-studio-muted">The studio brings writing, close reading and revision together. This guide stays available whenever you need a reminder.</p></div><Figure image="home" caption="The entrance to shortstory.ink: a quiet invitation to begin." /></section>
  <aside className="guide-next"><p className="studio-eyebrow">A little more context</p><h2 className="literary-title mt-4 text-3xl">What happens on your teacher’s desk?</h2><p className="mt-5 max-w-[60ch] text-base leading-8 text-studio-muted">See how private reading becomes published feedback, and how teaching handouts are prepared.</p><Link href="/guide/new-writers/how-feedback-works" className="studio-secondary mt-6">See how teaching works →</Link></aside>
 </GuideShell>
}
