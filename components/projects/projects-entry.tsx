import React from 'react'
import Link from 'next/link'

/** Clear choices without moving, hiding or clearing an existing quick draft. */
export function ProjectsEntry({enabled}:{enabled:boolean}) {
 if(!enabled)return null
 return <section aria-labelledby="writer-projects-heading" className="mb-8 border-b border-studio-line pb-7">
  <p className="studio-eyebrow">Your writing desk</p>
  <h2 id="writer-projects-heading" className="literary-title mt-2 text-3xl">What would you like to work on?</h2>
  <div className="mt-5 grid gap-4 sm:grid-cols-3">
   <Link href="/app/writer/projects#existing-projects" className="rounded border border-studio-line bg-studio-tint p-5"><h3 className="literary-title text-xl">Continue a project</h3><p className="mt-2 text-sm leading-6 text-studio-muted">Return to your sections, cards and snapshots.</p></Link>
   <Link href="/app/writer/projects#new-project" className="rounded border border-studio-line bg-studio-paper p-5"><h3 className="literary-title text-xl">Start a project</h3><p className="mt-2 text-sm leading-6 text-studio-muted">Organise a short piece, chapters or a collection, then compile a manuscript.</p></Link>
   <a href="#single-piece" className="rounded border border-studio-line bg-studio-paper p-5"><h3 className="literary-title text-xl">Write or send one piece</h3><p className="mt-2 text-sm leading-6 text-studio-muted">Use the familiar single-piece draft below. No project needed.</p></a>
  </div>
  <p className="mt-3 text-sm text-studio-muted">Opening your projects does not move or clear your single-piece draft.</p>
  <span id="single-piece" className="block scroll-mt-8" />
 </section>
}
