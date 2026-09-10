import type { Metadata } from 'next'
import { GuideShell, GuideHero, GuideStep, NextGuideLink } from '../guide-content'
export const metadata: Metadata = { title: "Behind the scenes | New Writer Guide", description: "Your teacher reads privately, prepares the feedback, and deliberately publishes it back to you." }
export default function Page() { return <GuideShell activeHref="/guide/new-writers/how-feedback-works">
<GuideHero kicker="Behind the scenes" title="A considered response, shared when ready." body="Your teacher reads privately, prepares the feedback, and deliberately publishes it back to you." />
<GuideStep number="01" title="Read and respond privately." image="teacher-review" caption="A teacher\u2019s manuscript workspace, shown with fictional example writing.">
<p>{"Submitted pieces enter the review queue. Your teacher opens a manuscript and attaches comments to particular passages."}</p>
<p>{"Draft feedback stays private while that reading is in progress."}</p>
</GuideStep>
<GuideStep number="02" title="Publish a complete response." image="teacher-publish" caption="Publication is a separate, deliberate action.">
<p>{"The teacher can add an overview before confirming publication. The writer then receives the overview and the anchored comments together."}</p>
<p>{"Nothing becomes visible to the writer just because a draft comment has been written."}</p>
</GuideStep>
<GuideStep number="03" title="Bring a teaching idea to life." image="handout" caption="An illustrated handout being prepared in the teaching studio.">
<p>{"Teachers can also prepare illustrated handouts and writing exercises. Materials shared with your group are available from the Reading room."}</p>
</GuideStep>
<NextGuideLink href="/guide/new-writers" label="Return to the guide overview" />
</GuideShell> }
