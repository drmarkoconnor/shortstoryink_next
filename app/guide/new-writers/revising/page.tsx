import type { Metadata } from 'next'
import { GuideShell, GuideHero, GuideStep, NextGuideLink } from '../guide-content'
export const metadata: Metadata = { title: "Revising | New Writer Guide", description: "A revision continues the same piece while preserving the earlier manuscript and its feedback." }
export default function Page() { return <GuideShell activeHref="/guide/new-writers/revising">
<GuideHero kicker="Revising" title="Make room for the next version." body="A revision continues the same piece while preserving the earlier manuscript and its feedback." />
<GuideStep number="01" title="Begin from the returned piece." image="start-revision" caption="The confirmation keeps the move from reading to revising deliberate.">
<p>{"Choose Start a new revision in the feedback view. Confirm when you are ready to leave the reader and work on the next draft."}</p>
</GuideStep>
<GuideStep number="02" title="Work on the next draft." image="revision" caption="The source and next-version labels keep your place in the revision history clear.">
<p>{"The revision workspace shows the source version and the next version. Edit your text and title, then choose Submit revision when it is ready for another reading."}</p>
<p>{"Submitting creates the next version in the same chain. It does not overwrite the earlier feedback."}</p>
</GuideStep>
<GuideStep number="03" title="Keep your history close." image="version-history" caption="Version history connects the drafts of one piece.">
<p>{"Open Version history to return to earlier feedback. Each published response remains with the version it describes."}</p>
</GuideStep>
<NextGuideLink href="/guide/new-writers/how-feedback-works" label="Optional: how teaching works" />
</GuideShell> }
