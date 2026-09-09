import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppNav } from '@/components/layout/app-nav'
import { BrandWordmark } from '@/components/brand/brand-wordmark'
import type { AppRole } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { SignOutForm } from '@/components/auth/sign-out-form'

const writerNavItems = [
	{ href: '/app/writer', label: 'Write' },
	{ href: '/app/writer/documents', label: 'Materials' },
	{ href: '/app/writer/examples', label: 'Examples' },
	{ href: '/app/writer/feedback', label: 'Finished Pieces' },
	{ href: '/guide/new-writers', label: 'Guide' },
	{ href: '/app/account', label: 'Account' },
]

const teacherNavItems = [
	{ href: '/app/teacher/review-desk', label: 'Review' },
	{ href: '/app/teacher/groups', label: 'Groups' },
	{ href: '/app/teacher-studio', label: 'Studio' },
	{ href: '/app/teacher/feedback-memory', label: 'Memory' },
	{ href: '/app/teacher/examples', label: 'Examples' },
	{ href: '/app/teacher/archive', label: 'Archive' },
	{ href: '/app/account', label: 'Account' },
]

export async function AppFrame({
	children,
	role,
	user,
}: {
	children: ReactNode
	role: AppRole
	user: User
}) {
	const userEmail = user.email || ''
	const profile = await getCurrentProfile()
	const displayName = profile.displayName || user.user_metadata?.display_name || user.user_metadata?.name || userEmail

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

	const identityClass =
		role === 'writer'
			? 'border-burgundy-200/80 bg-burgundy-500/85 text-parchment-100 shadow-[0_0_0_1px_rgba(252,251,248,0.08),0_8px_20px_rgba(122,47,69,0.28)]'
			: 'border-white/15 bg-white/10 text-silver-100'

	return (
		<div className="min-h-screen bg-ink-900 text-parchment-100">
			<header className="app-shell-header border-b border-white/15 bg-ink-950/35">
				<div className="mx-auto flex w-full max-w-6xl flex-wrap items-start justify-between gap-4 px-6 py-5">
					<div>
						<BrandWordmark />
						<div className="mt-2 flex flex-wrap gap-1.5">
							<span
								className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] ${identityClass}`}>
								{role}
							</span>
							<span
								className={`rounded-full border px-2.5 py-1 text-[11px] tracking-tight ${identityClass}`}>
								{displayName || userEmail}
							</span>
						</div>
					</div>
					<div className="flex flex-wrap items-center justify-end gap-2">
						<AppNav items={visibleNav} />
						<SignOutForm ownerId={user.id} action={signOutAction} />
					</div>
				</div>
			</header>
			<main className="app-shell-main mx-auto w-full max-w-6xl px-6 py-8 lg:py-10">
				{children}
			</main>
		</div>
	)
}
