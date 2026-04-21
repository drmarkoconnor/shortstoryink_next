'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { buildClientAuthCallbackUrl } from '@/lib/site/client-urls'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export function SignInPanel({
	configError = false,
}: {
	configError?: boolean
}) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [status, setStatus] = useState<
		'idle' | 'signing-in' | 'resetting' | 'reset-sent' | 'error'
	>('idle')
	const [message, setMessage] = useState<string | null>(null)
	const [showReset, setShowReset] = useState(false)
	const sendPasswordReset = async () => {
	       if (!email.trim()) {
		       setStatus('error')
		       setMessage('Enter your email to reset your password.')
		       return
	       }
	       setStatus('resetting')
	       setMessage(null)
	       const supabase = createBrowserSupabaseClient()
	       const { error } = await supabase.auth.resetPasswordForEmail(email, {
		       redirectTo: buildClientAuthCallbackUrl('/app/account'),
	       })

		       if (error) {
			       setStatus('error')
			       if (
				       error.message &&
				       error.message.toLowerCase().includes('email not confirmed')
			       ) {
				       setMessage('Your email is not confirmed. Please check your inbox for the confirmation link, then try signing in again.')
			       } else {
				       setMessage(error.message)
			       }
			       return
		       }
	       setStatus('reset-sent')
	       setMessage('Password reset email sent. Check your inbox.')
	}



	const onPasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setStatus('signing-in')
		setMessage(null)

		const supabase = createBrowserSupabaseClient()
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		})

		if (error) {
			setStatus('error')
			if (error.message.toLowerCase().includes('email not confirmed')) {
				setMessage(
					'Your email is not confirmed yet. Please open the confirmation email, then sign in again.',
				)
			} else {
				setMessage(error.message)
			}
			return
		}

		window.location.assign('/app')
	}


	return (
		<section className="surface w-full p-8">
			<p className="mb-3 text-xs uppercase tracking-[0.16em] text-accent-300">
				Authentication
			</p>
			<h1 className="literary-title text-3xl">Sign in to shortstory.ink</h1>
			<p className="muted mt-3 text-sm">
				Sign in with your email and password.
			</p>
			{configError && (
				<p className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
					Environment is not configured. Add `NEXT_PUBLIC_SUPABASE_URL` and
					`NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`, then restart the dev
					server.
				</p>
			)}

			<form onSubmit={onPasswordSubmit} className="mt-8 space-y-4">
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

				{!showReset && (
					<label className="block">
						<span className="mb-2 block text-sm text-silver-200">Password</span>
						<input
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							type="password"
							required
							className="w-full rounded-xl border border-white/15 bg-ink-900 px-4 py-2.5 text-parchment-100 outline-none ring-accent-400 transition focus:ring"
							placeholder="Your password"
						/>
					</label>
				)}

				       <div className="flex flex-wrap gap-2">
					       {!showReset && (
						       <>
							       <button
								       type="submit"
								       disabled={status === 'signing-in'}
								       className="rounded-full border border-accent-400/70 bg-accent-400/20 px-5 py-2.5 text-sm text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
								       {status === 'signing-in' ? 'Signing in…' : 'Sign in'}
							       </button>
							       <button
								       type="button"
								       onClick={() => setShowReset(true)}
								       className="rounded-full border border-white/25 bg-white/5 px-5 py-2.5 text-sm text-parchment-100 transition hover:bg-white/10">
								       Forgot password?
							       </button>
						       </>
					       )}
					       {showReset && (
						       <button
							       type="button"
							       onClick={sendPasswordReset}
							       disabled={status === 'resetting'}
							       className="rounded-full border border-accent-400/70 bg-accent-400/20 px-5 py-2.5 text-sm text-parchment-100 transition hover:bg-accent-400/30 disabled:cursor-not-allowed disabled:opacity-60">
							       {status === 'resetting' ? 'Sending reset…' : 'Send password reset email'}
						       </button>
					       )}
				       </div>

				{message && (
					<p
						className={`text-sm ${status === 'error' ? 'text-red-300' : 'text-silver-200'}`}>
						{message}
					</p>
				)}
			</form>
		</section>
	)
}
