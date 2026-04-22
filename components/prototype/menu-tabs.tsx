import Link from 'next/link'

export function MenuTabs({
	tabs,
	active,
}: {
	tabs: { href: string; label: string }[]
	active: string
}) {
	return (
		<nav className="surface flex flex-wrap gap-1 p-2">
			{tabs.map((tab) => {
				const isActive = active === tab.href
				return (
					<Link
						key={tab.href}
						href={tab.href}
						className={`rounded-full px-3.5 py-2 text-xs uppercase tracking-[0.09em] transition ${
							isActive
								? 'bg-burgundy-500/80 text-parchment-100 shadow-[0_0_0_1px_rgba(248,246,242,0.08)]'
								: 'text-silver-100 hover:bg-white/10 hover:text-parchment-100'
						}`}>
						{tab.label}
					</Link>
				)
			})}
		</nav>
	)
}
