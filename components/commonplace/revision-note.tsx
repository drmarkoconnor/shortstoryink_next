'use client'
import {useState} from 'react'
import Link from 'next/link'
import {NoteEditor} from './note-editor'
import {saveCommonplace} from '@/app/app/writer/commonplace/actions'
import type {CommonplaceInput} from '@/lib/commonplace/validation'
export function RevisionNote({title,submissionId}:{title:string;submissionId:string}){
 const [draft,setDraft]=useState<CommonplaceInput|null>(null),[saved,setSaved]=useState(false)
 return <section className="border-y border-studio-line py-6"><h2 className="literary-title text-2xl">One intention for this revision</h2><p className="mt-3 leading-8">What do you want the next version to do? After revising, note one choice changed, one retained and one question still alive.</p><p className="mt-2 text-sm text-studio-muted">Optional, private notes for you. They are saved separately from the manuscript and are not sent to your teacher.</p><div className="mt-4 flex flex-wrap gap-4"><button type="button" className="studio-secondary" onClick={()=>setDraft({id:crypto.randomUUID(),passage:`Revision of ${title}`,source:'My revision notes',sourceUrl:`/app/writer/revise/${submissionId}`,tag:'Revision',note:'My intention:\n\nA choice I changed:\n\nA choice I kept:\n\nA question still alive:\n'})}>Keep a revision note</button><Link className="studio-link" href="/app/writer/commonplace">Return to my notes</Link></div>{saved && <p role="status" className="mt-3 text-sm">Saved to your private commonplace.</p>}{draft && <NoteEditor initial={draft} onSave={saveCommonplace} onClose={()=>setDraft(null)} onSaved={()=>{setDraft(null);setSaved(true)}} />}</section>
}
