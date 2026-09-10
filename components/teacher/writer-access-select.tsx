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
				className="block text-xs uppercase tracking-[0.1em] text-studio-muted">
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
				className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink disabled:cursor-wait disabled:opacity-80">
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
				<p className="text-xs text-studio-muted">Loading writer...</p>
			) : null}
		</div>
	)
}
