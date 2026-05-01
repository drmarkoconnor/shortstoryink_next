'use client'

import { useState, type FormEvent } from 'react'
import { fixedFeedbackCategories } from '@/lib/feedback/categories'

function parseTags(value: string) {
	return [
		...new Set(
			value
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean),
		),
	].slice(0, 12)
}

export function SourceExcerptForm() {
	const [author, setAuthor] = useState('')
	const [title, setTitle] = useState('')
	const [source, setSource] = useState('manual')
	const [sourceUrl, setSourceUrl] = useState('')
	const [sourceSection, setSourceSection] = useState('')
	const [excerpt, setExcerpt] = useState('')
	const [categoryLabel, setCategoryLabel] = useState('')
	const [tags, setTags] = useState('')
	const [note, setNote] = useState('')
	const [isSaving, setIsSaving] = useState(false)
	const [notice, setNotice] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const clearMessages = () => {
		setNotice(null)
		setError(null)
	}

	const saveSourceExcerpt = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setIsSaving(true)
		clearMessages()

		try {
			const response = await fetch('/api/teacher/source-excerpts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					author,
					title,
					source,
					sourceUrl,
					sourceSection,
					excerpt,
					categoryLabel,
					tags: parseTags(tags),
					note,
				}),
			})
			const payload = (await response.json()) as
				| { error?: string; notice?: string }
				| undefined

			if (!response.ok || payload?.error) {
				throw new Error(payload?.error ?? 'Unable to save source excerpt.')
			}

			setNotice(payload?.notice ?? 'Source excerpt saved as a snippet.')
			setExcerpt('')
			setTags('')
			setNote('')
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: 'Unable to save source excerpt.',
			)
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<form onSubmit={saveSourceExcerpt} className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
			<section className="surface space-y-4 p-4 lg:p-5">
				<div>
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						Source metadata
					</p>
					<p className="muted mt-2 text-sm leading-relaxed">
						Store the citation shape, not the whole book.
					</p>
				</div>
				<label className="block">
					<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
						Author
					</span>
					<input
						required
						value={author}
						onChange={(event) => {
							clearMessages()
							setAuthor(event.target.value)
						}}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
					/>
				</label>
				<label className="block">
					<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
						Title
					</span>
					<input
						required
						value={title}
						onChange={(event) => {
							clearMessages()
							setTitle(event.target.value)
						}}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
					/>
				</label>
				<label className="block">
					<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
						Source
					</span>
					<input
						value={source}
						onChange={(event) => {
							clearMessages()
							setSource(event.target.value)
						}}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
						placeholder="Gutenberg, Internet Archive, manual"
					/>
				</label>
				<label className="block">
					<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
						Source URL
					</span>
					<input
						type="url"
						value={sourceUrl}
						onChange={(event) => {
							clearMessages()
							setSourceUrl(event.target.value)
						}}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
						placeholder="Optional"
					/>
				</label>
				<label className="block">
					<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
						Chapter / section
					</span>
					<input
						value={sourceSection}
						onChange={(event) => {
							clearMessages()
							setSourceSection(event.target.value)
						}}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
						placeholder="Optional"
					/>
				</label>
			</section>

			<section className="surface space-y-4 p-4 lg:p-5">
				<div>
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						Excerpt
					</p>
					<p className="muted mt-2 text-sm leading-relaxed">
						Save only the selected passage you intend to teach from.
					</p>
				</div>
				<label className="block">
					<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
						Excerpt text
					</span>
					<textarea
						required
						rows={9}
						value={excerpt}
						onChange={(event) => {
							clearMessages()
							setExcerpt(event.target.value)
						}}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm leading-relaxed text-parchment-100"
					/>
				</label>
				<div className="grid gap-3 sm:grid-cols-2">
					<label className="block">
						<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
							Category
						</span>
						<select
							value={categoryLabel}
							onChange={(event) => {
								clearMessages()
								setCategoryLabel(event.target.value)
							}}
							className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
							<option value="">Uncategorised</option>
							{fixedFeedbackCategories.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					</label>
					<label className="block">
						<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
							Tags
						</span>
						<input
							value={tags}
							onChange={(event) => {
								clearMessages()
								setTags(event.target.value)
							}}
							className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
							placeholder="dialogue, opening, imagery"
						/>
					</label>
				</div>
				<label className="block">
					<span className="mb-1 block text-[11px] uppercase tracking-[0.1em] text-silver-300">
						Teacher note
					</span>
					<textarea
						rows={4}
						value={note}
						onChange={(event) => {
							clearMessages()
							setNote(event.target.value)
						}}
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm leading-relaxed text-parchment-100"
						placeholder="Optional private teaching note"
					/>
				</label>
				<div className="flex flex-wrap items-center gap-3">
					<button
						type="submit"
						disabled={isSaving}
						className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
						{isSaving ? 'Saving...' : 'Save excerpt'}
					</button>
					{notice ? (
						<p className="text-sm text-emerald-100">{notice}</p>
					) : null}
					{error ? (
						<p className="text-sm text-amber-100">{error}</p>
					) : null}
				</div>
			</section>
		</form>
	)
}
