import type { ReactNode } from 'react'
import { AppFrame } from '@/components/layout/app-frame'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'

export default async function AuthenticatedLayout({
	children,
}: {
	children: ReactNode
}) {
	const profile = await getCurrentProfile()
	return <AppFrame role={profile.role}>{children}</AppFrame>
}

