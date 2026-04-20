import Link from 'next/link'

export default function ConfirmEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-16">
      <section className="surface w-full p-8 text-center">
        <h1 className="literary-title text-3xl mb-4">Confirm your email</h1>
        <p className="mb-6 text-silver-200">
          Thank you for signing up!<br />
          Please check your inbox for a confirmation link to activate your account.
        </p>
        <p className="mb-6 text-silver-300 text-sm">
          Once you have confirmed, you can <Link href="/auth/sign-in" className="underline hover:text-accent-300">sign in here</Link>.
        </p>
        <p className="text-xs text-silver-400">
          Didn&apos;t receive the email? Check your spam folder or <a href="mailto:support@shortstory.ink" className="underline">contact support</a>.
        </p>
      </section>
    </main>
  )
}
