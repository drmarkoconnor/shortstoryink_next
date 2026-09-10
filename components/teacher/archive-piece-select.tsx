'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function ArchivePieceSelect({
	options,
	selectedId,
}: {
	options: Array<{ id: string; label: string }>
	selectedId: string
}) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [isPending, startTransition] = useTransition()

	return (
		<div className="max-w-full space-y-2">
			<label className="block text-xs uppercase tracking-[0.12em] text-studio-muted">
				Choose a published piece
			</label>
			<select
				value={selectedId}
				onChange={(event) => {
					const nextId = event.target.value
					const nextParams = new URLSearchParams(searchParams.toString())
					nextParams.set('submission', nextId)
					startTransition(() => {
						router.push(`/app/teacher/archive?${nextParams.toString()}`)
					})
				}}
				disabled={isPending}
				className="block w-full min-w-0 max-w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink disabled:cursor-wait disabled:opacity-80">
				{options.map((item) => (
					<option key={item.id} value={item.id}>
						{item.label}
					</option>
				))}
			</select>
			{isPending ? (
				<p className="text-xs text-studio-muted">Opening selected piece...</p>
			) : null}
		</div>
	)
}
