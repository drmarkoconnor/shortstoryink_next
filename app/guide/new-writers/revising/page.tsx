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
	title: 'Revising | New Writer Guide',
	description: 'How to begin a new revision after feedback in shortstory.ink.',
}

export default function RevisingPage() {
	return (
		<GuideShell activeHref="/guide/new-writers/revising">
			<GuideHero
				kicker="Revising"
				title="Start the next version when you are ready."
				body="After feedback is published, you can begin a revision. The new version goes back for review while the earlier feedback stays preserved."
				image={{
					src: '/guide/new-writers/start-revision.webp',
					width: 814,
					height: 324,
					alt: 'The start a new revision button below the feedback view.',
				}}
			/>

			<PageGrid>
				<CopyBlock kicker="Next draft" title="A revision is a new version.">
					<p>
						Click the revision button from the feedback view. The app shows the
						source version and the next version, so it is clear what you are
						working from.
					</p>
					<p>
						When you submit the revision, it returns to the teacher as the next
						draft in the same chain.
					</p>
				</CopyBlock>
				<Figure
					image={{
						src: '/guide/new-writers/revision-panel.webp',
						width: 337,
						height: 537,
						alt: 'The revision panel showing version one as source and version two as next.',
					}}
				/>
				<Figure
					image={{
						src: '/guide/new-writers/version-history.webp',
						width: 760,
						height: 148,
						alt: 'The version history panel.',
					}}
				/>
				<CopyBlock kicker="Continuity" title="History stays with the work.">
					<p>
						Published feedback stays preserved for each version. That gives you
						a record of the piece as it develops, not just a pile of separate
						files.
					</p>
					<p>
						The aim is steady improvement: read, notice, revise, and return.
					</p>
				</CopyBlock>
			</PageGrid>

			<NextGuideLink
				href="/guide/new-writers/how-feedback-works"
				label="Optional: see how feedback is prepared"
			/>
		</GuideShell>
	)
}
