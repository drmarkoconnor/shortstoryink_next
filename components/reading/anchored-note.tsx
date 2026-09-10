'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function NoteMarker({ number, category, active, onOpen }: {
 number: number; category: string; active: boolean; onOpen: (anchor: HTMLButtonElement) => void
}) {
 return <button type="button" data-note-marker="true" aria-label={`Open note ${number}: ${category}`} aria-expanded={active} aria-haspopup="dialog" onClick={event => onOpen(event.currentTarget)} className={`example-note-marker ${active ? 'example-note-marker--active' : ''}`}>{number}</button>
}

export function AnchoredNote({ anchor, title, onClose, children }: {
 anchor: HTMLElement; title: string; onClose: () => void; children: ReactNode
}) {
 const panel = useRef<HTMLDivElement>(null)
 const close = useRef(onClose)
 close.current = onClose
 const [position, setPosition] = useState({ left: 16, top: 16, visible: false })
 useLayoutEffect(() => {
  const place = () => {
   const box = anchor.getBoundingClientRect()
   if (!anchor.isConnected || box.bottom < 0 || box.top > window.innerHeight) { close.current(); return }
   const width = panel.current?.offsetWidth ?? 360
   const height = panel.current?.offsetHeight ?? 300
   const rightFits = box.right + 20 + width <= window.innerWidth - 16
   const left = rightFits ? box.right + 20 : Math.max(16, Math.min(box.left, window.innerWidth - width - 16))
   const top = Math.max(16, Math.min(rightFits ? box.top : box.bottom + 12, window.innerHeight - height - 16))
   setPosition({ left, top, visible: true })
  }
  place()
  const observer = new ResizeObserver(place)
  if (panel.current) observer.observe(panel.current)
  window.addEventListener('resize', place)
  window.addEventListener('scroll', place, true)
  return () => { observer.disconnect(); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
 }, [anchor])
 useEffect(() => {
  panel.current?.focus({ preventScroll: true })
  const keydown = (event: KeyboardEvent) => {
   if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); anchor.focus({ preventScroll: true }) }
  }
  const outside = (event: PointerEvent) => {
   if (event.target instanceof Node && !panel.current?.contains(event.target) && !anchor.contains(event.target)) close.current()
  }
  document.addEventListener('keydown', keydown, true)
  document.addEventListener('pointerdown', outside)
  return () => { document.removeEventListener('keydown', keydown, true); document.removeEventListener('pointerdown', outside) }
 }, [anchor])
 return createPortal(<div ref={panel} role="dialog" aria-label={title} tabIndex={-1} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.stopPropagation() }} data-selection-ignore="true" className="example-note-popover" style={{left:position.left,top:position.top,visibility:position.visible?'visible':'hidden'}}>
  <div className="flex items-start justify-between gap-4"><h2 className="studio-eyebrow">{title}</h2><button type="button" className="studio-link text-sm" onClick={() => { onClose(); anchor.focus({preventScroll:true}) }}>Close</button></div>
  {children}
 </div>, document.body)
}

export function ReadingNavigation({ index, total, onChange }: {index:number;total:number;onChange:(index:number)=>void}) {
 return <nav aria-label="Reading sections" className="flex flex-wrap items-center justify-between gap-3 border-y border-studio-line py-4">
  <button type="button" className="studio-secondary" disabled={index === 0} onClick={() => onChange(index-1)}>Previous</button>
  <label className="flex items-center gap-2 text-sm text-studio-muted">Section<select aria-label="Reading section" className="rounded border border-studio-line bg-white px-2 py-2" value={index} onChange={event=>onChange(Number(event.target.value))}>{Array.from({length:total},(_,i)=><option key={i} value={i}>{i+1} of {total}</option>)}</select></label>
  <button type="button" className="studio-secondary" disabled={index === total-1} onClick={() => onChange(index+1)}>Next</button>
 </nav>
}
