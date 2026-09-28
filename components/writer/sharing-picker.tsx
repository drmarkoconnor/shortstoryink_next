'use client'

import { useMemo, useState } from 'react'

type Reader = { id: string; displayName: string; selected: boolean }

export function SharingPicker({
	title,
	groupTitle,
	readers,
	selectedRecipientIds,
	saveAction,
	stopAction,
}: {
	title: string
	groupTitle: string
	readers: Reader[]
	selectedRecipientIds: string[]
	saveAction: (formData: FormData) => void
	stopAction: (formData: FormData) => void
}) {
	const selectedSet = useMemo(() => new Set(selectedRecipientIds), [selectedRecipientIds])
	const [selected, setSelected] = useState<string[]>(
		selectedRecipientIds.length
			? readers.filter((reader) => selectedSet.has(reader.id)).map((reader) => reader.id)
			: readers.map((reader) => reader.id),
	)
	const alreadyShared = selectedRecipientIds.length > 0
	const writerWord = selected.length === 1 ? 'writer' : 'writers'

	function toggle(id: string) {
		setSelected((current) =>
			current.includes(id)
				? current.filter((readerId) => readerId !== id)
				: [...current, id],
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<p className="studio-eyebrow">Share with your writing group</p>
				<h2 className="literary-title mt-3 text-3xl text-studio-ink">{title}</h2>
				<p className="mt-3 max-w-2xl text-sm leading-6 text-studio-muted">
					Choose who in {groupTitle} may read this version. Everyone currently in the
					group is selected the first time you share; you can remove anyone you wish.
					Future group members are not added automatically.
				</p>
			</div>

			<form action={saveAction} className="space-y-5">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-sm text-studio-muted">
						{selected.length} of {readers.length} writers selected
					</p>
					<div className="flex gap-4 text-xs">
						<button
							type="button"
							onClick={() => setSelected(readers.map((reader) => reader.id))}
							className="studio-link">
							Select everyone
						</button>
						<button type="button" onClick={() => setSelected([])} className="studio-link">
							Clear selection
						</button>
					</div>
				</div>

				<div className="grid gap-2 sm:grid-cols-2">
					{readers.map((reader) => (
						<label
							key={reader.id}
							className="flex items-center gap-3 rounded border border-studio-line bg-studio-paper px-4 py-3 text-sm text-studio-ink">
							<input
								type="checkbox"
								name="recipientId"
								value={reader.id}
								checked={selected.includes(reader.id)}
								onChange={() => toggle(reader.id)}
							/>
							{reader.displayName}
						</label>
					))}
				</div>

				{selected.length === 0 ? (
					<p className="text-sm text-amber-800">
						Choose at least one writer to share with. To make the piece private, use
						Stop sharing instead.
					</p>
				) : null}

				<button
					type="submit"
					disabled={selected.length === 0}
					className="studio-primary disabled:opacity-50">
					{alreadyShared
						? 'Update sharing with ' + selected.length + ' ' + writerWord
						: 'Share with ' + selected.length + ' ' + writerWord}
				</button>
			</form>

			{alreadyShared ? (
				<form action={stopAction} className="border-t border-studio-line pt-5">
					<p className="mb-3 text-sm leading-6 text-studio-muted">
						Stopping sharing removes this piece from everyone&apos;s group reading list.
						Responses you have already received remain in your own history.
					</p>
					<button
						type="submit"
						className="rounded border border-rose-300/50 bg-rose-300/10 px-4 py-2 text-sm text-rose-800 transition hover:bg-rose-300/20">
						Stop sharing
					</button>
				</form>
			) : null}
		</div>
	)
}
