import Link from 'next/link'
import type { ReactNode } from 'react'

export function MenuTabs({
	tabs,
	active,
	context,
}: {
	tabs: { href: string; label: string }[]
	active: string
	context?: ReactNode
}) {
	return (
		<nav className="print-controls surface flex flex-wrap items-center justify-between gap-3 p-2">
			<div className="flex flex-wrap gap-1">
				{tabs.map((tab) => {
					const isActive = active === tab.href
					return (
						<Link
							key={tab.href}
							href={tab.href}
							prefetch={false}
							className={`rounded-full px-3.5 py-2 text-xs uppercase tracking-[0.09em] transition ${
								isActive
									? 'bg-burgundy-500/80 text-parchment-100 shadow-[0_0_0_1px_rgba(248,246,242,0.08)]'
									: 'text-silver-100 hover:bg-white/10 hover:text-parchment-100'
							}`}>
							{tab.label}
						</Link>
					)
				})}
			</div>
			{context ? (
				<div className="min-w-0 flex-1 px-2 text-right sm:flex-none">
					{context}
				</div>
			) : null}
		</nav>
	)
}
