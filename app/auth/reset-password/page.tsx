import SecuritySection from '@/components/account/security-section'
import { getCurrentUser } from '@/lib/auth/get-current-user'

export default async function ResetPasswordPage() {
	await getCurrentUser()
	return <main className="mx-auto min-h-screen max-w-lg px-6 py-16"><div className="surface p-8"><SecuritySection recovery /></div></main>
}
