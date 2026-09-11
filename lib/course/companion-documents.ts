import 'server-only'
import {getCurrentProfile} from '@/lib/auth/get-current-profile'
import {createAdminDataClient} from '@/lib/data/client'
export async function companionDocuments(titles:string[]) {
 const {user,role}=await getCurrentProfile()
 if(role!=='writer')return []
 const db=createAdminDataClient()
 const membership=await db.from('workshop_members').select('workshop_id').eq('profile_id',user.id)
 if(membership.error)throw new Error('Your group materials could not be loaded. Please try again.')
 const groups=new Set((membership.data??[]).map(row=>row.workshop_id))
 if(!groups.size)return []
 const result=await db.from('teacher_documents').select('id,title,body').in('title',titles)
 if(result.error)throw new Error('Your companion handouts could not be loaded. Please try again.')
 return (result.data??[]).filter(row=>Array.isArray(row.body?.metadata?.groupIds)&&row.body.metadata.groupIds.some((id:string)=>groups.has(id))).map(row=>({title:String(row.title),href:`/app/writer/documents/${row.id}`}))
}
