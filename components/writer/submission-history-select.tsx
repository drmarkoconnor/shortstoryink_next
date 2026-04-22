'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type WriterSubmission = {
	id: string
	title: string
	status: string
	createdAt: string
	workshopTitle?: string | null
	version?: number
	commentCount?: number
}

function statusLabel(value: string) {
	return value.replaceAll('_', ' ')
}

function formatDate(value: string) {
	if (!value) {
		return 'Unknown date'
	}

	return new Date(value).toLocaleString()
}

export function SubmissionHistorySelect({
	submissions,
	submissionsError,
	deleteSubmissionAction,
}: {
	submissions: WriterSubmission[]
	submissionsError: string | null
	deleteSubmissionAction: (formData: FormData) => void
}) {
	const [selectedSubmissionId, setSelectedSubmissionId] = useState('')

	const selectedSubmission = useMemo(
		() =>
			submissions.find(
				(submission) => submission.id === selectedSubmissionId,
			) ?? null,
		[submissions, selectedSubmissionId],
	)

	return (
		<section className="surface p-4 lg:p-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="literary-title text-2xl text-parchment-100">
						Previous submissions
					</h2>
					<p className="muted mt-2 max-w-[48rem] text-sm leading-relaxed">
						Choose a past piece to check its status, comments, and published
						feedback without turning the page into a long filing cabinet.
					</p>
				</div>
				<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-silver-200">
					{submissions.length} total
				</p>
			</div>

			{submissionsError ? (
				<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
					{submissionsError}
				</p>
			) : submissions.length === 0 ? (
				<p className="muted mt-4 text-sm">No submissions yet.</p>
			) : (
				<div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
					<label className="block">
						<span className="mb-1.5 block text-sm text-silver-100">
							Select a submission
						</span>
						<select
							value={selectedSubmissionId}
							onChange={(event) => setSelectedSubmissionId(event.target.value)}
							className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2.5 text-parchment-100 outline-none ring-accent-400 transition focus:ring">
							<option value="">Choose from your submitted pieces</option>
							{submissions.map((submission) => (
								<option key={submission.id} value={submission.id}>
									{submission.title} - {statusLabel(submission.status)}
								</option>
							))}
						</select>
					</label>

					{selectedSubmission ? (
						<div className="rounded-2xl border border-white/10 bg-ink-900/45 p-4 text-sm text-silver-100 lg:min-w-[19rem]">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<p className="font-medium text-parchment-100">
										{selectedSubmission.title}
									</p>
									<p className="mt-1 text-xs uppercase tracking-[0.1em] text-accent-300">
										{statusLabel(selectedSubmission.status)}
									</p>
								</div>
								<p className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-silver-100">
									{selectedSubmission.commentCount ?? 0} comments
								</p>
							</div>

							<p className="mt-3 text-xs leading-relaxed text-silver-200">
								{selectedSubmission.workshopTitle ?? 'Default group queue'}
								{' · '}
								{formatDate(selectedSubmission.createdAt)}
								{selectedSubmission.version
									? ` · Version ${selectedSubmission.version}`
									: ''}
							</p>

							<div className="mt-4 flex flex-wrap gap-2">
								{selectedSubmission.status === 'feedback_published' ? (
									<Link
										href={`/app/writer/feedback/${selectedSubmission.id}`}
										className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30">
										Go to feedback
									</Link>
								) : null}
								{selectedSubmission.status === 'submitted' ? (
									<form action={deleteSubmissionAction}>
										<input
											type="hidden"
											name="submissionId"
											value={selectedSubmission.id}
										/>
										<button
											type="submit"
											className="rounded-full border border-rose-300/50 bg-rose-300/10 px-4 py-2 text-xs uppercase tracking-[0.1em] text-rose-100 transition hover:bg-rose-300/20">
											Delete draft
										</button>
									</form>
								) : null}
								{selectedSubmission.status !== 'feedback_published' &&
								selectedSubmission.status !== 'submitted' ? (
									<p className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.1em] text-silver-200">
										Feedback not published yet
									</p>
								) : null}
							</div>
						</div>
					) : null}
				</div>
			)}
		</section>
	)
}
