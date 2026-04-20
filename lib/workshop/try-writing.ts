import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function getOrCreateTryWritingWorkshopId() {
	const adminSupabase = createAdminSupabaseClient()

	const { data: existing, error: existingError } = await adminSupabase
		.from('workshops')
		.select('id')
		.eq('slug', 'try-writing')
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
			title: 'Try Writing',
			slug: 'try-writing',
		})
		.select('id')
		.single()

	if (createError || !created?.id) {
		throw new Error(createError?.message ?? 'Unable to create Try Writing workshop.')
	}

	return created.id as string
}