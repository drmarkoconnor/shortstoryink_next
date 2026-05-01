import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
	Figure,
	GuideHero,
	GuideShell,
	guideSteps,
} from './guide-content'

export const metadata: Metadata = {
	title: 'New Writer Guide | shortstory.ink',
	description: 'A simple guide to writing, feedback, and revision in shortstory.ink.',
}

export default function NewWritersGuidePage() {
	return (
		<GuideShell activeHref="/guide/new-writers">
			<GuideHero
				kicker="New writer guide"
				title="From first sign-up to your next revision."
				body="shortstory.ink is built around a steady loop: submit a draft, receive careful feedback, read it in context, and return to the work with more clarity."
				image={{
					src: '/guide/new-writers/homepage.webp',
					width: 1200,
					height: 572,
					alt: 'The shortstory.ink public home page.',
				}}
			/>

			<section className="mx-auto w-full max-w-6xl px-6 py-10 lg:py-12">
				<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
					{guideSteps.map((step) => (
						<Link
							key={step.href}
							href={step.href}
							className="group overflow-hidden rounded-2xl border border-white/15 bg-ink-800/90 shadow-glow transition hover:border-accent-300/45">
							<div className="aspect-[4/3] overflow-hidden bg-ink-950/60">
								<Image
									src={step.image.src}
									width={step.image.width}
									height={step.image.height}
									alt={step.image.alt}
									className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
								/>
							</div>
							<div className="p-4">
								<p className="text-xs uppercase tracking-[0.16em] text-accent-300">
									{step.kicker}
								</p>
								<h2 className="literary-title mt-2 text-2xl text-parchment-100">
									{step.title}
								</h2>
								<p className="mt-3 text-sm leading-6 text-silver-100">
									{step.body}
								</p>
							</div>
						</Link>
					))}
				</div>
			</section>

			<section className="mx-auto grid w-full max-w-6xl gap-5 px-6 pb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]">
				<Figure
					image={{
						src: '/guide/new-writers/homepage-steps.webp',
						width: 1100,
						height: 573,
						alt: 'Three short cards explaining the write, feedback, revise loop.',
					}}
					caption="The core rhythm is simple: begin with one draft, read close feedback, then revise."
				/>
				<div className="surface p-5 lg:p-6">
					<p className="text-xs uppercase tracking-[0.14em] text-accent-300">
						The big idea
					</p>
					<h2 className="literary-title mt-2 text-3xl text-parchment-100">
						One piece at a time.
					</h2>
					<p className="mt-4 text-[16px] leading-8 text-silver-100">
						You do not need to learn a complicated platform before you begin.
						The app gives you a quiet writing space, a clear place to find
						feedback, and a revision path when you are ready for the next draft.
					</p>
				</div>
			</section>
		</GuideShell>
	)
}
