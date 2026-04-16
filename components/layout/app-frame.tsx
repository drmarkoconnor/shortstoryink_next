import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import type { AppRole } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const writerNavItems = [
	{ href: '/app/writer', label: 'Workshop' },
	{ href: '/app/writer/feedback', label: 'Feedback' },
]

const teacherNavItems = [
	{ href: '/app/teacher', label: 'Home' },
	{ href: '/app/teacher/review-desk', label: 'Workshop' },
	{ href: '/app/teacher/archive', label: 'Archive' },
	{ href: '/app/teacher-studio', label: 'Teacher Studio' },
]

export function AppFrame({
	children,
	role,
}: {
	children: ReactNode
	role: AppRole
}) {
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
			<header className="border-b border-white/10">
				<div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
					<Link href="/" className="literary-title text-lg text-parchment-100">
						shortstory.ink
					</Link>
					<nav className="flex flex-wrap items-center gap-2 text-sm text-silver-200">
						{visibleNav.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className="rounded-full px-3 py-1.5 transition hover:bg-white/5">
								{item.label}
							</Link>
						))}
						<p className="ml-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.11em] text-silver-300">
							{role}
						</p>
						<form action={signOutAction}>
							<button
								type="submit"
								className="rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-[0.11em] text-silver-200 transition hover:border-white/30 hover:text-parchment-100">
								Log out
							</button>
						</form>
					</nav>
				</div>
			</header>

			<main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
		</div>
	)
}

