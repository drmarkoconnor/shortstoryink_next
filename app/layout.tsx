import type { Metadata } from 'next'
import './globals.css'
import { IdentityLifecycle } from '@/components/auth/identity-lifecycle'

export const metadata: Metadata = {
	title: 'shortstory.ink',
	description: 'Elegant, workshop-first writing platform.',
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
