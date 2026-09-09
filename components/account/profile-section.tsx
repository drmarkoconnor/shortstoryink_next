'use client'

import { useActionState } from 'react'

export type ProfileSaveState = { error?: string; saved?: boolean }
export default function ProfileSection({ displayName, email, saveAction }: {
	displayName: string
	email: string
	saveAction: (state: ProfileSaveState, form: FormData) => Promise<ProfileSaveState>
}) {
	const [state, action, pending] = useActionState(saveAction, {})
	return <section className="space-y-6">
		<h2 className="literary-title text-2xl text-parchment-100">Profile</h2>
		<form action={action} className="space-y-4">
			<label className="block text-sm text-silver-100">Display name
				<input name="displayName" defaultValue={displayName} required maxLength={100} autoComplete="name" className="mt-2 w-full rounded-xl border border-white/15 bg-ink-900 px-3 py-2 text-parchment-100 outline-none focus:ring focus:ring-accent-400" />
			</label>
			<p className="text-sm text-silver-200">Account email: {email}</p>
			{state.error && <p role="alert" className="text-sm text-amber-100">{state.error}</p>}
			{state.saved && <p role="status" className="text-sm text-emerald-200">Your display name has been saved.</p>}
			<button disabled={pending} className="rounded-full border border-accent-400/70 bg-accent-400/20 px-4 py-2 text-sm text-parchment-100 disabled:opacity-60">{pending ? 'Saving…' : 'Save profile'}</button>
		</form>
	</section>
}
