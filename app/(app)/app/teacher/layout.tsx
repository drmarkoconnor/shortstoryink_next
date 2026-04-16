import type { ReactNode } from 'react'
import { requireTeacher } from '@/lib/auth/get-current-profile'

export default async function TeacherAreaLayout({
	children,
}: {
	children: ReactNode
}) {
	await requireTeacher()
	return <>{children}</>
}

