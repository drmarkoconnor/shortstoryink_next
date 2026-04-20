import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { teacherTabs } from '@/lib/mock/teacher-prototype'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type SavedSnippetRow = {
	id: string
	snippet_text: string
	note: string | null
	source_submission_id: string | null
	source_author_id: string | null
	snippet_category_id: string | null
	created_at: string
}

type SnippetCategoryRow = {
	id: string
	name: string
	slug: string
}

type FeedbackCategoryRow = {
	id: string
	name: string
	slug: string
	tone: 'typo' | 'craft' | 'pacing' | 'structure'
}

function toMessage(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

function slugifyCategoryName(name: string) {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

export default async function TeacherStudioPage({
	searchParams,
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const profile = await requireTeacher()
	const supabase = await createServerSupabaseClient()
	const query = searchParams ? await searchParams : {}
	const activeCategoryFilter = toMessage(query.category)
	const notice = toMessage(query.notice)
	const errorNotice = toMessage(query.error)

	async function createCategoryAction(formData: FormData) {
		'use server'

		const teacher = await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const name = String(formData.get('name') ?? '').trim()
		const slug = slugifyCategoryName(name)

		if (!name || !slug) {
			redirect('/app/teacher-studio?error=Enter+a+category+name.')
		}

		const { error } = await serverSupabase.from('snippet_categories').insert({
			owner_id: teacher.user.id,
			name,
			slug,
		})

		if (error) {
			redirect('/app/teacher-studio?error=Unable+to+create+category.')
		}

		revalidatePath('/app/teacher-studio')
		redirect('/app/teacher-studio?notice=Category+created.')
	}

	async function renameCategoryAction(formData: FormData) {
		'use server'

		const teacher = await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const categoryId = String(formData.get('categoryId') ?? '').trim()
		const name = String(formData.get('name') ?? '').trim()
		const slug = slugifyCategoryName(name)

		if (!categoryId || !name || !slug) {
			redirect('/app/teacher-studio?error=Enter+a+valid+category+name.')
		}

		const { error } = await serverSupabase
			.from('snippet_categories')
			.update({ name, slug })
			.eq('id', categoryId)
			.eq('owner_id', teacher.user.id)

		if (error) {
			redirect('/app/teacher-studio?error=Unable+to+rename+category.')
		}

		revalidatePath('/app/teacher-studio')
		redirect('/app/teacher-studio?notice=Category+updated.')
	}

	async function deleteCategoryAction(formData: FormData) {
		'use server'

		const teacher = await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const categoryId = String(formData.get('categoryId') ?? '').trim()

		if (!categoryId) {
			redirect('/app/teacher-studio?error=Choose+a+category+to+delete.')
		}

		const { error } = await serverSupabase
			.from('snippet_categories')
			.delete()
			.eq('id', categoryId)
			.eq('owner_id', teacher.user.id)

		if (error) {
			redirect('/app/teacher-studio?error=Unable+to+delete+category.')
		}

		revalidatePath('/app/teacher-studio')
		redirect('/app/teacher-studio?notice=Category+deleted.')
	}

	async function createFeedbackCategoryAction(formData: FormData) {
		'use server'

		const teacher = await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const name = String(formData.get('name') ?? '').trim()
		const slug = slugifyCategoryName(name)
		const toneInput = String(formData.get('tone') ?? '').trim()
		const tone: 'typo' | 'craft' | 'pacing' | 'structure' =
			toneInput === 'typo' ||
			toneInput === 'craft' ||
			toneInput === 'pacing' ||
			toneInput === 'structure'
				? toneInput
				: 'craft'

		if (!name || !slug) {
			redirect('/app/teacher-studio?error=Enter+a+feedback+category+name.')
		}

		const { error } = await serverSupabase.from('feedback_categories').insert({
			owner_id: teacher.user.id,
			name,
			slug,
			tone,
		})

		if (error) {
			redirect('/app/teacher-studio?error=Unable+to+create+feedback+category.')
		}

		revalidatePath('/app/teacher-studio')
		redirect('/app/teacher-studio?notice=Feedback+category+created.')
	}

	async function updateFeedbackCategoryAction(formData: FormData) {
		'use server'

		const teacher = await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const categoryId = String(formData.get('categoryId') ?? '').trim()
		const name = String(formData.get('name') ?? '').trim()
		const slug = slugifyCategoryName(name)
		const toneInput = String(formData.get('tone') ?? '').trim()
		const tone: 'typo' | 'craft' | 'pacing' | 'structure' =
			toneInput === 'typo' ||
			toneInput === 'craft' ||
			toneInput === 'pacing' ||
			toneInput === 'structure'
				? toneInput
				: 'craft'

		if (!categoryId || !name || !slug) {
			redirect('/app/teacher-studio?error=Enter+a+valid+feedback+category.')
		}

		const { error } = await serverSupabase
			.from('feedback_categories')
			.update({ name, slug, tone })
			.eq('id', categoryId)
			.eq('owner_id', teacher.user.id)

		if (error) {
			redirect('/app/teacher-studio?error=Unable+to+update+feedback+category.')
		}

		revalidatePath('/app/teacher-studio')
		redirect('/app/teacher-studio?notice=Feedback+category+updated.')
	}

	async function deleteFeedbackCategoryAction(formData: FormData) {
		'use server'

		const teacher = await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const categoryId = String(formData.get('categoryId') ?? '').trim()

		if (!categoryId) {
			redirect('/app/teacher-studio?error=Choose+a+feedback+category+to+delete.')
		}

		const { error } = await serverSupabase
			.from('feedback_categories')
			.delete()
			.eq('id', categoryId)
			.eq('owner_id', teacher.user.id)

		if (error) {
			redirect('/app/teacher-studio?error=Unable+to+delete+feedback+category.')
		}

		revalidatePath('/app/teacher-studio')
		redirect('/app/teacher-studio?notice=Feedback+category+deleted.')
	}

	let snippetRows: SavedSnippetRow[] = []
	let categories: SnippetCategoryRow[] = []
	let feedbackCategories: FeedbackCategoryRow[] = []
	let loadError: string | null = null
	let categoryError: string | null = null
	let feedbackCategoryError: string | null = null

	const categoriesResult = await supabase
		.from('snippet_categories')
		.select('id, name, slug')
		.eq('owner_id', profile.user.id)
		.order('name', { ascending: true })

	if (categoriesResult.error) {
		categoryError = categoriesResult.error.message
	} else {
		categories = (categoriesResult.data ?? []) as SnippetCategoryRow[]
	}

	const feedbackCategoriesResult = await supabase
		.from('feedback_categories')
		.select('id, name, slug, tone')
		.eq('owner_id', profile.user.id)
		.order('name', { ascending: true })

	if (feedbackCategoriesResult.error) {
		feedbackCategoryError = feedbackCategoriesResult.error.message
	} else {
		feedbackCategories = (feedbackCategoriesResult.data ?? []) as FeedbackCategoryRow[]
	}

	const snippetsResult = await supabase
		.from('snippets')
		.select(
			'id, snippet_text, note, source_submission_id, source_author_id, snippet_category_id, created_at',
		)
		.eq('saved_by', profile.user.id)
		.order('created_at', { ascending: false })

	if (snippetsResult.error) {
		loadError = snippetsResult.error.message
	} else {
		snippetRows = (snippetsResult.data ?? []) as SavedSnippetRow[]
	}

	const filteredSnippets = snippetRows.filter((snippet) => {
		if (!activeCategoryFilter) {
			return true
		}
		if (activeCategoryFilter === 'uncategorised') {
			return !snippet.snippet_category_id
		}
		return snippet.snippet_category_id === activeCategoryFilter
	})

	const submissionIds = [
		...new Set(
			filteredSnippets
				.map((item) => item.source_submission_id)
				.filter((value): value is string => Boolean(value)),
		),
	]
	const authorIds = [
		...new Set(
			filteredSnippets
				.map((item) => item.source_author_id)
				.filter((value): value is string => Boolean(value)),
		),
	]

	let submissionTitleById: Record<string, string> = {}
	let authorNameById: Record<string, string> = {}
	const categoryNameById = Object.fromEntries(
		categories.map((category) => [category.id, category.name]),
	)

	if (!loadError && submissionIds.length > 0) {
		const submissionsLookup = await supabase
			.from('submissions')
			.select('id, title')
			.in('id', submissionIds)

		submissionTitleById = Object.fromEntries(
			(submissionsLookup.data ?? []).map((item) => [
				item.id as string,
				(item.title as string | null) ?? 'Untitled submission',
			]),
		)
	}

	if (!loadError && authorIds.length > 0) {
		const authorsLookup = await supabase
			.from('profiles')
			.select('id, display_name')
			.in('id', authorIds)

		authorNameById = Object.fromEntries(
			(authorsLookup.data ?? []).map((item) => [
				item.id as string,
				(item.display_name as string | null) ?? 'Writer',
			]),
		)
	}

	return (
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher-studio" />

			<div className="surface p-6 lg:p-8">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="max-w-[46rem]">
						<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
							Teacher Studio
						</p>
						<h1 className="literary-title mt-2 text-3xl text-parchment-100">
							Saved snippets
						</h1>
						<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
							Passages saved during close reading collect here as private
							teaching material. Use categories to shape the desk into reusable
							craft lenses rather than one long stack.
						</p>
					</div>
					<p className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.1em] text-silver-300">
						{snippetRows.length} saved
					</p>
				</div>
			</div>

			<div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
				<aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
					<div className="surface p-5">
						<div className="flex items-center justify-between gap-3">
							<h2 className="text-sm font-semibold text-parchment-100">
								Snippet categories
							</h2>
							<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
								{categories.length} total
							</p>
						</div>

						{notice ? (
							<p className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
								{notice}
							</p>
						) : null}
						{errorNotice ? (
							<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
								{errorNotice}
							</p>
						) : null}
						{categoryError ? (
							<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
								Unable to load categories: {categoryError}
							</p>
						) : (
							<>
								<form action={createCategoryAction} className="mt-4 space-y-2">
									<label className="text-xs uppercase tracking-[0.1em] text-silver-300">
										New category
									</label>
									<input
										type="text"
										name="name"
										required
										className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
										placeholder="Dialogue, character, image..."
									/>
									<button
										type="submit"
										className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30">
										Add category
									</button>
								</form>

								<div className="mt-5 flex flex-wrap gap-2">
									<Link
										href="/app/teacher-studio"
										className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.1em] transition ${
											!activeCategoryFilter
												? 'border-accent-300/60 bg-accent-400/15 text-parchment-100'
												: 'border-white/10 bg-white/5 text-silver-300 hover:text-parchment-100'
										}`}>
										All snippets
									</Link>
									<Link
										href="/app/teacher-studio?category=uncategorised"
										className={`inline-flex rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.1em] transition ${
											activeCategoryFilter === 'uncategorised'
												? 'border-accent-300/60 bg-accent-400/15 text-parchment-100'
												: 'border-white/10 bg-white/5 text-silver-300 hover:text-parchment-100'
										}`}>
										Uncategorised
									</Link>
								</div>

								{categories.length === 0 ? (
									<p className="mt-4 text-sm text-silver-300">
										No categories yet. Create a few craft lenses here, then use
										them while saving snippets from review.
									</p>
								) : (
									<ul className="mt-4 space-y-3">
										{categories.map((category) => (
											<li
												key={category.id}
												className="rounded-2xl border border-white/10 bg-ink-900/35 p-3">
												<Link
													href={`/app/teacher-studio?category=${category.id}`}
													className={`inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.1em] ${
														activeCategoryFilter === category.id
															? 'border-accent-300/60 bg-accent-400/15 text-parchment-100'
															: 'border-white/10 bg-white/5 text-silver-300 hover:text-parchment-100'
													}`}>
													{category.name}
												</Link>
												<form
													action={renameCategoryAction}
													className="mt-3 flex gap-2">
													<input
														type="hidden"
														name="categoryId"
														value={category.id}
													/>
													<input
														type="text"
														name="name"
														required
														defaultValue={category.name}
														className="min-w-0 flex-1 rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
													/>
													<button
														type="submit"
														className="rounded-full border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
														Rename
													</button>
												</form>
												<form action={deleteCategoryAction} className="mt-2">
													<input
														type="hidden"
														name="categoryId"
														value={category.id}
													/>
													<button
														type="submit"
														className="text-[11px] uppercase tracking-[0.1em] text-silver-400 transition hover:text-amber-100">
														Delete
													</button>
												</form>
											</li>
										))}
									</ul>
								)}
							</>
						)}
					</div>
					<div className="surface p-5">
						<div className="flex items-center justify-between gap-3">
							<h2 className="text-sm font-semibold text-parchment-100">
								Feedback categories
							</h2>
							<p className="text-xs uppercase tracking-[0.1em] text-silver-300">
								{feedbackCategories.length} total
							</p>
						</div>

						{feedbackCategoryError ? (
							<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
								Unable to load feedback categories: {feedbackCategoryError}
							</p>
						) : (
							<>
								<form
									action={createFeedbackCategoryAction}
									className="mt-4 space-y-2">
									<label className="text-xs uppercase tracking-[0.1em] text-silver-300">
										New feedback category
									</label>
									<input
										type="text"
										name="name"
										required
										className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
										placeholder="Dialogue, image, openings..."
									/>
									<select
										name="tone"
										defaultValue="craft"
										className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
										<option value="craft">Craft tone</option>
										<option value="typo">Typo / Grammar tone</option>
										<option value="pacing">Pacing tone</option>
										<option value="structure">Structure tone</option>
									</select>
									<button
										type="submit"
										className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs uppercase tracking-[0.1em] text-parchment-100 transition hover:bg-accent-400/30">
										Add feedback category
									</button>
								</form>

								{feedbackCategories.length === 0 ? (
									<p className="mt-4 text-sm text-silver-300">
										No feedback categories yet. Add your own craft lenses here,
										then use them while commenting in review.
									</p>
								) : (
									<ul className="mt-4 space-y-3">
										{feedbackCategories.map((category) => (
											<li
												key={category.id}
												className="rounded-2xl border border-white/10 bg-ink-900/35 p-3">
												<form
													action={updateFeedbackCategoryAction}
													className="space-y-2">
													<input
														type="hidden"
														name="categoryId"
														value={category.id}
													/>
													<input
														type="text"
														name="name"
														required
														defaultValue={category.name}
														className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100"
													/>
													<select
														name="tone"
														defaultValue={category.tone}
														className="w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-sm text-parchment-100">
														<option value="craft">Craft tone</option>
														<option value="typo">Typo / Grammar tone</option>
														<option value="pacing">Pacing tone</option>
														<option value="structure">Structure tone</option>
													</select>
													<div className="flex items-center gap-3">
														<button
															type="submit"
															className="rounded-full border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100">
															Update
														</button>
													</div>
												</form>
												<form action={deleteFeedbackCategoryAction} className="mt-2">
													<input
														type="hidden"
														name="categoryId"
														value={category.id}
													/>
													<button
														type="submit"
														className="text-[11px] uppercase tracking-[0.1em] text-silver-400 transition hover:text-amber-100">
														Delete
													</button>
												</form>
											</li>
										))}
									</ul>
								)}
							</>
						)}
					</div>
				</aside>

				<div className="surface p-6 lg:p-8">
					<div className="flex items-center justify-between gap-3">
						<h2 className="literary-title text-2xl text-parchment-100">
							Private snippet desk
						</h2>
						<p className="text-xs uppercase tracking-[0.11em] text-silver-300">
							{activeCategoryFilter
								? `${filteredSnippets.length} matching`
								: 'Newest first'}
						</p>
					</div>

					{loadError ? (
						<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
							Unable to load saved snippets: {loadError}
						</p>
					) : filteredSnippets.length === 0 ? (
						<p className="mt-4 text-sm text-silver-300">
							{activeCategoryFilter
								? 'No snippets match this category yet.'
								: 'No snippets saved yet. Save a passage from the review workspace to start building the desk.'}
						</p>
					) : (
						<ul className="mt-4 space-y-3">
							{filteredSnippets.map((snippet) => (
								<li
									key={snippet.id}
									className="rounded-2xl border border-white/10 bg-ink-900/35 p-4">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div className="space-y-2">
											<p className="font-serif text-lg italic leading-relaxed text-parchment-100">
												&ldquo;{snippet.snippet_text}&rdquo;
											</p>
											<p className="text-xs text-silver-300">
												{submissionTitleById[snippet.source_submission_id ?? ''] ??
													'Submission'}
												{' · '}
												{authorNameById[snippet.source_author_id ?? ''] ?? 'Writer'}
												{' · '}
												{new Date(snippet.created_at).toLocaleString()}
											</p>
											<p className="text-[11px] uppercase tracking-[0.1em] text-silver-300">
												{snippet.snippet_category_id
													? categoryNameById[snippet.snippet_category_id] ??
														'Category'
													: 'Uncategorised'}
											</p>
											{snippet.note ? (
												<p className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-sm leading-relaxed text-silver-100">
													{snippet.note}
												</p>
											) : null}
										</div>
										{snippet.source_submission_id ? (
											<Link
												href={`/app/workshop/${snippet.source_submission_id}`}
												className="text-xs uppercase tracking-[0.1em] text-accent-200 hover:text-accent-100">
												Open manuscript
											</Link>
										) : null}
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</section>
	)
}
