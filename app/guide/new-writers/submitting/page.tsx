import type { Metadata } from 'next'
import { GuideShell, GuideHero, GuideStep, NextGuideLink } from '../guide-content'
export const metadata: Metadata = { title: "Submitting | New Writer Guide", description: "Bring one piece, add its title, and send it for a close read when you are ready." }
export default function Page() { return <GuideShell activeHref="/guide/new-writers/submitting">
<GuideHero kicker="Submitting" title="Give your draft room to be read." body="Bring one piece, add its title, and send it for a close read when you are ready." />
<GuideStep number="01" title="Write, then check the details." image="draft-filled" caption="Write in the shaded draft area, then add the submission details below it.">
<p>{"Choose Start writing on your writing page. Type or paste your draft into the manuscript area, then add a title and choose your group."}</p>
<p>{"Your paragraph breaks stay with the text. The word counter helps you check the length before you submit."}</p>
</GuideStep>
<GuideStep number="02" title="Save the submission." image="submission-saved" caption="This confirmation appears after a successful submission. The example uses fictional writing.">
<p>{"Choose Save submission and wait for the confirmation. Your piece is then in the review queue."}</p>
<p>{"A recovery copy on this device is different from a submitted piece. Look for the submission confirmation before leaving; Download draft also gives you a copy to keep."}</p>
</GuideStep>
<NextGuideLink href="/guide/new-writers/feedback" label="Next: read feedback" />
</GuideShell> }
