import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const ABU_WORKSHOP_SLUG = 'authorised-basic-user'
export const ABU_WORKSHOP_TITLE = 'Authorised Basic User'

export function isAbuWorkshopSlug(value: string | null | undefined) {
	return (value ?? '').trim().toLowerCase() === ABU_WORKSHOP_SLUG
}

export async function getOrCreateAbuWorkshopId() {
	const adminSupabase = createAdminSupabaseClient()

	const { data: existing, error: existingError } = await adminSupabase
		.from('workshops')
		.select('id')
		.eq('slug', ABU_WORKSHOP_SLUG)
		.maybeSingle()

	if (existingError) {
		throw new Error(existingError.message)
	}

	if (existing?.id) {
		return existing.id as string
	}

	const { data: created, error: createError } = await adminSupabase
		.from('workshops')
		.insert({
			title: ABU_WORKSHOP_TITLE,
			slug: ABU_WORKSHOP_SLUG,
		})
		.select('id')
		.single()

	if (createError || !created?.id) {
		throw new Error(
			createError?.message ?? 'Unable to create Authorised Basic User workshop.',
		)
	}

	return created.id as string
}

export async function ensureAbuMembership(profileId: string) {
	const adminSupabase = createAdminSupabaseClient()
	const workshopId = await getOrCreateAbuWorkshopId()

	const { error } = await adminSupabase.from('workshop_members').upsert(
		{
			workshop_id: workshopId,
			profile_id: profileId,
		},
		{
			onConflict: 'workshop_id,profile_id',
			ignoreDuplicates: true,
		},
	)

	if (error) {
		throw new Error(error.message)
	}

	return workshopId
}

export async function ensureAbuMembershipForAllProfiles() {
	const adminSupabase = createAdminSupabaseClient()
	const workshopId = await getOrCreateAbuWorkshopId()

	const { data: profiles, error: profileError } = await adminSupabase
		.from('profiles')
		.select('id')

	if (profileError) {
		throw new Error(profileError.message)
	}

	if (!profiles || profiles.length === 0) {
		return workshopId
	}

	const rows = profiles.map((profile) => ({
		workshop_id: workshopId,
		profile_id: profile.id as string,
	}))

	const { error } = await adminSupabase.from('workshop_members').upsert(rows, {
		onConflict: 'workshop_id,profile_id',
		ignoreDuplicates: true,
	})

	if (error) {
		throw new Error(error.message)
	}

	return workshopId
}
