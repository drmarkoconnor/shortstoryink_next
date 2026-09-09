'use client'
import { useEffect } from 'react'
import { hydrateSession } from '@netlify/identity'
import { completeIdentityCallback } from '@/lib/auth/identity-callback'

export function IdentityLifecycle() {
	useEffect(() => {
		if (window.location.pathname === '/auth/reset-password') return
		void (async () => {
			try {
				const result = await completeIdentityCallback()
				if (result?.type === 'invite') window.location.replace('/auth/reset-password#invite_token=' + encodeURIComponent(result.token ?? ''))
				else if (result?.type === 'recovery') window.location.replace('/auth/reset-password')
				else if (result) window.location.replace('/app')
				else if (window.location.pathname === '/auth/callback') window.location.replace('/auth/sign-in?error=callback')
				else await hydrateSession().catch(() => null)
			} catch { window.location.replace('/auth/sign-in?error=callback') }
		})()
	}, [])
	return null
}
