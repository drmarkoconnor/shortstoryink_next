import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { ProtoCard } from '@/components/prototype/card'
import { WriterAccessSelect } from '@/components/teacher/writer-access-select'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { teacherTabs } from '@/lib/mock/teacher-prototype'
import {
	ABU_WORKSHOP_TITLE,
	ensureAbuMembership,
	ensureAbuMembershipForAllProfiles,
	getOrCreateAbuWorkshopId,
	isAbuWorkshopSlug,
} from '@/lib/workshop/access-groups'

type TeacherProfile = {
	id: string
	display_name: string | null
	role: 'writer' | 'teacher' | 'admin'
}

type Workshop = {
	id: string
	title: string
	slug: string | null
}

type WorkshopMembershipRow = {
	profile_id: string
	workshop_id: string
}

type WriterWithMemberships = TeacherProfile & {
	memberships: Workshop[]
}

function toMessage(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

function slugify(input: string) {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
}

function displayUserLabel(profile: TeacherProfile) {
	return profile.display_name?.trim() || profile.id
}

function isProtectedWorkshop(workshop: Pick<Workshop, 'slug' | 'title'>) {
	return (
		isAbuWorkshopSlug(workshop.slug) ||
		workshop.title.trim().toLowerCase() === ABU_WORKSHOP_TITLE.toLowerCase()
	)
}

export default async function TeacherPage({
	searchParams,
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	await requireTeacher()
	const supabase = await createServerSupabaseClient()
	const params = searchParams ? await searchParams : {}
	const notice = toMessage(params.notice)
	const errorNotice = toMessage(params.error)
	const selectedWriterIdParam = toMessage(params.writer)

	try {
		await ensureAbuMembershipForAllProfiles()
	} catch (membershipError) {
		console.error('[TeacherPage] Failed to backfill ABU memberships:', membershipError)
	}

		async function createWorkshopAction(formData: FormData) {
			'use server'

		const profile = await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const title = String(formData.get('title') ?? '').trim()

		if (!title) {
			redirect('/app/teacher/groups?error=Group+title+is+required.')
		}

		const slug = `${slugify(title)}-${Date.now().toString().slice(-5)}`
		const { error } = await serverSupabase.from('workshops').insert({
			title,
			slug,
			created_by: profile.user.id,
		})

		if (error) {
			redirect('/app/teacher/groups?error=Unable+to+create+group.')
		}

			revalidatePath('/app/teacher/groups')
			redirect('/app/teacher/groups?notice=Group+created.')
		}

		async function updateWorkshopAction(formData: FormData) {
			'use server'

			await requireTeacher()
			const serverSupabase = await createServerSupabaseClient()
			const workshopId = String(formData.get('workshopId') ?? '').trim()
			const workshopSlug = String(formData.get('workshopSlug') ?? '').trim()
			const currentTitle = String(formData.get('currentTitle') ?? '').trim()
			const title = String(formData.get('title') ?? '').trim()

			if (!workshopId || !title) {
				redirect('/app/teacher/groups?error=Choose+a+group+and+enter+a+title.')
			}

			if (isProtectedWorkshop({ slug: workshopSlug, title: currentTitle })) {
				redirect('/app/teacher/groups?error=ABU+is+the+protected+baseline+group.')
			}

			const { error } = await serverSupabase
				.from('workshops')
				.update({ title })
				.eq('id', workshopId)

			if (error) {
				redirect('/app/teacher/groups?error=Unable+to+update+group.')
			}

			revalidatePath('/app/teacher/groups')
			revalidatePath('/app/teacher/documents')
			revalidatePath('/app/writer')
			redirect('/app/teacher/groups?notice=Group+updated.')
		}

		async function deleteWorkshopAction(formData: FormData) {
			'use server'

			await requireTeacher()
			const workshopId = String(formData.get('workshopId') ?? '').trim()
			const workshopSlug = String(formData.get('workshopSlug') ?? '').trim()
			const title = String(formData.get('title') ?? '').trim()

			if (!workshopId) {
				redirect('/app/teacher/groups?error=Choose+a+group+to+delete.')
			}

			if (isProtectedWorkshop({ slug: workshopSlug, title })) {
				redirect('/app/teacher/groups?error=ABU+cannot+be+deleted.')
			}

			const abuWorkshopId = await getOrCreateAbuWorkshopId()

			if (workshopId === abuWorkshopId) {
				redirect('/app/teacher/groups?error=ABU+cannot+be+deleted.')
			}

			const adminSupabase = createAdminSupabaseClient()
			const { error: moveSubmissionsError } = await adminSupabase
				.from('submissions')
				.update({ workshop_id: abuWorkshopId })
				.eq('workshop_id', workshopId)

			if (moveSubmissionsError) {
				redirect('/app/teacher/groups?error=Unable+to+move+linked+submissions+back+to+ABU.')
			}

			const { error } = await adminSupabase
				.from('workshops')
				.delete()
				.eq('id', workshopId)

			if (error) {
				redirect('/app/teacher/groups?error=Unable+to+delete+group.')
			}

			revalidatePath('/app/teacher/groups')
			revalidatePath('/app/teacher/documents')
			revalidatePath('/app/teacher/review-desk')
			revalidatePath('/app/teacher/archive')
			revalidatePath('/app/writer')
			redirect('/app/teacher/groups?notice=Group+deleted.+Linked+submissions+moved+to+ABU.')
		}

		async function assignMembershipAction(formData: FormData) {
		'use server'

		await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const writerId = String(formData.get('writerId') ?? '').trim()
		const workshopId = String(formData.get('workshopId') ?? '').trim()

		if (!writerId || !workshopId) {
			redirect('/app/teacher/groups?error=Select+writer+and+group.')
		}

		const { error } = await serverSupabase
			.from('workshop_members')
			.insert({ workshop_id: workshopId, profile_id: writerId })

		if (error && error.code !== '23505') {
			redirect('/app/teacher/groups?error=Unable+to+add+user+to+group.')
		}

		revalidatePath('/app/teacher/groups')
		revalidatePath('/app/writer')
		redirect('/app/teacher/groups?notice=User+added+to+group.')
	}

	async function removeMembershipAction(formData: FormData) {
		'use server'

		await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const writerId = String(formData.get('writerId') ?? '').trim()
		const workshopId = String(formData.get('workshopId') ?? '').trim()
		const workshopSlug = String(formData.get('workshopSlug') ?? '').trim()

		if (!writerId || !workshopId) {
			redirect('/app/teacher/groups?error=Missing+membership+to+remove.')
		}

		if (isAbuWorkshopSlug(workshopSlug)) {
			redirect('/app/teacher/groups?error=ABU+membership+is+the+required+baseline+group.')
		}

		const { error } = await serverSupabase
			.from('workshop_members')
			.delete()
			.eq('profile_id', writerId)
			.eq('workshop_id', workshopId)

		if (error) {
			redirect('/app/teacher/groups?error=Unable+to+remove+membership.')
		}

		try {
			await ensureAbuMembership(writerId)
		} catch (membershipError) {
			console.error('[TeacherPage] Failed to re-ensure ABU membership:', {
				writerId,
				membershipError,
			})
		}

		revalidatePath('/app/teacher/groups')
		revalidatePath('/app/writer')
		redirect('/app/teacher/groups?notice=Membership+removed.')
	}

	async function deleteUserAction(formData: FormData) {
		'use server'

		const actingProfile = await requireTeacher()
		const userId = String(formData.get('userId') ?? '').trim()

		if (!userId) {
			redirect('/app/teacher/groups?error=Missing+user+to+delete.')
		}

		if (userId === actingProfile.user.id) {
			redirect('/app/teacher/groups?error=You+cannot+delete+your+own+account+from+here.')
		}

		const adminSupabase = createAdminSupabaseClient()
		const { data: targetProfile, error: targetError } = await adminSupabase
			.from('profiles')
			.select('role')
			.eq('id', userId)
			.maybeSingle()

		if (targetError || !targetProfile?.role) {
			redirect('/app/teacher/groups?error=Unable+to+load+that+user+for+deletion.')
		}

		if (targetProfile.role !== 'writer') {
			redirect(
				'/app/teacher/groups?error=Only+writer+accounts+can+be+deleted+from+this+screen.',
			)
		}

		const modernDeleteResult = await adminSupabase
			.from('submissions')
			.delete()
			.eq('author_id', userId)

		if (
			modernDeleteResult.error &&
			!modernDeleteResult.error.message.toLowerCase().includes('does not exist') &&
			!modernDeleteResult.error.message.toLowerCase().includes('schema cache')
		) {
			redirect('/app/teacher/groups?error=Unable+to+delete+that+user%27s+submissions.')
		}

		if (modernDeleteResult.error) {
			const legacyDeleteResult = await adminSupabase
				.from('submissions')
				.delete()
				.eq('writer_id', userId)

			if (legacyDeleteResult.error) {
				redirect('/app/teacher/groups?error=Unable+to+delete+that+user%27s+legacy+submissions.')
			}
		}

		await adminSupabase.from('workshop_members').delete().eq('profile_id', userId)
		await adminSupabase.from('profiles').delete().eq('id', userId)

		const { error: deleteUserError } =
			await adminSupabase.auth.admin.deleteUser(userId)

		if (deleteUserError) {
			redirect('/app/teacher/groups?error=Unable+to+delete+the+user+account.')
		}

		revalidatePath('/app/teacher/groups')
		revalidatePath('/app/writer')
		revalidatePath('/app/teacher/review-desk')
		revalidatePath('/app/teacher/archive')
		redirect('/app/teacher/groups?notice=User+deleted.')
	}

	const { data: profileRows } = await supabase
		.from('profiles')
		.select('id, display_name, role')
		.order('display_name', { ascending: true })

	const { data: workshopRows } = await supabase
		.from('workshops')
		.select('id, title, slug')
		.order('title', { ascending: true })

	const profiles = (profileRows ?? []) as TeacherProfile[]
	const writers = profiles.filter((profile) => profile.role === 'writer')
	const workshops = (workshopRows ?? []) as Workshop[]
	const abuWorkshop = workshops.find((workshop) => isProtectedWorkshop(workshop))
	const assignableWorkshops = workshops.filter(
		(workshop) => !isProtectedWorkshop(workshop),
	)

	const { data: membershipRows } = await supabase
		.from('workshop_members')
		.select('profile_id, workshop_id')

	const memberships = (membershipRows ?? []) as WorkshopMembershipRow[]
	const workshopsById = Object.fromEntries(
		workshops.map((workshop) => [workshop.id, workshop]),
	)
	const membershipsByProfileId = memberships.reduce(
		(acc, membership) => {
			if (!acc[membership.profile_id]) {
				acc[membership.profile_id] = []
			}

			const workshop = workshopsById[membership.workshop_id]
			if (workshop) {
				acc[membership.profile_id].push(workshop)
			}

			return acc
		},
		{} as Record<string, Workshop[]>,
	)
	const writersWithMemberships: WriterWithMemberships[] = writers.map((writer) => ({
		...writer,
		memberships: (membershipsByProfileId[writer.id] ?? []).sort((a, b) =>
			a.title.localeCompare(b.title),
		),
	}))
	// TODO: Future: support assigned teacher per writer/student.
	const selectedWriter =
		writersWithMemberships.find((writer) => writer.id === selectedWriterIdParam) ??
		writersWithMemberships[0] ??
		null

	return (
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher/groups" />

			{notice && (
				<p className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
					{notice}
				</p>
			)}
			{errorNotice && (
				<p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
					{errorNotice}
				</p>
			)}

				<div className="surface p-5 lg:p-6">
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						Groups
					</p>
					<h1 className="literary-title mt-2 text-3xl text-parchment-100">
						Group access
					</h1>
					<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
						Create groups, assign writers, and manage access without leaving the
						teacher workflow.
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<ProtoCard title={String(writers.length)} meta="Writers">
						Writer accounts available for group assignment.
					</ProtoCard>
					<ProtoCard title={String(workshops.length)} meta="Total groups">
						All access groups including the protected baseline group.
					</ProtoCard>
					<ProtoCard title={String(assignableWorkshops.length)} meta="Assignable">
						Groups that can be manually assigned to writers.
					</ProtoCard>
					<ProtoCard title={String(memberships.length)} meta="Memberships">
						Current writer-to-group relationships.
					</ProtoCard>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<ProtoCard title="Create group" meta="Setup tool">
					<form action={createWorkshopAction} className="space-y-2">
						<input
							name="title"
							required
							className="w-full rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100"
							placeholder="Group title"
						/>
						<button
							type="submit"
							className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs text-parchment-100 transition hover:bg-accent-400/30">
							Create group
						</button>
					</form>
				</ProtoCard>

				<ProtoCard title="Add user to group" meta="Setup tool">
					<form action={assignMembershipAction} className="space-y-2">
						<select
							name="writerId"
							required
							className="w-full rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100">
							<option value="">Select writer</option>
							{writers.map((writer) => (
								<option key={writer.id} value={writer.id}>
									{displayUserLabel(writer)}
								</option>
							))}
						</select>
						<select
							name="workshopId"
							required
							className="w-full rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100">
							<option value="">Select group</option>
							{assignableWorkshops.map((workshop) => (
								<option key={workshop.id} value={workshop.id}>
									{workshop.title}
								</option>
							))}
						</select>
						<button
							type="submit"
							className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs text-parchment-100 transition hover:bg-accent-400/30">
							Add user to group
						</button>
					</form>
					</ProtoCard>
				</div>

				<ProtoCard title="Manage groups" meta="Group CRUD">
					<div className="space-y-3">
						{workshops.length === 0 ? (
							<p className="text-sm text-silver-300">No groups found.</p>
						) : (
							workshops.map((workshop) => {
								const isProtected = isProtectedWorkshop(workshop)
								return (
									<div
										key={workshop.id}
										className="grid gap-2 rounded-xl border border-white/10 bg-ink-900/35 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
										<form
											action={updateWorkshopAction}
											className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
											<input
												type="hidden"
												name="workshopId"
												value={workshop.id}
											/>
											<input
												type="hidden"
												name="workshopSlug"
												value={workshop.slug ?? ''}
											/>
											<input
												type="hidden"
												name="currentTitle"
												value={workshop.title}
											/>
											<input
												name="title"
												defaultValue={workshop.title}
												disabled={isProtected}
												className="w-full rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100 disabled:opacity-70"
											/>
											<button
												type="submit"
												disabled={isProtected}
												className="rounded-full border border-white/15 px-3 py-2 text-xs uppercase tracking-[0.09em] text-silver-200 transition hover:border-white/25 hover:text-parchment-100 disabled:cursor-not-allowed disabled:opacity-50">
												Update
											</button>
										</form>
										<div className="flex items-center gap-2 lg:justify-end">
											{isProtected ? (
												<span className="rounded-full border border-emerald-300/35 bg-emerald-300/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.09em] text-emerald-100">
													Protected
												</span>
											) : (
												<form action={deleteWorkshopAction}>
													<input
														type="hidden"
														name="workshopId"
														value={workshop.id}
													/>
													<input
														type="hidden"
														name="workshopSlug"
														value={workshop.slug ?? ''}
													/>
													<input
														type="hidden"
														name="title"
														value={workshop.title}
													/>
													<button
														type="submit"
														className="rounded-full border border-rose-300/45 bg-rose-300/10 px-3 py-2 text-xs uppercase tracking-[0.09em] text-rose-100 transition hover:bg-rose-300/20">
														Delete
													</button>
												</form>
											)}
										</div>
									</div>
								)
							})
						)}
					</div>
				</ProtoCard>

				<div className="surface p-6 lg:p-8">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
							User access
						</p>
						<h2 className="literary-title mt-2 text-2xl text-parchment-100">
							Baseline access and extra groups
						</h2>
						<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
							Every user keeps ABU as their default baseline group, so teachers
							do not need to manually unlock first access. Additional groups can
							be added or removed here.
						</p>
						{abuWorkshop ? (
							<p className="mt-3 text-xs text-silver-300">
								Baseline group: {abuWorkshop.title}
							</p>
						) : null}
					</div>
					<WriterAccessSelect
						selectedId={selectedWriter?.id ?? ''}
						options={writersWithMemberships.map((writer) => ({
							id: writer.id,
							label: displayUserLabel(writer),
						}))}
					/>
				</div>

				<div className="mt-6 space-y-3">
					{writersWithMemberships.length === 0 ? (
						<p className="text-sm text-silver-300">No writer accounts found.</p>
					) : (
						selectedWriter ? (
							<div
								key={selectedWriter.id}
								className="rounded-2xl border border-white/10 bg-ink-900/35 p-4">
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div>
										<p className="text-sm font-medium text-parchment-100">
											{displayUserLabel(selectedWriter)}
										</p>
										<p className="mt-1 text-xs uppercase tracking-[0.1em] text-silver-300">
											{selectedWriter.role}
										</p>
									</div>
									<form action={deleteUserAction}>
										<input
											type="hidden"
											name="userId"
											value={selectedWriter.id}
										/>
										<button
											type="submit"
											className="rounded-full border border-rose-300/50 bg-rose-300/10 px-3 py-1.5 text-xs uppercase tracking-[0.09em] text-rose-100 transition hover:bg-rose-300/20">
											Delete user
										</button>
									</form>
								</div>

								<div className="mt-4 flex flex-wrap gap-2">
									{selectedWriter.memberships.length === 0 ? (
										<p className="text-xs text-silver-300">
											No group memberships found.
										</p>
									) : (
										selectedWriter.memberships.map((workshop) => {
											const isBaseline = isAbuWorkshopSlug(workshop.slug)
											return (
												<div
													key={`${selectedWriter.id}-${workshop.id}`}
													className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
														isBaseline
															? 'border-emerald-300/35 bg-emerald-300/10 text-emerald-100'
															: 'border-white/10 bg-white/5 text-silver-200'
													}`}>
													<span>{workshop.title}</span>
													{isBaseline ? (
														<span className="uppercase tracking-[0.09em] text-emerald-200/80">
															locked
														</span>
													) : (
														<form action={removeMembershipAction}>
															<input
																type="hidden"
																name="writerId"
																value={selectedWriter.id}
															/>
															<input
																type="hidden"
																name="workshopId"
																value={workshop.id}
															/>
															<input
																type="hidden"
																name="workshopSlug"
																value={workshop.slug ?? ''}
															/>
															<button
																type="submit"
																className="text-silver-300 transition hover:text-parchment-100">
																Remove
															</button>
														</form>
													)}
												</div>
											)
										})
									)}
								</div>
							</div>
						) : null
					)}
				</div>
			</div>

			</section>
		)
	}
