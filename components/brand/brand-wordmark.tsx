import Link from 'next/link'

export function BrandWordmark({ className = '' }: { className?: string }) {
	return (
		<Link
			href="/"
			className={`inline-flex items-center gap-2.5 text-parchment-100 ${className}`}
			aria-label="shortstory.ink home">
			<span className="grid h-8 w-8 place-items-center rounded-full border border-accent-300/45 bg-burgundy-500/55 text-[13px] font-semibold tracking-[0.03em] text-parchment-100 shadow-[0_0_0_1px_rgba(252,251,248,0.08),0_8px_20px_rgba(0,0,0,0.22)]">
				ss
			</span>
			<span className="literary-title text-lg sm:text-xl">shortstory.ink</span>
		</Link>
	)
}
