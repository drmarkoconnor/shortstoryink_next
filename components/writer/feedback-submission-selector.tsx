'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

type FeedbackCommentPreview = {
	id: string
	comment: string
	quote: string
	categoryLabel?: string
}

type FeedbackSubmission = {
	id: string
	title: string
	createdAt: string
	version: number
	summary: string
	commentCount: number
	comments: FeedbackCommentPreview[]
}

function formatDate(value: string) {
	return value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Europe/London' }) : 'Unknown date'
}

function curlyQuote(value: string) {
	return value.trim() ? `\u201c${value.trim()}\u201d` : 'General note'
}

function versionLabel(version: number) {
	return `v${version}`
}

export function FeedbackSubmissionSelector({
	submissions,
}: {
	submissions: FeedbackSubmission[]
}) {
	const [selectedSubmissionId, setSelectedSubmissionId] = useState(
		submissions[0]?.id ?? '',
	)
	const selectedSubmissionRef = useRef<HTMLElement>(null)

	useEffect(() => {
		if (submissions.length === 0) {
			if (selectedSubmissionId) {
				setSelectedSubmissionId('')
			}
			return
		}

		const hasSelectedSubmission = submissions.some(
			(submission) => submission.id === selectedSubmissionId,
		)

		if (!selectedSubmissionId || !hasSelectedSubmission) {
			setSelectedSubmissionId(submissions[0].id)
		}
	}, [selectedSubmissionId, submissions])

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

	if (submissions.length === 0) {
		return <p className="text-sm text-studio-muted">No finished pieces yet.</p>
	}

	return (
		<div className="space-y-4">
			<label className="block">
				<span className="mb-1.5 block text-sm text-studio-muted">
					Choose a finished piece
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
					<option value="">Select a finished piece</option>
					{submissions.map((submission) => (
						<option key={submission.id} value={submission.id}>
							{versionLabel(submission.version)} - {submission.title} -{' '}
							{submission.commentCount} comments
						</option>
					))}
				</select>
			</label>

			{selectedSubmission ? (
				<section
					ref={selectedSubmissionRef}
					className="rounded-md border border-studio-line bg-studio-canvas p-4 lg:p-5">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="text-xs uppercase tracking-[0.12em] text-studio-accent">
								Finished piece
							</p>
							<h2 className="literary-title mt-2 line-clamp-2 text-2xl text-studio-ink">
								{versionLabel(selectedSubmission.version)} -{' '}
								{selectedSubmission.title}
							</h2>
							<p className="mt-2 text-xs leading-relaxed text-studio-muted">
								{formatDate(selectedSubmission.createdAt)} {' · '} Version{' '}
								{selectedSubmission.version} {' · '}
								{selectedSubmission.commentCount} comments
							</p>
						</div>
						<Link
							href={`/app/writer/feedback/${selectedSubmission.id}`}
							className="studio-primary">
							Read finished piece
						</Link>
					</div>

					<div className="mt-4 rounded-md border border-studio-line bg-black/20 p-4">
						<p className="text-xs uppercase tracking-[0.12em] text-studio-muted">
							Overview
						</p>
						<p className="mt-2 text-[15px] leading-relaxed text-studio-muted">
							{selectedSubmission.summary || 'No summary published.'}
						</p>
					</div>

					<div className="mt-4">
						<div className="flex items-baseline justify-between gap-3">
							<h3 className="literary-title text-lg text-studio-ink">
								Comments
							</h3>
							<p className="text-xs uppercase tracking-[0.1em] text-studio-muted">
								Preview
							</p>
						</div>
						{selectedSubmission.comments.length === 0 ? (
							<p className="mt-3 text-sm text-studio-muted">
								No comments found.
							</p>
						) : (
							<ul className="mt-3 space-y-2.5">
								{selectedSubmission.comments.map((comment) => (
									<li
										key={comment.id}
										className="rounded-md border border-studio-line bg-studio-tint p-3">
										<p className="text-xs uppercase tracking-[0.1em] text-studio-accent">
											{comment.categoryLabel || 'Feedback'}
										</p>
										{comment.quote ? (
											<p className="mt-2 text-sm leading-relaxed text-studio-muted">
												{curlyQuote(comment.quote)}
											</p>
										) : null}
										<p className="mt-2 border-l border-burgundy-300/70 pl-3 font-serif text-sm italic leading-relaxed text-studio-ink">
											{comment.comment}
										</p>
									</li>
								))}
							</ul>
						)}
					</div>
				</section>
			) : (
				<section className="rounded-md border border-studio-line bg-studio-canvas p-5">
					<p className="text-xs uppercase tracking-[0.12em] text-studio-accent">
						Choose a piece
					</p>
					<h2 className="literary-title mt-2 text-2xl text-studio-ink">
						Select a finished piece to preview it here.
					</h2>
					<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
						You can read the overview and individual comments on this page, or
						open the book view to see each comment beside the whole piece.
					</p>
				</section>
			)}
		</div>
	)
}
