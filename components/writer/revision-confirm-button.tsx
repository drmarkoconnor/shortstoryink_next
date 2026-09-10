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
			<div className="rounded-md border border-amber-700/25 bg-amber-50/90 p-4 shadow-sm">
				<p className="text-sm leading-relaxed text-studio-ink/78">
					You&apos;re about to leave the feedback view and begin a new revision
					from this draft. You can return to this feedback from your feedback
					page.
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => router.push(href)}
						className="rounded border border-burgundy-500 bg-studio-soft px-4 py-2 text-xs uppercase tracking-[0.1em] text-studio-ink transition hover:bg-studio-soft">
						Start revision
					</button>
					<button
						type="button"
						onClick={() => setIsConfirming(false)}
						className="rounded border border-ink-900/15 bg-studio-tint px-4 py-2 text-xs uppercase tracking-[0.1em] text-studio-ink/70 transition hover:bg-white hover:text-studio-ink">
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
			className="w-full rounded border border-burgundy-500 bg-studio-soft px-4 py-2.5 text-xs uppercase tracking-[0.1em] text-studio-ink shadow-sm transition hover:bg-studio-soft">
			Start a new revision
		</button>
	)
}
