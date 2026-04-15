export function LiteraryQuote({
	quote,
	author,
}: {
	quote: string
	author: string
}) {
	return (
		<blockquote className="surface border-burgundy-300/40 p-5">
			<p className="literary-title text-lg leading-relaxed text-parchment-100">
				“{quote}”
			</p>
			<footer className="mt-3 text-xs uppercase tracking-[0.11em] text-silver-300">
				{author}
			</footer>
		</blockquote>
	)
}

