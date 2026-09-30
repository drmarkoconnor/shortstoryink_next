import React from 'react'
import Link from 'next/link'

/** A visible choice above quick submission; never moves or clears a local draft. */
export function ProjectsEntry({ enabled }: { enabled: boolean }) {
	if (!enabled) return null

	return (
		<section aria-labelledby="writer-projects-heading" className="mb-8 border-b border-studio-line pb-7">
			<div className="flex flex-wrap items-end justify-between gap-5 rounded-lg bg-studio-tint p-6">
				<div className="max-w-2xl">
					<p className="studio-eyebrow">For scenes, chapters and longer work</p>
					<h2 id="writer-projects-heading" className="literary-title mt-2 text-3xl">Your projects</h2>
					<p className="mt-3 leading-7 text-studio-muted">
						Create sections, arrange them as cards, keep snapshots and compile a manuscript.
						These tools live in a project, rather than in the single-piece draft below.
					</p>
				</div>
				<Link href="/app/writer/projects" className="studio-primary">Open your projects</Link>
			</div>
			<p className="mt-3 text-sm text-studio-muted">
				Only sending one piece? Carry on below. Opening a project does not move or clear this draft.
			</p>
		</section>
	)
}
