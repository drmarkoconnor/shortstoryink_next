import Image from 'next/image'
import Link from 'next/link'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { requireTeacher } from '@/lib/auth/get-current-profile'
import { teacherTabs } from '@/lib/mock/teacher-prototype'
import { createServerDataClient } from '@/lib/data/client'

export default async function TeacherStudioPage() {
 const profile = await requireTeacher()
 const client = await createServerDataClient()
 const {data, error} = await client.from('teacher_documents').select('id, title, updated_at').eq('owner_id', profile.user.id).order('updated_at', {ascending:false}).limit(5)
 const documents = (data ?? []) as {id:string; title:string; updated_at:string}[]
 return <div className="space-y-8">
  <MenuTabs tabs={teacherTabs} active="/app/teacher-studio" />
  <header className="flex flex-wrap items-end justify-between gap-6"><div><p className="studio-eyebrow">Gather. Shape. Share.</p><h1 className="studio-heading mt-3">The editorial studio</h1><p className="mt-4 text-studio-muted">Turn a passage, a question or an image into something useful for another writer.</p></div><Link href="/app/teacher/documents" className="studio-primary">Create a handout</Link></header>
  <section className="border-l-2 border-studio-line pl-5"><p className="studio-eyebrow">Material in development</p><p className="mt-3 leading-7">The short-story course material is kept here privately while it develops. Share individual readings or handouts when they are useful rather than presenting an unfinished course to writers.</p><Link className="studio-link mt-3 inline-block" href="/app/course">Open private course material →</Link></section>
  <div className="grid gap-12 border-t border-studio-line pt-9 lg:grid-cols-[1fr_360px]">
   <section><h2 className="literary-title text-3xl">On your desk</h2><p className="mt-2 text-sm text-studio-muted">Your recent editorial and workshop documents</p>
    {error ? <p role="alert" className="mt-6 text-rose-800">Your documents could not be loaded. Please refresh to try again.</p> : documents.length ? <ul className="mt-5 divide-y divide-studio-line">{documents.map(document => <li key={document.id}><Link href={`/app/teacher/documents?document=${document.id}`} className="flex items-center justify-between gap-5 py-5 hover:bg-studio-tint"><span className="font-serif text-xl">{document.title || 'Untitled document'}</span><span className="shrink-0 text-xs text-studio-muted">{new Date(document.updated_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span></Link></li>)}</ul> : <p className="my-8 font-serif text-lg text-studio-muted">Your first handout can begin with a single question.</p>}
    <div className="mt-8 grid gap-6 border-t border-studio-line pt-7 sm:grid-cols-2"><div><h3 className="literary-title text-2xl">A commonplace for your practice</h3><p className="mt-3 text-sm leading-7 text-studio-muted">Return to the passages and observations you have collected.</p><Link className="studio-link mt-4 inline-block text-sm" href="/app/teacher/snippets">Browse saved passages</Link></div><div><h3 className="literary-title text-2xl">Read with a pencil</h3><p className="mt-3 text-sm leading-7 text-studio-muted">Annotate a source and draw out its craft for other writers.</p><Link className="studio-link mt-4 inline-block text-sm" href="/app/teacher/sources/read">Open the source reader</Link></div></div>
   </section>
   <aside><Image src="/illustrations/cafe.webp" alt="An intimate café setting for a writing exercise." width={1774} height={887} sizes="(max-width:1024px) 90vw, 360px" className="studio-illustration" /><p className="studio-eyebrow mt-5">A world of imagination</p><h2 className="literary-title mt-3 text-3xl">Someone. Somewhere.<br /><em>Under pressure.</em></h2><p className="mt-4 text-sm leading-7 text-studio-muted">Choose from nineteen illustrations of settings and writing themes in the handout editor. Add a caption, a prompt, or space for a writer&rsquo;s own beginning.</p><Link className="studio-link mt-5 inline-block text-sm" href="/app/teacher/documents">Make an illustrated handout</Link></aside>
  </div>
 </div>
}
