import Link from 'next/link'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { createServerDataClient } from '@/lib/data/client'
import { CommonplaceBook } from '@/components/commonplace/commonplace-book'
import type { CommonplaceEntry } from '@/lib/commonplace/validation'
import { saveCommonplace,deleteCommonplace } from './actions'
export default async function Page(){
 const {user}=await requireWriter();const db=await createServerDataClient()
 const {data,error}=await db.from('snippets').select('id,snippet_text,note,anchor,updated_at').eq('saved_by',user.id).order('updated_at',{ascending:false})
 const entries:CommonplaceEntry[]=(data??[]).map(row=>({id:row.id,passage:row.snippet_text,source:String(row.anchor?.sourceLabel || 'My observation'),sourceUrl:String(row.anchor?.sourceUrl || ''),note:row.note||'',tag:row.anchor?.categoryLabel==='Uncategorised'?'':String(row.anchor?.categoryLabel||''),updatedAt:row.updated_at}))
 return <section className="mx-auto max-w-3xl"><p className="studio-eyebrow">A notebook for your writing life</p><h1 className="studio-heading mt-3">My commonplace</h1><p className="mt-5 max-w-2xl leading-8 text-studio-muted">Keep passages, observations and choices you want to remember. Your notes are private and saved to your account, so you can return on another device.</p><Link href="/app/course" className="studio-link mt-4 inline-block">Return to the workshop course</Link><CommonplaceBook initialEntries={entries} onSave={saveCommonplace} onDelete={deleteCommonplace} loadError={Boolean(error)} /></section>
}
