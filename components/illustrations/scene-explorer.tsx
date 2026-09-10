'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { illustrations } from '@/lib/illustrations/catalog'
export function SceneExplorer() {
 const [sceneId, setSceneId] = useState('park')
 const [visible, setVisible] = useState(true)
 const [pressure, setPressure] = useState<'internal'|'external'>('internal')
 const scene = illustrations.find(item => item.id === sceneId)!
 return <section className="mt-10 border-t border-studio-line pt-8">
  <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="studio-eyebrow">A world of imagination</p><h2 className="literary-title mt-3 text-3xl">Someone, somewhere, under pressure.</h2></div><button type="button" className="studio-link" onClick={() => setVisible(value => !value)} aria-expanded={visible}>{visible ? 'Hide illustration' : 'Show illustration'}</button></div>
  <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
   <div>{visible ? <Image src={scene.src} alt={scene.alt} width={1774} height={887} sizes="(max-width: 1024px) 90vw, 740px" className="studio-illustration" /> : null}<label className="mt-5 block text-sm">Choose a setting<select className="ml-3 max-w-full rounded border border-studio-line bg-white p-2" value={sceneId} onChange={event => setSceneId(event.target.value)}>{illustrations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
   <div><p className="studio-eyebrow">Try a beginning</p><p className="mt-4 font-serif text-2xl leading-relaxed">{scene.prompt}</p><fieldset className="mt-6"><legend className="text-sm text-studio-muted">Where does the pressure come from?</legend><div className="mt-3 flex flex-wrap gap-4">{(['internal','external'] as const).map(value => <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="pressure" checked={pressure === value} onChange={() => setPressure(value)} />{value === 'internal' ? 'Within' : 'The world outside'}</label>)}</div></fieldset><p aria-live="polite" className="mt-5 border-l-2 border-studio-line pl-4 text-sm leading-7 text-studio-muted">{pressure === 'internal' ? 'Give your character something they cannot admit. Let a small gesture reveal the strain.' : 'Introduce a deadline, an interruption or an unexpected arrival. Let the setting complicate their choice.'}</p><Link className="studio-primary mt-6" href="/app/writer#writing-draft">Take it to your draft</Link></div>
  </div>
 </section>
}
