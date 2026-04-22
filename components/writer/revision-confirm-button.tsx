'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RevisionConfirmButton({
	href,
}: {
	href: string
}) {
	const router = useRouter()
	const [isConfirming, setIsConfirming] = useState(false)

	if (isConfirming) {
		return (
			<div className="rounded-2xl border border-amber-300/35 bg-amber-300/10 p-4">
				<p className="text-sm leading-relaxed text-amber-100">
					You&apos;re about to leave the feedback view and begin a new revision
					from this draft. You can return to this feedback from your feedback
					page.
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => router.push(href)}
						className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30">
						Start revision
					</button>
					<button
						type="button"
						onClick={() => setIsConfirming(false)}
						className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.1em] text-silver-100 transition hover:bg-white/10 hover:text-parchment-100">
						Stay with feedback
					</button>
				</div>
			</div>
		)
	}

	return (
		<button
			type="button"
			onClick={() => setIsConfirming(true)}
			className="w-full rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2.5 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30">
			Start a new revision
		</button>
	)
}
