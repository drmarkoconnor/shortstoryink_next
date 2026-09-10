import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandWordmark } from '@/components/brand/brand-wordmark'

export function AuthFrame({ children }: { children: ReactNode }) {
 return <div className="min-h-screen bg-studio-canvas">
  <header className="studio-header"><BrandWordmark /><Link href="/guide/new-writers" className="studio-link">Writing guide</Link></header>
  <main className="mx-auto w-full max-w-xl px-5 py-12 sm:px-8 sm:py-20">{children}</main>
  <footer className="mx-auto flex max-w-xl flex-wrap justify-center gap-6 px-5 pb-10 text-sm text-studio-muted"><Link href="/auth/sign-in" className="hover:underline">Sign in</Link><Link href="/auth/sign-up" className="hover:underline">Create an account</Link></footer>
 </div>
}
