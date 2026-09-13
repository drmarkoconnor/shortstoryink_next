'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ManuscriptTextarea } from '@/components/writer/manuscript-textarea'
import { useRecoveryDraft } from '@/lib/drafts/use-recovery-draft'
import { DraftRecoveryNotice } from '@/components/writer/draft-recovery-notice'
import type { DraftSubmissionResult } from '@/lib/drafts/recovery'
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

type WriterDocumentResource = {
	id: string
	title: string
	documentType: string
	updatedAt: string
}

function countWords(value: string) {
	return value.trim().split(/\s+/).filter(Boolean).length
}

export function WriterSubmissionComposer({
	writerId,
	writerName,
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
	availableDocuments,
	documentsError,
}: {
	writerId: string
	writerName: string
	createSubmissionAction: (formData: FormData) => Promise<DraftSubmissionResult>
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
	availableDocuments: WriterDocumentResource[]
	documentsError: string | null
}) {
	const router = useRouter()
	const recovery = useRecoveryDraft(writerId, 'new', {
		title: '',
		body: '',
		workshopId: defaultWorkshopId,
	})
	const { draft } = recovery
	const draftBody = draft.body
	const selectedWorkshopId = draft.workshopId
	const [pending, setPending] = useState(false)
	const [saveError, setSaveError] = useState<string | null>(null)
	const [savedNotice, setSavedNotice] = useState<string | null>(null)
	const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(Boolean(notice))
	const titleInputRef = useRef<HTMLInputElement | null>(null)

	const wordCount = useMemo(() => countWords(draftBody), [draftBody])
	const selectedWorkshop = workshops.find((workshop) => workshop.id === selectedWorkshopId)
	const isAbuSelected = Boolean(selectedWorkshop?.isAbu)
	const isOverAbuLimit =
		isWorkshopRequired && isAbuSelected && wordCount > abuSubmissionWordLimit
	const remainingWords = abuSubmissionWordLimit - wordCount

	async function submit(form: FormData) {
		if (pending) return
		setPending(true)
		setSaveError(null)
		const saved = { ...draft }
		form.set('requestId', saved.requestId)
		try {
			const result = await createSubmissionAction(form)
			if ('error' in result) {
				setSaveError(result.error)
				return
			}
			recovery.submitted(saved)
			setSavedNotice('Your submission has been saved.')
			setIsSuccessModalOpen(true)
			router.refresh()
		} catch {
			setSaveError(
				'We could not confirm the save. Your draft is still here; retrying will not create a duplicate.',
			)
		} finally {
			setPending(false)
		}
	}

	useEffect(() => {
		setIsSuccessModalOpen(Boolean(notice))
	}, [notice])

	const firstName = writerName.split(' ')[0]

	return (
		<div className="mx-auto max-w-[1200px] space-y-10">
			<header>
				<p className="studio-eyebrow">Your writing</p>
				<h1 className="studio-heading mt-3">Welcome back, {firstName}.</h1>
				<p className="mt-4 max-w-2xl text-studio-muted">
					What are you working on? Continue something here, paste in a piece from elsewhere,
					or start with a sentence.
				</p>
			</header>

			<section className="grid gap-6 border-y border-studio-line py-7 md:grid-cols-[1.4fr_1fr]">
				<div>
					<p className="studio-eyebrow">On your desk</p>
					<h2 className="literary-title mt-3 text-3xl">
						{draft.title || 'The next page is yours'}
					</h2>
					<p className="mt-4 max-w-2xl font-serif text-lg leading-8 text-studio-muted">
						{draft.body
							? draft.body.slice(0, 230) + (draft.body.length > 230 ? '…' : '')
							: 'Begin here, or paste something you would like read closely.'}
					</p>
					<a
						href="#writing-draft"
						className="studio-primary mt-6"
						onClick={() =>
							document.querySelector<HTMLTextAreaElement>('textarea[name="body"]')?.focus()
						}>
						{draft.body ? 'Continue writing' : 'Start or paste a piece'}
					</a>
					<p className="mt-3 text-xs text-studio-muted">
						Your working draft is recovered on this browser.
					</p>
				</div>

				<aside className="md:border-l md:border-studio-line md:pl-6">
					<p className="studio-eyebrow">With the editor</p>
					<div className="mt-4 space-y-3 text-sm leading-6 text-studio-muted">
						<p><strong className="text-studio-ink">{submittedCount}</strong> waiting for a close read</p>
						<p><strong className="text-studio-ink">{inReviewCount}</strong> currently being read</p>
						<p><strong className="text-studio-ink">{publishedCount}</strong> with feedback ready</p>
					</div>
					<Link href="/app/writer/feedback" className="studio-link mt-5 inline-block">
						Open feedback →
					</Link>
					<div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-studio-line pt-5 text-sm">
						<Link href="/app/writer/reading-room" className="studio-link">Reading</Link>
						<Link href="/app/writer/commonplace" className="studio-link">Commonplace</Link>
					</div>
				</aside>
			</section>

			{(notice || savedNotice) && isSuccessModalOpen ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4 backdrop-blur-sm">
					<div className="w-full max-w-md rounded-lg border border-emerald-300/25 bg-studio-canvas p-5 shadow-none">
						<p className="text-xs uppercase tracking-[0.12em] text-emerald-800">Submission saved</p>
						<h2 className="literary-title mt-2 text-3xl text-studio-ink">It's on the desk.</h2>
						<p className="mt-3 text-sm leading-relaxed text-studio-muted">
							Your piece is waiting for a close read. You can start another piece, return to
							your writing, or leave it here for now.
						</p>
						<div className="mt-5 flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => {
									setIsSuccessModalOpen(false)
									window.requestAnimationFrame(() => titleInputRef.current?.focus())
								}}
								className="studio-primary">
								Start another
							</button>
							<button
								type="button"
								onClick={() => setIsSuccessModalOpen(false)}
								className="rounded border border-studio-line px-4 py-2 text-sm text-studio-muted transition hover:text-studio-ink">
								Close
							</button>
						</div>
					</div>
				</div>
			) : null}

			<div id="writing-draft" className="scroll-mt-6 space-y-4">
				<header className="pb-3">
					<p className="studio-eyebrow">Work in progress</p>
					<h2 className="literary-title mt-3 text-4xl">Your draft</h2>
					<p className="mt-3 font-serif text-xl text-studio-muted">
						Write here or paste in a piece you have already begun.
					</p>
				</header>

				<label className="block">
					<span className="mb-3 block text-xs uppercase tracking-[0.1em] text-studio-muted">Writing surface</span>
					<div className="writing-surface p-5 sm:p-7">
						<ManuscriptTextarea
							name="body"
							value={draft.body}
							disabled={!recovery.ready || pending}
							required
							form="writer-submit-form"
							rows={12}
							className="writing-manuscript"
							placeholder="Begin here, or paste a piece you have started."
							onValueChange={(body) => recovery.edit({ body })}
						/>
					</div>
					<div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
						<p className={isOverAbuLimit ? 'text-amber-800' : 'text-studio-muted'}>
							{wordCount.toLocaleString()} words
							{isAbuSelected
								? ` · ${Math.max(remainingWords, 0).toLocaleString()} remaining for Authorised Basic User`
								: ''}
						</p>
						{isOverAbuLimit ? (
							<p className="rounded border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs text-amber-800">
								Please shorten this piece before submitting.
							</p>
						) : null}
					</div>
				</label>

				<DraftRecoveryNotice message={recovery.message} download={recovery.download} />
			</div>

			<form id="writer-submit-form" action={submit} className="border-t border-studio-line pt-7">
				<p className="studio-eyebrow">When you would like a close read</p>
				<div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
					<h2 className="literary-title text-3xl">Send this piece</h2>
					<p className="text-sm leading-6 text-studio-muted">
						{submittedCount} waiting · {inReviewCount} being read · {publishedCount} returned
					</p>
				</div>

				<div className="mt-5 grid items-end gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
					<label className="block">
						<span className="mb-1.5 block text-sm text-studio-muted">Title</span>
						<input
							ref={titleInputRef}
							name="title"
							value={draft.title}
							onChange={(event) => recovery.edit({ title: event.target.value })}
							disabled={!recovery.ready || pending}
							required
							className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink outline-none ring-accent-400 transition placeholder:text-studio-muted focus:ring"
							placeholder="Draft title"
						/>
					</label>

					{isWorkshopRequired ? (
						<label className="block">
							<span className="mb-1.5 block text-sm text-studio-muted">Writing group</span>
							<select
								name="workshopId"
								required
								value={selectedWorkshopId}
								onChange={(event) => recovery.edit({ workshopId: event.target.value })}
								disabled={!recovery.ready || pending || workshops.length === 0}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink outline-none ring-accent-400 transition focus:ring disabled:opacity-60">
								{workshops.length === 0 ? <option value="">No writing group found</option> : null}
								{workshops.map((workshop) => (
									<option key={workshop.id} value={workshop.id}>{workshop.title}</option>
								))}
							</select>
						</label>
					) : (
						<div className="rounded-md border border-studio-line bg-studio-canvas px-3 py-2 text-sm text-studio-muted">
							Editorial queue
						</div>
					)}

					<button
						type="submit"
						disabled={!recovery.ready || pending || isOverAbuLimit || (isWorkshopRequired && !selectedWorkshop)}
						className="studio-primary w-full md:w-auto md:min-w-[220px]">
						{pending ? 'Sending…' : isOverAbuLimit ? 'Shorten before sending' : 'Send for a close read'}
					</button>
				</div>

				<div className="mt-4 space-y-2">
					{isAbuSelected ? (
						<p className="text-xs text-studio-muted">
							Authorised Basic User submissions are limited to {abuSubmissionWordLimit.toLocaleString()} words.
						</p>
					) : null}
					{notice ? <p className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-800">{notice}</p> : null}
					{saveError ? <p role="alert" className="text-sm text-amber-800">{saveError}</p> : null}
					{errorNotice ? <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">{errorNotice}</p> : null}
					{workshopError ? <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">{workshopError}</p> : null}
					{isWorkshopRequired && !workshopError && workshops.length === 0 ? (
						<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
							No writing group membership found yet. Your group may still be loading.
						</p>
					) : null}
					{!isWorkshopRequired ? (
						<p className="rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 py-2 text-sm text-sky-800">
							Legacy schema detected. Submissions currently route through a default queue.
						</p>
					) : null}
					{isOverAbuLimit ? (
						<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
							This draft is {Math.abs(remainingWords).toLocaleString()} words over the current Authorised Basic User limit.
						</p>
					) : null}
				</div>

				{availableDocuments.length > 0 || documentsError ? (
					<div className="mt-5 border-t border-studio-line pt-4">
						<p className="studio-eyebrow">Optional reading</p>
						<label className="mt-3 block">
							<span className="mb-1.5 block text-sm text-studio-muted">Teaching material</span>
							<select
								value=""
								onChange={(event) => {
									const documentId = event.target.value
									if (documentId) router.push(`/app/writer/documents/${documentId}`)
								}}
								disabled={availableDocuments.length === 0}
								className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-sm text-studio-ink outline-none ring-accent-400 transition focus:ring disabled:opacity-60">
								<option value="">
									{availableDocuments.length > 0 ? 'Available reading' : 'No reading available'}
								</option>
								{availableDocuments.map((document) => (
									<option key={document.id} value={document.id}>{document.title} · {document.documentType}</option>
								))}
							</select>
						</label>
						{documentsError ? <p className="mt-2 text-xs leading-5 text-amber-800">{documentsError}</p> : null}
						<button
							type="button"
							onClick={() => router.push('/app/writer/documents')}
							className="mt-3 text-left text-xs uppercase tracking-[0.1em] text-studio-accent transition hover:text-studio-accent">
							Browse the reading room
						</button>
					</div>
				) : null}
			</form>

			<div className="border-t border-studio-line pt-7">
				<SubmissionHistorySelect
					submissions={submissions}
					submissionsError={submissionsError}
					deleteSubmissionAction={deleteSubmissionAction}
				/>
			</div>
		</div>
	)
}
