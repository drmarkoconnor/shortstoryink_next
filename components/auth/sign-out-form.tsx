'use client'
import { forgetDrafts } from '@/lib/drafts/recovery'
import { logout } from '@netlify/identity'
import { useState } from 'react'
export function SignOutForm({ ownerId }: { ownerId: string }) {
	const [pending, setPending] = useState(false)
	return <form onSubmit={async event => {
		event.preventDefault(); setPending(true)
		try { forgetDrafts(window.localStorage, ownerId) } catch { /* Storage can be unavailable in private browsing. */ }
		try { await logout() } catch { /* Clear this browser even if the service is unavailable. */ }
		finally {
			for (const name of ['nf_jwt', 'nf_refresh']) document.cookie = `${name}=; path=/; secure; samesite=lax; max-age=0`
			window.location.assign('/auth/sign-in')
		}
	}}><button disabled={pending} type="submit" className="rounded border border-studio-line px-3 py-1.5 text-sm text-studio-muted transition hover:border-studio-line hover:bg-studio-tint hover:text-studio-ink">{pending ? 'Logging out…' : 'Log out'}</button></form>
}
