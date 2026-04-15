import type { ReactNode } from 'react'
import { AppFrame } from '@/components/layout/app-frame'
import { getCurrentUser } from '@/lib/auth/get-current-user'

export default async function AuthenticatedLayout({
	children,
}: {
	children: ReactNode
}) {
	await getCurrentUser()
	return <AppFrame>{children}</AppFrame>
}
