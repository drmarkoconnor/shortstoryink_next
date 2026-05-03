'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function WriterAccessSelect({
	options,
	selectedId,
}: {
	options: Array<{ id: string; label: string }>
	selectedId: string
}) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	return (
		<div className="w-full max-w-sm space-y-2">
			<label
				htmlFor="writer-access-select"
				className="block text-xs uppercase tracking-[0.1em] text-silver-300">
				Writer
			</label>
			<select
				id="writer-access-select"
				value={selectedId}
				onChange={(event) => {
					const writerId = event.target.value
					if (!writerId) {
						return
					}
					startTransition(() => {
						router.push(`/app/teacher?writer=${encodeURIComponent(writerId)}`)
					})
				}}
				disabled={isPending || options.length === 0}
				className="w-full rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100 disabled:cursor-wait disabled:opacity-80">
				{options.length === 0 ? (
					<option value="">No writers available</option>
				) : (
					options.map((writer) => (
						<option key={writer.id} value={writer.id}>
							{writer.label}
						</option>
					))
				)}
			</select>
			{isPending ? (
				<p className="text-xs text-silver-300">Loading writer...</p>
			) : null}
		</div>
	)
}
