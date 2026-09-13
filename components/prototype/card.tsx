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
		<section data-proto-card={title} className="surface p-5 sm:p-6">
			<div className="mb-4 flex items-start justify-between gap-3">
				<div>
					<h3 className="literary-title text-2xl text-studio-ink">{title}</h3>
					{meta && (
						<p className="mt-1 text-xs uppercase tracking-[0.09em] text-studio-muted">
							{meta}
						</p>
					)}
				</div>
				{action}
			</div>
			<div className="text-sm leading-7 text-studio-muted">
				{children}
			</div>
		</section>
	)
}
