import 'server-only'
import { createAdminDataClient } from '@/lib/data/client'
import { isRequestId } from '@/lib/drafts/recovery'

export async function saveWorkshopDraft(authorId: string, form: FormData, sourceId?: string) {
	const requestId = String(form.get('requestId') ?? '')
	if (!isRequestId(requestId)) return { error: 'Draft recovery is still preparing. Please try again.' } as const
	const title = String(form.get('title') ?? '').trim()
	const body = String(form.get('body') ?? '')
	if (!title || !body.trim()) return { error: 'Please complete the title and manuscript.' } as const
	const { data, error } = await createAdminDataClient().rpc('submit_workshop_draft', {
		p_author_id: authorId, p_request_id: requestId, p_title: title, p_body: body,
		p_workshop_id: sourceId ? null : String(form.get('workshopId') ?? '') || null,
		p_source_id: sourceId ?? null,
	})
	if (error || !data?.id) return { error: error?.code === '22023' || error?.code === '42501'
		? error.message : 'Saving is temporarily unavailable. Your draft has been kept; please try again shortly.' } as const
	return { id: String(data.id), version: Number(data.version), created: data.created === true }
}
