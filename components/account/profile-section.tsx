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
		<h2 className="literary-title text-2xl text-studio-ink">Profile</h2>
		<form action={action} className="space-y-4">
			<label className="block text-sm text-studio-muted">Display name
				<input name="displayName" defaultValue={displayName} required maxLength={100} autoComplete="name" className="mt-2 w-full rounded border border-studio-line bg-studio-paper px-3 py-2.5 text-studio-ink outline-none focus:ring focus:ring-accent-400" />
			</label>
			<p className="text-sm text-studio-muted">Account email: {email}</p>
			{state.error && <p role="alert" className="text-sm text-amber-800">{state.error}</p>}
			{state.saved && <p role="status" className="text-sm text-emerald-800">Your display name has been saved.</p>}
			<button disabled={pending} className="studio-primary">{pending ? 'Saving…' : 'Save profile'}</button>
		</form>
	</section>
}
