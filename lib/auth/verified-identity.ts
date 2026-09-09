import 'server-only'
import { cookies } from 'next/headers'
import { cache } from 'react'

// Identity 2.0's getUser() can fall back to JWT claims in Next SSR and omit
// confirmedAt (verified in the deployed preview). Verify the actual request
// cookie with Identity's /user API instead; never authenticate decoded claims.
export const getVerifiedIdentity = cache(async () => {
	const token = (await cookies()).get('nf_jwt')?.value
	if (!token) return null
	try {
		const response = await fetch(new URL('/.netlify/identity/user', process.env.URL ?? 'https://shortstory.ink'), {
			headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000),
		})
		if (!response.ok) return null
		const user = await response.json()
		if (typeof user.id !== 'string' || typeof user.email !== 'string' || !user.confirmed_at) return null
		return { id: user.id, email: user.email, confirmedAt: user.confirmed_at as string,
			userMetadata: (user.user_metadata ?? {}) as Record<string, unknown> }
	} catch { return null }
})
