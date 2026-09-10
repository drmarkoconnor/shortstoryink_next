import type { ReactNode } from 'react'
import type { MouseEventHandler } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'text'

const classes: Record<Variant, string> = {
 primary: 'studio-primary gap-2',
 secondary: 'studio-secondary gap-2',
 ghost: 'studio-secondary gap-2 border-transparent text-studio-muted',
 text: 'studio-link inline-flex items-center gap-2',
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
