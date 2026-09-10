import { AuthFrame } from '@/components/layout/auth-frame'
import { SignInPanel } from '@/components/auth/sign-in-panel'
import { safeRedirectPath } from '@/lib/auth/safe-redirect'

function toMessage(value: string | string[] | undefined) {
	return typeof value === 'string' && value.trim() ? value : null
}

export default async function SignInPage({
	searchParams,
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
	const params = searchParams ? await searchParams : {}
	const configError = params.error === 'config'
	const postSignInPath = safeRedirectPath(toMessage(params.next))

	return (
		<AuthFrame>
			<SignInPanel
				configError={configError}
				callbackError={params.error === 'callback'}
				postSignInPath={postSignInPath}
			/>
		</AuthFrame>
	)
}
