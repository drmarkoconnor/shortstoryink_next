import { completeTrialSubmission } from '@/lib/workshop/complete-trial'

export default async function CompleteTrialWithPathPage({
	params,
}: {
	params: Promise<{ pendingId: string }>
}) {
	const { pendingId } = await params
	await completeTrialSubmission(pendingId)
}