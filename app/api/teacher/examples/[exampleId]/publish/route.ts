import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ exampleId: string }> },
) {
	await requireTeacher()
	const { exampleId } = await params
	const payload = (await request.json()) as { status?: string }
	const nextStatus = payload.status === 'draft' ? 'draft' : 'published'
	const adminSupabase = createAdminSupabaseClient()

	const updateResult = await adminSupabase
		.from('teaching_examples')
		.update({
			status: nextStatus,
			published_at: nextStatus === 'published' ? new Date().toISOString() : null,
		})
		.eq('id', exampleId)
		.select('id, status')
		.single()

	if (updateResult.error || !updateResult.data) {
		return NextResponse.json(
			{ error: 'Unable to update publication.' },
			{ status: 500 },
		)
	}

	return NextResponse.json({
		status: updateResult.data.status,
		notice:
			nextStatus === 'published'
				? 'Example published to enabled groups.'
				: 'Example returned to draft.',
	})
}
