'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { acceptInvite, getUser, hydrateSession, updateUser } from '@netlify/identity'
import { completeIdentityCallback } from '@/lib/auth/identity-callback'
import { passwordValidationError } from '@/lib/auth/password-validation'

export default function SecuritySection({ recovery = false }: { recovery?: boolean }) {
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [saved, setSaved] = useState(false)
	const [inviteToken, setInviteToken] = useState<string | null>(null)
	const [ready, setReady] = useState(!recovery)
	useEffect(() => {
		if (!recovery) return
		void (async () => {
			try {
				const callback = await completeIdentityCallback()
				if (callback?.type === 'invite' && callback.token) setInviteToken(callback.token)
				else if (!await hydrateSession()) throw new Error('Your reset link has expired. Request a new password reset from Sign in.')
				setReady(true)
			} catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to verify this link.') }
		})()
	}, [recovery])
	async function save(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const form = event.currentTarget
		const values = new FormData(form)
		const password = String(values.get('password') ?? '')
		const invalid = passwordValidationError(password, String(values.get('confirmation') ?? ''))
		setError(invalid)
		setSaved(false)
		if (invalid) return
		setPending(true)
		try {
			if (inviteToken) { await acceptInvite(inviteToken, password); setInviteToken(null) }
			else {
				await hydrateSession()
				if (!await getUser()) throw new Error('Your session has expired. Request a new password reset email from Sign in.')
				await updateUser({ password })
			}
			form.reset()
			setSaved(true)
		} catch (failure) {
			setError(failure instanceof Error ? failure.message : 'Unable to update your password. Please try again.')
		} finally {
			setPending(false)
		}
	}
	return (
		<section className="space-y-6">
			<h2 className="literary-title text-2xl text-studio-ink">{recovery ? 'Choose a new password' : 'Password'}</h2>
			<form onSubmit={save} className="space-y-4">
				{[['password', 'New password'], ['confirmation', 'Confirm new password']].map(([name, label]) => (
					<label key={name} className="block text-sm text-studio-muted">
						{label}
						<input name={name} type="password" autoComplete="new-password" required minLength={8} disabled={pending} className="mt-2 w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink outline-none focus:ring focus:ring-accent-400" />
					</label>
				))}
				<p className="text-sm text-studio-muted">Use at least 8 characters.</p>
				{error && <p role="alert" className="text-sm text-amber-800">{error}</p>}
				{saved && <p role="status" className="text-sm text-emerald-800">Your password has been updated.</p>}
				<button disabled={pending || !ready} className="studio-primary">{pending ? 'Saving…' : !ready && !error ? 'Checking your link…' : 'Update password'}</button>
				{recovery && error && <Link href="/auth/sign-in" className="ml-4 text-sm text-studio-accent">Return to sign in</Link>}
				{saved && recovery && <Link href="/app" className="ml-4 text-sm text-studio-accent">Continue to your studio</Link>}
			</form>
		</section>
	)
}
