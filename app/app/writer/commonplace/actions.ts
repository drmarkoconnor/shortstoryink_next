'use server'
import { revalidatePath } from 'next/cache'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { createServerDataClient } from '@/lib/data/client'
import { safeSourceUrl, validateCommonplace, type CommonplaceInput } from '@/lib/commonplace/validation'
export async function saveCommonplace(input:CommonplaceInput):Promise<{error?:string}> {
 const {user}=await requireWriter()
 if (!input || ['id','passage','source','sourceUrl','note','tag'].some(key=>typeof input[key as keyof CommonplaceInput]!=='string')) return {error:'Please complete the note and try again.'}
 const invalid=validateCommonplace(input);if(invalid)return {error:invalid}
 const db=await createServerDataClient()
 const result=await db.from('snippets').upsert({
  id:input.id,saved_by:user.id,captured_by:user.id,source_type:'external',visibility:'private',snippet_text:input.passage,note:input.note,
  anchor:{blockId:'commonplace',startOffset:0,endOffset:input.passage.length,quote:input.passage,sourceLabel:input.source,sourceUrl:safeSourceUrl(input.sourceUrl),categoryLabel:input.tag || 'Uncategorised',kind:'writer-commonplace'},
 },{onConflict:'id'}).select('id').single()
 if(result.error || !result.data)return {error:'Your note could not be saved. It is still here; please try again.'}
 revalidatePath('/app/writer/commonplace');return {}
}
export async function deleteCommonplace(id:string):Promise<{error?:string}> {
 const {user}=await requireWriter()
 if(!/^[0-9a-f-]{36}$/i.test(id))return {error:'That note could not be found.'}
 const db=await createServerDataClient()
 const result=await db.from('snippets').delete().eq('id',id).eq('saved_by',user.id).select('id').maybeSingle()
 if(result.error || !result.data)return {error:'The note could not be removed. Please reload and try again.'}
 revalidatePath('/app/writer/commonplace');return {}
}
