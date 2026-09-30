'use client'

import { useState } from 'react'

type Recipient = { id: string; name: string }

export function SubmissionSharingManager({
	submissionId,
	title,
	groupTitle,
	eligibleRecipients,
	existingRecipientIds,
	saveAction,
	stopAction,
}: {
	submissionId: string
	title: string
	groupTitle: string
	eligibleRecipients: Recipient[]
	existingRecipientIds: string[]
	saveAction: (formData: FormData) => void
	stopAction: (formData: FormData) => void
}) {
	const [active, setActive] = useState(existingRecipientIds.length > 0)
	const [selected, setSelected] = useState<string[]>(existingRecipientIds)

	function startSharing() {
		setActive(true)
		setSelected(eligibleRecipients.map((recipient) => recipient.id))
	}

	function toggle(id: string) {
		setSelected((current) =>
			current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
		)
	}

	if (eligibleRecipients.length === 0) {
		return (
			<div className="surface p-6">
				<p className="studio-eyebrow">Sharing</p>
				<h2 className="literary-title mt-3 text-3xl">No fellow writers are available in this group.</h2>
				<p className="mt-3 text-sm leading-6 text-studio-muted">
					The piece remains private between you and the editor.
				</p>
			</div>
		)
	}

	return (
		<section className="surface p-6 lg:p-8">
			<p className="studio-eyebrow">Sharing</p>
			<h1 className="literary-title mt-3 text-3xl">{title}</h1>
			<p className="mt-3 max-w-2xl text-sm leading-6 text-studio-muted">
				Share this version with selected writers in {groupTitle}. Your editor&apos;s inline comments stay private.
			</p>

			{!active ? (
				<div className="mt-6">
					<p className="rounded border border-studio-line bg-studio-canvas px-4 py-3 text-sm text-studio-muted">
						This version is private.
					</p>
					<button type="button" onClick={startSharing} className="studio-primary mt-4">
						Share with your group
					</button>
				</div>
			) : (
				<div className="mt-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<p className="text-sm text-studio-muted">
							{selected.length} of {eligibleRecipients.length} selected
						</p>
						<div className="flex gap-4 text-xs">
							<button type="button" className="studio-link" onClick={() => setSelected(eligibleRecipients.map((item) => item.id))}>
								Select everyone
							</button>
							<button type="button" className="studio-link" onClick={() => setSelected([])}>
								Clear selection
							</button>
						</div>
					</div>

					<form action={saveAction} className="mt-4">
						<input type="hidden" name="submissionId" value={submissionId} />
						{selected.map((id) => <input key={id} type="hidden" name="recipientIds" value={id} />)}
						<div className="grid gap-2 sm:grid-cols-2">
							{eligibleRecipients.map((recipient) => (
								<label key={recipient.id} className="flex items-center gap-2 rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm">
									<input
										type="checkbox"
										checked={selected.includes(recipient.id)}
										onChange={() => toggle(recipient.id)}
									/>
									{recipient.name}
								</label>
							))}
						</div>
						{selected.length === 0 ? (
							<p className="mt-3 text-sm text-amber-800">
								Choose at least one writer, or use Stop sharing.
							</p>
						) : null}
						<div className="mt-5 flex flex-wrap gap-3">
							<button type="submit" disabled={selected.length === 0} className="studio-primary">
								{existingRecipientIds.length > 0 ? 'Save sharing' : \`Share with \${selected.length} writer\${selected.length === 1 ? '' : 's'}\`}
							</button>
							{existingRecipientIds.length > 0 ? (
								<button
									type="button"
									onClick={() => {
										setSelected(existingRecipientIds)
										setActive(true)
									}}
									className="studio-secondary">
									Undo changes
								</button>
							) : (
								<button type="button" onClick={() => { setActive(false); setSelected([]) }} className="studio-secondary">
									Keep private
								</button>
							)}
						</div>
					</form>

					{existingRecipientIds.length > 0 ? (
						<form action={stopAction} className="mt-7 border-t border-studio-line pt-5">
							<input type="hidden" name="submissionId" value={submissionId} />
							<p className="text-sm leading-6 text-studio-muted">
								Stopping sharing removes this manuscript from everyone&apos;s group reading list. Responses already received remain in your history.
							</p>
							<button type="submit" className="mt-3 rounded border border-rose-300/50 bg-rose-300/10 px-4 py-2 text-sm text-rose-800">
								Stop sharing
							</button>
						</form>
					) : null}
				</div>
			)}
		</section>
	)
}
