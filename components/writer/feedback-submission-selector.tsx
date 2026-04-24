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
	return value ? new Date(value).toLocaleString() : 'Unknown date'
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
		return <p className="text-sm text-silver-300">No published feedback yet.</p>
	}

	return (
		<div className="space-y-4">
			<label className="block">
				<span className="mb-1.5 block text-sm text-silver-100">
					Choose feedback
				</span>
				<select
					value={selectedSubmissionId}
					onChange={(event) => {
						setSelectedSubmissionId(event.target.value)
						if (event.target.value) {
							scrollToSelectedSubmission()
						}
					}}
					className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2.5 text-parchment-100 outline-none ring-accent-400 transition focus:ring">
					<option value="">Select a published response</option>
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
					className="rounded-2xl border border-white/15 bg-ink-900/40 p-4 lg:p-5">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="text-xs uppercase tracking-[0.12em] text-accent-300">
								Published response
							</p>
							<h2 className="literary-title mt-2 line-clamp-2 text-2xl text-parchment-100">
								{versionLabel(selectedSubmission.version)} -{' '}
								{selectedSubmission.title}
							</h2>
							<p className="mt-2 text-xs leading-relaxed text-silver-300">
								{formatDate(selectedSubmission.createdAt)} {' · '} Version{' '}
								{selectedSubmission.version} {' · '}
								{selectedSubmission.commentCount} comments
							</p>
						</div>
						<Link
							href={`/app/writer/feedback/${selectedSubmission.id}`}
							className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30">
							Read feedback in context
						</Link>
					</div>

					<div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
						<p className="text-[11px] uppercase tracking-[0.12em] text-silver-300">
							Overview
						</p>
						<p className="mt-2 text-[15px] leading-relaxed text-silver-100">
							{selectedSubmission.summary || 'No summary published.'}
						</p>
					</div>

					<div className="mt-4">
						<div className="flex items-baseline justify-between gap-3">
							<h3 className="literary-title text-lg text-parchment-100">
								Comments
							</h3>
							<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
								Preview
							</p>
						</div>
						{selectedSubmission.comments.length === 0 ? (
							<p className="mt-3 text-sm text-silver-200">
								No comments found.
							</p>
						) : (
							<ul className="mt-3 space-y-2.5">
								{selectedSubmission.comments.map((comment) => (
									<li
										key={comment.id}
										className="rounded-xl border border-white/10 bg-ink-800/60 p-3">
										<p className="text-xs uppercase tracking-[0.1em] text-accent-300">
											{comment.categoryLabel || 'Feedback'}
										</p>
										{comment.quote ? (
											<p className="mt-2 text-sm leading-relaxed text-silver-100">
												{curlyQuote(comment.quote)}
											</p>
										) : null}
										<p className="mt-2 border-l border-burgundy-300/70 pl-3 font-serif text-sm italic leading-relaxed text-parchment-100">
											{comment.comment}
										</p>
									</li>
								))}
							</ul>
						)}
					</div>
				</section>
			) : (
				<section className="rounded-2xl border border-white/15 bg-ink-900/40 p-5">
					<p className="text-xs uppercase tracking-[0.12em] text-accent-300">
						Choose a piece
					</p>
					<h2 className="literary-title mt-2 text-2xl text-parchment-100">
						Select published feedback to preview it here.
					</h2>
					<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
						You can read the overview and individual comments on this page, or
						open the full contextual feedback view to see each comment beside
						the whole piece.
					</p>
				</section>
			)}
		</div>
	)
}
