import Link from 'next/link'
import type { ReactNode } from 'react'

const navItems = [
	{ href: '/app', label: 'Overview' },
	{ href: '/app/workshop', label: 'Workshop' },
	{ href: '/app/writer', label: 'Writer' },
	{ href: '/app/teacher', label: 'Teacher' },
	{ href: '/app/teacher-studio', label: 'Teacher Studio' },
]

export function AppFrame({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen bg-ink-900 text-parchment-100">
			<header className="border-b border-white/10">
				<div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
					<Link href="/" className="literary-title text-lg text-parchment-100">
						shortstory.ink
					</Link>
					<nav className="flex flex-wrap items-center gap-2 text-sm text-silver-200">
						{navItems.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className="rounded-full px-3 py-1.5 transition hover:bg-white/5">
								{item.label}
							</Link>
						))}
					</nav>
				</div>
			</header>

			<main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
		</div>
	)
}
