/** Original illustrations generated for shortstory.ink, September 2026.
 * Keep IDs stable: saved teaching documents refer to them. No remote image URLs.
 */
export const illustrations = [
 { id: 'park', title: 'The park', alt: 'A quiet park with benches, trees and people passing along a sunlit path.', prompt: 'Someone has come to the park to meet a person who may never arrive.' },
 { id: 'railway-platform', title: 'The railway platform', alt: 'Travellers waiting on a quiet railway platform beside the tracks.', prompt: 'The train is approaching. Someone must decide whether to leave.' },
 { id: 'cafe', title: 'The café', alt: 'A softly lit café with tables, chairs and a view through the windows.', prompt: 'Two people share a table. Only one knows why they are really here.' },
 { id: 'kitchen', title: 'The kitchen', alt: 'An intimate kitchen with everyday objects and daylight at the window.', prompt: 'An ordinary object in this room has become impossible to ignore.' },
 { id: 'coastal-path', title: 'The coastal path', alt: 'A winding path above a quiet coast, with sea and distant headland.', prompt: 'A familiar walk takes someone further from home than they intended.' },
 { id: 'room-at-dusk', title: 'The room at dusk', alt: 'A quiet room as evening light falls across its furniture and window.', prompt: 'Something must be said before the light is gone.' },
].map(item => ({ ...item, src: `/illustrations/${item.id}.webp`, width: 1774, height: 887 }))

export function getIllustration(id: unknown) {
 return typeof id === 'string' ? illustrations.find(item => item.id === id) : undefined
}
export function normalizeIllustrationAttrs(attrs: Record<string, unknown> = {}) {
 const illustration = getIllustration(attrs.illustrationId)
 if (!illustration) return null
 return { illustrationId: illustration.id, caption: typeof attrs.caption === 'string' ? attrs.caption.slice(0, 500) : '', size: attrs.size === 'compact' ? 'compact' : 'wide' }
}
