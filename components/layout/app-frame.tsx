import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppNav } from '@/components/layout/app-nav'
import { BrandWordmark } from '@/components/brand/brand-wordmark'
import type { AppRole } from '@/lib/auth/get-current-profile'
import type { StudioUser } from '@/lib/auth/studio-user'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { SignOutForm } from '@/components/auth/sign-out-form'

const writerNavItems = [
 { href: '/app/course', label: 'Workshop course' },
 { href: '/app/writer', label: 'My writing' },
 { href: '/app/writer/reading-room', label: 'Reading room', matches: ['/app/writer/documents', '/app/writer/examples'] },
 { href: '/app/writer/feedback', label: 'My feedback' },
 { href: '/app/writer/commonplace', label: 'Commonplace' },
]
const teacherNavItems = [
 { href: '/app/teacher/review-desk', label: 'Review queue', matches: ['/app/workshop', '/app/teacher/archive'] },
 { href: '/app/teacher-studio', label: 'Teaching studio', matches: ['/app/teacher/documents', '/app/teacher/snippets', '/app/teacher/feedback-memory'] },
 { href: '/app/teacher/library', label: 'Reading library', matches: ['/app/teacher/examples', '/app/teacher/sources'] },
 { href: '/app/teacher/groups', label: 'Groups' },
]

export async function AppFrame({
	children,
	role,
	user,
}: {
	children: ReactNode
	role: AppRole
	user: StudioUser
}) {
	const userEmail = user.email || ''
	const profile = await getCurrentProfile()
	const displayName = profile.displayName || userEmail

	const visibleNav =
		role === 'writer'
			? writerNavItems
			: role === 'teacher' || role === 'admin'
				? teacherNavItems
				: []


 return (
  <div className="min-h-screen bg-studio-canvas text-studio-ink">
   <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 studio-primary" href="#main-content">Skip to content</a>
   <header className="app-shell-header studio-header">
    <BrandWordmark />
    <AppNav items={visibleNav} />
    <details className="studio-account">
     <summary className="cursor-pointer text-sm">{displayName || 'Account'}</summary>
     <div className="space-y-4">
      <a className="block studio-link" href="/app/account">Account settings</a>
      <a className="block studio-link" href="/guide/new-writers">Writing guide</a>
      <Link className="block studio-link" href="/app/course">Workshop course</Link>
      <SignOutForm ownerId={user.id} />
     </div>
    </details>
   </header>
   <main id="main-content" className="app-shell-main studio-main">{children}</main>
  </div>
 )
}
