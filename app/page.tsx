import Image from 'next/image'
import Link from 'next/link'
import { Fragment } from 'react'
import penImage from '@/assets/images/piltopen.jpg'
import { BrandWordmark } from '@/components/brand/brand-wordmark'

const steps = [
	{
		title: 'Start with one draft',
		body: 'Bring a piece that matters to you. We keep the page quiet, the text intact, and the attention where it belongs: on the writing.',
	},
	{
		title: 'Read close, human feedback',
		body: 'A real teacher responds closely to the work, in context and in detail. The point is not speed. It is to help you see the draft more clearly.',
	},
	{
		title: 'Revise, then return',
		body: 'Use the comments to strengthen the piece, then come back into the same steady cycle of reading, response, and revision.',
	},
]

export default function HomePage() {
	return (
		<main className="min-h-screen bg-ink-900 text-parchment-100">
			<section className="relative isolate overflow-hidden border-b border-white/10">
				<Image
					src={penImage}
					alt=""
					priority
					className="absolute inset-0 -z-20 h-full w-full object-cover opacity-[0.88] brightness-[1.32] contrast-[1.04]"
				/>
				<div className="absolute inset-0 -z-10 bg-ink-950/20" />
				<div className="absolute inset-y-0 left-0 -z-10 w-full bg-gradient-to-r from-ink-950/95 via-ink-950/55 to-ink-950/5" />
				<div className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-ink-900/90 to-transparent" />

				<div className="mx-auto flex min-h-[88vh] w-full max-w-6xl flex-col justify-center px-6 py-20 sm:py-24">
					<nav className="mb-16 flex flex-wrap items-center justify-between gap-4">
						<BrandWordmark />
					</nav>

					<div className="max-w-3xl">
						<p className="mb-5 text-sm uppercase tracking-[0.18em] text-accent-300">
							Teacher-led close reading for short fiction
						</p>
						<h1 className="literary-title text-5xl leading-[1.04] text-parchment-100 sm:text-6xl lg:text-7xl">
							A better place for a serious draft to be read.
						</h1>
						<p className="mt-7 max-w-2xl text-lg leading-8 text-silver-100 sm:text-xl sm:leading-9">
							shortstory.ink is a calm writing studio for writers who want more
							than a quick note in the margin: careful reading, precise
							feedback, and a clearer way back into revision.
						</p>
						<div className="mt-8 flex flex-wrap gap-3">
							<Link
								href="/auth/sign-up"
								className="inline-flex rounded-full border border-accent-400/80 bg-accent-400/30 px-6 py-3 text-sm font-medium text-parchment-100 shadow-[0_10px_24px_rgba(0,0,0,0.2)] transition hover:bg-accent-400/40">
								Create a free account
							</Link>
							<Link
								href="/auth/sign-in"
								className="inline-flex rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-parchment-100 shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition hover:bg-white/15">
								Welcome back
							</Link>
						</div>
					</div>
				</div>
			</section>

			<section className="border-b border-white/10 bg-ink-950/35">
				<div className="mx-auto w-full max-w-6xl px-6 py-12">
					<div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
						{steps.map((step, index) => (
							<Fragment key={step.title}>
								<section
									className="rounded-2xl border border-accent-300/25 bg-ink-800/95 p-4 text-center shadow-glow">
									<p className="text-xs uppercase tracking-[0.16em] text-accent-300">
										0{index + 1}
									</p>
									<h3 className="literary-title mt-3 text-xl text-parchment-100">
										{step.title}
									</h3>
									<p className="mt-3 text-sm leading-6 text-silver-100">
										{step.body}
									</p>
								</section>
								{index < steps.length - 1 ? (
									<div
										key={`${step.title}-arrow`}
										className="hidden items-center md:flex"
										aria-hidden="true">
										<div className="h-px w-12 bg-accent-300/50" />
										<div className="-ml-1 h-2 w-2 rotate-45 border-r border-t border-accent-300/70" />
									</div>
								) : null}
							</Fragment>
						))}
					</div>
				</div>
			</section>

			<section className="mx-auto w-full max-w-4xl px-6 py-14 text-center lg:py-16">
				<div className="rounded-2xl border border-accent-300/25 bg-accent-400/10 p-6 lg:p-8">
					<p className="text-xs uppercase tracking-[0.14em] text-accent-300">
						A quiet invitation
					</p>
					<div className="mt-3 space-y-5">
						<div className="mx-auto max-w-2xl">
							<h2 className="literary-title text-3xl text-parchment-100">
								Begin with the draft
							</h2>
							<p className="mt-4 text-[16px] leading-8 text-silver-100">
								If the piece matters, let it be read with care. Read the
								feedback in place. Revise with the conversation still visible.
							</p>
						</div>
					</div>
				</div>
			</section>
		</main>
	)
}
