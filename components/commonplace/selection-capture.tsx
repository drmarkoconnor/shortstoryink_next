'use client'
import { useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { NoteEditor, type SaveNote } from './note-editor'
import type { CommonplaceInput } from '@/lib/commonplace/validation'
export function SelectionCapture({children,source,sourceUrl,onSave}:{children:ReactNode;source:string;sourceUrl:string;onSave:SaveNote}) {
 const root=useRef<HTMLDivElement>(null),[selection,setSelection]=useState(''),[draft,setDraft]=useState<CommonplaceInput|null>(null),[saved,setSaved]=useState(false)
 function capture(){const s=window.getSelection();if(s?.anchorNode && s.focusNode && root.current?.contains(s.anchorNode) && root.current.contains(s.focusNode))setSelection(s.toString())}
 return <><div ref={root} onMouseUp={capture} onKeyUp={capture} onTouchEnd={capture}>{children}</div>
 <div className="course-controls mt-5 flex flex-wrap items-center gap-4"><button type="button" className="studio-secondary" onClick={()=>{setSaved(false);setDraft({id:crypto.randomUUID(),passage:selection,source,sourceUrl,note:'',tag:''})}}>Keep a passage</button><p className="text-sm text-studio-muted">Select words first, or type a passage into your note.</p>{saved && <p role="status" className="text-sm">Saved. <Link href="/app/writer/commonplace" className="studio-link">Open my commonplace</Link></p>}</div>
 {draft && <NoteEditor initial={draft} onSave={onSave} onClose={()=>setDraft(null)} onSaved={()=>{setDraft(null);setSaved(true)}} />}</>
}
