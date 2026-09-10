'use client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { illustrations } from '@/lib/illustrations/catalog'
export function IllustrationPicker({ initial, onChoose, onClose }: {
 initial?: { illustrationId?: string; caption?: string; size?: string }
 onChoose: (attrs: {illustrationId: string; caption: string; size: string}) => void
 onClose: () => void
}) {
 const dialog = useRef<HTMLDialogElement>(null)
 const [selected, setSelected] = useState(initial?.illustrationId || 'park')
 const [caption, setCaption] = useState(initial?.caption || '')
 const [size, setSize] = useState(initial?.size || 'wide')
 useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
 return <dialog ref={dialog} onCancel={onClose} aria-labelledby="illustration-picker-title" className="studio-picker document-builder-controls">
  <div className="flex items-start justify-between gap-4">
   <div><p className="studio-eyebrow">A world of imagination</p><h2 id="illustration-picker-title" className="literary-title mt-2 text-3xl">Choose a setting</h2></div>
   <button type="button" onClick={onClose} className="studio-secondary">Close</button>
  </div>
  <p className="mt-3 text-sm text-studio-muted">Place an illustration at your cursor. It stays with the saved handout and its printout.</p>
  <fieldset className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><legend className="sr-only">Illustration</legend>
   {illustrations.map(item => <label key={item.id} className={`cursor-pointer rounded border p-2 ${selected === item.id ? 'border-studio-accent bg-studio-soft' : 'border-studio-line'}`}>
    <Image src={item.src} alt={item.alt} width={item.width} height={item.height} sizes="(max-width: 640px) 85vw, 260px" className="studio-illustration" />
    <span className="mt-3 flex items-center gap-2 text-sm"><input type="radio" name="illustration" value={item.id} checked={selected === item.id} onChange={() => setSelected(item.id)} />{item.title}</span>
   </label>)}
  </fieldset>
  <label className="mt-6 block text-sm">Caption <span className="text-studio-muted">(optional)</span><input value={caption} onChange={event => setCaption(event.target.value)} maxLength={500} className="mt-2 w-full rounded border border-studio-line bg-white p-3" /></label>
  <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
   <label className="text-sm">Image size<select value={size} onChange={event => setSize(event.target.value)} className="ml-3 rounded border border-studio-line bg-white p-2"><option value="wide">Full width</option><option value="compact">Compact</option></select></label>
   <button type="button" onClick={() => onChoose({illustrationId:selected, caption, size})} className="studio-primary">{initial?.illustrationId ? 'Update illustration' : 'Insert illustration'}</button>
  </div>
 </dialog>
}
