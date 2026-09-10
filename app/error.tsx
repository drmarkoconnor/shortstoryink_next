'use client'

export default function StudioError({ reset }: { reset: () => void }) {
	return (
		<main className="mx-auto max-w-xl px-6 py-16">
			<section className="surface space-y-4 p-8">
				<h1 className="literary-title text-3xl text-studio-ink">The studio couldn’t load</h1>
				<p className="text-sm text-studio-muted">Please try again in a moment. If you have an open draft in another tab, keep it open or download a copy before leaving.</p>
				<button onClick={reset} className="studio-primary">Try again</button>
			</section>
		</main>
	)
}
