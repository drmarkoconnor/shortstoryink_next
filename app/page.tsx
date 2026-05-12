import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import penImage from '@/assets/images/piltopen.jpg'

const detailCards = [
	{
		kicker: 'Draft',
		title: 'One page at a time',
		body: 'No performance, no feed, no pressure to explain the work first.',
	},
	{
		kicker: 'Feedback',
		title: 'Readable, anchored advice',
		body: 'Every response has a place in the manuscript.',
	},
	{
		kicker: 'Growth',
		title: 'The habit of revision',
		body: 'Build a steady loop of noticing, rewriting, and returning.',
	},
]

const heroStyle = {
	'--home-accent': '#cfb890',
	'--home-accent-soft': '#d8c7a6',
} as CSSProperties

function HomeWordmark() {
	return (
		<Link
			href="/"
			className="inline-flex items-center gap-2.5 text-parchment-100"
			aria-label="shortstory.ink home">
			<span className="grid h-8 w-8 place-items-center rounded-full border border-accent-300/45 bg-burgundy-500/60 text-[13px] font-semibold text-parchment-100 shadow-[0_0_0_1px_rgba(252,251,248,0.08),0_8px_20px_rgba(0,0,0,0.22)]">
				ss
			</span>
			<span className="font-serif text-lg sm:text-xl">shortstory.ink</span>
		</Link>
	)
}

export default function HomePage() {
	return (
		<main
			className="min-h-screen overflow-x-clip bg-ink-950 text-parchment-100"
			style={heroStyle}>
			<section
				className="relative isolate overflow-hidden border-b border-white/10 bg-ink-950">
				<Image
					src={penImage}
					alt=""
					fill
					priority
					sizes="100vw"
					className="-z-20 object-cover opacity-[0.88] brightness-[1.32] contrast-[1.04]"
					style={{ objectPosition: 'center center' }}
				/>
				<div className="absolute inset-0 -z-10 bg-ink-950/20" />
				<div className="absolute inset-y-0 left-0 -z-10 w-full bg-gradient-to-r from-ink-950/95 via-ink-950/55 to-ink-950/5" />
				<div className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-ink-900/90 to-transparent" />

				<div className="mx-auto flex min-h-[76svh] w-full max-w-7xl flex-col px-5 py-6 sm:min-h-[78svh] sm:px-8 lg:min-h-[80svh] lg:px-10">
					<nav className="flex items-center justify-between gap-4 text-parchment-100">
						<HomeWordmark />
						<div className="hidden items-center gap-2 text-sm sm:flex">
							<Link
								href="/auth/sign-in"
								className="rounded-full px-4 py-2 transition hover:bg-white/10">
								Sign in
							</Link>
							<Link
								href="/auth/sign-up"
								className="rounded-full border border-parchment-100/25 bg-parchment-100 px-4 py-2 text-ink-950 transition hover:bg-parchment-200">
								Join
							</Link>
						</div>
					</nav>

					<div className="flex flex-1 items-center py-14">
						<div
							className="mr-auto min-w-0 text-left"
							style={{ width: 'min(48rem, calc(100vw - 2.5rem))' }}>
							<p
								className="mb-5 text-sm font-semibold uppercase"
								style={{ color: 'var(--home-accent)' }}>
								Teacher-led close reading for short fiction
							</p>
							<h1 className="font-serif text-5xl leading-[1.02] text-parchment-100 sm:text-6xl lg:text-7xl">
								Short fiction, carefully read
							</h1>
							<p className="mt-7 max-w-[19rem] text-lg leading-8 text-silver-100 sm:max-w-2xl sm:text-xl sm:leading-9">
								A literary writing studio where feedback is close to the text,
								revision is part of the process, and the atmosphere stays serious
								but inviting.
							</p>
							<div className="mt-8 flex flex-wrap gap-3">
								<Link
									href="/auth/sign-up"
									className="rounded-full border border-parchment-100/25 bg-parchment-100 px-6 py-3 text-sm font-semibold text-ink-950 shadow-[0_16px_40px_rgba(0,0,0,0.18)] transition hover:bg-parchment-200">
									Create a free account
								</Link>
								<Link
									href="/auth/sign-in"
									className="rounded-full border border-parchment-100/25 bg-white/10 px-6 py-3 text-sm font-semibold text-parchment-100 backdrop-blur transition hover:bg-white/15">
									Welcome back
								</Link>
							</div>
							<p className="mt-8 max-w-[18rem] text-sm leading-6 text-silver-100 sm:max-w-xl">
								Not a social feed. Not a course dump. A place to work on the
								draft.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section className="relative z-10 -mt-8 border-y border-white/10 bg-[linear-gradient(180deg,rgba(31,36,38,0.98)_0%,rgba(16,20,25,0.99)_55%,rgba(7,9,15,1)_100%)] text-parchment-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_-24px_70px_rgba(0,0,0,0.22)] sm:-mt-10">
				<div className="mx-auto grid max-w-7xl gap-0 px-5 py-6 sm:px-8 lg:grid-cols-3 lg:px-10">
					{detailCards.map((detail) => (
						<div
							key={detail.title}
							className="border-b border-white/15 py-4 last:border-b-0 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
							<p
								className="text-sm font-semibold"
								style={{ color: 'var(--home-accent-soft)' }}>
								{detail.kicker}
							</p>
							<h2 className="mt-1.5 font-serif text-[1.45rem] leading-tight">
								{detail.title}
							</h2>
							<p className="mt-2.5 text-sm leading-6 text-silver-100">
								{detail.body}
							</p>
						</div>
					))}
				</div>
			</section>
		</main>
	)
}
