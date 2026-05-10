import { SignInPanel } from '@/components/auth/sign-in-panel'

function toMessage(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

function safePostSignInPath(value: string | null) {
	if (!value || !value.startsWith('/') || value.startsWith('//')) {
		return '/app'
	}

	return value
}

export default async function SignInPage({
	searchParams,
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const params = searchParams ? await searchParams : {}
	const configError = params.error === 'config'
	const postSignInPath = safePostSignInPath(toMessage(params.next))

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-16">
			<SignInPanel
				configError={configError}
				postSignInPath={postSignInPath}
			/>
		</main>
	)
}
