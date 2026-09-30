'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Group = { id: string; title: string; slug: string | null }
type Writer = { id: string; displayName: string; groupIds: string[] }
type GroupMember = { id: string; displayName: string }
type RevisionSource = {
	id: string
	authorId: string
	title: string
	version: number
	workshopId: string
}

type IntakeResult = { id?: string; error?: string; warning?: string }

function isAbu(group?: Group | null) {
	return Boolean(
		group &&
			(group.slug === 'authorised-basic-user' ||
				group.title.trim().toLowerCase() === 'authorised basic user'),
	)
}

function countWords(value: string) {
	return value.trim().split(/\s+/).filter(Boolean).length
}

export function EditorIntakeForm({
	requestId,
	writers,
	groups,
	membersByGroup,
	revisionSources,
	createAction,
}: {
	requestId: string
	writers: Writer[]
	groups: Group[]
	membersByGroup: Record<string, GroupMember[]>
	revisionSources: RevisionSource[]
	createAction: (formData: FormData) => Promise<IntakeResult>
}) {
	const router = useRouter()
	const [writerId, setWriterId] = useState(writers[0]?.id ?? '')
	const writer = writers.find((item) => item.id === writerId) ?? null
	const writerGroups = groups.filter((group) => writer?.groupIds.includes(group.id))
	const preferredGroups = writerGroups.some((group) => !isAbu(group))
		? writerGroups.filter((group) => !isAbu(group))
		: writerGroups
	const [workshopId, setWorkshopId] = useState(preferredGroups[0]?.id ?? '')
	const [sourceId, setSourceId] = useState('')
	const [title, setTitle] = useState('')
	const [body, setBody] = useState('')
	const [share, setShare] = useState(false)
	const [selectedReaders, setSelectedReaders] = useState<string[]>([])
	const [reviewing, setReviewing] = useState(false)
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const source = revisionSources.find((item) => item.id === sourceId) ?? null
	const effectiveWorkshopId = source?.workshopId ?? workshopId
	const group = groups.find((item) => item.id === effectiveWorkshopId) ?? null
	const eligibleReaders = useMemo(
		() =>
			(membersByGroup[effectiveWorkshopId] ?? []).filter(
				(member) => member.id !== writerId,
			),
		[effectiveWorkshopId, membersByGroup, writerId],
	)
	const canShare = Boolean(group && !isAbu(group) && eligibleReaders.length)
	const wordCount = countWords(body)

	function chooseWriter(nextWriterId: string) {
		setWriterId(nextWriterId)
		setSourceId('')
		const nextWriter = writers.find((item) => item.id === nextWriterId)
		const nextGroups = groups.filter((item) => nextWriter?.groupIds.includes(item.id))
		const nextPreferred = nextGroups.find((item) => !isAbu(item)) ?? nextGroups[0]
		setWorkshopId(nextPreferred?.id ?? '')
		setShare(false)
		setSelectedReaders([])
		setReviewing(false)
	}

	function chooseGroup(nextGroupId: string) {
		setWorkshopId(nextGroupId)
		setShare(false)
		setSelectedReaders([])
		setReviewing(false)
	}

	function setSharingEnabled(enabled: boolean) {
		setShare(enabled)
		setSelectedReaders(enabled ? eligibleReaders.map((reader) => reader.id) : [])
	}

	function toggleReader(readerId: string) {
		setSelectedReaders((current) =>
			current.includes(readerId)
				? current.filter((id) => id !== readerId)
				: [...current, readerId],
		)
	}

	async function submit() {
		if (pending) return
		setPending(true)
		setError(null)
		const form = new FormData()
		form.set('requestId', requestId)
		form.set('writerId', writerId)
		form.set('workshopId', effectiveWorkshopId)
		form.set('sourceId', sourceId)
		form.set('title', title)
		form.set('body', body)
		form.set('share', share ? 'yes' : 'no')
		selectedReaders.forEach((id) => form.append('recipientId', id))
		try {
			const result = await createAction(form)
			if (!result.id) {
				setError(result.error ?? 'Unable to add this piece.')
				return
			}
			const suffix = result.warning
				? `?notice=${encodeURIComponent(result.warning)}`
				: '?notice=Piece+added+for+the+writer.'
			router.push(`/app/workshop/${result.id}${suffix}`)
			router.refresh()
		} catch {
			setError('Unable to confirm the save. Please try again.')
		} finally {
			setPending(false)
		}
	}

	if (!writers.length) {
		return <p className="text-sm text-studio-muted">No writer accounts are available yet.</p>
	}

	return (
		<div className="space-y-8">
			{!reviewing ? (
				<>
					<section className="grid gap-5 md:grid-cols-2">
						<label className="block">
							<span className="mb-1.5 block text-sm text-studio-muted">Writer</span>
							<select
								value={writerId}
								onChange={(event) => chooseWriter(event.target.value)}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink">
								{writers.map((item) => (
									<option key={item.id} value={item.id}>{item.displayName}</option>
								))}
							</select>
						</label>

						<label className="block">
							<span className="mb-1.5 block text-sm text-studio-muted">Writing group</span>
							<select
								value={effectiveWorkshopId}
								disabled={Boolean(source)}
								onChange={(event) => chooseGroup(event.target.value)}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink disabled:opacity-60">
								{preferredGroups.map((item) => (
									<option key={item.id} value={item.id}>{item.title}</option>
								))}
							</select>
						</label>
					</section>

					<label className="block">
						<span className="mb-1.5 block text-sm text-studio-muted">Revision of an earlier piece (optional)</span>
						<select
							value={sourceId}
							onChange={(event) => {
								const id = event.target.value
								setSourceId(id)
								const selected = revisionSources.find((item) => item.id === id)
								if (selected) {
									setWorkshopId(selected.workshopId)
									if (!title) setTitle(selected.title)
								}
								setShare(false)
								setSelectedReaders([])
							}}
							className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink">
							<option value="">This is a new piece</option>
							{revisionSources
								.filter((item) => item.authorId === writerId)
								.map((item) => (
									<option key={item.id} value={item.id}>
										v{item.version} · {item.title}
									</option>
								))}
						</select>
					</label>

					<label className="block">
						<span className="mb-1.5 block text-sm text-studio-muted">Title</span>
						<input
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="Title of the piece"
							className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink"
						/>
					</label>

					<label className="block">
						<div className="mb-2 flex items-center justify-between gap-3">
							<span className="text-sm text-studio-muted">Manuscript</span>
							<span className="text-xs text-studio-muted">{wordCount.toLocaleString()} words</span>
						</div>
						<textarea
							value={body}
							onChange={(event) => setBody(event.target.value)}
							rows={20}
							placeholder="Paste the writer's piece here. Correct copy-and-paste artefacts before adding it to the desk."
							className="writing-manuscript writing-surface w-full p-5 sm:p-7"
						/>
					</label>

					<section className="rounded-md border border-studio-line bg-studio-canvas p-5">
						<p className="studio-eyebrow">Sharing</p>
						<label className="mt-4 flex gap-3">
							<input
								type="radio"
								checked={!share}
								onChange={() => setSharingEnabled(false)}
							/>
							<span>
								<strong className="block text-sm text-studio-ink">Keep this between the writer and editor</strong>
								<span className="mt-1 block text-xs leading-5 text-studio-muted">Default. The writer can choose to share it later.</span>
							</span>
						</label>
						<label className="mt-4 flex gap-3">
							<input
								type="radio"
								checked={share}
								disabled={!canShare}
								onChange={() => setSharingEnabled(true)}
							/>
							<span>
								<strong className="block text-sm text-studio-ink">The writer has asked me to share this with {group?.title ?? 'their group'}</strong>
								<span className="mt-1 block text-xs leading-5 text-studio-muted">Everyone currently eligible is selected first; you can remove individuals.</span>
							</span>
						</label>

						{share && canShare ? (
							<div className="mt-5 border-t border-studio-line pt-4">
								<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
									<p className="text-sm text-studio-muted">{selectedReaders.length} of {eligibleReaders.length} writers selected</p>
									<div className="flex gap-3 text-xs">
										<button type="button" className="studio-link" onClick={() => setSelectedReaders(eligibleReaders.map((reader) => reader.id))}>Select everyone</button>
										<button type="button" className="studio-link" onClick={() => setSelectedReaders([])}>Clear selection</button>
									</div>
								</div>
								<div className="grid gap-2 sm:grid-cols-2">
									{eligibleReaders.map((reader) => (
										<label key={reader.id} className="flex items-center gap-2 rounded border border-studio-line bg-studio-paper px-3 py-2 text-sm">
											<input
												type="checkbox"
												checked={selectedReaders.includes(reader.id)}
												onChange={() => toggleReader(reader.id)}
											/>
											{reader.displayName}
										</label>
									))}
								</div>
								{selectedReaders.length === 0 ? (
									<p className="mt-3 text-xs text-amber-800">Choose at least one writer, or keep the piece private.</p>
								) : null}
							</div>
						) : null}
					</section>

					{error ? <p role="alert" className="text-sm text-amber-800">{error}</p> : null}

					<div className="flex justify-end">
						<button
							type="button"
							disabled={!writerId || !effectiveWorkshopId || !title.trim() || !body.trim() || (share && selectedReaders.length === 0)}
							onClick={() => {
								setError(null)
								setReviewing(true)
								window.scrollTo({ top: 0, behavior: 'smooth' })
							}}
							className="studio-primary disabled:opacity-50">
							Review before adding
						</button>
					</div>
				</>
			) : (
				<section className="space-y-6">
					<div className="rounded-md border border-studio-line bg-studio-canvas p-5">
						<p className="studio-eyebrow">Check ownership before adding</p>
						<dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
							<div><dt className="text-studio-muted">Writer</dt><dd className="font-medium text-studio-ink">{writer?.displayName}</dd></div>
							<div><dt className="text-studio-muted">Group</dt><dd className="font-medium text-studio-ink">{group?.title}</dd></div>
							<div><dt className="text-studio-muted">Title</dt><dd className="font-medium text-studio-ink">{title}</dd></div>
							<div><dt className="text-studio-muted">Length</dt><dd className="font-medium text-studio-ink">{wordCount.toLocaleString()} words</dd></div>
							<div><dt className="text-studio-muted">Version</dt><dd className="font-medium text-studio-ink">{source ? `Revision after v${source.version}` : 'New piece · v1'}</dd></div>
							<div><dt className="text-studio-muted">Sharing</dt><dd className="font-medium text-studio-ink">{share ? `${selectedReaders.length} selected writers` : 'Private: writer + editor'}</dd></div>
						</dl>
					</div>

					<div className="writing-surface p-6 sm:p-8">
						<h2 className="literary-title text-3xl text-studio-ink">{title}</h2>
						<div className="mt-6 whitespace-pre-wrap font-serif text-[1.05rem] leading-8 text-studio-ink">{body}</div>
					</div>

					<p className="text-sm leading-6 text-studio-muted">
						Once it is shared or editorial comments begin, the manuscript text is locked so comments and reader responses always refer to the version people actually saw.
					</p>
					{error ? <p role="alert" className="text-sm text-amber-800">{error}</p> : null}
					<div className="flex flex-wrap justify-between gap-3">
						<button type="button" disabled={pending} onClick={() => setReviewing(false)} className="studio-secondary disabled:opacity-50">Back and correct</button>
						<button type="button" disabled={pending} onClick={submit} className="studio-primary">
							{pending ? 'Adding…' : 'Add to editorial desk'}
						</button>
					</div>
				</section>
			)}
		</div>
	)
}
