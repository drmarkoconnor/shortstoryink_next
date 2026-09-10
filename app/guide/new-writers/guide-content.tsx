import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandWordmark } from '@/components/brand/brand-wordmark'
import { guideImages } from './guide-images'

export const guideNav = [
 { href: '/guide/new-writers', label: 'Overview' },
 { href: '/guide/new-writers/getting-started', label: 'Getting started' },
 { href: '/guide/new-writers/submitting', label: 'Submitting' },
 { href: '/guide/new-writers/feedback', label: 'Reading feedback' },
 { href: '/guide/new-writers/revising', label: 'Revising' },
 { href: '/guide/new-writers/how-feedback-works', label: 'How teaching works' },
]

export function GuideShell({ activeHref, children }: { activeHref: string; children: ReactNode }) {
 return <div className="min-h-screen bg-studio-canvas text-studio-ink">
  <a href="#guide-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 studio-primary">Skip to guide</a>
  <header className="studio-header"><BrandWordmark /><Link href="/app" className="studio-secondary">Back to the studio</Link></header>
  <nav aria-label="Writing guide chapters" className="guide-chapters">
   {guideNav.map(item => <Link key={item.href} href={item.href} aria-current={activeHref === item.href ? 'page' : undefined}>{item.label}</Link>)}
  </nav>
  <main id="guide-content" className="guide-content">{children}</main>
  <footer className="guide-footer"><p>Screenshots show the current interface with fictional example writing.</p><Link href="/guide/new-writers" className="studio-link">All guide chapters</Link></footer>
 </div>
}

export function GuideHero({ kicker, title, body }: { kicker: string; title: string; body: string }) {
 return <header className="guide-intro"><p className="studio-eyebrow">{kicker}</p><h1 className="literary-title mt-5 text-4xl leading-tight sm:text-5xl">{title}</h1><p className="mt-6 max-w-[62ch] text-lg leading-8 text-studio-muted">{body}</p></header>
}

export function Figure({ image, caption }: { image: keyof typeof guideImages; caption: string }) {
 const asset = guideImages[image]
 return <figure className="guide-figure">
  <a href={asset.src} target="_blank" rel="noreferrer" aria-label={`Open full-size screenshot: ${asset.alt}`} className="guide-image-link">
   <Image src={asset.src} alt={asset.alt} width={asset.width} height={asset.height} sizes="(max-width: 768px) 92vw, 1080px" unoptimized className="h-auto w-full" style={{maxWidth:asset.width}} />
  </a>
  <figcaption className="flex flex-wrap items-start justify-between gap-4 px-1 pt-4 text-sm leading-6 text-studio-muted"><span className="max-w-[65ch]">{caption}</span><a href={asset.src} target="_blank" rel="noreferrer" className="studio-link shrink-0" aria-label={`Open full-size screenshot: ${asset.alt}`}>Open full-size image ↗</a></figcaption>
 </figure>
}

export function GuideStep({ number, title, children, image, caption }: { number: string; title: string; children: ReactNode; image?: keyof typeof guideImages; caption?: string }) {
 return <section className="guide-step">
  <div className="guide-step-copy"><p className="studio-eyebrow">Step {number}</p><h2 className="literary-title mt-4 text-3xl leading-tight sm:text-4xl">{title}</h2><div className="mt-5 max-w-[65ch] space-y-4 text-base leading-8 text-studio-muted">{children}</div></div>
  {image ? <Figure image={image} caption={caption || title} /> : null}
 </section>
}

export function NextGuideLink({ href, label }: { href: string; label: string }) {
 return <div className="guide-next"><p className="studio-eyebrow">When you are ready</p><Link href={href} className="studio-primary mt-5">{label} →</Link></div>
}
