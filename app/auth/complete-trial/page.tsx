import { completeTrialSubmission } from '@/lib/workshop/complete-trial'

export default async function CompleteTrialPage({
	searchParams,
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const params = searchParams ? await searchParams : {}
	const pendingId =
		typeof params.pending === 'string' ? params.pending.trim() : ''
	await completeTrialSubmission(pendingId || undefined)
}
