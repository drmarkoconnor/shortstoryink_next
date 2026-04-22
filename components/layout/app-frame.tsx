
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import type { AppRole } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'


const writerNavItems = [
	{ href: '/app/writer', label: 'Groups' },
	{ href: '/app/writer/feedback', label: 'Feedback' },
	{ href: '/app/account', label: 'Account' },
]

const teacherNavItems = [
	{ href: '/app/teacher', label: 'Home' },
	{ href: '/app/teacher/review-desk', label: 'Review' },
	{ href: '/app/teacher/archive', label: 'Archive' },
	{ href: '/app/teacher-studio', label: 'Teacher Studio' },
]

export async function AppFrame({
       children,
       role,
}: {
       children: ReactNode
       role: AppRole
}) {
       // Fetch user profile for display
       const profile = await getCurrentProfile()
	const userEmail = profile.user?.email || ''
	const displayName = profile.user?.user_metadata?.display_name || userEmail

       async function signOutAction() {
	       'use server'
	       const supabase = await createServerSupabaseClient()
	       await supabase.auth.signOut()
	       redirect('/auth/sign-in')
       }

       const visibleNav =
	       role === 'writer'
		       ? writerNavItems
		       : role === 'teacher' || role === 'admin'
			       ? teacherNavItems
			       : []

	       return (
		       <div className="min-h-screen bg-ink-900 text-parchment-100">
			       <header className="app-shell-header border-b border-white/15 bg-ink-950/35">
				       <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
					       <Link href="/" className="literary-title text-lg text-parchment-100">
						       shortstory.ink
					       </Link>
					       <nav className="flex flex-wrap items-center gap-2 text-sm text-silver-100">
						       {visibleNav.map((item) => (
							       <Link
								       key={item.href}
								       href={item.href}
								       className="rounded-full px-3 py-1.5 transition hover:bg-white/10 hover:text-parchment-100">
								       {item.label}
							       </Link>
						       ))}
						       <span className="ml-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs uppercase tracking-[0.11em] text-silver-300">
							       {role}
						       </span>
						       <span className="ml-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs tracking-tight text-silver-100">
							       {displayName || userEmail}
						       </span>
						       <form action={signOutAction}>
							       <button
								       type="submit"
								       className="rounded-full border border-white/25 px-3 py-1.5 text-xs uppercase tracking-[0.11em] text-silver-100 transition hover:border-white/35 hover:bg-white/5 hover:text-parchment-100">
								       Log out
							       </button>
						       </form>
					       </nav>
				       </div>
			       </header>
			       <main className="app-shell-main mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
		       </div>
	       )
}
