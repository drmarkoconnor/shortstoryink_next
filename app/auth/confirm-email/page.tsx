import { AuthFrame } from '@/components/layout/auth-frame'
import Link from 'next/link'

export default function ConfirmEmailPage() {
  return (
    <AuthFrame>
      <section className="w-full space-y-6 border-t border-studio-line pt-8">
        <h1 className="studio-heading mb-6">Confirm your email</h1>
        <p className="mb-6 text-studio-muted">
          Thank you for signing up!<br />
          Please check your inbox for a confirmation link to activate your account.
        </p>
        <p className="mb-6 text-studio-muted text-sm">
          Once you have confirmed, you can <Link href="/auth/sign-in" className="underline hover:text-studio-accent">sign in here</Link>.
        </p>
        <p className="text-xs text-studio-muted">
          Didn&apos;t receive the email? Check your spam folder or <a href="mailto:support@shortstory.ink" className="underline">contact support</a>.
        </p>
      </section>
    </AuthFrame>
  )
}
