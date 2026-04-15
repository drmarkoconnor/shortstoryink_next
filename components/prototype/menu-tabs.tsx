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
						className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.09em] transition ${
							isActive
								? 'bg-burgundy-500/70 text-parchment-100'
								: 'text-silver-200 hover:bg-white/5'
						}`}>
						{tab.label}
					</Link>
				)
			})}
		</nav>
	)
}

