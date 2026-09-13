import type { Metadata } from 'next'
import './globals.css'
import './studio-v11.css'
import { IdentityLifecycle } from '@/components/auth/identity-lifecycle'

export const metadata: Metadata = {
	title: 'shortstory.ink',
	description: 'A private literary studio for writing, close reading, feedback and revision.',
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="en">
			<body><IdentityLifecycle />{children}</body>
		</html>
	)
}
