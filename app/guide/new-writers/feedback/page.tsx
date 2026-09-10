import type { Metadata } from 'next'
import { GuideShell, GuideHero, GuideStep, NextGuideLink } from '../guide-content'
export const metadata: Metadata = { title: "Reading feedback | New Writer Guide", description: "Open My feedback to find the pieces your teacher has returned. An email may also let you know when feedback is ready." }
export default function Page() { return <GuideShell activeHref="/guide/new-writers/feedback">
<GuideHero kicker="Reading feedback" title="Return to the words with fresh eyes." body="Open My feedback to find the pieces your teacher has returned. An email may also let you know when feedback is ready." />
<GuideStep number="01" title="Begin with the overview." image="feedback-overview" caption="The overview introduces the feedback before you work through individual passages.">
<p>{"Read the editorial letter for the larger response to your piece. The title and version identify exactly which draft the feedback belongs to."}</p>
<p>{"Take your time. You can return to the same feedback later."}</p>
</GuideStep>
<GuideStep number="02" title="Read a note in context." image="feedback-note" caption="A comment opens beside the passage it describes.">
<p>{"Choose a marker beside a highlighted passage to open its comment. Craft notes, Quick fixes and All notes let you choose which kind of feedback to read."}</p>
<p>{"Use Next and Previous to move through longer pieces. The notes remain attached to the words in this version."}</p>
</GuideStep>
<NextGuideLink href="/guide/new-writers/revising" label="Next: begin a revision" />
</GuideShell> }
