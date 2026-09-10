import Link from 'next/link'
import type { ReactNode } from 'react'

const reviewTools = [
 { href: '/app/teacher/review-desk', label: 'Current submissions' },
 { href: '/app/teacher/archive', label: 'Archive' },
]
const studioTools = [
 { href: '/app/teacher-studio', label: 'Overview' },
 { href: '/app/teacher/documents', label: 'Handouts' },
 { href: '/app/teacher/snippets', label: 'Saved passages' },
 { href: '/app/teacher/feedback-memory', label: 'Feedback memory' },
]
const readingTools = [
 { href: '/app/teacher/library', label: 'Library' },
 { href: '/app/teacher/sources/read', label: 'Source reader' },
 { href: '/app/teacher/sources/new', label: 'Add a passage' },
 { href: '/app/teacher/examples', label: 'Annotated examples' },
]
export function MenuTabs({ tabs, active, context }: {
 tabs: { href: string; label: string }[]
 active: string
 context?: ReactNode
}) {
 const teacher = tabs.some(tab => tab.href === '/app/teacher-studio')
 const local = !teacher ? tabs
  : /review-desk|archive/.test(active) ? reviewTools
  : active.includes('groups') || active === '/app/teacher' ? []
  : /\/library|\/sources|\/examples/.test(active) ? readingTools
  : studioTools
 if (!local.length && !context) return null
 return <nav aria-label="Related tools" className="print-controls studio-subnav">
  <div className="flex flex-wrap gap-x-6 gap-y-2">{local.map(tab => <Link key={tab.href} href={tab.href} aria-current={active === tab.href ? 'page' : undefined} className={active === tab.href ? 'font-medium text-studio-ink' : 'text-studio-muted hover:text-studio-ink'}>{tab.label}</Link>)}</div>
  {context ? <div className="ml-auto">{context}</div> : null}
 </nav>
}
