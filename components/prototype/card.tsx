import type { ReactNode } from 'react'

export function ProtoCard({
	title,
	meta,
	children,
	action,
}: {
	title: string
	meta?: string
	children: ReactNode
	action?: ReactNode
}) {
	return (
		<section className="surface p-4">
			<div className="mb-2 flex items-start justify-between gap-3">
				<div>
					<h3 className="text-sm font-semibold text-parchment-100">{title}</h3>
					{meta && (
						<p className="mt-1 text-xs uppercase tracking-[0.09em] text-silver-300">
							{meta}
						</p>
					)}
				</div>
				{action}
			</div>
			<div className="text-sm leading-relaxed text-silver-200">{children}</div>
		</section>
	)
}

