import Image from 'next/image'
import { getIllustration, normalizeIllustrationAttrs } from '@/lib/illustrations/catalog'
export function IllustrationFigure({ attrs }: { attrs?: Record<string, unknown> }) {
 const value = normalizeIllustrationAttrs(attrs)
 const item = getIllustration(value?.illustrationId)
 if (!item || !value) return null
 return <figure className="studio-figure" data-size={value.size}>
  <Image src={item.src} alt={item.alt} width={item.width} height={item.height} unoptimized loading="eager" className="studio-illustration" />
  {value.caption ? <figcaption>{value.caption}</figcaption> : null}
 </figure>
}
