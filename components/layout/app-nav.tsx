'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
	href: string
	label: string
	disabled?: boolean
}

function isActivePath(pathname: string, href: string) {
	if (href === '/app/writer') {
		return pathname === href
	}
	return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppNav({ items }: { items: NavItem[] }) {
	const pathname = usePathname()

	return (
		<nav className="flex flex-wrap items-center justify-end gap-2 text-sm text-silver-100">
			{items.map((item) => {
				const isActive = isActivePath(pathname, item.href)

				if (item.disabled) {
					return (
						<span
							key={item.href}
							className="rounded-full border border-white/10 px-3 py-1.5 text-silver-400/70">
							{item.label}
						</span>
					)
				}

				return (
					<Link
						key={item.href}
						href={item.href}
						className={
							isActive
								? 'rounded-full border border-burgundy-300/65 bg-burgundy-500/75 px-3 py-1.5 text-parchment-100 shadow-[0_8px_20px_rgba(122,47,69,0.18)]'
								: 'rounded-full px-3 py-1.5 transition hover:bg-burgundy-500/25 hover:text-parchment-100'
						}>
						{item.label}
					</Link>
				)
			})}
		</nav>
	)
}
