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
	title: 'Reading Feedback | New Writer Guide',
	description: 'How to find and read published feedback in shortstory.ink.',
}

export default function FeedbackPage() {
	return (
		<GuideShell activeHref="/guide/new-writers/feedback">
			<GuideHero
				kicker="Feedback"
				title="Read the response where the writing is."
				body="When feedback is ready, you can open it from the app or from the email notification. Comments appear in context, beside the words they are about."
				image={{
					src: '/guide/new-writers/feedback-in-context.webp',
					width: 1200,
					height: 764,
					alt: 'Published feedback shown in context beside the manuscript.',
				}}
			/>

			<PageGrid>
				<CopyBlock kicker="Notification" title="You may receive an email.">
					<p>
						When your teacher publishes feedback, the app can send a simple
						email with a link back to the piece.
					</p>
					<p>
						The important work still happens in shortstory.ink, where the draft
						and comments remain together.
					</p>
				</CopyBlock>
				<Figure
					image={{
						src: '/guide/new-writers/email-ready-piece.webp',
						width: 536,
						height: 331,
						alt: 'An email notification saying feedback is ready.',
					}}
				/>
				<Figure
					image={{
						src: '/guide/new-writers/feedback-list.webp',
						width: 1050,
						height: 887,
						alt: 'The published feedback list in the writer area.',
					}}
					caption="The feedback page collects returned pieces and lets you reopen them later."
				/>
				<CopyBlock kicker="Reading" title="Open the latest feedback, then read slowly.">
					<p>
						The manuscript stays central. Hover or click a highlighted passage
						to read the note attached to it.
					</p>
					<p>
						The overview gives you the teacher&apos;s larger response, while the
						highlighted comments help you work through the draft line by line.
					</p>
				</CopyBlock>
				<CopyBlock kicker="Offline copy" title="Save or print a feedback document.">
					<p>
						Some writers like to print feedback before revising. The feedback
						document gives you a calm, printable version of the overview,
						annotated manuscript, and notes.
					</p>
				</CopyBlock>
				<Figure
					image={{
						src: '/guide/new-writers/feedback-document.webp',
						width: 1100,
						height: 700,
						alt: 'A printable feedback document with annotated manuscript.',
					}}
				/>
				<Figure
					image={{
						src: '/guide/new-writers/print-feedback.webp',
						width: 980,
						height: 691,
						alt: 'Browser print preview for the feedback document.',
					}}
				/>
				<CopyBlock kicker="Tip" title="Use the document beside your draft.">
					<p>
						If you print or save the document as a PDF, keep it nearby while
						you revise. It is not a separate task; it is a companion to the next
						version.
					</p>
				</CopyBlock>
			</PageGrid>

			<NextGuideLink href="/guide/new-writers/revising" label="Next: revise the piece" />
		</GuideShell>
	)
}
