'use client'

import { useState, type FormEvent } from 'react'
import { login, requestPasswordRecovery } from '@netlify/identity'
import { safeRedirectPath } from '@/lib/auth/safe-redirect'

export function SignInPanel({ configError = false, callbackError = false, postSignInPath = '/app' }: {
	configError?: boolean
	callbackError?: boolean
	postSignInPath?: string
}) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [status, setStatus] = useState<'idle' | 'signing-in' | 'resetting' | 'reset-sent' | 'error'>('idle')
	const [message, setMessage] = useState<string | null>(callbackError ? 'This sign-in link has expired or could not be verified. Sign in or request a new password reset email in this browser.' : null)
	const [showReset, setShowReset] = useState(callbackError)
	async function sendPasswordReset() {
		setStatus('resetting')
		setMessage(null)
		try {
			await requestPasswordRecovery(email.trim())
			setStatus('reset-sent')
			setMessage('If an account exists for this email, a reset link is on its way. Follow it to choose a new password.')
		} catch {
			setStatus('error')
			setMessage('Unable to send a reset email right now. Please try again shortly.')
		}
	}
	async function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (status === 'signing-in' || status === 'resetting') return
		if (showReset) { await sendPasswordReset(); return }
		setStatus('signing-in')
		setMessage(null)
		try {
			await login(email.trim(), password)
			window.location.assign(safeRedirectPath(postSignInPath))
		} catch (failure) {
			setStatus('error')
			setMessage(failure instanceof Error ? failure.message : 'Unable to sign in. Please try again shortly.')
		}
	}

	return (
		<section className="w-full">
			<p className="mb-3 text-xs uppercase tracking-[0.16em] text-studio-accent">
				Welcome back
			</p>
			<h1 className="studio-heading">Sign in to your studio</h1>
			<p className="muted mt-3 text-sm">
				Sign in with your email and password.
			</p>
			<p className="muted mt-3 text-sm">Returning after our September update? Choose “Forgot password?” once to set a new password. Your writing and feedback are still here.</p>
			{configError && (
				<p className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-800">
					Sign-in is temporarily unavailable. Please try again later.
				</p>
			)}

			<form onSubmit={onPasswordSubmit} className="mt-8 space-y-4">
				<label className="block">
					<span className="mb-2 block text-sm text-studio-muted">Email</span>
					<input
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						type="email"
						autoComplete="email"
						required
						className="w-full rounded border border-studio-line bg-studio-paper px-4 py-2.5 text-studio-ink outline-none ring-accent-400 transition focus:ring"
						placeholder="you@example.com"
					/>
				</label>

				{!showReset && (
					<label className="block">
						<span className="mb-2 block text-sm text-studio-muted">Password</span>
						<input
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							type="password"
							autoComplete="current-password"
							required
							className="w-full rounded border border-studio-line bg-studio-paper px-4 py-2.5 text-studio-ink outline-none ring-accent-400 transition focus:ring"
							placeholder="Your password"
						/>
					</label>
				)}

				<div className="flex flex-wrap gap-2">
					{!showReset && (
						<>
							<button
								type="submit"
								disabled={configError || status === 'signing-in'}
								className="studio-primary">
								{status === 'signing-in' ? 'Signing in…' : 'Sign in'}
							</button>
							<button
								type="button"
								disabled={status === 'signing-in'}
								onClick={() => setShowReset(true)}
								className="rounded border border-studio-line bg-studio-tint px-5 py-2.5 text-sm text-studio-ink transition hover:bg-studio-tint">
								Forgot password?
							</button>
						</>
					)}
					{showReset && (
						<button
							type="submit"
							disabled={configError || status === 'resetting'}
							className="studio-primary">
							{status === 'resetting' ? 'Sending reset…' : 'Send password reset email'}
						</button>
					)}
				</div>

				{showReset && <button type="button" disabled={status === 'resetting'} className="text-sm text-studio-accent" onClick={() => { setShowReset(false); setMessage(null) }}>Back to sign in</button>}
				{message && (
					<p role="status"
						className={`text-sm ${status === 'error' ? 'text-red-800' : 'text-studio-muted'}`}>
						{message}
					</p>
				)}
			</form>
		</section>
	)
}
