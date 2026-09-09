'use client'
import { forgetDrafts } from '@/lib/drafts/recovery'
export function SignOutForm({ ownerId, action }: { ownerId: string; action: () => Promise<void> }) {
	return <form action={action} onSubmit={() => {
		try { forgetDrafts(window.localStorage, ownerId) } catch { /* Storage can be unavailable in private browsing. */ }
	}}><button type="submit" className="rounded-full border border-white/25 px-3 py-1.5 text-xs uppercase tracking-[0.11em] text-silver-100 transition hover:border-white/35 hover:bg-white/5 hover:text-parchment-100">Log out</button></form>
}
