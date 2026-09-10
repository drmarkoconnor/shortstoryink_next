/** Original illustrations generated for shortstory.ink, September 2026.
 * Keep IDs stable: saved teaching documents refer to them. No remote image URLs.
 */
const settings = [
 { id: 'park', title: 'The park', alt: 'A quiet park with benches, trees and people passing along a sunlit path.', prompt: 'Someone has come to the park to meet a person who may never arrive.' },
 { id: 'railway-platform', title: 'The railway platform', alt: 'Travellers waiting on a quiet railway platform beside the tracks.', prompt: 'The train is approaching. Someone must decide whether to leave.' },
 { id: 'cafe', title: 'The café', alt: 'A softly lit café with tables, chairs and a view through the windows.', prompt: 'Two people share a table. Only one knows why they are really here.' },
 { id: 'kitchen', title: 'The kitchen', alt: 'An intimate kitchen with everyday objects and daylight at the window.', prompt: 'An ordinary object in this room has become impossible to ignore.' },
 { id: 'coastal-path', title: 'The coastal path', alt: 'A winding path above a quiet coast, with sea and distant headland.', prompt: 'A familiar walk takes someone further from home than they intended.' },
 { id: 'room-at-dusk', title: 'The room at dusk', alt: 'A quiet room as evening light falls across its furniture and window.', prompt: 'Something must be said before the light is gone.' },
].map(item => ({ ...item, category: 'settings' as const }))

const writingThemes = [
 {
  "id": "openings",
  "title": "Openings",
  "alt": "An open green cottage door leads into a sunlit garden, with a travel bag beside the threshold.",
  "prompt": "Begin with someone on a threshold. What makes the next step difficult?"
 },
 {
  "id": "endings",
  "title": "Endings",
  "alt": "A woman watches a passenger boat depart a harbour at sunset.",
  "prompt": "Choose one final image that changes how we understand the story."
 },
 {
  "id": "feeling-stuck",
  "title": "Feeling stuck",
  "alt": "A writer pauses over a blank notebook beside a window overlooking an overgrown gate.",
  "prompt": "Let your character notice one ordinary object. Write the next sentence about it."
 },
 {
  "id": "time-in-fiction",
  "title": "Time in fiction",
  "alt": "A clockmaker works beside a large clock as people cross the square outside.",
  "prompt": "Tell the same minute quickly, then slowly. What changes in the reader’s experience?"
 },
 {
  "id": "clarity",
  "title": "Clarity",
  "alt": "Morning mist clears over a river with visible pebbles and a path toward a cottage.",
  "prompt": "Replace a vague description with three precise things the character can see."
 },
 {
  "id": "editing",
  "title": "Editing",
  "alt": "A writer considers loose pages beside a pencil, eraser and pruned herb plant.",
  "prompt": "Remove one explanation and let a gesture carry its meaning."
 },
 {
  "id": "free-writing",
  "title": "Free writing",
  "alt": "A young man sits beside a flowing stream, with an open notebook on the grass.",
  "prompt": "Write for five minutes without stopping to correct a sentence."
 },
 {
  "id": "metaphors-and-images",
  "title": "Metaphors and images",
  "alt": "A pond reflects trees and clouds as a woman sketches beside floating blossoms.",
  "prompt": "Describe a feeling through an image from the world around your character."
 },
 {
  "id": "location",
  "title": "Location",
  "alt": "A stone village street winds past a green shopfront toward an estuary.",
  "prompt": "Let three details of a place complicate what your character wants."
 },
 {
  "id": "character",
  "title": "Character",
  "alt": "A woman with a folded letter sits in a conservatory opposite an empty chair.",
  "prompt": "Choose a possession, a habit and a secret. Let them shape a character’s next action."
 },
 {
  "id": "plot",
  "title": "Plot",
  "alt": "A traveller considers two woodland paths, one toward a cottage and one obstructed by a fallen branch.",
  "prompt": "Give your character two possible paths and a reason neither is easy."
 },
 {
  "id": "voice",
  "title": "Voice",
  "alt": "Adults listen to a woman telling a story in a warmly lit library.",
  "prompt": "Tell the same event in two distinct voices. Notice what each speaker chooses to reveal."
 },
 {
  "id": "theme",
  "title": "Theme",
  "alt": "Roses in bud, bloom and fallen petals recur through a garden framed by an open gate.",
  "prompt": "Return to one image three times, changing its meaning each time."
 }
].map(item => ({ ...item, category: 'craft' as const }))

export const illustrations = [...settings, ...writingThemes].map(item => ({ ...item, src: `/illustrations/${item.id}.webp`, width: 1774, height: 887 }))

export const settingIllustrations = illustrations.filter(item => item.category === 'settings')

export function getIllustration(id: unknown) {
 return typeof id === 'string' ? illustrations.find(item => item.id === id) : undefined
}
export function normalizeIllustrationAttrs(attrs: Record<string, unknown> = {}) {
 const illustration = getIllustration(attrs.illustrationId)
 if (!illustration) return null
 return { illustrationId: illustration.id, caption: typeof attrs.caption === 'string' ? attrs.caption.slice(0, 500) : '', size: attrs.size === 'compact' ? 'compact' : 'wide' }
}
