import { AuthFrame } from '@/components/layout/auth-frame'
import SecuritySection from '@/components/account/security-section'

export default async function ResetPasswordPage() {
	return <AuthFrame><div className="border-t border-studio-line pt-8"><SecuritySection recovery /></div></AuthFrame>
}
