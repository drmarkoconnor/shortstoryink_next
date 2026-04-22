'use client'

import Link from 'next/link'
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
	title: string
	body: string
	status: string
	sourceVersion: number
	nextVersion: number
	sourceCreatedAt: string
	submitRevisionAction: (formData: FormData) => void
	canSubmitRevision: boolean
	blockedReason: string | null
	isAbuRevision: boolean
	abuSubmissionWordLimit: number
	revisionHistory: RevisionHistoryItem[]
	currentSubmissionId: string
	notice: string | null
	errorNotice: string | null
}) {
	const [draftBody, setDraftBody] = useState(body)
	const [isHistoryOpen, setIsHistoryOpen] = useState(false)
	const historySectionRef = useRef<HTMLElement>(null)
	const wordCount = useMemo(() => countWords(draftBody), [draftBody])
	const remainingWords = abuSubmissionWordLimit - wordCount
	const isOverAbuLimit = isAbuRevision && wordCount > abuSubmissionWordLimit
	const isSubmitDisabled = !canSubmitRevision || isOverAbuLimit
	const scrollToSectionEnd = (element: HTMLElement | null) => {
		window.requestAnimationFrame(() => {
			element?.scrollIntoView({ behavior: 'smooth', block: 'end' })
		})
	}

	return (
		<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
			<div className="space-y-4">
				<label className="block">
					<span className="mb-2 block text-sm text-silver-100">
						Revised body text
					</span>
					<div className="folio-page p-5 sm:p-6 lg:min-h-[34rem] lg:p-7">
						<ManuscriptTextarea
							name="body"
							required
							form="writer-revision-form"
							defaultValue={body}
							rows={16}
							className="min-h-[26rem] w-full resize-y border-none bg-transparent font-serif text-[18px] leading-8 text-ink-900/90 outline-none placeholder:text-ink-900/45 lg:min-h-[28rem]"
							placeholder="Revise your draft here"
							onValueChange={setDraftBody}
						/>
					</div>
					<div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
						<p className={isOverAbuLimit ? 'text-amber-100' : 'text-silver-200'}>
							{wordCount.toLocaleString()} words
							{isAbuRevision
								? ` - ${Math.max(remainingWords, 0).toLocaleString()} remaining for Authorised Basic User`
								: ''}
						</p>
						{isOverAbuLimit ? (
							<p className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
								Please shorten this revision before submitting.
							</p>
						) : null}
					</div>
				</label>

				<section ref={historySectionRef} className="surface p-4 lg:p-5">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="literary-title text-xl text-parchment-100">
								Version history
							</h2>
							<p className="mt-1 text-sm text-silver-300">
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
							className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-silver-100 transition hover:bg-white/10 hover:text-parchment-100"
							aria-expanded={isHistoryOpen}>
							{isHistoryOpen ? 'Collapse' : 'Show'}
						</button>
					</div>

					{isHistoryOpen ? (
						<ul className="mt-4 grid gap-2 sm:grid-cols-2">
							{revisionHistory.map((item) => (
								<li
									key={item.id}
									className={`rounded-2xl border p-3 ${
										item.id === currentSubmissionId
											? 'border-accent-300/40 bg-accent-300/10'
											: 'border-white/10 bg-ink-900/35'
									}`}>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<p className="text-xs uppercase tracking-[0.11em] text-accent-300">
											v{item.version}
										</p>
										<p className="text-xs text-silver-300">
											{new Date(item.createdAt).toLocaleDateString()}
										</p>
									</div>
									<p className="mt-1 text-sm text-parchment-100">
										{statusLabel(item.status)}
									</p>
									<div className="mt-3 flex flex-wrap gap-2 text-xs">
										{item.status === 'feedback_published' ? (
											<Link
												href={`/app/writer/feedback/${item.id}`}
												className="text-accent-200 hover:text-accent-100">
												Open feedback
											</Link>
										) : (
											<p className="text-silver-300">Awaiting feedback</p>
										)}
										{item.id === currentSubmissionId ? (
											<p className="rounded-full border border-accent-300/50 bg-accent-300/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-accent-100">
												Current source
											</p>
										) : null}
									</div>
								</li>
							))}
						</ul>
					) : (
						<p className="mt-3 text-sm text-silver-300">
							{revisionHistory.length} versions in this chain.
						</p>
					)}
				</section>
			</div>

			<form
				id="writer-revision-form"
				action={submitRevisionAction}
				className="surface p-4 lg:sticky lg:top-6 lg:p-5">
				<div className="mb-4 flex items-start justify-between gap-3">
					<div>
						<p className="text-xs uppercase tracking-[0.12em] text-accent-300">
							Revision workspace
						</p>
						<h1 className="literary-title mt-2 text-2xl text-parchment-100">
							{title}
						</h1>
					</div>
					<Link
						href={`/app/writer/feedback/${currentSubmissionId}`}
						className="text-xs text-accent-200 hover:text-accent-100">
						Back to feedback
					</Link>
				</div>

				<div className="grid grid-cols-2 gap-2 text-center text-[11px] text-silver-100">
					<div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
						<p className="text-lg font-semibold text-parchment-100">
							v{sourceVersion}
						</p>
						<p className="mt-0.5 uppercase tracking-[0.08em]">Source</p>
					</div>
					<div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
						<p className="text-lg font-semibold text-parchment-100">
							v{nextVersion}
						</p>
						<p className="mt-0.5 uppercase tracking-[0.08em]">Next</p>
					</div>
				</div>

				<div className="mt-5 space-y-3">
					<label className="block">
						<span className="mb-1.5 block text-sm text-silver-100">Title</span>
						<input
							name="title"
							required
							defaultValue={title}
							className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
							placeholder="Draft title"
						/>
					</label>

					<div className="rounded-xl border border-white/10 bg-ink-900/35 px-3 py-2 text-sm text-silver-100">
						<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
							Published source
						</p>
						<p className="mt-1">
							v{sourceVersion} - {new Date(sourceCreatedAt).toLocaleString()}
						</p>
					</div>

					<p className="rounded-xl border border-white/10 bg-ink-900/35 px-3 py-2 text-sm text-silver-100">
						Current status: {statusLabel(status)}.
					</p>

					<p className="rounded-xl border border-white/10 bg-ink-900/35 px-3 py-2 text-sm text-silver-100">
						Next review state: submitted for teacher review.
					</p>

					{blockedReason ? (
						<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
							{blockedReason}
						</p>
					) : null}
					{isOverAbuLimit ? (
						<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
							This revision is over the current Authorised Basic User limit.
						</p>
					) : null}
					{notice ? (
						<p className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
							{notice}
						</p>
					) : null}
					{errorNotice ? (
						<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
							{errorNotice}
						</p>
					) : null}
				</div>

				<button
					type="submit"
					disabled={isSubmitDisabled}
					className="mt-5 w-full rounded-full border border-accent-400/70 bg-accent-400/20 px-5 py-2.5 text-sm text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:border-white/15 disabled:bg-white/5 disabled:text-silver-400">
					Submit revision
				</button>
			</form>
		</div>
	)
}
