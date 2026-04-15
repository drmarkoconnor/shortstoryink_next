import Link from 'next/link'

export default function HomePage() {
	return (
		<main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-24">
			<p className="mb-6 text-sm uppercase tracking-[0.18em] text-accent-300">
				shortstory.ink
			</p>
			<h1 className="literary-title max-w-prose text-4xl leading-tight text-parchment-100 sm:text-5xl">
				A calm, workshop-first space for serious short fiction.
			</h1>
			<p className="muted mt-6 max-w-prose text-lg leading-relaxed">
				This foundation ships the new App Router shell only: writer and teacher
				surfaces, workshop core lanes, and Teacher Studio scaffolding.
			</p>

			<div className="mt-10 flex flex-wrap gap-3">
				<Link
					href="/app"
					className="rounded-full border border-accent-400/60 bg-accent-400/15 px-5 py-2.5 text-sm text-parchment-100 transition hover:bg-accent-400/25">
					Enter application shell
				</Link>
				<Link
					href="/auth/sign-in"
					className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-silver-200 transition hover:border-white/30 hover:text-parchment-100">
					Sign in
				</Link>
			</div>
		</main>
	)
}
