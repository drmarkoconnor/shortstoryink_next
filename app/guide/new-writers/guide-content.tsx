import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandWordmark } from '@/components/brand/brand-wordmark'

export type GuideImage = {
	src: string
	width: number
	height: number
	alt: string
}

export type GuideStep = {
	kicker: string
	title: string
	body: string
	href: string
	image: GuideImage
}

export const guideSteps: GuideStep[] = [
	{
		kicker: '01',
		title: 'Create your account',
		body: 'Start with a simple email and password. Once you are in, the app keeps the focus on your writing rather than on setup.',
		href: '/guide/new-writers/getting-started',
		image: {
			src: '/guide/new-writers/sign-up.webp',
			width: 490,
			height: 458,
			alt: 'The shortstory.ink sign up form.',
		},
	},
	{
		kicker: '02',
		title: 'Submit one draft',
		body: 'Paste or type your piece, add a title, choose your group, and send it for a close read.',
		href: '/guide/new-writers/submitting',
		image: {
			src: '/guide/new-writers/submit-empty.webp',
			width: 1050,
			height: 713,
			alt: 'The writer submission page with a blank draft area.',
		},
	},
	{
		kicker: '03',
		title: 'Read feedback in context',
		body: 'When feedback is published, you can read comments exactly where they belong: beside the words they refer to.',
		href: '/guide/new-writers/feedback',
		image: {
			src: '/guide/new-writers/feedback-in-context.webp',
			width: 1200,
			height: 764,
			alt: 'Published feedback shown beside the submitted manuscript.',
		},
	},
	{
		kicker: '04',
		title: 'Revise with history intact',
		body: 'Start a new version from the feedback screen. Earlier feedback stays preserved, so your progress remains visible.',
		href: '/guide/new-writers/revising',
		image: {
			src: '/guide/new-writers/revision-panel.webp',
			width: 337,
			height: 537,
			alt: 'The revision workspace showing source version and next version.',
		},
	},
]

export const guideNav = [
	{ href: '/guide/new-writers', label: 'Overview' },
	{ href: '/guide/new-writers/getting-started', label: 'Getting Started' },
	{ href: '/guide/new-writers/submitting', label: 'Submitting' },
	{ href: '/guide/new-writers/feedback', label: 'Feedback' },
	{ href: '/guide/new-writers/revising', label: 'Revising' },
	{ href: '/guide/new-writers/how-feedback-works', label: 'How Feedback Works' },
]

export function GuideShell({
	activeHref,
	children,
}: {
	activeHref: string
	children: ReactNode
}) {
	return (
		<main className="min-h-screen bg-ink-900 text-parchment-100">
			<header className="border-b border-white/10 bg-ink-950/45">
				<div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
					<BrandWordmark />
					<nav className="flex flex-wrap items-center justify-end gap-2 text-sm text-silver-100">
						<Link
							href="/app/writer"
							className="rounded-full border border-accent-400/70 bg-accent-400/20 px-3 py-1.5 text-parchment-100 transition hover:bg-accent-400/30">
							Back to writing
						</Link>
						{guideNav.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className={
									activeHref === item.href
										? 'rounded-full border border-burgundy-300/65 bg-burgundy-500/75 px-3 py-1.5 text-parchment-100'
										: 'rounded-full px-3 py-1.5 transition hover:bg-burgundy-500/25 hover:text-parchment-100'
								}>
								{item.label}
							</Link>
						))}
					</nav>
				</div>
			</header>
			{children}
		</main>
	)
}

export function GuideHero({
	kicker,
	title,
	body,
	image,
}: {
	kicker: string
	title: string
	body: string
	image?: GuideImage
}) {
	return (
		<section className="border-b border-white/10 bg-ink-950/35">
			<div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-6 py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-16">
				<div>
					<p className="text-xs uppercase tracking-[0.18em] text-accent-300">
						{kicker}
					</p>
					<h1 className="literary-title mt-4 text-4xl leading-tight text-parchment-100 sm:text-5xl">
						{title}
					</h1>
					<p className="mt-5 max-w-2xl text-lg leading-8 text-silver-100">
						{body}
					</p>
				</div>
				{image ? (
					<Figure image={image} priority />
				) : (
					<div className="rounded-[28px] border border-accent-300/25 bg-accent-400/10 p-6 text-center">
						<p className="literary-title text-2xl">Write, read, revise.</p>
					</div>
				)}
			</div>
		</section>
	)
}

export function Figure({
	image,
	caption,
	priority = false,
}: {
	image: GuideImage
	caption?: string
	priority?: boolean
}) {
	return (
		<figure className="overflow-hidden rounded-2xl border border-white/15 bg-ink-950/55 shadow-glow">
			<Image
				src={image.src}
				width={image.width}
				height={image.height}
				alt={image.alt}
				priority={priority}
				className="h-auto w-full"
			/>
			{caption ? (
				<figcaption className="border-t border-white/10 px-4 py-3 text-sm leading-6 text-silver-200">
					{caption}
				</figcaption>
			) : null}
		</figure>
	)
}

export function CopyBlock({
	kicker,
	title,
	children,
}: {
	kicker?: string
	title: string
	children: ReactNode
}) {
	return (
		<section className="surface p-5 lg:p-6">
			{kicker ? (
				<p className="text-xs uppercase tracking-[0.14em] text-accent-300">
					{kicker}
				</p>
			) : null}
			<h2 className="literary-title mt-2 text-3xl text-parchment-100">
				{title}
			</h2>
			<div className="mt-4 space-y-4 text-[16px] leading-8 text-silver-100">
				{children}
			</div>
		</section>
	)
}

export function PageGrid({ children }: { children: ReactNode }) {
	return (
		<div className="mx-auto grid w-full max-w-6xl gap-5 px-6 py-10 lg:grid-cols-2 lg:py-12">
			{children}
		</div>
	)
}

export function NextGuideLink({
	href,
	label,
}: {
	href: string
	label: string
}) {
	return (
		<div className="mx-auto w-full max-w-6xl px-6 pb-14">
			<Link
				href={href}
				className="inline-flex rounded-full border border-accent-400/70 bg-accent-400/20 px-5 py-2.5 text-sm text-parchment-100 transition hover:bg-accent-400/30">
				{label}
			</Link>
		</div>
	)
}
