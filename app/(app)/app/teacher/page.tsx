import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { ProtoCard } from '@/components/prototype/card'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { teacherTabs } from '@/lib/mock/teacher-prototype'

type TeacherProfile = {
	id: string
	display_name: string | null
	role: 'writer' | 'teacher'
}

type Workshop = {
	id: string
	title: string
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

	async function createWorkshopAction(formData: FormData) {
		'use server'

		const profile = await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const title = String(formData.get('title') ?? '').trim()

		if (!title) {
			redirect('/app/teacher?error=Workshop+title+is+required.')
		}

		const slug = `${slugify(title)}-${Date.now().toString().slice(-5)}`
		const { error } = await serverSupabase.from('workshops').insert({
			title,
			slug,
			created_by: profile.user.id,
		})

		if (error) {
			redirect('/app/teacher?error=Unable+to+create+workshop.')
		}

		revalidatePath('/app/teacher')
		redirect('/app/teacher?notice=Workshop+created.')
	}

	async function assignMembershipAction(formData: FormData) {
		'use server'

		await requireTeacher()
		const serverSupabase = await createServerSupabaseClient()
		const writerId = String(formData.get('writerId') ?? '').trim()
		const workshopId = String(formData.get('workshopId') ?? '').trim()

		if (!writerId || !workshopId) {
			redirect('/app/teacher?error=Select+writer+and+workshop.')
		}

		const { error } = await serverSupabase
			.from('workshop_members')
			.insert({ workshop_id: workshopId, profile_id: writerId })

		if (error && error.code !== '23505') {
			redirect('/app/teacher?error=Unable+to+assign+membership.')
		}

		revalidatePath('/app/teacher')
		revalidatePath('/app/writer')
		redirect('/app/teacher?notice=Writer+assigned+to+workshop.')
	}

	const { data: profileRows } = await supabase
		.from('profiles')
		.select('id, display_name, role')
		.order('display_name', { ascending: true })

	const { data: workshopRows } = await supabase
		.from('workshops')
		.select('id, title')
		.order('title', { ascending: true })

	const profiles = (profileRows ?? []) as TeacherProfile[]
	const writers = profiles.filter((profile) => profile.role === 'writer')
	const workshops = (workshopRows ?? []) as Workshop[]

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
					Workshop oversight
				</h1>
				<p className="muted mt-3 max-w-prose text-sm leading-relaxed">
					Use Workshop for live review and published feedback. Teacher Studio
					remains the separate preparation space for reusable teaching material.
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
				<ProtoCard title={String(workshops.length)} meta="Workshops">
					Active workshop spaces currently available for assignment.
				</ProtoCard>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<ProtoCard title="Create workshop" meta="Setup tool">
					<form action={createWorkshopAction} className="space-y-2">
						<input
							name="title"
							required
							className="w-full rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100"
							placeholder="Workshop title"
						/>
						<button
							type="submit"
							className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs text-parchment-100 transition hover:bg-accent-400/30">
							Create workshop
						</button>
					</form>
				</ProtoCard>

				<ProtoCard title="Assign writer membership" meta="Setup tool">
					<form action={assignMembershipAction} className="space-y-2">
						<select
							name="writerId"
							required
							className="w-full rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100">
							<option value="">Select writer</option>
							{writers.map((writer) => (
								<option key={writer.id} value={writer.id}>
									{writer.display_name ?? writer.id}
								</option>
							))}
						</select>
						<select
							name="workshopId"
							required
							className="w-full rounded-xl border border-white/15 bg-ink-900/50 px-3 py-2 text-sm text-parchment-100">
							<option value="">Select workshop</option>
							{workshops.map((workshop) => (
								<option key={workshop.id} value={workshop.id}>
									{workshop.title}
								</option>
							))}
						</select>
						<button
							type="submit"
							className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-xs text-parchment-100 transition hover:bg-accent-400/30">
							Assign membership
						</button>
					</form>
				</ProtoCard>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Link
					className="surface p-5 transition hover:border-burgundy-300/60"
					href="/app/teacher/review-desk">
					<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
						Workshop
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

