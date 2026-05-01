import type { Metadata } from 'next'
import {
	CopyBlock,
	Figure,
	GuideHero,
	GuideShell,
	NextGuideLink,
	PageGrid,
} from '../guide-content'

export const metadata: Metadata = {
	title: 'Getting Started | New Writer Guide',
	description: 'How to create an account and sign in to shortstory.ink.',
}

export default function GettingStartedPage() {
	return (
		<GuideShell activeHref="/guide/new-writers/getting-started">
			<GuideHero
				kicker="Getting started"
				title="Create your account and come back whenever you need."
				body="Your account is simply the doorway to your writing desk. Use the same email and password when you return."
				image={{
					src: '/guide/new-writers/sign-up.webp',
					width: 490,
					height: 458,
					alt: 'The sign up form with email, password, and confirm password fields.',
				}}
			/>

			<PageGrid>
				<CopyBlock kicker="Step one" title="Sign up once.">
					<p>
						Enter your email, choose a password, and confirm it. After that,
						your drafts, feedback, and revision history all stay attached to
						your account.
					</p>
					<p>
						If you are joining a group, use the email address your teacher is
						expecting so access is smooth.
					</p>
				</CopyBlock>
				<Figure
					image={{
						src: '/guide/new-writers/sign-up.webp',
						width: 490,
						height: 458,
						alt: 'The shortstory.ink sign up panel.',
					}}
				/>
				<Figure
					image={{
						src: '/guide/new-writers/sign-in.webp',
						width: 492,
						height: 439,
						alt: 'The shortstory.ink sign in panel.',
					}}
				/>
				<CopyBlock kicker="Coming back" title="Sign in when you return.">
					<p>
						Use the sign-in page when you want to submit another piece, check
						whether feedback has arrived, or continue a revision.
					</p>
					<p>
						Forgot your password? Use the password reset option and follow the
						email link.
					</p>
				</CopyBlock>
			</PageGrid>

			<NextGuideLink href="/guide/new-writers/submitting" label="Next: submit a draft" />
		</GuideShell>
	)
}
