import Link from 'next/link'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { SceneExplorer } from '@/components/illustrations/scene-explorer'
export default async function ReadingRoomPage() {
 await requireWriter()
 return <div><header><p className="studio-eyebrow">Read. Notice. Imagine.</p><h1 className="studio-heading mt-3">The reading room</h1><p className="mt-4 max-w-2xl text-studio-muted leading-7">Spend time with a passage. Follow a teacher&rsquo;s observations. Find a beginning of your own.</p></header>
  <div className="mt-9 grid gap-8 md:grid-cols-2"><Link href="/app/writer/examples" className="border-y border-studio-line py-6 hover:bg-studio-tint"><h2 className="literary-title text-2xl">Stories, closely read</h2><p className="mt-3 text-sm leading-7 text-studio-muted">Explore annotated examples and the writing choices behind them.</p><span className="studio-link mt-4 inline-block">Browse annotated examples</span></Link><Link href="/app/writer/documents" className="border-y border-studio-line py-6 hover:bg-studio-tint"><h2 className="literary-title text-2xl">From your teacher&rsquo;s desk</h2><p className="mt-3 text-sm leading-7 text-studio-muted">Read and print the handouts and exercises shared with your group.</p><span className="studio-link mt-4 inline-block">Open teaching materials</span></Link></div>
  <SceneExplorer />
 </div>
}
