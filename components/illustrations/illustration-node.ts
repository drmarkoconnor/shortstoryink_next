import { Node } from '@tiptap/core'
import { getIllustration, normalizeIllustrationAttrs } from '@/lib/illustrations/catalog'
export const StudioIllustrationNode = Node.create({
 name: 'studioIllustration', group: 'block', atom: true, selectable: true, draggable: true,
 addAttributes() { return {
  illustrationId: {default: 'park', parseHTML: element => element.getAttribute('data-illustration-id')},
  caption: {default: '', parseHTML: element => element.querySelector('figcaption')?.textContent || ''},
  size: {default: 'wide', parseHTML: element => element.getAttribute('data-size') || 'wide'},
 } },
 parseHTML() { return [{tag:'figure[data-type="studio-illustration"]'}] },
 renderHTML({node}) {
  const attrs = normalizeIllustrationAttrs(node.attrs)
  const item = getIllustration(attrs?.illustrationId)
  if (!item || !attrs) return ['figure', {'data-type':'studio-illustration'}, 'Illustration unavailable']
  return ['figure', {'data-type':'studio-illustration', 'data-illustration-id':item.id, 'data-size':attrs.size, class:'studio-figure'},
   ['img', {src:item.src, alt:item.alt, width:item.width, height:item.height}],
   ...(attrs.caption ? [['figcaption', {}, attrs.caption]] : []),
  ]
 },
})
