'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'

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

	return new Date(value).toLocaleString('en-GB', { timeZone: 'Europe/London' })
}

function versionLabel(version?: number) {
	return `v${version ?? 1}`
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
	const selectedSubmissionRef = useRef<HTMLDivElement>(null)

	const selectedSubmission = useMemo(
		() =>
			submissions.find(
				(submission) => submission.id === selectedSubmissionId,
			) ?? null,
		[submissions, selectedSubmissionId],
	)
	const scrollToSelectedSubmission = () => {
		window.requestAnimationFrame(() => {
			selectedSubmissionRef.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'end',
			})
		})
	}

	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="literary-title text-2xl text-studio-ink">
						Previous submissions
					</h2>
					<p className="muted mt-2 max-w-[48rem] text-sm leading-relaxed">
						Choose a past piece to check its status, comments, and published
						feedback without turning the page into a long filing cabinet.
					</p>
				</div>
				<p className="rounded border border-studio-line bg-studio-tint px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-studio-muted">
					{submissions.length} total
				</p>
			</div>

			{submissionsError ? (
				<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
					{submissionsError}
				</p>
			) : submissions.length === 0 ? (
				<p className="muted mt-4 text-sm">No submissions yet.</p>
			) : (
				<div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
					<label className="block">
						<span className="mb-1.5 block text-sm text-studio-muted">
							Select a submission
						</span>
						<select
							value={selectedSubmissionId}
							onChange={(event) => {
								setSelectedSubmissionId(event.target.value)
								if (event.target.value) {
									scrollToSelectedSubmission()
								}
							}}
							className="w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink outline-none ring-accent-400 transition focus:ring">
							<option value="">Choose from your submitted pieces</option>
							{submissions.map((submission) => (
								<option key={submission.id} value={submission.id}>
									{versionLabel(submission.version)} - {submission.title} -{' '}
									{statusLabel(submission.status)}
								</option>
							))}
						</select>
					</label>

					{selectedSubmission ? (
						<div
							ref={selectedSubmissionRef}
							className="rounded-md border border-studio-line bg-studio-canvas p-4 text-sm text-studio-muted lg:min-w-[19rem]">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<p className="font-medium text-studio-ink">
										{versionLabel(selectedSubmission.version)} -{' '}
										{selectedSubmission.title}
									</p>
									<p className="mt-1 text-xs uppercase tracking-[0.1em] text-studio-accent">
										{statusLabel(selectedSubmission.status)}
									</p>
								</div>
								<p className="rounded border border-studio-line bg-studio-tint px-2.5 py-1 text-xs text-studio-muted">
									{selectedSubmission.commentCount ?? 0} comments
								</p>
							</div>

							<p className="mt-3 text-xs leading-relaxed text-studio-muted">
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
										className="studio-primary">
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
											className="rounded border border-rose-300/50 bg-rose-300/10 px-4 py-2 text-xs uppercase tracking-[0.1em] text-rose-800 transition hover:bg-rose-300/20">
											Delete draft
										</button>
									</form>
								) : null}
								{selectedSubmission.status !== 'feedback_published' &&
								selectedSubmission.status !== 'submitted' ? (
									<p className="rounded border border-studio-line bg-studio-tint px-4 py-2 text-xs uppercase tracking-[0.1em] text-studio-muted">
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
