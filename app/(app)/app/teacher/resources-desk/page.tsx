'use client'

import { useMemo, useState } from 'react'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { ProtoCard } from '@/components/prototype/card'
import { ProtoButton } from '@/components/prototype/button'
import { teacherTabs } from '@/lib/mock/teacher-prototype'

type ResourceItem = {
	id: string
	title: string
	categoryId: string
	format: 'Handout' | 'Book' | 'Article' | 'Prompt Pack'
	audience: 'Whole class' | 'Small group' | 'Intervention'
	description: string
	classroomUse: string
	url?: string
}

type ResourceCategory = {
	id: string
	name: string
	color: string
}

const seed: ResourceItem[] = [
	{
		id: 'rs-1',
		title: 'Beginner handout: dialogue drift',
		categoryId: 'cat-dialogue',
		format: 'Handout',
		audience: 'Whole class',
		description:
			'Checklist to keep speech specific, purposeful, and grounded in subtext pressure.',
		classroomUse:
			'10-minute warmup in week 2, then revisit as a revision checklist in conferencing.',
	},
	{
		id: 'rs-2',
		title: 'Steering the Craft — Le Guin',
		categoryId: 'cat-prose',
		format: 'Book',
		audience: 'Intervention',
		description:
			'Exercise-focused craft support for sentence control and narrative mode.',
		classroomUse:
			'Targeted chapter excerpts assigned to students struggling with sentence rhythm.',
		url: 'https://www.amazon.co.uk/',
	},
	{
		id: 'rs-3',
		title: 'POV handout: stability pass',
		categoryId: 'cat-pov',
		format: 'Handout',
		audience: 'Small group',
		description:
			'A line-level pass to confirm paragraph ownership and avoid accidental interiority bleed.',
		classroomUse: 'Small-group clinic before draft 2 due date.',
	},
	{
		id: 'rs-4',
		title: 'Setting prompt sheet',
		categoryId: 'cat-setting',
		format: 'Prompt Pack',
		audience: 'Whole class',
		description:
			'Prompts for sensory specificity and physical orientation in opening scenes.',
		classroomUse:
			'Independent writing sprint starter; students choose 2 prompts then share.',
	},
]

const seedCategories: ResourceCategory[] = [
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
		id: 'cat-pacing',
		name: 'Pacing',
		color: 'border-sky-300/60 bg-sky-500/20',
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

export default function TeacherResourcesDeskPage() {
	const [categories, setCategories] =
		useState<ResourceCategory[]>(seedCategories)
	const [items, setItems] = useState<ResourceItem[]>(seed)
	const [activeCategoryId, setActiveCategoryId] = useState('all')
	const [selectedId, setSelectedId] = useState<string | null>(
		seed[0]?.id ?? null,
	)
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [classroomUse, setClassroomUse] = useState('')
	const [url, setUrl] = useState('')
	const [draftCategoryId, setDraftCategoryId] = useState('cat-character')
	const [draftFormat, setDraftFormat] =
		useState<ResourceItem['format']>('Handout')
	const [draftAudience, setDraftAudience] =
		useState<ResourceItem['audience']>('Whole class')
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
		setDescription('')
		setClassroomUse('')
		setUrl('')
		setDraftCategoryId(categories[0]?.id ?? 'cat-uncategorized')
		setDraftFormat('Handout')
		setDraftAudience('Whole class')
	}

	const createResource = () => {
		if (!title.trim() || !description.trim() || !classroomUse.trim()) return
		const newItem: ResourceItem = {
			id: `rs-${Date.now()}`,
			title: title.trim(),
			description: description.trim(),
			classroomUse: classroomUse.trim(),
			categoryId: draftCategoryId,
			format: draftFormat,
			audience: draftAudience,
			url: url.trim() || undefined,
		}
		setItems((prev) => [newItem, ...prev])
		setSelectedId(newItem.id)
		resetForm()
	}

	const updateSelected = () => {
		if (
			!selected ||
			!title.trim() ||
			!description.trim() ||
			!classroomUse.trim()
		)
			return
		setItems((prev) =>
			prev.map((item) =>
				item.id === selected.id
					? {
							...item,
							title: title.trim(),
							description: description.trim(),
							classroomUse: classroomUse.trim(),
							categoryId: draftCategoryId,
							format: draftFormat,
							audience: draftAudience,
							url: url.trim() || undefined,
						}
					: item,
			),
		)
	}

	const removeSelected = () => {
		if (!selected) return
		setItems((prev) => prev.filter((item) => item.id !== selected.id))
		setSelectedId((prev) => items.find((item) => item.id !== prev)?.id ?? null)
		resetForm()
	}

	const beginEdit = () => {
		if (!selected) return
		setTitle(selected.title)
		setDescription(selected.description)
		setClassroomUse(selected.classroomUse)
		setUrl(selected.url ?? '')
		setDraftCategoryId(selected.categoryId)
		setDraftFormat(selected.format)
		setDraftAudience(selected.audience)
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
			`${selected.title}\n${selected.format} · ${selected.audience}\n\nSummary:\n${selected.description}\n\nClassroom use:\n${selected.classroomUse}${selected.url ? `\n\n${selected.url}` : ''}`,
		)
	}

	return (
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher/resources-desk" />

			<div className="relative overflow-hidden rounded-2xl">
				<div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
					<aside className="surface space-y-3 p-4">
						<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
							Library lanes
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
								<li key={entry.id}>
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
							title="Resource library manager"
							meta="Tag by format + audience">
							<div className="grid gap-2 sm:grid-cols-2">
								<input
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="Resource title"
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
							<div className="mt-2 grid gap-2 sm:grid-cols-2">
								<select
									value={draftFormat}
									onChange={(e) =>
										setDraftFormat(e.target.value as ResourceItem['format'])
									}
									className="rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100">
									{(['Handout', 'Book', 'Article', 'Prompt Pack'] as const).map(
										(option) => (
											<option key={option}>{option}</option>
										),
									)}
								</select>
								<select
									value={draftAudience}
									onChange={(e) =>
										setDraftAudience(e.target.value as ResourceItem['audience'])
									}
									className="rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100">
									{(
										['Whole class', 'Small group', 'Intervention'] as const
									).map((option) => (
										<option key={option}>{option}</option>
									))}
								</select>
							</div>
							<input
								value={url}
								onChange={(e) => setUrl(e.target.value)}
								placeholder="External link (optional)"
								className="mt-2 w-full rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100"
							/>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Resource summary"
								rows={4}
								className="mt-2 w-full rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100"
							/>
							<textarea
								value={classroomUse}
								onChange={(e) => setClassroomUse(e.target.value)}
								placeholder="Classroom use plan"
								rows={3}
								className="mt-2 w-full rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100"
							/>
							<div className="mt-3 flex flex-wrap gap-2">
								<ProtoButton onClick={createResource}>Create</ProtoButton>
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
							{visible.map((resource) => (
								<ProtoCard
									key={resource.id}
									title={resource.title}
									meta={`${categoryMap[resource.categoryId]?.name ?? 'Uncategorized'} · ${resource.format}`}
									action={
										<ProtoButton
											variant="text"
											onClick={() => setSelectedId(resource.id)}>
											Open
										</ProtoButton>
									}>
									<div className="space-y-1">
										<p>{resource.description.slice(0, 90)}...</p>
										<p className="text-xs text-silver-300">
											Audience: {resource.audience}
										</p>
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
										{selectedCategory?.name ?? 'Uncategorized'} ·{' '}
										{selected.format} · {selected.audience}
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
								<p>{selected.description}</p>
								<p className="mt-3 border-l-2 border-burgundy-300/50 pl-3 text-parchment-200">
									{selected.classroomUse}
								</p>
								{selected.url ? (
									<a
										href={selected.url}
										target="_blank"
										rel="noreferrer"
										className="mt-3 inline-block text-burgundy-200 underline-offset-4 hover:underline">
										Open external link
									</a>
								) : null}
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

