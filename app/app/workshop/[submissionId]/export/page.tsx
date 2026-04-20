import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PrintAction } from '@/components/export/print-action'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import {
	getFeedbackExportPacket,
	type ExportFeedbackItem,
} from '@/lib/export/get-feedback-export-packet'

function kindLabel(kind: ExportFeedbackItem['anchor'] extends null ? never : 'typo' | 'craft' | 'pacing' | 'structure' | undefined) {
	if (kind === 'typo') {
		return 'Typo / Grammar'
	}
	if (kind === 'pacing') {
		return 'Pacing'
	}
	if (kind === 'structure') {
		return 'Structure'
	}
	return 'Craft'
}

function feedbackLabel(anchor: ExportFeedbackItem['anchor']) {
	if (anchor?.categoryLabel?.trim()) {
		return anchor.categoryLabel
	}
	return kindLabel(anchor?.kind)
}

function toFilenamePart(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/@.*$/, '')
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
}

function buildExportFilename({
	title,
	writerName,
	teacherName,
	exportedAt,
}: {
	title: string
	writerName: string
	teacherName: string
	exportedAt: Date
}) {
	const titlePart = toFilenamePart(title) || 'untitled'
	const writerPart = toFilenamePart(writerName) || 'writer'
	const teacherPart = toFilenamePart(teacherName) || 'teacher'
	const datePart = [
		exportedAt.getFullYear(),
		String(exportedAt.getMonth() + 1).padStart(2, '0'),
		String(exportedAt.getDate()).padStart(2, '0'),
	].join('')

	return `${titlePart}_${writerPart}_${teacherPart}_${datePart}_shortstory_ink_feedback`
}

function renderParagraphWithHighlights(
	text: string,
	items: ExportFeedbackItem[],
): ReactNode[] {
	if (items.length === 0) {
		return [text]
	}

	const sorted = [...items]
		.filter(
			(item) =>
				item.anchor &&
				Number.isFinite(item.anchor.startOffset) &&
				Number.isFinite(item.anchor.endOffset),
		)
		.sort(
			(a, b) =>
				(a.anchor?.startOffset ?? 0) - (b.anchor?.startOffset ?? 0),
		)

	const nodes: ReactNode[] = []
	let cursor = 0

	for (const item of sorted) {
		if (!item.anchor) {
			continue
		}

		const start = Math.max(cursor, Math.min(item.anchor.startOffset, text.length))
		const end = Math.max(start, Math.min(item.anchor.endOffset, text.length))

		if (start > cursor) {
			nodes.push(text.slice(cursor, start))
		}

		const markedText = text.slice(start, end)
		if (markedText) {
			nodes.push(
				<mark
					key={`${item.id}-${start}`}
					className="rounded px-1"
					style={{
						backgroundColor:
							item.anchor.kind === 'typo'
								? 'color-mix(in srgb, #5b6f99 28%, transparent)'
								: item.anchor.kind === 'structure'
									? 'color-mix(in srgb, #49615a 30%, transparent)'
									: 'color-mix(in srgb, #7a2f45 26%, transparent)',
					}}>
					{markedText}
				</mark>,
			)
		}

		cursor = end
	}

	if (cursor < text.length) {
		nodes.push(text.slice(cursor))
	}

	return nodes
}

export default async function WorkshopSubmissionExportPage({
	params,
}: {
	params: Promise<{ submissionId: string }>
}) {
	const profile = await requireTeacher()
	const { submissionId } = await params
	const packet = await getFeedbackExportPacket(submissionId, profile.user.id)

	if (!packet) {
		notFound()
	}

	const exportedAt = new Date()
	const teacherName =
		(profile.user.user_metadata?.display_name as string | undefined) ||
		profile.user.email ||
		'teacher'
	const exportFilename = buildExportFilename({
		title: packet.title,
		writerName: packet.writerName,
		teacherName,
		exportedAt,
	})

	return (
		<section className="print-shell mx-auto max-w-5xl space-y-6 rounded-[32px] bg-parchment-50 px-6 py-8 text-ink-900 shadow-[0_24px_80px_rgba(0,0,0,0.18)] lg:px-10">
			<div className="print-controls flex flex-wrap items-center justify-between gap-3 border-b border-ink-900/10 pb-6">
				<div>
					<p className="text-xs uppercase tracking-[0.14em] text-ink-900/50">
						shortstory.ink export
					</p>
					<h1 className="literary-title mt-2 text-3xl text-ink-900">
						Feedback packet
					</h1>
				</div>
				<div className="flex flex-wrap gap-2">
					<Link
						href={`/app/workshop/${packet.submissionId}`}
						className="rounded-full border border-ink-900/15 px-4 py-2 text-xs uppercase tracking-[0.1em] text-ink-900/75 transition hover:bg-white">
						Back to review
					</Link>
					<PrintAction filename={exportFilename} />
				</div>
			</div>

			<section className="print-break-avoid rounded-[28px] border border-ink-900/10 bg-white px-6 py-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
				<p className="text-xs uppercase tracking-[0.14em] text-ink-900/50">
					Submission
				</p>
				<h2 className="literary-title mt-3 text-4xl leading-tight text-ink-900">
					{packet.title}
				</h2>
				<div className="mt-5 flex flex-wrap gap-2 text-xs text-ink-900/70">
					<p className="rounded-full border border-ink-900/10 bg-parchment-50 px-3 py-1.5">
						Writer: {packet.writerName}
					</p>
					<p className="rounded-full border border-ink-900/10 bg-parchment-50 px-3 py-1.5">
						Version {packet.version}
					</p>
					<p className="rounded-full border border-ink-900/10 bg-parchment-50 px-3 py-1.5">
						Source {packet.source === 'try_writing' ? 'try writing' : 'workshop'}
					</p>
					<p className="rounded-full border border-ink-900/10 bg-parchment-50 px-3 py-1.5">
						{packet.status.replaceAll('_', ' ')}
					</p>
					<p className="rounded-full border border-ink-900/10 bg-parchment-50 px-3 py-1.5">
						Submitted {new Date(packet.createdAt).toLocaleString()}
					</p>
					<p className="rounded-full border border-ink-900/10 bg-parchment-50 px-3 py-1.5">
						Exported {exportedAt.toLocaleString()}
					</p>
				</div>
			</section>

			<section className="print-break-avoid rounded-[28px] border border-ink-900/10 bg-white px-6 py-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
				<p className="text-xs uppercase tracking-[0.14em] text-ink-900/50">
					Teacher summary
				</p>
				<p className="mt-3 text-base leading-8 text-ink-900/88">
					{packet.summary?.text || 'No summary published.'}
				</p>
				<p className="mt-4 text-xs text-ink-900/55">
					By {packet.summary?.authorName || 'Teacher'}
					{packet.summary?.publishedAt
						? ` · Published ${new Date(packet.summary.publishedAt).toLocaleString()}`
						: ''}
				</p>
			</section>

			<section className="print-manuscript-section rounded-[28px] border border-ink-900/10 bg-white px-6 py-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
				<div className="flex items-center justify-between gap-3">
					<h3 className="literary-title text-2xl text-ink-900">
						Annotated manuscript
					</h3>
					<p className="text-xs uppercase tracking-[0.14em] text-ink-900/50">
						Student copy
					</p>
				</div>
				{packet.feedback.length === 0 ? (
					<p className="mt-6 rounded-[24px] border border-ink-900/10 bg-parchment-50 px-6 py-5 text-sm text-ink-900/70">
						No feedback comments were found for this submission.
					</p>
				) : null}
				<div className="mt-6 space-y-6 font-serif text-[18px] leading-8 text-ink-900/92">
					{packet.paragraphs.map((paragraph) => {
						const isSceneBreak = paragraph.text.trim() === '**'
						const paragraphFeedback = packet.feedback.filter(
							(item) => item.anchor?.blockId === paragraph.id,
						)
						return (
							<div key={paragraph.id} className="print-break-avoid">
								<p
									className={
										isSceneBreak
											? 'text-center tracking-[0.22em] text-ink-900/55'
											: 'whitespace-pre-wrap'
									}>
									{isSceneBreak
										? '***'
										: renderParagraphWithHighlights(
												paragraph.text,
												paragraphFeedback,
											)}
								</p>
								{paragraphFeedback.length > 0 ? (
									<div className="mt-3 space-y-3 border-l-2 border-ink-900/12 pl-4">
										{paragraphFeedback.map((item) => (
											<div
												key={item.id}
												className="rounded-2xl border border-ink-900/10 bg-parchment-50 px-4 py-3">
												<div className="flex flex-wrap items-center gap-2">
													<p className="text-[11px] uppercase tracking-[0.14em] text-ink-900/55">
														{feedbackLabel(item.anchor)}
													</p>
													<p className="font-serif text-sm italic text-ink-900/80">
														&ldquo;{item.anchor?.quote || 'General note'}&rdquo;
													</p>
												</div>
												<p className="mt-2 text-sm leading-7 text-ink-900/88">
													{item.comment}
												</p>
												<p className="mt-3 text-xs text-ink-900/55">
													{item.authorName} ·{' '}
													{new Date(item.createdAt).toLocaleString()}
												</p>
											</div>
										))}
									</div>
								) : null}
							</div>
						)
					})}
				</div>
			</section>
		</section>
	)
}
