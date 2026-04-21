'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

export function PendingSubmitButton({
	children,
	pendingChildren = 'Saving...',
	className,
	pendingClassName,
}: {
	children: ReactNode
	pendingChildren?: ReactNode
	className: string
	pendingClassName?: string
}) {
	const { pending } = useFormStatus()

	return (
		<button
			type="submit"
			disabled={pending}
			aria-busy={pending}
			className={`${className} disabled:cursor-wait disabled:opacity-65 ${
				pending ? pendingClassName ?? '' : ''
			}`}>
			{pending ? pendingChildren : children}
		</button>
	)
}
