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
 const [filter, setFilter] = useState('all')
 const [query, setQuery] = useState('')
 const visible = illustrations.filter(item => (filter === 'all' || item.category === filter) && item.title.toLowerCase().includes(query.trim().toLowerCase()))
 const selectedImage = illustrations.find(item => item.id === selected)
 useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
 return <dialog ref={dialog} onCancel={onClose} aria-labelledby="illustration-picker-title" className="studio-picker document-builder-controls">
  <div className="shrink-0">
   <div className="flex items-start justify-between gap-4">
    <div><p className="studio-eyebrow">A world of imagination</p><h2 id="illustration-picker-title" className="literary-title mt-2 text-3xl">Choose an illustration</h2></div>
    <button type="button" onClick={onClose} className="studio-secondary">Close</button>
   </div>
   <p className="mt-3 text-sm text-studio-muted">Illustrations for your handout and its printout.</p>
   <div className="my-4 flex flex-wrap gap-3">
    <label className="sr-only" htmlFor="illustration-search">Search illustrations</label>
    <input id="illustration-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search illustrations" className="min-w-0 flex-1 rounded border border-studio-line bg-white p-2 text-sm" />
    <label className="sr-only" htmlFor="illustration-filter">Illustration collection</label>
    <select id="illustration-filter" value={filter} onChange={event => setFilter(event.target.value)} className="rounded border border-studio-line bg-white p-2 text-sm"><option value="all">All illustrations</option><option value="craft">Writing themes</option><option value="settings">Settings</option></select>
   </div>
  </div>
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
   <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"><legend className="sr-only">Illustration</legend>
    {visible.map(item => <label key={item.id} className={`cursor-pointer rounded border p-2 ${selected === item.id ? 'border-studio-accent bg-studio-soft' : 'border-studio-line'}`}>
     <Image src={item.src} alt={item.alt} width={item.width} height={item.height} sizes="(max-width: 640px) 85vw, 260px" className="studio-illustration" />
     <span className="mt-3 flex items-center gap-2 text-sm"><input type="radio" name="illustration" value={item.id} aria-label={item.title} checked={selected === item.id} onChange={() => setSelected(item.id)} />{item.title}</span>
    </label>)}
   </fieldset>
   {visible.length === 0 ? <p className="py-8 text-sm text-studio-muted" role="status">No illustrations match. Try another search or collection.</p> : null}
  </div>
  <div className="mt-4 shrink-0 border-t border-studio-line pt-3">
   <p className="text-sm text-studio-muted" aria-live="polite">Selected: {selectedImage?.title}</p>
   <label className="mt-2 block text-sm">Caption <span className="text-studio-muted">(optional)</span><input value={caption} onChange={event => setCaption(event.target.value)} maxLength={500} className="mt-1 w-full rounded border border-studio-line bg-white p-2" /></label>
   <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
    <label className="text-sm">Image size<select value={size} onChange={event => setSize(event.target.value)} className="ml-3 rounded border border-studio-line bg-white p-2"><option value="wide">Full width</option><option value="compact">Compact</option></select></label>
    <button type="button" onClick={() => onChoose({illustrationId:selected, caption, size})} className="studio-primary">{initial?.illustrationId ? 'Update illustration' : 'Insert illustration'}</button>
   </div>
  </div>
 </dialog>
}
