import Image from 'next/image'
import Link from 'next/link'
import { BrandWordmark } from '@/components/brand/brand-wordmark'

export default function HomePage() {
	return (
		<div className="public-shell">
			<header className="studio-header">
				<BrandWordmark />
				<nav aria-label="Main navigation" className="flex items-center gap-6 text-sm">
					<Link href="/guide/new-writers" className="public-muted hover:text-white">About the studio</Link>
					<Link href="/auth/sign-in" className="studio-secondary">Sign in</Link>
				</nav>
			</header>

			<main>
				<section className="public-hero grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
					<div className="public-hero-copy">
						<p className="studio-eyebrow">A private place for the writing life</p>
						<h1 className="literary-title mt-6 text-5xl leading-[1.06] sm:text-6xl lg:text-7xl">
							Every story begins<br />
							<span className="italic">with noticing.</span>
						</h1>
						<p className="public-muted mt-7 max-w-xl text-lg leading-8">
							Bring something you are working on. Send it when you would like a close read,
							then find thoughtful comments beside the words that prompted them.
						</p>
						<div className="mt-8 flex flex-wrap gap-4">
							<Link href="/auth/sign-in" className="studio-primary">Enter the studio</Link>
							<Link href="/guide/new-writers" className="studio-secondary">See how it works</Link>
						</div>
						<p className="public-muted mt-7 text-sm leading-6">
							Access is currently by invitation while the studio remains small and personal.
						</p>
					</div>

					<figure>
						<Image
							src="/illustrations/park.webp"
							alt="An illustrated park with quiet paths and people whose stories are waiting to be imagined."
							width={1774}
							height={887}
							priority
							sizes="(max-width: 1024px) 90vw, 640px"
							className="studio-illustration"
						/>
						<figcaption className="public-muted mt-4 font-serif italic">
							Someone, somewhere, under pressure. A world of possibilities.
						</figcaption>
					</figure>
				</section>

				<section className="public-paper">
					<div className="grid gap-9 md:grid-cols-3">
						{[
							['Write', 'Bring the piece you actually care about.', 'Write here, continue a saved draft, or paste work begun somewhere else.'],
							['Receive a close read', 'Feedback stays with the writing.', 'Comments remain anchored beside the exact lines and passages that prompted them.'],
							['Return', 'Revision is part of the conversation.', 'Earlier versions remain available while you decide what to keep, change, or ignore.'],
						].map(([label, title, body]) => (
							<div key={label} className="public-feature">
								<p className="studio-eyebrow">{label}</p>
								<h2 className="literary-title mt-4 text-2xl">{title}</h2>
								<p className="mt-3 text-sm leading-7 text-studio-muted">{body}</p>
							</div>
						))}
					</div>

					<div className="mt-12 grid gap-7 border-t border-studio-line pt-9 lg:grid-cols-[1.2fr_.8fr]">
						<div>
							<p className="studio-eyebrow">Other rooms, when useful</p>
							<h2 className="literary-title mt-3 text-3xl">Reading and a private commonplace.</h2>
							<p className="mt-4 max-w-2xl leading-7 text-studio-muted">
								There are readings, annotated examples and a place to keep passages or observations
								worth returning to. None of them are prerequisites for submitting a piece.
							</p>
						</div>
						<div className="public-access-note self-end text-sm leading-7">
							<p><strong className="text-studio-ink">shortstory.ink</strong> is presently a private studio rather than a commercial course or open social platform.</p>
						</div>
					</div>

					<footer className="mt-10 flex flex-wrap justify-between gap-4 border-t border-studio-line pt-7 text-sm text-studio-muted">
						<p>shortstory.ink · A practice of attention</p>
						<Link href="/auth/sign-in" className="studio-link">Writer sign in</Link>
					</footer>
				</section>
			</main>
		</div>
	)
}
