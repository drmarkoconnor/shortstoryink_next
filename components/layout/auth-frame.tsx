import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandWordmark } from '@/components/brand/brand-wordmark'

export function AuthFrame({ children }: { children: ReactNode }) {
	return (
		<div className="auth-shell">
			<header className="studio-header">
				<BrandWordmark />
				<Link href="/guide/new-writers" className="text-sm text-[#c4cec8] hover:text-white">
					About the studio
				</Link>
			</header>
			<main className="mx-auto w-full max-w-xl px-5 py-12 sm:px-8 sm:py-20">
				<div className="auth-paper">{children}</div>
			</main>
			<footer className="auth-footer mx-auto flex max-w-xl flex-wrap justify-center gap-6 px-5 pb-10 text-sm">
				<Link href="/auth/sign-in" className="hover:text-white hover:underline">Sign in</Link>
				<span>Access is currently by invitation.</span>
			</footer>
		</div>
	)
}
