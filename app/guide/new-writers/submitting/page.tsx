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
	title: 'Submitting A Draft | New Writer Guide',
	description: 'How to submit a piece for feedback in shortstory.ink.',
}

export default function SubmittingPage() {
	return (
		<GuideShell activeHref="/guide/new-writers/submitting">
			<GuideHero
				kicker="Submitting"
				title="Bring the draft as you want it read."
				body="Paste or type your piece into the writing space, add a title, choose the group, and save the submission."
				image={{
					src: '/guide/new-writers/submit-empty.webp',
					width: 1050,
					height: 713,
					alt: 'The writer submission page before a draft has been entered.',
				}}
			/>

			<PageGrid>
				<CopyBlock kicker="Your writing space" title="Paste, type, and check the title.">
					<p>
						The large pale page is where your draft goes. Formatting is
						preserved, so you can bring the piece in as you want it read.
					</p>
					<p>
						Add a title in the right-hand panel. If you belong to more than one
						group, choose the right one before saving.
					</p>
				</CopyBlock>
				<Figure
					image={{
						src: '/guide/new-writers/submit-draft.webp',
						width: 1200,
						height: 764,
						alt: 'A filled draft on the writer submission page.',
					}}
					caption="The word counter helps you keep within the current submission limit."
				/>
				<Figure
					image={{
						src: '/guide/new-writers/submission-saved.webp',
						width: 299,
						height: 143,
						alt: 'A confirmation message saying the submission was saved.',
					}}
				/>
				<CopyBlock kicker="After saving" title="You will see confirmation.">
					<p>
						Once the piece is saved, it enters the review queue. You can leave
						the page; the draft is now waiting for a teacher response.
					</p>
					<p>
						Your previous submissions remain available below the writing space,
						so you can check the status of older pieces without losing your
						place.
					</p>
				</CopyBlock>
				<CopyBlock kicker="History" title="Previous submissions stay organised.">
					<p>
						The previous submissions panel is a simple record of what you have
						sent. It is there when you need it, but it does not crowd the main
						writing page.
					</p>
				</CopyBlock>
				<Figure
					image={{
						src: '/guide/new-writers/version-history.webp',
						width: 760,
						height: 148,
						alt: 'A version history panel showing preserved feedback history.',
					}}
				/>
			</PageGrid>

			<NextGuideLink href="/guide/new-writers/feedback" label="Next: read feedback" />
		</GuideShell>
	)
}
