import type { ReactNode } from 'react'

export function StoryFolio({
	title,
	children,
}: {
	title: string
	children: ReactNode
}) {
	return (
		<article className="folio-page p-8 lg:p-10">
			<header className="mb-8 border-b border-ink-900/10 pb-5">
				<p className="text-xs uppercase tracking-[0.14em] text-ink-900/55">
					Submission draft
				</p>
				<h2 className="literary-title mt-2 text-3xl leading-tight text-ink-900">
					{title}
				</h2>
			</header>
			<div className="max-w-[75ch] space-y-5 font-serif text-[18px] leading-8 text-ink-900/90">
				{children}
			</div>
		</article>
	)
}

