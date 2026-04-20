import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { ProtoCard } from '@/components/prototype/card'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { teacherTabs } from '@/lib/mock/teacher-prototype'
import {
	ensureAbuMembership,
	ensureAbuMembershipForAllProfiles,
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
			redirect('/app/teacher?error=Group+title+is+required.')
		}

		const slug = `${slugify(title)}-${Date.now().toString().slice(-5)}`
		const { error } = await serverSupabase.from('workshops').insert({
			title,
			slug,
			created_by: profile.user.id,
		})

		if (error) {
			redirect('/app/teacher?error=Unable+to+create+group.')
		}

		revalidatePath('/app/teacher')
		redirect('/app/teacher?notice=Group+created.')
	}

	async function assignMembershipAction(formData: FormData) {
		'use server'

		await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const writerId = String(formData.get('writerId') ?? '').trim()
		const workshopId = String(formData.get('workshopId') ?? '').trim()

		if (!writerId || !workshopId) {
			redirect('/app/teacher?error=Select+writer+and+group.')
		}

		const { error } = await serverSupabase
			.from('workshop_members')
			.insert({ workshop_id: workshopId, profile_id: writerId })

		if (error && error.code !== '23505') {
			redirect('/app/teacher?error=Unable+to+add+user+to+group.')
		}

		revalidatePath('/app/teacher')
		revalidatePath('/app/writer')
		redirect('/app/teacher?notice=User+added+to+group.')
	}

	async function removeMembershipAction(formData: FormData) {
		'use server'

		await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const writerId = String(formData.get('writerId') ?? '').trim()
		const workshopId = String(formData.get('workshopId') ?? '').trim()
		const workshopSlug = String(formData.get('workshopSlug') ?? '').trim()

		if (!writerId || !workshopId) {
			redirect('/app/teacher?error=Missing+membership+to+remove.')
		}

		if (isAbuWorkshopSlug(workshopSlug)) {
			redirect('/app/teacher?error=ABU+membership+is+the+required+baseline+group.')
		}

		const { error } = await serverSupabase
			.from('workshop_members')
			.delete()
			.eq('profile_id', writerId)
			.eq('workshop_id', workshopId)

		if (error) {
			redirect('/app/teacher?error=Unable+to+remove+membership.')
		}

		try {
			await ensureAbuMembership(writerId)
		} catch (membershipError) {
			console.error('[TeacherPage] Failed to re-ensure ABU membership:', {
				writerId,
				membershipError,
			})
		}

		revalidatePath('/app/teacher')
		revalidatePath('/app/writer')
		redirect('/app/teacher?notice=Membership+removed.')
	}

	async function deleteUserAction(formData: FormData) {
		'use server'

		const actingProfile = await requireTeacher()
		const userId = String(formData.get('userId') ?? '').trim()

		if (!userId) {
			redirect('/app/teacher?error=Missing+user+to+delete.')
		}

		if (userId === actingProfile.user.id) {
			redirect('/app/teacher?error=You+cannot+delete+your+own+account+from+here.')
		}

		const adminSupabase = createAdminSupabaseClient()
		const { data: targetProfile, error: targetError } = await adminSupabase
			.from('profiles')
			.select('role')
			.eq('id', userId)
			.maybeSingle()

		if (targetError || !targetProfile?.role) {
			redirect('/app/teacher?error=Unable+to+load+that+user+for+deletion.')
		}

		if (targetProfile.role !== 'writer') {
			redirect(
				'/app/teacher?error=Only+writer+accounts+can+be+deleted+from+this+screen.',
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
			redirect('/app/teacher?error=Unable+to+delete+that+user%27s+submissions.')
		}

		if (modernDeleteResult.error) {
			const legacyDeleteResult = await adminSupabase
				.from('submissions')
				.delete()
				.eq('writer_id', userId)

			if (legacyDeleteResult.error) {
				redirect('/app/teacher?error=Unable+to+delete+that+user%27s+legacy+submissions.')
			}
		}

		await adminSupabase.from('workshop_members').delete().eq('profile_id', userId)
		await adminSupabase.from('profiles').delete().eq('id', userId)

		const { error: deleteUserError } =
			await adminSupabase.auth.admin.deleteUser(userId)

		if (deleteUserError) {
			redirect('/app/teacher?error=Unable+to+delete+the+user+account.')
		}

		revalidatePath('/app/teacher')
		revalidatePath('/app/writer')
		revalidatePath('/app/teacher/review-desk')
		revalidatePath('/app/teacher/archive')
		redirect('/app/teacher?notice=User+deleted.')
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
	const abuWorkshop = workshops.find((workshop) =>
		isAbuWorkshopSlug(workshop.slug),
	)
	const assignableWorkshops = workshops.filter(
		(workshop) => !isAbuWorkshopSlug(workshop.slug),
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

	const { count: awaitingCount } = await supabase
		.from('submissions')
		.select('id', { count: 'exact', head: true })
		.eq('status', 'submitted')

	const { count: inReviewCount } = await supabase
		.from('submissions')
		.select('id', { count: 'exact', head: true })
		.eq('status', 'in_review')

	const { count: publishedCount } = await supabase
		.from('submissions')
		.select('id', { count: 'exact', head: true })
		.eq('status', 'feedback_published')

	return (
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher" />

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

			<div className="surface p-6 lg:p-8">
				<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
					Teacher home
				</p>
				<h1 className="literary-title mt-2 text-3xl text-parchment-100">
					Group and review oversight
				</h1>
				<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
					Use Review for live draft reading and published feedback. Groups handle
					access and membership, while Teacher Studio remains the preparation
					space for reusable teaching material.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<ProtoCard title={String(awaitingCount ?? 0)} meta="Awaiting reply">
					Submitted pieces still waiting for a first teacher response.
				</ProtoCard>
				<ProtoCard title={String(inReviewCount ?? 0)} meta="In review">
					Drafts with comments underway but not yet published back to the
					writer.
				</ProtoCard>
				<ProtoCard title={String(publishedCount ?? 0)} meta="Published">
					Pieces already returned to writers with inline feedback.
				</ProtoCard>
				<ProtoCard title={String(assignableWorkshops.length)} meta="Groups">
					Active groups currently available for assignment.
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
				</div>

				<div className="mt-6 space-y-3">
					{writersWithMemberships.length === 0 ? (
						<p className="text-sm text-silver-300">No writer accounts found.</p>
					) : (
						writersWithMemberships.map((writer) => (
							<div
								key={writer.id}
								className="rounded-2xl border border-white/10 bg-ink-900/35 p-4">
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div>
										<p className="text-sm font-medium text-parchment-100">
											{displayUserLabel(writer)}
										</p>
										<p className="mt-1 text-xs uppercase tracking-[0.1em] text-silver-300">
											{writer.role}
										</p>
									</div>
									<form action={deleteUserAction}>
										<input type="hidden" name="userId" value={writer.id} />
										<button
											type="submit"
											className="rounded-full border border-rose-300/50 bg-rose-300/10 px-3 py-1.5 text-xs uppercase tracking-[0.09em] text-rose-100 transition hover:bg-rose-300/20">
											Delete user
										</button>
									</form>
								</div>

								<div className="mt-4 flex flex-wrap gap-2">
									{writer.memberships.length === 0 ? (
										<p className="text-xs text-silver-300">
											No group memberships found.
										</p>
									) : (
										writer.memberships.map((workshop) => {
											const isBaseline = isAbuWorkshopSlug(workshop.slug)
											return (
												<div
													key={`${writer.id}-${workshop.id}`}
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
																value={writer.id}
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
						))
					)}
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Link
					className="surface p-5 transition hover:border-burgundy-300/60"
					href="/app/teacher/review-desk">
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						Review
					</p>
					<h2 className="literary-title mt-2 text-2xl">Review desk</h2>
					<p className="muted mt-2 text-sm">
						Open the live queue, read closely, and publish feedback back to
						writers.
					</p>
					<p className="mt-3 text-xs text-silver-300">
						{awaitingCount ?? 0} awaiting {' · '} {inReviewCount ?? 0} in review
					</p>
				</Link>
				<Link
					className="surface p-5 transition hover:border-burgundy-300/60"
					href="/app/teacher/archive">
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						Archive
					</p>
					<h2 className="literary-title mt-2 text-2xl">Published feedback</h2>
					<p className="muted mt-2 text-sm">
						Review what has already been returned and reopen any piece when
						needed.
					</p>
					<p className="mt-3 text-xs text-silver-300">
						{publishedCount ?? 0} published pieces
					</p>
				</Link>
				<Link
					className="surface p-5 transition hover:border-burgundy-300/60"
					href="/app/teacher-studio">
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						Teacher Studio
					</p>
					<h2 className="literary-title mt-2 text-2xl">
						Preparation workspace
					</h2>
					<p className="muted mt-2 text-sm">
						The next build area for handouts, exercises, snippets, and reusable
						teaching material.
					</p>
				</Link>
			</div>
		</section>
	)
}
