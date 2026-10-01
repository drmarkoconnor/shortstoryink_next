'use client'
import { forgetDrafts } from '@/lib/drafts/recovery'
import { forgetProjectDrafts, hasUnsentProjectDraft } from '@/lib/projects/transport'
import { logout } from '@netlify/identity'
import { useState } from 'react'
export function SignOutForm({ ownerId }: { ownerId: string }) {
 const [pending, setPending] = useState(false)
 return <form onSubmit={async event => {
  event.preventDefault()
  try { if(hasUnsentProjectDraft(window.localStorage,ownerId) && !window.confirm('A project draft has unsent changes on this device. Cancel to save or download it first. Sign out and remove this device copy?')) return } catch { /* Storage may be unavailable. */ }
  setPending(true)
  try { forgetDrafts(window.localStorage, ownerId); forgetProjectDrafts(window.localStorage,ownerId); forgetProjectDrafts(window.sessionStorage,ownerId) } catch { /* Storage can be unavailable in private browsing. */ }
  try { await logout() } catch { /* Clear this browser even if the service is unavailable. */ }
  finally {
   for (const name of ['nf_jwt', 'nf_refresh']) document.cookie = `${name}=; path=/; secure; samesite=lax; max-age=0`
   window.location.assign('/auth/sign-in')
  }
 }}><button disabled={pending} type="submit" className="rounded border border-studio-line px-3 py-1.5 text-sm text-studio-muted transition hover:border-studio-line hover:bg-studio-tint hover:text-studio-ink">{pending ? 'Logging out…' : 'Log out'}</button></form>
}
