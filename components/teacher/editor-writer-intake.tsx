'use client'

import { useMemo, useState } from 'react'

export type EditorIntakeWriter = {
	id: string
	name: string
	groups: Array<{
		id: string
		title: string
		isAbu: boolean
		members: Array<{ id: string; name: string }>
	}>
	publishedPieces: Array<{
		id: string
		title: string
		version: number
		workshopId: string
	}>
}

export function EditorWriterIntake({
	writers,
	action,
}: {
	writers: EditorIntakeWriter[]
	action: (formData: FormData) => void
}) {
	const [writerId, setWriterId] = useState(writers[0]?.id ?? '')
	const writer = writers.find((item) => item.id === writerId) ?? null
	const realGroups = writer?.groups.filter((group) => !group.isAbu) ?? []
	const fallbackGroups = writer?.groups ?? []
	const availableGroups = realGroups.length > 0 ? realGroups : fallbackGroups
	const [workshopId, setWorkshopId] = useState(availableGroups[0]?.id ?? '')
	const [sourceId, setSourceId] = useState('')
	const [share, setShare] = useState(false)
	const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
	const [body, setBody] = useState('')
	const [title, setTitle] = useState('')
	const [reviewing, setReviewing] = useState(false)
	const [requestId] = useState(() => crypto.randomUUID())

	const selectedSource = writer?.publishedPieces.find((piece) => piece.id === sourceId) ?? null
	const effectiveWorkshopId = selectedSource?.workshopId ?? workshopId
	const group = writer?.groups.find((item) => item.id === effectiveWorkshopId) ?? null
	const eligibleRecipients = useMemo(
		() => (group?.isAbu ? [] : (group?.members ?? []).filter((member) => member.id !== writerId)),
		[group, writerId],
	)

	function chooseWriter(nextWriterId: string) {
		const nextWriter = writers.find((item) => item.id === nextWriterId) ?? null
		const real = nextWriter?.groups.filter((item) => !item.isAbu) ?? []
		const all = nextWriter?.groups ?? []
		const nextGroups = real.length > 0 ? real : all
		setWriterId(nextWriterId)
		setWorkshopId(nextGroups[0]?.id ?? '')
		setSourceId('')
		setShare(false)
		setSelectedRecipients([])
	}

	function chooseGroup(nextGroupId: string) {
		setWorkshopId(nextGroupId)
		setShare(false)
		setSelectedRecipients([])
	}

	function toggleSharing(next: boolean) {
		setShare(next)
		setSelectedRecipients(next ? eligibleRecipients.map((member) => member.id) : [])
	}

	function toggleRecipient(id: string) {
		setSelectedRecipients((current) =>
			current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
		)
	}

	const wordCount = body.trim().split(/\s+/).filter(Boolean).length
	const canReview = Boolean(writerId && effectiveWorkshopId && title.trim() && body.trim())
	const canSubmit = canReview && (!share || selectedRecipients.length > 0)

	return (
		<form action={action} className="space-y-8">
			<input type="hidden" name="requestId" value={requestId} />
			<input type="hidden" name="sourceSubmissionId" value={sourceId} />
			<input type="hidden" name="workshopId" value={effectiveWorkshopId} />
			{selectedRecipients.map((id) => (
				<input key={id} type="hidden" name="recipientIds" value={id} />
			))}
			<input type="hidden" name="shareRequested" value={share ? 'yes' : 'no'} />

			<section className="surface p-6 lg:p-8">
				<p className="studio-eyebrow">1 · Place the manuscript</p>
				<h1 className="studio-heading mt-3">Add a writer&apos;s piece</h1>
				<p className="mt-4 max-w-2xl leading-7 text-studio-muted">
					Paste work a writer has sent by email, message or elsewhere. It will belong to the writer
					and enter the same editorial workflow as a piece they submit themselves.
				</p>

				<div className="mt-7 grid gap-5 md:grid-cols-2">
					<label className="block">
						<span className="mb-1.5 block text-sm text-studio-muted">Writer</span>
						<select
							name="writerId"
							value={writerId}
							onChange={(event) => chooseWriter(event.target.value)}
							required
							className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink">
							{writers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
						</select>
					</label>

					<label className="block">
						<span className="mb-1.5 block text-sm text-studio-muted">Writing group</span>
						<select
							value={effectiveWorkshopId}
							onChange={(event) => chooseGroup(event.target.value)}
							disabled={Boolean(selectedSource)}
							required
							className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink disabled:opacity-60">
							{availableGroups.map((item) => (
								<option key={item.id} value={item.id}>
									{item.title}{item.isAbu ? ' · access group only' : ''}
								</option>
							))}
						</select>
					</label>
				</div>

				{(writer?.publishedPieces.length ?? 0) > 0 ? (
					<label className="mt-5 block">
						<span className="mb-1.5 block text-sm text-studio-muted">Revision of an earlier piece (optional)</span>
						<select
							value={sourceId}
							onChange={(event) => {
								setSourceId(event.target.value)
								setShare(false)
								setSelectedRecipients([])
							}}
							className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink">
							<option value="">This is a new piece</option>
							{writer?.publishedPieces.map((piece) => (
								<option key={piece.id} value={piece.id}>
									{piece.title} · v{piece.version}
								</option>
							))}
						</select>
					</label>
				) : null}

				<label className="mt-5 block">
					<span className="mb-1.5 block text-sm text-studio-muted">Title</span>
					<input
						name="title"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						required
						className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink"
						placeholder="Title"
					/>
				</label>

				<label className="mt-5 block">
					<span className="mb-1.5 block text-sm text-studio-muted">Manuscript</span>
					<textarea
						name="body"
						value={body}
						onChange={(event) => setBody(event.target.value)}
						required
						rows={20}
						className="writing-manuscript min-h-[28rem] w-full rounded border border-studio-line bg-studio-paper p-5"
						placeholder="Paste the writer's manuscript here, then correct any copying or formatting mistakes before adding it to the desk."
					/>
				</label>
				<p className="mt-2 text-sm text-studio-muted">{wordCount.toLocaleString()} words</p>
			</section>

			<section className="surface p-6 lg:p-8">
				<p className="studio-eyebrow">2 · Sharing</p>
				<h2 className="literary-title mt-3 text-3xl">Keep the writer in control</h2>
				<div className="mt-5 space-y-3">
					<label className="flex gap-3">
						<input type="radio" checked={!share} onChange={() => toggleSharing(false)} />
						<span>
							<strong className="block text-studio-ink">Keep this between the writer and editor</strong>
							<span className="text-sm text-studio-muted">The safe default.</span>
						</span>
					</label>
					<label className={\`flex gap-3 \${eligibleRecipients.length === 0 ? 'opacity-50' : ''}\`}>
						<input
							type="radio"
							checked={share}
							disabled={eligibleRecipients.length === 0}
							onChange={() => toggleSharing(true)}
						/>
						<span>
							<strong className="block text-studio-ink">The writer has asked me to share this with {group?.title ?? 'their group'}</strong>
							<span className="text-sm text-studio-muted">All current fellow writers are selected first; remove anyone the writer did not mean to include.</span>
						</span>
					</label>
				</div>

				{share ? (
					<div className="mt-5 rounded-md border border-studio-line bg-studio-canvas p-4">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<p className="text-sm text-studio-muted">{selectedRecipients.length} of {eligibleRecipients.length} selected</p>
							<div className="flex gap-3 text-xs">
								<button type="button" className="studio-link" onClick={() => setSelectedRecipients(eligibleRecipients.map((item) => item.id))}>Select everyone</button>
								<button type="button" className="studio-link" onClick={() => setSelectedRecipients([])}>Clear selection</button>
							</div>
						</div>
						<div className="mt-4 grid gap-2 sm:grid-cols-2">
							{eligibleRecipients.map((member) => (
								<label key={member.id} className="flex items-center gap-2 rounded border border-studio-line bg-studio-paper px-3 py-2 text-sm">
									<input
										type="checkbox"
										checked={selectedRecipients.includes(member.id)}
										onChange={() => toggleRecipient(member.id)}
									/>
									{member.name}
								</label>
							))}
						</div>
						{selectedRecipients.length === 0 ? (
							<p className="mt-3 text-sm text-amber-800">Choose at least one writer, or keep the piece private.</p>
						) : null}
					</div>
				) : null}
			</section>

			<section className="surface p-6 lg:p-8">
				<p className="studio-eyebrow">3 · Review</p>
				{reviewing ? (
					<div className="mt-4 space-y-4">
						<div className="grid gap-3 text-sm sm:grid-cols-2">
							<p><span className="text-studio-muted">Writer</span><br /><strong>{writer?.name}</strong></p>
							<p><span className="text-studio-muted">Group</span><br /><strong>{group?.title}</strong></p>
							<p><span className="text-studio-muted">Title</span><br /><strong>{title}</strong></p>
							<p><span className="text-studio-muted">Sharing</span><br /><strong>{share ? \`\${selectedRecipients.length} writers\` : 'Private'}</strong></p>
						</div>
						<div className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded border border-studio-line bg-studio-paper p-5 font-serif leading-8 text-studio-ink">
							{body}
						</div>
						<div className="flex flex-wrap gap-3">
							<button type="submit" disabled={!canSubmit} className="studio-primary">Add to editorial desk</button>
							<button type="button" onClick={() => setReviewing(false)} className="studio-secondary">Go back and correct</button>
						</div>
					</div>
				) : (
					<div className="mt-4">
						<p className="max-w-2xl text-sm leading-6 text-studio-muted">
							Check the writer, group, title and manuscript before committing it. Once reading or feedback begins, the manuscript text is locked.
						</p>
						<button type="button" disabled={!canReview} onClick={() => setReviewing(true)} className="studio-primary mt-5">
							Review before adding
						</button>
					</div>
				)}
			</section>
		</form>
	)
}
