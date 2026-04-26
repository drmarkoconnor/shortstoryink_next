import type { ReactNode } from 'react'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { PrintAction } from '@/components/export/print-action'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
	getFeedbackExportPacket,
	type ExportFeedbackItem,
} from '@/lib/export/get-feedback-export-packet'

function normalizeTextAreaValue(value: string | string[] | undefined) {
	if (Array.isArray(value)) {
		return value[value.length - 1] ?? ''
	}
	return value ?? ''
}

function splitLines(value: string) {
	return value
		.split('\n')
		.map((item) => item.trim())
		.filter(Boolean)
}

function isEnabledParam(
	value: string | string[] | undefined,
	defaultValue = true,
): boolean {
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return defaultValue
		}

		return value.some((item) => isEnabledParam(item, false))
	}

	const normalized = normalizeTextAreaValue(value).trim().toLowerCase()
	if (!normalized) {
		return defaultValue
	}

	return !['0', 'false', 'off', 'no'].includes(normalized)
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

function summarizeAnchorQuote(value: string | null | undefined, wordLimit = 6) {
	if (!value) {
		return 'General note'
	}

	const words = value.trim().split(/\s+/).filter(Boolean)
	if (words.length <= wordLimit) {
		return value.trim()
	}

	return `${words.slice(0, wordLimit).join(' ')}...`
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
				<span key={`${item.id}-${start}`} className="inline">
					<mark
						className={`rounded px-1 ${
							item.anchor.suggestedAction === 'cut'
								? 'bg-transparent text-ink-900/45 line-through decoration-2 decoration-ink-900/30'
								: ''
						}`}
						style={{
							backgroundColor:
								item.anchor.suggestedAction === 'cut'
									? 'transparent'
									: item.anchor.kind === 'typo'
										? 'color-mix(in srgb, #5b6f99 28%, transparent)'
										: item.anchor.kind === 'structure'
											? 'color-mix(in srgb, #49615a 30%, transparent)'
											: 'color-mix(in srgb, #7a2f45 26%, transparent)',
						}}>
						{markedText}
					</mark>
					<sup className="ml-1 text-[10px] font-semibold text-ink-900/55">
						{item.number}
					</sup>
				</span>,
			)
		}

		cursor = end
	}

	if (cursor < text.length) {
		nodes.push(text.slice(cursor))
	}

	return nodes
}

const packetSectionClass =
	'print-break-avoid border-t border-ink-900/10 bg-transparent px-0 py-7'

export default async function WorkshopSubmissionExportPage({
	params,
	searchParams,
}: {
	params: Promise<{ submissionId: string }>
	searchParams?: Promise<{
		saved?: string | string[]
		includeAppendix?: string | string[]
	}>
}) {
	const profile = await requireTeacher()
	const { submissionId } = await params
	const resolvedSearchParams = searchParams ? await searchParams : undefined
	const savedNotice = normalizeTextAreaValue(resolvedSearchParams?.saved)
	const appendixEnabled = isEnabledParam(
		resolvedSearchParams?.includeAppendix,
		true,
	)
	const supabase = await createServerSupabaseClient()

	async function saveExportCopyAction(formData: FormData) {
		'use server'

		await requireTeacher()
		const supabase = await createServerSupabaseClient()
		const personalNote = String(formData.get('personalNote') ?? '').trim()
		const nextStepsInput = String(formData.get('nextSteps') ?? '')
		const readingSuggestionsInput = String(
			formData.get('readingSuggestions') ?? '',
		)
		const nextSteps = splitLines(nextStepsInput)
		const readingSuggestions = splitLines(readingSuggestionsInput)
		const currentSummaryResult = await supabase
			.from('feedback_summaries')
			.select(
				'personal_note, next_steps, reading_suggestions, export_copy_version',
			)
			.eq('submission_id', submissionId)
			.maybeSingle()

		const currentPersonalNote =
			(currentSummaryResult.data?.personal_note as string | null | undefined) ?? null
		const currentNextSteps = Array.isArray(currentSummaryResult.data?.next_steps)
			? (currentSummaryResult.data?.next_steps as unknown[]).filter(
					(item): item is string =>
						typeof item === 'string' && item.trim().length > 0,
				)
			: []
		const currentReadingSuggestions = Array.isArray(
			currentSummaryResult.data?.reading_suggestions,
		)
			? (currentSummaryResult.data?.reading_suggestions as unknown[]).filter(
					(item): item is string =>
						typeof item === 'string' && item.trim().length > 0,
				)
			: []
		const currentVersion = Math.max(
			1,
			Number(currentSummaryResult.data?.export_copy_version ?? 1) || 1,
		)
		const hasChanged =
			(currentPersonalNote ?? '') !== personalNote ||
			currentNextSteps.join('\n') !== nextSteps.join('\n') ||
			currentReadingSuggestions.join('\n') !== readingSuggestions.join('\n')

		const { error } = await supabase
			.from('feedback_summaries')
			.update({
				personal_note: personalNote || null,
				next_steps: nextSteps,
				reading_suggestions: readingSuggestions,
				export_copy_version: hasChanged ? currentVersion + 1 : currentVersion,
				export_copy_updated_at: hasChanged ? new Date().toISOString() : undefined,
			})
			.eq('submission_id', submissionId)

		if (error) {
			redirect(`/app/workshop/${submissionId}/export?saved=error`)
		}

		revalidatePath(`/app/workshop/${submissionId}/export`)
		redirect(`/app/workshop/${submissionId}/export?saved=1`)
	}

	async function clearExportCopyAction() {
		'use server'

		await requireTeacher()
		const supabase = await createServerSupabaseClient()
		const currentSummaryResult = await supabase
			.from('feedback_summaries')
			.select('export_copy_version')
			.eq('submission_id', submissionId)
			.maybeSingle()
		const currentVersion = Math.max(
			1,
			Number(currentSummaryResult.data?.export_copy_version ?? 1) || 1,
		)

		const { error } = await supabase
			.from('feedback_summaries')
			.update({
				personal_note: null,
				next_steps: [],
				reading_suggestions: [],
				export_copy_version: currentVersion + 1,
				export_copy_updated_at: new Date().toISOString(),
			})
			.eq('submission_id', submissionId)

		if (error) {
			redirect(`/app/workshop/${submissionId}/export?saved=error`)
		}

		revalidatePath(`/app/workshop/${submissionId}/export`)
		redirect(`/app/workshop/${submissionId}/export?saved=cleared`)
	}

	const submissionResult = await supabase
		.from('submissions')
		.select('id, status, title')
		.eq('id', submissionId)
		.maybeSingle()

	if (submissionResult.error || !submissionResult.data) {
		notFound()
	}

	if (submissionResult.data.status !== 'feedback_published') {
		return (
			<section className="mx-auto max-w-3xl space-y-5 rounded-[32px] bg-parchment-50 px-6 py-10 text-ink-900 shadow-[0_24px_80px_rgba(0,0,0,0.18)] lg:px-12">
				<p className="text-[11px] uppercase tracking-[0.18em] text-ink-900/42">
					shortstory.ink
				</p>
				<h1 className="literary-title text-3xl text-ink-900">
					Feedback document unavailable
				</h1>
				<p className="max-w-2xl font-serif text-[19px] leading-8 text-ink-900/78">
					Feedback must be published before export is available.
				</p>
				<div className="flex flex-wrap gap-2">
					<Link
						href={`/app/workshop/${submissionId}`}
						className="rounded-full border border-ink-900/15 px-4 py-2 text-xs uppercase tracking-[0.1em] text-ink-900/75 transition hover:bg-white">
						Back to review
					</Link>
				</div>
			</section>
		)
	}

	const packet = await getFeedbackExportPacket(submissionId, profile.user.id)

	if (!packet) {
		notFound()
	}

	const revisionNotes = packet.groupedComments.flatMap((group) =>
		group.comments.map((item) => ({
			id: item.id,
			number: item.number,
			label: group.label || item.label || 'Uncategorised',
			comment: item.comment,
			quote: summarizeAnchorQuote(item.anchor?.quote, 6),
		})),
	)
	const hasNextSteps =
		!packet.nextSteps.isPlaceholder && packet.nextSteps.items.length > 0
	const hasReadingSuggestions = packet.nextSteps.readingSuggestions.length > 0
	const hasAppendixExtras =
		Boolean(packet.teacherAdditions.personalNote) ||
		hasNextSteps ||
		hasReadingSuggestions

	const exportedAt = new Date()
	const exportFilename = buildExportFilename({
		title: packet.cover.title,
		writerName: packet.cover.writerName,
		teacherName: packet.cover.teacherName,
		exportedAt,
	})

	return (
		<section className="print-shell mx-auto max-w-5xl space-y-5 rounded-[32px] bg-parchment-50 px-6 py-8 text-ink-900 shadow-[0_24px_80px_rgba(0,0,0,0.18)] lg:px-12">
			<div className="print-page-footer hidden text-[11px] uppercase tracking-[0.16em] text-ink-900/42 print:flex">
				<span>shortstory.ink</span>
				<span className="print-page-number" />
			</div>

			<div className="print-controls flex flex-wrap items-center justify-between gap-3 border-b border-ink-900/10 pb-6">
				<div>
					<p className="text-xs uppercase tracking-[0.14em] text-ink-900/50">
						shortstory.ink feedback
					</p>
					<h1 className="literary-title mt-2 text-3xl text-ink-900">
						Feedback document
					</h1>
				</div>
				<div className="flex flex-wrap gap-2">
					<Link
						href={packet.reviewUrl}
						className="rounded-full border border-ink-900/15 px-4 py-2 text-xs uppercase tracking-[0.1em] text-ink-900/75 transition hover:bg-white">
						Back to review
					</Link>
					<PrintAction filename={exportFilename} />
				</div>
			</div>

			<form
				method="get"
				className="print-controls flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-ink-900/10 bg-white/60 px-4 py-3">
				<div>
					<p className="text-xs uppercase tracking-[0.14em] text-ink-900/45">
						Packet composition
					</p>
					<p className="mt-1 text-sm text-ink-900/68">
						Keep the manuscript central, and include the appendix only when it
						serves this feedback document.
					</p>
				</div>
				<label className="flex items-center gap-3 text-sm text-ink-900/80">
					<input type="hidden" name="includeAppendix" value="0" />
					<input
						type="checkbox"
						name="includeAppendix"
						value="1"
						defaultChecked={appendixEnabled}
						className="h-4 w-4 rounded border-ink-900/20 text-ink-900 focus:ring-ink-900/20"
					/>
					{appendixEnabled ? 'Hide appendix' : 'Include appendix'}
				</label>
				{savedNotice ? <input type="hidden" name="saved" value={savedNotice} /> : null}
				<button
					type="submit"
					className="rounded-full border border-ink-900/15 px-4 py-2 text-xs uppercase tracking-[0.1em] text-ink-900/75 transition hover:bg-white">
					Show feedback document
				</button>
			</form>

			{savedNotice === '1' ? (
				<p className="print-controls rounded-2xl border border-emerald-700/20 bg-emerald-100/70 px-4 py-3 text-sm text-emerald-950">
					Feedback document notes saved for this published submission.
				</p>
			) : savedNotice === 'cleared' ? (
				<p className="print-controls rounded-2xl border border-amber-700/20 bg-amber-100/70 px-4 py-3 text-sm text-amber-950">
					Saved feedback document notes cleared.
				</p>
			) : savedNotice === 'error' ? (
				<p className="print-controls rounded-2xl border border-rose-700/20 bg-rose-100/70 px-4 py-3 text-sm text-rose-950">
					Unable to save feedback document notes right now.
				</p>
			) : null}

			<form
				className="print-controls rounded-[28px] border border-ink-900/12 bg-white px-5 py-4 text-ink-900 shadow-[0_18px_44px_rgba(11,14,23,0.16)]"
				action={saveExportCopyAction}>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-xs uppercase tracking-[0.14em] text-ink-900/45">
							Feedback document notes
						</p>
						<h2 className="literary-title mt-2 text-2xl text-ink-900">
							Writer-facing additions
						</h2>
						<p className="mt-2 max-w-2xl text-sm leading-6 text-ink-900/64">
							Use these fields only for material you want the writer to receive
							in the feedback document.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							formAction={clearExportCopyAction}
							type="submit"
							className="inline-flex select-none appearance-none items-center justify-center rounded-full border border-ink-900/18 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-900/70 shadow-sm transition hover:border-ink-900/28 hover:bg-parchment-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:bg-parchment-200">
							Clear notes
						</button>
						<button
							type="submit"
							className="inline-flex select-none appearance-none items-center justify-center rounded-full border border-accent-400 bg-accent-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-950 shadow-[0_8px_18px_rgba(11,14,23,0.18)] transition hover:border-accent-300 hover:bg-accent-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/75 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px">
							Save feedback notes
						</button>
					</div>
				</div>
				<div className="mt-4 grid gap-3 lg:grid-cols-3">
					<label className="block">
						<span className="text-xs uppercase tracking-[0.12em] text-ink-900/48">
							Personal note
						</span>
						<textarea
							name="personalNote"
							defaultValue={packet.teacherAdditions.personalNote ?? ''}
							rows={6}
							className="mt-2 w-full rounded-2xl border border-ink-900/12 bg-ink-800 px-4 py-2.5 text-sm leading-6 text-parchment-100 outline-none ring-accent-400/50 transition placeholder:text-parchment-100/48 focus:border-accent-400/60 focus:ring"
							placeholder="Add a brief personal note to sit beside the editorial letter."
						/>
					</label>
					<label className="block">
						<span className="text-xs uppercase tracking-[0.12em] text-ink-900/48">
							Next steps
						</span>
						<textarea
							name="nextSteps"
							defaultValue={packet.nextSteps.isPlaceholder ? '' : packet.nextSteps.items.join('\n')}
							rows={6}
							className="mt-2 w-full rounded-2xl border border-ink-900/12 bg-ink-800 px-4 py-2.5 text-sm leading-6 text-parchment-100 outline-none ring-accent-400/50 transition placeholder:text-parchment-100/48 focus:border-accent-400/60 focus:ring"
							placeholder="One item per line"
						/>
					</label>
					<label className="block">
						<span className="text-xs uppercase tracking-[0.12em] text-ink-900/48">
							Reading suggestions
						</span>
						<textarea
							name="readingSuggestions"
							defaultValue={packet.nextSteps.readingSuggestions.join('\n')}
							rows={6}
							className="mt-2 w-full rounded-2xl border border-ink-900/12 bg-ink-800 px-4 py-2.5 text-sm leading-6 text-parchment-100 outline-none ring-accent-400/50 transition placeholder:text-parchment-100/48 focus:border-accent-400/60 focus:ring"
							placeholder="Suggested authors, stories, or exercises, one per line"
						/>
					</label>
				</div>
			</form>

			<section className="print-break-avoid px-1 pb-5 pt-5">
				<p className="text-[11px] uppercase tracking-[0.18em] text-ink-900/42">
					shortstory.ink
				</p>
				<div className="mt-4 max-w-4xl text-[11px] uppercase tracking-[0.16em] text-ink-900/52">
					<span>{packet.cover.writerName}</span>
					<span className="mx-2 text-ink-900/28">/</span>
					<span>{packet.cover.teacherName}</span>
					<span className="mx-2 text-ink-900/28">/</span>
					<span>{packet.cover.date}</span>
					<span className="mx-2 text-ink-900/28">/</span>
					<span>{packet.cover.versionLabel}</span>
					<span className="mx-2 text-ink-900/28">/</span>
					<span>{packet.cover.wordCount} words</span>
				</div>
				<h2 className="literary-title mt-5 max-w-4xl text-[42px] leading-[1.08] text-ink-900 lg:text-[52px]">
					{packet.cover.title}
				</h2>
				<p className="mt-4 max-w-2xl font-serif text-[18px] leading-8 text-ink-900/72">
					Prepared by {packet.cover.teacherName} for {packet.cover.writerName} on{' '}
					{packet.cover.date}.
				</p>
				<p className="mt-2 max-w-2xl font-serif text-[17px] leading-7 text-ink-900/66">
					Use this feedback document alongside the annotated manuscript as you plan your
					next revision.
				</p>
			</section>

			<section className={packetSectionClass}>
				<p className="text-xs uppercase tracking-[0.16em] text-ink-900/45">
					A note on this draft
				</p>
				<div className="mt-5 max-w-[42rem] border-l border-ink-900/10 pl-6">
					<p className="font-serif text-[19px] italic leading-[1.8] text-ink-900/84">
						{packet.editorialLetter.summary}
					</p>
				</div>
			</section>

			<section className="border-t border-ink-900/10 px-0 py-7">
				<div className="flex items-center justify-between gap-3">
					<h3 className="literary-title text-3xl text-ink-900">
						Annotated manuscript
					</h3>
					<p className="text-xs uppercase tracking-[0.16em] text-ink-900/45">
						{packet.annotatedManuscript.commentCount} comments
					</p>
				</div>
				{packet.annotatedManuscript.commentCount === 0 ? (
					<p className="mt-5 px-1 text-sm text-ink-900/70">
						No feedback comments were found for this submission.
					</p>
				) : null}
				<div className="mt-5 space-y-5 font-serif text-[18px] leading-8 text-ink-900/92">
					{packet.annotatedManuscript.paragraphs.map((paragraph) => {
						const isSceneBreak = paragraph.text.trim() === '**'
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
												paragraph.comments,
											)}
								</p>
								{paragraph.comments.length > 0 ? (
									<div className="mt-2.5 space-y-2.5 border-l-2 border-ink-900/12 pl-4">
										{paragraph.comments.map((item) => (
											<div
												key={item.id}
												className="print-comment-card px-3 py-1.5">
												<div className="flex flex-wrap items-center gap-2">
													<p className="text-[11px] uppercase tracking-[0.14em] text-ink-900/50">
														Note {item.number} · {item.label}
													</p>
													<p className="font-serif text-[15px] italic text-ink-900/76">
														&ldquo;{summarizeAnchorQuote(item.anchor?.quote)}&rdquo;
													</p>
												</div>
												<p className="mt-1.5 text-[16px] leading-[1.65] text-ink-900/88">
													{item.comment}
												</p>
												<p className="mt-2 text-xs text-ink-900/55">
													{item.authorName}
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

			{appendixEnabled ? (
				<section className={packetSectionClass}>
					<p className="text-xs uppercase tracking-[0.16em] text-ink-900/45">
						Revision notes
					</p>
					{packet.keyRevisionThemes.length > 0 ? (
						<p className="mt-3 max-w-3xl text-sm leading-6 text-ink-900/70">
							The main themes in this feedback:{' '}
							<span className="font-medium text-ink-900/82">
								{packet.keyRevisionThemes.map((theme) => theme.label).join(', ')}
							</span>
						</p>
					) : null}
					<ul className="mt-4 space-y-2.5">
						{revisionNotes.map((item) => (
							<li
								key={item.id}
								className="max-w-4xl font-serif text-[18px] leading-[1.65] text-ink-900/90">
								<span className="font-medium text-ink-900">
									Comment {item.number} [{item.label}]:
								</span>{' '}
								{item.comment}
								{item.quote !== 'General note' ? (
									<span className="text-ink-900/62">
										{' '}
										(&ldquo;{item.quote}&rdquo;)
									</span>
								) : null}
							</li>
						))}
					</ul>
				</section>
			) : null}

			{appendixEnabled && hasAppendixExtras ? (
				<section className={packetSectionClass}>
					<div className="max-w-3xl">
						<p className="text-xs uppercase tracking-[0.16em] text-ink-900/45">
							Appendix
						</p>
						<h3 className="literary-title mt-2 text-3xl text-ink-900">
							Next steps
						</h3>
						<p className="mt-3 font-serif text-[19px] leading-8 text-ink-900/76">
							Use these practical prompts only if they help shape the next pass.
						</p>
					</div>
					{packet.teacherAdditions.personalNote ? (
						<section className="mt-8 border-t border-ink-900/10 pt-5">
							<p className="text-xs uppercase tracking-[0.16em] text-ink-900/45">
								Personal note
							</p>
							<p className="mt-3 max-w-[42rem] whitespace-pre-wrap border-l border-ink-900/10 pl-6 font-serif text-[18px] italic leading-[1.75] text-ink-900/78">
								{packet.teacherAdditions.personalNote}
							</p>
						</section>
					) : null}
					{hasNextSteps ? (
						<section className="mt-6 border-t border-ink-900/10 pt-4">
							<p className="text-xs uppercase tracking-[0.16em] text-ink-900/45">
								Next steps
							</p>
							<ul className="mt-3 list-disc space-y-1 pl-5">
								{packet.nextSteps.items.map((item) => (
									<li
										key={item}
										className="max-w-3xl font-serif text-[18px] leading-6 text-ink-900/90">
										{item}
									</li>
								))}
							</ul>
						</section>
					) : null}
					{packet.nextSteps.readingSuggestions.length > 0 ? (
						<div className="mt-6 border-t border-ink-900/10 pt-4">
							<p className="text-xs uppercase tracking-[0.16em] text-ink-900/45">
								Suggested reading
							</p>
							<ul className="mt-3 list-disc space-y-1 pl-5">
								{packet.nextSteps.readingSuggestions.map((item) => (
									<li
										key={item}
										className="max-w-3xl font-serif text-[18px] leading-6 text-ink-900/88">
										{item}
									</li>
								))}
							</ul>
						</div>
					) : null}
				</section>
			) : null}
		</section>
	)
}
