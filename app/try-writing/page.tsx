import { redirect } from 'next/navigation'
import { TryWritingPanel } from '@/components/public/try-writing-panel'
import { sendTryWritingConfirmationEmail } from '@/lib/notifications/email'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

function toMessage(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

export default async function TryWritingPage({
	searchParams,
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const params = searchParams ? await searchParams : {}
	const notice = toMessage(params.notice)
	const errorNotice = toMessage(params.error)

	async function startTryWritingAction(formData: FormData) {
		'use server'

		const title = String(formData.get('title') ?? '').trim()
		const body = String(formData.get('body') ?? '')
		const email = String(formData.get('email') ?? '').trim().toLowerCase()

		if (!title || !body.trim() || !email) {
			redirect('/try-writing?error=Complete+the+draft+and+enter+your+email.')
		}

		const adminSupabase = createAdminSupabaseClient()
		const { data: pending, error: pendingError } = await adminSupabase
			.from('pending_try_submissions')
			.insert({
				title,
				body,
				email,
			})
			.select('id')
			.single()

		if (pendingError || !pending?.id) {
			redirect('/try-writing?error=Unable+to+save+your+trial+draft.')
		}

		try {
			await sendTryWritingConfirmationEmail({
				email,
				title,
				pendingId: pending.id as string,
			})
		} catch {
			redirect('/try-writing?error=Unable+to+send+confirmation+email+right+now.')
		}

		redirect(
			'/try-writing?notice=Check+your+email+to+confirm+and+send+your+draft+into+the+workshop.',
		)
	}

	return (
		<main className="mx-auto w-full max-w-4xl px-6 py-16">
			<section className="surface p-6 lg:p-8">
				<p className="text-xs uppercase tracking-[0.16em] text-accent-300">
					Try writing
				</p>
				<h1 className="literary-title mt-3 text-4xl text-parchment-100">
					Write first. Sign in later.
				</h1>
				<p className="muted mt-4 max-w-prose text-sm leading-relaxed">
					Draft freely in the manuscript view. When you are ready to send the
					piece into the workshop, confirm your email and we will place it in the
					teacher queue.
				</p>

				{notice ? (
					<p className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
						{notice}
					</p>
				) : null}
				{errorNotice ? (
					<p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
						{errorNotice}
					</p>
				) : null}

				<div className="mt-8">
					<TryWritingPanel action={startTryWritingAction} />
				</div>
			</section>
		</main>
	)
}