export const craftTags = ['Noticing','Character','Setting','Point of view','Voice','Scene','Dialogue','Plot','Opening','Time','Image','Theme','Ending','Clarity','Revision'] as const
export type CommonplaceInput = {id:string; passage:string; source:string; sourceUrl:string; note:string; tag:string}
export type CommonplaceEntry = CommonplaceInput & {updatedAt:string}
export function safeSourceUrl(value:string):string {
 if (!value) return ''
 if (/^\/app\/(course|writer)(\/|\?|#|$)/.test(value) && !/[\\\r\n]/.test(value)) return value
 try {const url=new URL(value);return ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''} catch {return ''}
}
export function validateCommonplace(value:CommonplaceInput):string|null {
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)) return 'Please reopen the note and try again.'
 if (!value.passage.trim() || value.passage.length>4000) return 'Keep a passage or observation between 1 and 4,000 characters.'
 if (!value.source.trim() || value.source.length>300) return 'Add a source, or write “My observation” (up to 300 characters).'
 if (value.note.length>4000) return 'Keep your note within 4,000 characters.'
 if (value.sourceUrl.length>1000 || (value.sourceUrl && !safeSourceUrl(value.sourceUrl))) return 'Use a full http or https source link, or leave it blank.'
 if (value.tag && !(craftTags as readonly string[]).includes(value.tag)) return 'Choose a craft tag from the list.'
 return null
}
