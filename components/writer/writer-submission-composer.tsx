'use client'

import { useMemo, useState } from 'react'
import { ManuscriptTextarea } from '@/components/writer/manuscript-textarea'
import { SubmissionHistorySelect } from '@/components/writer/submission-history-select'

type WriterWorkshop = {
	id: string
	title: string
	isAbu: boolean
}

type WriterSubmission = {
	id: string
	title: string
	status: string
	createdAt: string
	workshopTitle?: string | null
	version?: number
	commentCount?: number
}

function countWords(value: string) {
	return value.trim().split(/\s+/).filter(Boolean).length
}

export function WriterSubmissionComposer({
	createSubmissionAction,
	deleteSubmissionAction,
	workshops,
	isWorkshopRequired,
	defaultWorkshopId,
	submissions,
	submissionsError,
	notice,
	errorNotice,
	workshopError,
	submittedCount,
	inReviewCount,
	publishedCount,
	abuSubmissionWordLimit,
}: {
	createSubmissionAction: (formData: FormData) => void
	deleteSubmissionAction: (formData: FormData) => void
	workshops: WriterWorkshop[]
	isWorkshopRequired: boolean
	defaultWorkshopId: string
	submissions: WriterSubmission[]
	submissionsError: string | null
	notice: string | null
	errorNotice: string | null
	workshopError: string | null
	submittedCount: number
	inReviewCount: number
	publishedCount: number
	abuSubmissionWordLimit: number
}) {
	const [draftBody, setDraftBody] = useState('')
	const [selectedWorkshopId, setSelectedWorkshopId] =
		useState(defaultWorkshopId)

	const wordCount = useMemo(() => countWords(draftBody), [draftBody])
	const selectedWorkshop = workshops.find(
		(workshop) => workshop.id === selectedWorkshopId,
	)
	const isAbuSelected = Boolean(selectedWorkshop?.isAbu)
	const isOverAbuLimit =
		isWorkshopRequired && isAbuSelected && wordCount > abuSubmissionWordLimit
	const remainingWords = abuSubmissionWordLimit - wordCount

	return (
		<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
			<div className="space-y-4">
				<label className="block">
					<span className="mb-2 block text-sm text-silver-100">
						Your draft
					</span>
					<div className="folio-page p-5 sm:p-6 lg:min-h-[34rem] lg:p-7">
						<ManuscriptTextarea
							name="body"
							required
							form="writer-submit-form"
							rows={16}
							className="min-h-[26rem] w-full resize-y border-none bg-transparent font-serif text-[18px] leading-8 text-ink-900/90 outline-none placeholder:text-ink-900/45 lg:min-h-[28rem]"
							placeholder={
								'Paste or type the piece here as you want it read. Formatting is preserved.\n\nUse Tab to indent dialogue in the standard way.'
							}
							onValueChange={setDraftBody}
						/>
					</div>
					<div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
						<p
							className={
								isOverAbuLimit ? 'text-amber-100' : 'text-silver-200'
							}>
							{wordCount.toLocaleString()} words
							{isAbuSelected
								? ` · ${Math.max(remainingWords, 0).toLocaleString()} remaining for Authorised Basic User`
								: ''}
						</p>
						{isOverAbuLimit ? (
							<p className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
								Please shorten this piece before submitting.
							</p>
						) : null}
					</div>
				</label>

				<SubmissionHistorySelect
					submissions={submissions}
					submissionsError={submissionsError}
					deleteSubmissionAction={deleteSubmissionAction}
				/>
			</div>

			<form
				id="writer-submit-form"
				action={createSubmissionAction}
				className="surface p-4 lg:sticky lg:top-6 lg:p-5">
				<div className="grid grid-cols-3 gap-2 text-center text-[11px] text-silver-100">
					<div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
						<p className="text-lg font-semibold text-parchment-100">
							{submittedCount}
						</p>
						<p className="mt-0.5 uppercase tracking-[0.08em]">Awaiting</p>
					</div>
					<div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
						<p className="text-lg font-semibold text-parchment-100">
							{inReviewCount}
						</p>
						<p className="mt-0.5 uppercase tracking-[0.08em]">Review</p>
					</div>
					<div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2">
						<p className="text-lg font-semibold text-parchment-100">
							{publishedCount}
						</p>
						<p className="mt-0.5 uppercase tracking-[0.08em]">Feedback</p>
					</div>
				</div>

				<div className="mt-5">
					<p className="text-xs uppercase tracking-[0.12em] text-accent-300">
						Writer home
					</p>
					<h1 className="literary-title mt-2 text-2xl text-parchment-100">
						Submit a draft
					</h1>
				</div>

				<div className="mt-5 space-y-3">
					<label className="block">
						<span className="mb-1.5 block text-sm text-silver-100">Title</span>
						<input
							name="title"
							required
							className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 outline-none ring-accent-400 transition placeholder:text-silver-400 focus:ring"
							placeholder="Draft title"
						/>
					</label>

					{isWorkshopRequired ? (
						<label className="block">
							<span className="mb-1.5 block text-sm text-silver-100">
								Group
							</span>
							<select
								name="workshopId"
								required
								value={selectedWorkshopId}
								onChange={(event) => setSelectedWorkshopId(event.target.value)}
								disabled={workshops.length === 0}
								className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 outline-none ring-accent-400 transition focus:ring disabled:opacity-60">
								{workshops.length === 0 ? (
									<option value="">No group membership found</option>
								) : null}
								{workshops.map((workshop) => (
									<option key={workshop.id} value={workshop.id}>
										{workshop.title}
									</option>
								))}
							</select>
							<p className="mt-1.5 text-xs leading-5 text-silver-300">
								Authorised Basic User submissions are limited to{' '}
								{abuSubmissionWordLimit.toLocaleString()} words.
							</p>
						</label>
					) : (
						<div className="rounded-xl border border-white/10 bg-ink-900/35 px-3 py-2 text-sm text-silver-100">
							Default queue
						</div>
					)}
				</div>

				<div className="mt-4 space-y-2">
					{notice && (
						<p className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
							{notice}
						</p>
					)}
					{errorNotice && (
						<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
							{errorNotice}
						</p>
					)}
					{workshopError && (
						<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
							{workshopError}
						</p>
					)}
					{isWorkshopRequired && !workshopError && workshops.length === 0 && (
						<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
							No group membership found yet. Your baseline group may still be
							loading.
						</p>
					)}
					{!isWorkshopRequired && (
						<p className="rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-sm text-sky-100">
							Legacy schema detected. Submissions currently route through a
							default queue.
						</p>
					)}
					{isOverAbuLimit ? (
						<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
							This draft is {Math.abs(remainingWords).toLocaleString()} words
							over the current Authorised Basic User limit.
						</p>
					) : null}
				</div>

				<button
					type="submit"
					disabled={
						isOverAbuLimit || (isWorkshopRequired && workshops.length === 0)
					}
					className="mt-5 w-full rounded-full border border-accent-400/70 bg-accent-400/20 px-5 py-2.5 text-sm text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
					{isOverAbuLimit ? 'Shorten before submitting' : 'Save submission'}
				</button>
			</form>
		</div>
	)
}
