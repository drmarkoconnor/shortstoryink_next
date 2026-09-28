import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { createAdminDataClient } from '@/lib/data/client'

export default async function WriterResponsesPage({
	params,
}: {
	params: Promise<{ submissionId: string }>
}) {
	const profile = await requireWriter()
	const { submissionId } = await params
	const admin = createAdminDataClient()
	const { data: submission } = await admin
		.from('submissions')
		.select('id, title, author_id, version')
		.eq('id', submissionId)
		.maybeSingle()

	if (!submission || String(submission.author_id) !== profile.user.id) {
		redirect('/app/writer?error=Those+responses+are+not+available.')
	}

	const { data: responses } = await admin
		.from('reader_responses')
		.select('id, author_id, body, created_at, updated_at')
		.eq('submission_id', submissionId)
		.order('created_at', { ascending: true })

	const responderIds = [...new Set((responses ?? []).map((row) => String(row.author_id)))]
	const { data: profiles } = responderIds.length
		? await admin.from('profiles').select('id, display_name').in('id', responderIds)
		: { data: [] }
	const names = Object.fromEntries(
		(profiles ?? []).map((row) => [
			String(row.id),
			String(row.display_name ?? 'Writer'),
		]),
	)

	return (
		<section className="mx-auto max-w-[860px] space-y-7">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<header>
					<p className="studio-eyebrow">Responses from your group</p>
					<h1 className="studio-heading mt-3">{String(submission.title)}</h1>
					<p className="mt-3 text-sm text-studio-muted">
						Version {Number(submission.version ?? 1)} · {(responses ?? []).length} response{(responses ?? []).length === 1 ? '' : 's'}
					</p>
				</header>
				<div className="flex gap-2">
					<Link href={'/app/writer/sharing/' + submissionId} className="studio-secondary">Sharing</Link>
					<Link href="/app/writer" className="studio-secondary">Your writing</Link>
				</div>
			</div>

			{(responses ?? []).length === 0 ? (
				<div className="surface p-6">
					<p className="text-sm leading-6 text-studio-muted">
						No reader responses have arrived yet.
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{(responses ?? []).map((response) => (
						<article key={String(response.id)} className="surface p-6">
							<div className="flex flex-wrap items-baseline justify-between gap-3">
								<h2 className="literary-title text-2xl text-studio-ink">
									{names[String(response.author_id)] ?? 'Writer'}
								</h2>
								<p className="text-xs text-studio-muted">
									{new Date(String(response.updated_at ?? response.created_at)).toLocaleDateString('en-GB')}
								</p>
							</div>
							<p className="mt-4 whitespace-pre-wrap font-serif text-[1.02rem] leading-8 text-studio-ink">
								{String(response.body)}
							</p>
						</article>
					))}
				</div>
			)}
		</section>
	)
}
