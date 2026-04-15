'use client'

import { useMemo, useState } from 'react'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { ProtoCard } from '@/components/prototype/card'
import { ProtoButton } from '@/components/prototype/button'
import { teacherTabs } from '@/lib/mock/teacher-prototype'

type Snippet = {
	id: string
	title: string
	categoryId: string
	body: string
	sourceLine: string
}

type SnippetCategory = {
	id: string
	name: string
	color: string
}

const seed: Snippet[] = [
	{
		id: 'sn-1',
		title: 'Reveal desire early',
		categoryId: 'cat-character',
		body: 'In the first paragraph, let the reader glimpse what the protagonist wants and what could cost them that want.',
		sourceLine:
			'“A hand closed around the envelope before he knew what was inside.”',
	},
	{
		id: 'sn-2',
		title: 'Anchor place with one concrete noun',
		categoryId: 'cat-setting',
		body: 'Within five lines, name one physical object specific to this location. This improves scene trust immediately.',
		sourceLine: '“The enamel kettle clicked once against the chipped sink.”',
	},
	{
		id: 'sn-3',
		title: 'POV boundary check',
		categoryId: 'cat-pov',
		body: 'Mark each paragraph with viewpoint owner initials. Any drift between initials without transition is a revision target.',
		sourceLine: '“She knew the rain had started before hearing it.”',
	},
	{
		id: 'sn-4',
		title: 'Dialogue pressure pass',
		categoryId: 'cat-dialogue',
		body: 'For each line, ask what the speaker avoids saying. Add one line where subtext leaks into word choice.',
		sourceLine: '“That’s one way to tell it,” he said, not looking up.',
	},
]

const seedCategories: SnippetCategory[] = [
	{
		id: 'cat-character',
		name: 'Character',
		color: 'border-burgundy-300/60 bg-burgundy-500/25',
	},
	{
		id: 'cat-setting',
		name: 'Setting',
		color: 'border-indigo-300/60 bg-indigo-500/25',
	},
	{
		id: 'cat-pov',
		name: 'POV',
		color: 'border-emerald-300/60 bg-emerald-500/20',
	},
	{
		id: 'cat-dialogue',
		name: 'Dialogue',
		color: 'border-amber-300/60 bg-amber-500/20',
	},
	{
		id: 'cat-prose',
		name: 'Prose',
		color: 'border-fuchsia-300/60 bg-fuchsia-500/20',
	},
	{
		id: 'cat-uncategorized',
		name: 'Uncategorized',
		color: 'border-white/20 bg-white/10',
	},
]

export default function TeacherSnippetsDeskPage() {
	const [categories, setCategories] =
		useState<SnippetCategory[]>(seedCategories)
	const [items, setItems] = useState<Snippet[]>(seed)
	const [activeCategoryId, setActiveCategoryId] = useState<string>('all')
	const [selectedId, setSelectedId] = useState<string | null>(
		seed[0]?.id ?? null,
	)
	const [title, setTitle] = useState('')
	const [body, setBody] = useState('')
	const [sourceLine, setSourceLine] = useState('')
	const [draftCategoryId, setDraftCategoryId] = useState('cat-character')
	const [newCategoryName, setNewCategoryName] = useState('')
	const [renameCategoryName, setRenameCategoryName] = useState('')

	const categoryMap = useMemo(
		() => Object.fromEntries(categories.map((cat) => [cat.id, cat])),
		[categories],
	)

	const categoryCounts = useMemo(() => {
		const count: Record<string, number> = {}
		items.forEach((item) => {
			count[item.categoryId] = (count[item.categoryId] ?? 0) + 1
		})
		return count
	}, [items])

	const visible = useMemo(
		() =>
			items.filter(
				(item) =>
					activeCategoryId === 'all' || item.categoryId === activeCategoryId,
			),
		[items, activeCategoryId],
	)

	const selected = items.find((item) => item.id === selectedId) ?? null
	const selectedCategory = selected ? categoryMap[selected.categoryId] : null

	const resetForm = () => {
		setTitle('')
		setBody('')
		setSourceLine('')
		setDraftCategoryId(categories[0]?.id ?? 'cat-uncategorized')
	}

	const createSnippet = () => {
		if (!title.trim() || !body.trim() || !sourceLine.trim()) return
		const newItem: Snippet = {
			id: `sn-${Date.now()}`,
			title: title.trim(),
			body: body.trim(),
			sourceLine: sourceLine.trim(),
			categoryId: draftCategoryId,
		}
		setItems((prev) => [newItem, ...prev])
		setSelectedId(newItem.id)
		resetForm()
	}

	const updateSelected = () => {
		if (!selected || !title.trim() || !body.trim() || !sourceLine.trim()) return
		setItems((prev) =>
			prev.map((item) =>
				item.id === selected.id
					? {
							...item,
							title: title.trim(),
							body: body.trim(),
							sourceLine: sourceLine.trim(),
							categoryId: draftCategoryId,
						}
					: item,
			),
		)
	}

	const removeSelected = () => {
		if (!selected) return
		setItems((prev) => prev.filter((item) => item.id !== selected.id))
		setSelectedId((prev) => {
			const next = items.find((item) => item.id !== prev)
			return next?.id ?? null
		})
		resetForm()
	}

	const beginEdit = () => {
		if (!selected) return
		setTitle(selected.title)
		setBody(selected.body)
		setSourceLine(selected.sourceLine)
		setDraftCategoryId(selected.categoryId)
	}

	const createCategory = () => {
		const name = newCategoryName.trim()
		if (!name) return
		const id = `cat-${Date.now()}`
		setCategories((prev) => [
			...prev,
			{ id, name, color: 'border-slate-300/60 bg-slate-500/20' },
		])
		setNewCategoryName('')
	}

	const renameCategory = () => {
		if (activeCategoryId === 'all' || !renameCategoryName.trim()) return
		setCategories((prev) =>
			prev.map((cat) =>
				cat.id === activeCategoryId
					? { ...cat, name: renameCategoryName.trim() }
					: cat,
			),
		)
		setRenameCategoryName('')
	}

	const deleteCategory = () => {
		if (activeCategoryId === 'all' || activeCategoryId === 'cat-uncategorized')
			return
		setItems((prev) =>
			prev.map((item) =>
				item.categoryId === activeCategoryId
					? { ...item, categoryId: 'cat-uncategorized' }
					: item,
			),
		)
		setCategories((prev) => prev.filter((cat) => cat.id !== activeCategoryId))
		setActiveCategoryId('all')
	}

	const copySelected = async () => {
		if (!selected) return
		await navigator.clipboard.writeText(
			`${selected.title}\n\n${selected.sourceLine}\n\n${selected.body}`,
		)
	}

	return (
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher/snippets-desk" />

			<div className="relative overflow-hidden rounded-2xl">
				<div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
					<aside className="surface space-y-3 p-4">
						<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
							Snippet categories
						</p>
						<ul className="space-y-2">
							<li>
								<button
									type="button"
									onClick={() => setActiveCategoryId('all')}
									className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
										activeCategoryId === 'all'
											? 'border-white/25 bg-white/10'
											: 'border-white/10 bg-ink-900/45 hover:bg-ink-900/60'
									}`}>
									<span>All</span>
									<span className="text-xs text-silver-300">
										{items.length}
									</span>
								</button>
							</li>
							{categories.map((entry) => (
								<li key={entry.name}>
									<button
										type="button"
										onClick={() => setActiveCategoryId(entry.id)}
										className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
											activeCategoryId === entry.id
												? entry.color
												: 'border-white/10 bg-ink-900/45 hover:bg-ink-900/60'
										}`}>
										<span>{entry.name}</span>
										<span className="text-xs text-silver-300">
											{categoryCounts[entry.id] ?? 0}
										</span>
									</button>
								</li>
							))}
						</ul>

						<div className="border-t border-white/10 pt-3">
							<p className="mb-2 text-xs uppercase tracking-[0.11em] text-silver-300">
								Category CRUD
							</p>
							<input
								value={newCategoryName}
								onChange={(e) => setNewCategoryName(e.target.value)}
								placeholder="New category"
								className="w-full rounded-lg border border-white/15 bg-ink-900/40 px-2 py-1.5 text-xs"
							/>
							<div className="mt-2 flex gap-2">
								<ProtoButton
									className="!px-3 !py-1.5 !text-xs"
									onClick={createCategory}>
									Add
								</ProtoButton>
							</div>
							<input
								value={renameCategoryName}
								onChange={(e) => setRenameCategoryName(e.target.value)}
								placeholder="Rename selected"
								className="mt-2 w-full rounded-lg border border-white/15 bg-ink-900/40 px-2 py-1.5 text-xs"
							/>
							<div className="mt-2 flex gap-2">
								<ProtoButton
									className="!px-3 !py-1.5 !text-xs"
									variant="secondary"
									onClick={renameCategory}>
									Rename
								</ProtoButton>
								<ProtoButton
									className="!px-3 !py-1.5 !text-xs"
									variant="ghost"
									onClick={deleteCategory}>
									Delete
								</ProtoButton>
							</div>
						</div>
					</aside>

					<main className="space-y-4 pr-0 xl:pr-[430px]">
						<ProtoCard
							title="Commonplace snippet studio"
							meta="Capture line → craft note">
							<div className="grid gap-2 sm:grid-cols-2">
								<input
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="Snippet title"
									className="rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100"
								/>
								<select
									value={draftCategoryId}
									onChange={(e) => setDraftCategoryId(e.target.value)}
									className="rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100">
									{categories.map((option) => (
										<option key={option.id} value={option.id}>
											{option.name}
										</option>
									))}
								</select>
							</div>
							<input
								value={sourceLine}
								onChange={(e) => setSourceLine(e.target.value)}
								placeholder="Source line / excerpt"
								className="mt-2 w-full rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100"
							/>
							<textarea
								value={body}
								onChange={(e) => setBody(e.target.value)}
								placeholder="Craft interpretation / why this matters"
								rows={4}
								className="mt-2 w-full rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100"
							/>
							<div className="mt-3 flex flex-wrap gap-2">
								<ProtoButton onClick={createSnippet}>Create</ProtoButton>
								<ProtoButton variant="secondary" onClick={updateSelected}>
									Update selected
								</ProtoButton>
								<ProtoButton variant="ghost" onClick={removeSelected}>
									Delete selected
								</ProtoButton>
								<ProtoButton variant="text" onClick={beginEdit}>
									Load selected into form
								</ProtoButton>
							</div>
						</ProtoCard>

						<div className="grid gap-3 sm:grid-cols-2">
							{visible.map((snippet) => (
								<ProtoCard
									key={snippet.id}
									title={snippet.title}
									meta={
										categoryMap[snippet.categoryId]?.name ?? 'Uncategorized'
									}
									action={
										<ProtoButton
											variant="text"
											onClick={() => setSelectedId(snippet.id)}>
											Open
										</ProtoButton>
									}>
									<div className="space-y-1">
										<p className="line-clamp-2 text-xs text-parchment-200/90">
											{snippet.sourceLine}
										</p>
										<p>{snippet.body.slice(0, 90)}...</p>
									</div>
								</ProtoCard>
							))}
						</div>
					</main>
				</div>

				<aside
					className={`absolute right-0 top-0 h-full w-full max-w-[420px] transform border-l border-white/10 bg-ink-800/95 p-5 backdrop-blur-sm transition duration-300 ease-out ${
						selected ? 'translate-x-0' : 'translate-x-full'
					}`}>
					{selected ? (
						<div className="flex h-full flex-col">
							<div className="mb-3 flex items-start justify-between gap-3">
								<div>
									<p className="text-xs uppercase tracking-[0.11em] text-silver-300">
										{selectedCategory?.name ?? 'Uncategorized'}
									</p>
									<h3 className="literary-title mt-1 text-2xl text-parchment-100">
										{selected.title}
									</h3>
								</div>
								<button
									className="text-silver-300"
									onClick={() => setSelectedId(null)}>
									✕
								</button>
							</div>
							<div className="surface flex-1 overflow-y-auto p-4 text-sm leading-relaxed text-silver-200">
								<p className="mb-3 border-l-2 border-burgundy-300/50 pl-3 text-parchment-200">
									{selected.sourceLine}
								</p>
								<p>{selected.body}</p>
							</div>
							<div className="mt-3 flex gap-2">
								<ProtoButton onClick={copySelected}>
									Copy to clipboard
								</ProtoButton>
								<ProtoButton variant="secondary" onClick={beginEdit}>
									Edit
								</ProtoButton>
							</div>
						</div>
					) : null}
				</aside>
			</div>
		</section>
	)
}

