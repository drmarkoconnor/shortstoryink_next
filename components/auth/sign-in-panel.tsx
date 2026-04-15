'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export function SignInPanel({
	configError = false,
}: {
	configError?: boolean
}) {
	const [email, setEmail] = useState('')
	const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
		'idle',
	)

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setStatus('sending')

		const supabase = createBrowserSupabaseClient()
		const origin = window.location.origin

		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${origin}/auth/callback?next=/app`,
			},
		})

		setStatus(error ? 'error' : 'sent')
	}

	return (
		<section className="surface w-full p-8">
			<p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent-300">
				Authentication
			</p>
			<h1 className="literary-title text-3xl">Sign in to shortstory.ink</h1>
			<p className="muted mt-3 text-sm">
				Magic link authentication via Supabase.
			</p>
			{configError && (
				<p className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
					Environment is not configured. Add `NEXT_PUBLIC_SUPABASE_URL` and
					`NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`, then restart the dev
					server.
				</p>
			)}

			<form onSubmit={onSubmit} className="mt-8 space-y-4">
				<label className="block">
					<span className="mb-2 block text-sm text-silver-200">Email</span>
					<input
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						type="email"
						required
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-4 py-2.5 text-parchment-100 outline-none ring-accent-400 transition focus:ring"
						placeholder="you@example.com"
					/>
				</label>

				<button
					type="submit"
					disabled={status === 'sending'}
					className="rounded-full border border-accent-400/70 bg-accent-400/20 px-5 py-2.5 text-sm text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
					{status === 'sending' ? 'Sending link…' : 'Send magic link'}
				</button>

				{status === 'sent' && (
					<p className="text-sm text-silver-200">
						Check your email for the sign-in link.
					</p>
				)}
				{status === 'error' && (
					<p className="text-sm text-red-300">
						Unable to send sign-in link. Check configuration.
					</p>
				)}
			</form>
		</section>
	)
}

