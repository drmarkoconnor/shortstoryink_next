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
			<div className="rounded-2xl border border-amber-700/25 bg-amber-50/90 p-4 shadow-sm">
				<p className="text-sm leading-relaxed text-ink-900/78">
					You&apos;re about to leave the feedback view and begin a new revision
					from this draft. You can return to this feedback from your feedback
					page.
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => router.push(href)}
						className="rounded-full border border-burgundy-500 bg-burgundy-500 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-burgundy-400">
						Start revision
					</button>
					<button
						type="button"
						onClick={() => setIsConfirming(false)}
						className="rounded-full border border-ink-900/15 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.1em] text-ink-900/70 transition hover:bg-white hover:text-ink-900">
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
			className="w-full rounded-full border border-burgundy-500 bg-burgundy-500 px-4 py-2.5 text-xs uppercase tracking-[0.1em] text-parchment-100 shadow-sm transition hover:bg-burgundy-400">
			Start a new revision
		</button>
	)
}
