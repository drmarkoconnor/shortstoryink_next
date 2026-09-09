'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { passwordValidationError } from '@/lib/auth/password-validation'

export default function SecuritySection({ recovery = false }: { recovery?: boolean }) {
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [saved, setSaved] = useState(false)
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
			const client = createBrowserSupabaseClient()
			const { data, error: sessionError } = await client.auth.getUser()
			if (sessionError || !data.user) throw new Error('Your session has expired. Request a new password reset email from Sign in.')
			const { error: updateError } = await client.auth.updateUser({ password })
			if (updateError) throw updateError
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
			<h2 className="literary-title text-2xl text-parchment-100">{recovery ? 'Choose a new password' : 'Password'}</h2>
			<form onSubmit={save} className="space-y-4">
				{[['password', 'New password'], ['confirmation', 'Confirm new password']].map(([name, label]) => (
					<label key={name} className="block text-sm text-silver-100">
						{label}
						<input name={name} type="password" autoComplete="new-password" required minLength={8} disabled={pending} className="mt-2 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 outline-none focus:ring focus:ring-accent-400" />
					</label>
				))}
				<p className="text-sm text-silver-300">Use at least 8 characters.</p>
				{error && <p role="alert" className="text-sm text-amber-100">{error}</p>}
				{saved && <p role="status" className="text-sm text-emerald-200">Your password has been updated.</p>}
				<button disabled={pending} className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-sm text-parchment-100 disabled:opacity-60">{pending ? 'Saving…' : 'Update password'}</button>
				{saved && recovery && <Link href="/app" className="ml-4 text-sm text-accent-200">Continue to your studio</Link>}
			</form>
		</section>
	)
}
