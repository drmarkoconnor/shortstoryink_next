import type { Metadata } from 'next'
import { GuideShell, GuideHero, GuideStep, NextGuideLink } from '../guide-content'
export const metadata: Metadata = { title: "Getting started | New Writer Guide", description: "Create your account, confirm your email, and return whenever you are ready to write." }
export default function Page() { return <GuideShell activeHref="/guide/new-writers/getting-started">
<GuideHero kicker="Getting started" title="A doorway to your writing desk." body="Create your account, confirm your email, and return whenever you are ready to write." />
<GuideStep number="01" title="Create your account." image="sign-up" caption="The sign-up form asks for your email and a confirmed password.">
<p>{"Enter your email and choose a password. Type it again in the confirmation field, then choose Sign up."}</p>
<p>{"If you are joining a group, use the email address your teacher is expecting."}</p>
</GuideStep>
<GuideStep number="02" title="Confirm your email." image="confirm-email" caption="The confirmation screen explains what to do next.">
<p>{"Open the confirmation email and follow its link. Check your spam folder if it does not arrive."}</p>
<p>{"Confirmation activates your account; it does not submit any writing."}</p>
</GuideStep>
<GuideStep number="03" title="Come back to your studio." image="sign-in" caption="Sign in, or request a password reset from the same screen.">
<p>{"Sign in with the same email and password. If you forget your password, choose Forgot password? and follow the reset email."}</p>
<p>{"Returning after the September update? Use Forgot password? once to set your new password. Your existing writing and feedback remain attached to your account."}</p>
</GuideStep>
<NextGuideLink href="/guide/new-writers/submitting" label="Next: submit a draft" />
</GuideShell> }
