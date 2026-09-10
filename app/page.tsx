import Image from 'next/image'
import Link from 'next/link'
import { BrandWordmark } from '@/components/brand/brand-wordmark'
export default function HomePage() {
 return <div className="min-h-screen bg-studio-canvas">
  <header className="studio-header"><BrandWordmark /><nav aria-label="Main navigation" className="flex items-center gap-6 text-sm"><Link href="/auth/sign-in">Sign in</Link><Link href="/auth/sign-up" className="studio-secondary">Join the studio</Link></nav></header>
  <main className="studio-main">
   <section className="grid items-center gap-12 py-8 lg:grid-cols-[1fr_1.05fr] lg:py-14">
    <div><p className="studio-eyebrow">A place for the writing life</p><h1 className="literary-title mt-6 text-5xl leading-[1.08] sm:text-6xl lg:text-7xl">Every story begins<br /><span className="italic">with noticing.</span></h1><p className="mt-7 max-w-lg text-lg leading-8 text-studio-muted">A thoughtful space for short fiction. Bring your words, read closely, and discover what your writing might become.</p><div className="mt-8 flex flex-wrap gap-4"><Link href="/auth/sign-in" className="studio-primary">Enter the studio</Link><Link href="/guide/new-writers" className="studio-secondary">How it works</Link></div></div>
    <figure><Image src="/illustrations/park.webp" alt="An illustrated park with quiet paths and people whose stories are waiting to be imagined." width={1774} height={887} priority sizes="(max-width: 1024px) 90vw, 640px" className="studio-illustration" /><figcaption className="mt-4 font-serif italic text-studio-muted">Someone, somewhere, under pressure. A world of possibilities.</figcaption></figure>
   </section>
   <section className="mt-12 grid gap-8 border-y border-studio-line py-10 md:grid-cols-3">{[
    ['Write', 'Find your next sentence.', 'A quiet manuscript surface, with draft recovery while you work.'],
    ['Read', 'See how stories work.', 'Explore teaching materials and annotated examples, close to the words themselves.'],
    ['Revise', 'Return with fresh eyes.', 'Thoughtful feedback anchored in your manuscript, ready for your next draft.'],
   ].map(([label,title,body]) => <div key={label}><p className="studio-eyebrow">{label}</p><h2 className="literary-title mt-4 text-2xl">{title}</h2><p className="mt-3 text-sm leading-7 text-studio-muted">{body}</p></div>)}</section>
   <footer className="mt-8 flex flex-wrap justify-between gap-4 text-sm text-studio-muted"><p>shortstory.ink · A practice of attention</p><Link href="/auth/sign-up" className="studio-link">Begin your writing journey</Link></footer>
  </main>
 </div>
}
