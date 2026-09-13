import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { createServerDataClient } from '@/lib/data/client'

function asAnchor(value: unknown) {
	return value && typeof value === 'object'
		? (value as Record<string, unknown>)
		: {}
}

/**
 * Remove a comment from the editor's reusable memory without deleting the
 * feedback itself. Published comments remain attached to the writer's
 * manuscript; we only add a private indexing flag to the existing anchor JSON.
 */
export async function DELETE(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const profile = await requireTeacher()
	const { id } = await context.params
	const dataClient = await createServerDataClient()

	const currentResult = await dataClient
		.from('feedback_items')
		.select('id, anchor')
		.eq('id', id)
		.eq('author_id', profile.user.id)
		.maybeSingle()

	if (currentResult.error) {
		return NextResponse.json(
			{ error: currentResult.error.message },
			{ status: 500 },
		)
	}

	if (!currentResult.data) {
		return NextResponse.json({ error: 'Comment not found.' }, { status: 404 })
	}

	const nextAnchor = {
		...asAnchor(currentResult.data.anchor),
		memoryHidden: true,
	}

	const updateResult = await dataClient
		.from('feedback_items')
		.update({ anchor: nextAnchor })
		.eq('id', id)
		.eq('author_id', profile.user.id)
		.select('id')
		.maybeSingle()

	if (updateResult.error || !updateResult.data) {
		return NextResponse.json(
			{ error: updateResult.error?.message ?? 'Unable to remove comment from memory.' },
			{ status: 500 },
		)
	}

	revalidatePath('/app/teacher/feedback-memory')
	return NextResponse.json({
		notice: 'Removed from reusable memory. Published feedback is unchanged.',
	})
}
