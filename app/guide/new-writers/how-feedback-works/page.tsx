import type { Metadata } from 'next'
import {
	CopyBlock,
	Figure,
	GuideHero,
	GuideShell,
	PageGrid,
} from '../guide-content'

export const metadata: Metadata = {
	title: 'How Feedback Works | New Writer Guide',
	description: 'A brief view of how teacher feedback is prepared in shortstory.ink.',
}

export default function HowFeedbackWorksPage() {
	return (
		<GuideShell activeHref="/guide/new-writers/how-feedback-works">
			<GuideHero
				kicker="Behind the scenes"
				title="Your teacher reads privately before anything is returned."
				body="Draft comments stay private while the teacher reads. Feedback becomes visible to you only after it is deliberately published."
				image={{
					src: '/guide/new-writers/teacher-review-workspace.webp',
					width: 1100,
					height: 720,
					alt: 'The teacher review workspace with private draft comments.',
				}}
			/>

			<PageGrid>
				<CopyBlock kicker="Queue" title="Submissions enter a review desk.">
					<p>
						The teacher sees waiting drafts, drafts in progress, and published
						feedback in one calm review desk.
					</p>
					<p>
						This helps the next piece to read stay visible without turning your
						work into a noisy dashboard.
					</p>
				</CopyBlock>
				<Figure
					image={{
						src: '/guide/new-writers/teacher-review-desk.webp',
						width: 1100,
						height: 700,
						alt: 'The teacher review desk.',
					}}
				/>
				<Figure
					image={{
						src: '/guide/new-writers/teacher-publish.webp',
						width: 537,
						height: 424,
						alt: 'The publish to writer confirmation modal.',
					}}
				/>
				<CopyBlock kicker="Publication" title="Nothing appears until publish.">
					<p>
						While feedback is being drafted, you cannot see half-finished
						notes. Once the teacher confirms publication, the overview and
						anchored comments become available to you.
					</p>
					<p>
						That keeps the reading experience clear: first you submit, then the
						teacher reads, then you receive a considered response.
					</p>
				</CopyBlock>
			</PageGrid>
		</GuideShell>
	)
}
