import { revalidatePath } from 'next/cache'
import ProfileSection, { type ProfileSaveState } from '@/components/account/profile-section'
import SecuritySection from '@/components/account/security-section'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function AccountPage() {
	const { user } = await getCurrentProfile()
	const client = await createServerSupabaseClient()
	const { data, error } = await client.from('profiles').select('display_name').eq('id', user.id).single()
	async function saveProfile(_state: ProfileSaveState, form: FormData): Promise<ProfileSaveState> {
		'use server'
		const { user: currentUser } = await getCurrentProfile()
		const displayName = String(form.get('displayName') ?? '').trim()
		if (!displayName || displayName.length > 100) return { error: 'Enter a display name of 1–100 characters.' }
		try {
			const db = await createServerSupabaseClient()
			const result = await db.from('profiles').update({ display_name: displayName }).eq('id', currentUser.id).select('id').single()
			if (result.error || !result.data) return { error: 'Unable to save your profile. Please try again.' }
		} catch {
			return { error: 'Unable to save your profile. Please try again.' }
		}
		revalidatePath('/app', 'layout')
		revalidatePath('/account')
		return { saved: true }
	}
	return <div className="surface mx-auto max-w-2xl space-y-8 p-6 lg:p-8">
		<h1 className="literary-title text-3xl text-parchment-100">Your account</h1>
		{error ? <p role="alert" className="text-sm text-amber-100">Your profile could not be loaded. Please reload to try again.</p> : <ProfileSection displayName={data?.display_name ?? ''} email={user.email ?? ''} saveAction={saveProfile} />}
		<div className="border-t border-white/15 pt-8"><SecuritySection /></div>
	</div>
}
