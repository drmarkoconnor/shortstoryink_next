import { SignInPanel } from '@/components/auth/sign-in-panel'

export default async function SignInPage({
	searchParams,
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const params = searchParams ? await searchParams : {}
	const configError = params.error === 'config'

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-16">
			<SignInPanel configError={configError} />
		</main>
	)
}
