'use client'
import { useEffect, useRef, useState } from 'react'
import { craftTags, validateCommonplace, type CommonplaceInput } from '@/lib/commonplace/validation'
export type SaveNote = (input:CommonplaceInput)=>Promise<{error?:string}>
export function NoteEditor({initial,onSave,onClose,onSaved}:{initial:CommonplaceInput;onSave:SaveNote;onClose:()=>void;onSaved:(entry:CommonplaceInput)=>void}) {
 const [value,setValue]=useState(initial),[pending,setPending]=useState(false),[error,setError]=useState('')
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close()},[])
 function change(key:keyof CommonplaceInput,text:string){setValue(old=>({...old,[key]:text}))}
 async function submit(event:React.FormEvent){event.preventDefault();if(pending)return;const invalid=validateCommonplace(value);if(invalid){setError(invalid);return}setPending(true);setError('');try{const result=await onSave(value);if(result.error)setError(result.error);else onSaved(value)}catch{setError('We could not confirm the save. Your words are still here; please retry.')}finally{setPending(false)}}
 return <dialog ref={dialog} className="commonplace-dialog" aria-labelledby="note-title" onCancel={e=>{e.preventDefault();if(!pending)onClose()}}>
 <form onSubmit={submit}><fieldset disabled={pending} className="space-y-5">
 <div className="flex items-start justify-between gap-4"><div><p className="studio-eyebrow">Your private commonplace</p><h2 id="note-title" className="literary-title mt-2 text-3xl">Keep what matters</h2></div><button type="button" disabled={pending} className="studio-secondary" onClick={onClose}>Close</button></div>
 <p className="text-sm text-studio-muted">A passage, an observation or a thought to return to. Saved to your account, for you alone.</p>
 <label className="block text-sm">Passage or observation<textarea required maxLength={4000} rows={5} value={value.passage} onChange={e=>change('passage',e.target.value)} className="course-input font-serif" /></label>
 <label className="block text-sm">Source<input required maxLength={300} value={value.source} onChange={e=>change('source',e.target.value)} placeholder="Author and title, or My observation" className="course-input" /></label>
 <label className="block text-sm">Source link (optional)<input maxLength={1000} value={value.sourceUrl} onChange={e=>change('sourceUrl',e.target.value)} className="course-input" /></label>
 <label className="block text-sm">Why I’m keeping this (optional)<textarea maxLength={4000} rows={3} value={value.note} onChange={e=>change('note',e.target.value)} placeholder="What do you notice? What might you try?" className="course-input" /></label>
 <label className="block text-sm">Craft tag (optional)<select value={value.tag} onChange={e=>change('tag',e.target.value)} className="course-input"><option value="">No tag yet</option>{craftTags.map(tag=><option key={tag}>{tag}</option>)}</select></label>
 {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
 <button type="submit" disabled={pending} className="studio-primary">{pending?'Saving…':'Save to my commonplace'}</button>
 </fieldset></form></dialog>
}
