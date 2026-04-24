import type { ReactNode } from 'react'

export function StoryFolio({
	title,
	children,
	footer,
	eyebrow = 'Submission draft',
	paged,
	hideHeader = false,
}: {
	title: string
	children: ReactNode
	footer?: ReactNode
	eyebrow?: string
	paged?: boolean
	hideHeader?: boolean
}) {
	return (
		<article
			className={`folio-page p-6 sm:p-7 lg:p-9 xl:p-10 ${
				paged ? 'lg:min-h-[calc(100vh-16rem)] xl:min-h-[calc(100vh-17rem)]' : ''
			}`}>
			{hideHeader ? null : (
				<header className="mb-6 border-b border-ink-900/10 pb-5">
					<p className="text-xs uppercase tracking-[0.14em] text-ink-900/55">
						{eyebrow}
					</p>
					<h2 className="literary-title mt-2 text-3xl leading-tight text-ink-900">
						{title}
					</h2>
				</header>
			)}
			<div
				className={`max-w-[78ch] space-y-5 font-serif text-[18px] leading-8 text-ink-900/90 lg:text-[18px] lg:leading-[1.95rem] ${
					paged
						? hideHeader
							? 'lg:min-h-[calc(100vh-22rem)] xl:min-h-[calc(100vh-23rem)]'
							: 'lg:min-h-[calc(100vh-27rem)] xl:min-h-[calc(100vh-28rem)]'
						: ''
				}`}>
				{children}
			</div>
			{footer ? <div className="mt-6 border-t border-ink-900/10 pt-4">{footer}</div> : null}
		</article>
	)
}
