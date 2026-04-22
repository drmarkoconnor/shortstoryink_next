import type { ReactNode } from 'react'
import type { MouseEventHandler } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'text'

const classes: Record<Variant, string> = {
	primary:
		'inline-flex items-center gap-2 rounded-full border border-burgundy-300/80 bg-burgundy-500/70 px-4 py-2 text-sm text-parchment-100 transition hover:bg-burgundy-400/80',
	secondary:
		'inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm text-parchment-100 transition hover:bg-white/15',
	ghost:
		'inline-flex items-center gap-2 rounded-full border border-transparent px-4 py-2 text-sm text-silver-100 transition hover:border-white/20 hover:bg-white/10',
	text: 'inline-flex items-center gap-2 text-sm text-burgundy-200 underline-offset-4 transition hover:underline',
}

export function ProtoButton({
	children,
	variant = 'primary',
	as = 'button',
	href,
	onClick,
	type = 'button',
	disabled = false,
	className = '',
}: {
	children: ReactNode
	variant?: Variant
	as?: 'button' | 'a'
	href?: string
	onClick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>
	type?: 'button' | 'submit' | 'reset'
	disabled?: boolean
	className?: string
}) {
	if (as === 'a') {
		return (
			<a
				className={`${classes[variant]} ${className}`}
				href={href}
				target="_blank"
				rel="noreferrer"
				onClick={onClick}>
				{children}
			</a>
		)
	}

	return (
		<button
			type={type}
			disabled={disabled}
			onClick={onClick as MouseEventHandler<HTMLButtonElement>}
			className={`${classes[variant]} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>
			{children}
		</button>
	)
}
