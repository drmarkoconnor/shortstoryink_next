'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRecoveryDraft } from '@/lib/drafts/use-recovery-draft'
import { DraftRecoveryNotice } from '@/components/writer/draft-recovery-notice'
import type { DraftSubmissionResult } from '@/lib/drafts/recovery'
import { useMemo, useRef, useState } from 'react'
import { ManuscriptTextarea } from '@/components/writer/manuscript-textarea'

type RevisionHistoryItem = {
	id: string
	version: number
	status: string
	createdAt: string
}

function countWords(value: string) {
	return value.trim().split(/\s+/).filter(Boolean).length
}

function statusLabel(value: string) {
	return value.replaceAll('_', ' ')
}

export function RevisionDraftForm({
	writerId,
	title,
	body,
	status,
	sourceVersion,
	nextVersion,
	sourceCreatedAt,
	submitRevisionAction,
	canSubmitRevision,
	blockedReason,
	isAbuRevision,
	abuSubmissionWordLimit,
	revisionHistory,
	currentSubmissionId,
	notice,
	errorNotice,
}: {
	writerId: string
	title: string
	body: string
	status: string
	sourceVersion: number
	nextVersion: number
	sourceCreatedAt: string
	submitRevisionAction: (formData: FormData) => Promise<DraftSubmissionResult>
	canSubmitRevision: boolean
	blockedReason: string | null
	isAbuRevision: boolean
	abuSubmissionWordLimit: number
	revisionHistory: RevisionHistoryItem[]
	currentSubmissionId: string
	notice: string | null
	errorNotice: string | null
}) {
	const router = useRouter()
	const recovery = useRecoveryDraft(writerId, `revision:${currentSubmissionId}`, { title, body, workshopId: '' })
	const { draft } = recovery
	const draftBody = draft.body
	const [pending, setPending] = useState(false)
	const [saveError, setSaveError] = useState<string | null>(null)
	async function submit(form: FormData) {
		if (pending) return
		setPending(true); setSaveError(null)
		const saved = { ...draft }
		form.set('requestId', saved.requestId)
		try {
			const result = await submitRevisionAction(form)
			if ('error' in result) { setSaveError(result.error); return }
			recovery.submitted(saved)
			router.push(`/app/writer?notice=${encodeURIComponent(`Revision submitted as version ${result.version}.`)}`)
		} catch {
			setSaveError('We could not confirm the save. Your revision is still here; retrying will not create a duplicate.')
		} finally { setPending(false) }
	}
	const [isHistoryOpen, setIsHistoryOpen] = useState(false)
	const historySectionRef = useRef<HTMLElement>(null)
	const wordCount = useMemo(() => countWords(draftBody), [draftBody])
	const remainingWords = abuSubmissionWordLimit - wordCount
	const isOverAbuLimit = isAbuRevision && wordCount > abuSubmissionWordLimit
	const isSubmitDisabled = !recovery.ready || pending || !canSubmitRevision || isOverAbuLimit
	const scrollToSectionEnd = (element: HTMLElement | null) => {
		window.requestAnimationFrame(() => {
			element?.scrollIntoView({ behavior: 'smooth', block: 'end' })
		})
	}

	return (
		<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
			<div className="space-y-4">
				<label className="block">
					<span className="mb-2 block text-sm text-studio-muted">
						Revised body text
					</span>
					<div className="folio-page p-5 sm:p-6 lg:min-h-[34rem] lg:p-7">
						<ManuscriptTextarea
							name="body"
							required
							form="writer-revision-form"
							value={draft.body}
							disabled={!recovery.ready || pending}
							rows={16}
							className="min-h-[26rem] w-full resize-y border-none bg-transparent font-serif text-[18px] leading-8 text-studio-ink/90 outline-none placeholder:text-studio-ink/45 lg:min-h-[28rem]"
							placeholder="Revise your draft here"
							onValueChange={(body) => recovery.edit({ body })}
						/>
					</div>
					<div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
						<p className={isOverAbuLimit ? 'text-amber-800' : 'text-studio-muted'}>
							{wordCount.toLocaleString()} words
							{isAbuRevision
								? ` - ${Math.max(remainingWords, 0).toLocaleString()} remaining for Authorised Basic User`
								: ''}
						</p>
						{isOverAbuLimit ? (
							<p className="rounded border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs text-amber-800">
								Please shorten this revision before submitting.
							</p>
						) : null}
					</div>
				</label>

				<DraftRecoveryNotice message={recovery.message} download={recovery.download} />

				<section ref={historySectionRef} className="surface p-4 lg:p-5">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="literary-title text-xl text-studio-ink">
								Version history
							</h2>
							<p className="mt-1 text-sm text-studio-muted">
								Published feedback stays preserved for each version.
							</p>
						</div>
						<button
							type="button"
							onClick={() => {
								setIsHistoryOpen((value) => {
									const nextValue = !value
									if (nextValue) {
										scrollToSectionEnd(historySectionRef.current)
									}
									return nextValue
								})
							}}
							className="rounded border border-studio-line bg-studio-tint px-3 py-1.5 text-sm text-studio-muted transition hover:bg-studio-tint hover:text-studio-ink"
							aria-expanded={isHistoryOpen}>
							{isHistoryOpen ? 'Collapse' : 'Show'}
						</button>
					</div>

					{isHistoryOpen ? (
						<ul className="mt-4 grid gap-2 sm:grid-cols-2">
							{revisionHistory.map((item) => (
								<li
									key={item.id}
									className={`rounded-md border p-3 ${
										item.id === currentSubmissionId
											? 'border-accent-300/40 bg-accent-300/10'
											: 'border-studio-line bg-studio-canvas'
									}`}>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<p className="text-xs uppercase tracking-[0.11em] text-studio-accent">
											v{item.version}
										</p>
										<p className="text-xs text-studio-muted">
											{new Date(item.createdAt).toLocaleDateString('en-GB', { timeZone: 'Europe/London' })}
										</p>
									</div>
									<p className="mt-1 text-sm text-studio-ink">
										{statusLabel(item.status)}
									</p>
									<div className="mt-3 flex flex-wrap gap-2 text-xs">
										{item.status === 'feedback_published' ? (
											<Link
												href={`/app/writer/feedback/${item.id}`}
												className="text-studio-accent hover:text-studio-accent">
												Open feedback
											</Link>
										) : (
											<p className="text-studio-muted">Awaiting feedback</p>
										)}
										{item.id === currentSubmissionId ? (
											<p className="rounded border border-accent-300/50 bg-accent-300/10 px-2 py-0.5 text-xs uppercase tracking-[0.1em] text-studio-accent">
												Current source
											</p>
										) : null}
									</div>
								</li>
							))}
						</ul>
					) : (
						<p className="mt-3 text-sm text-studio-muted">
							{revisionHistory.length} versions in this chain.
						</p>
					)}
				</section>
			</div>

			<form
				id="writer-revision-form"
				action={submit}
				className="surface p-4 lg:sticky lg:top-6 lg:p-5">
				<div className="mb-4 flex items-start justify-between gap-3">
					<div>
						<p className="text-xs uppercase tracking-[0.12em] text-studio-accent">
							Revision workspace
						</p>
						<h1 className="literary-title mt-2 text-2xl text-studio-ink">
							{title}
						</h1>
					</div>
					<Link
						href={`/app/writer/feedback/${currentSubmissionId}`}
						className="text-xs text-studio-accent hover:text-studio-accent">
						Back to feedback
					</Link>
				</div>

				<div className="grid grid-cols-2 gap-2 text-center text-xs text-studio-muted">
					<div className="rounded-md border border-studio-line bg-studio-tint px-2 py-2">
						<p className="text-lg font-semibold text-studio-ink">
							v{sourceVersion}
						</p>
						<p className="mt-0.5 uppercase tracking-[0.08em]">Source</p>
					</div>
					<div className="rounded-md border border-studio-line bg-studio-tint px-2 py-2">
						<p className="text-lg font-semibold text-studio-ink">
							v{nextVersion}
						</p>
						<p className="mt-0.5 uppercase tracking-[0.08em]">Next</p>
					</div>
				</div>

				<div className="mt-5 space-y-3">
					<label className="block">
						<span className="mb-1.5 block text-sm text-studio-muted">Title</span>
						<input
							name="title"
							required
							value={draft.title}
							onChange={(event) => recovery.edit({ title: event.target.value })}
							disabled={!recovery.ready || pending}
							className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink outline-none ring-accent-400 transition placeholder:text-studio-muted focus:ring"
							placeholder="Draft title"
						/>
					</label>

					<div className="rounded-md border border-studio-line bg-studio-canvas px-3 py-2 text-sm text-studio-muted">
						<p className="text-xs uppercase tracking-[0.1em] text-studio-muted">
							Published source
						</p>
						<p className="mt-1">
							v{sourceVersion} - {new Date(sourceCreatedAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })}
						</p>
					</div>

					<p className="rounded-md border border-studio-line bg-studio-canvas px-3 py-2 text-sm text-studio-muted">
						Current status: {statusLabel(status)}.
					</p>

					<p className="rounded-md border border-studio-line bg-studio-canvas px-3 py-2 text-sm text-studio-muted">
						Next review state: submitted for teacher review.
					</p>

					{blockedReason ? (
						<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
							{blockedReason}
						</p>
					) : null}
					{isOverAbuLimit ? (
						<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
							This revision is over the current Authorised Basic User limit.
						</p>
					) : null}
					{notice ? (
						<p className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-800">
							{notice}
						</p>
					) : null}
					{saveError && <p role="alert" className="text-sm text-amber-800">{saveError}</p>}
					{errorNotice ? (
						<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
							{errorNotice}
						</p>
					) : null}
				</div>

				<button
					type="submit"
					disabled={isSubmitDisabled}
					className="studio-primary mt-5 w-full">
					{pending ? 'Saving…' : 'Submit revision'}
				</button>
			</form>
		</div>
	)
}
