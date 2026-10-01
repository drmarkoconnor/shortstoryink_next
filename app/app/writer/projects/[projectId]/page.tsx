import { notFound } from 'next/navigation'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { createServerDataClient } from '@/lib/data/client'
import { projectsEnabled } from '@/lib/projects/server'
import { ProjectWorkspace } from '@/components/projects/project-workspace'
export const dynamic='force-dynamic'
export default async function Page({params}:{params:Promise<{projectId:string}>}){
 const profile=await requireWriter();if(!projectsEnabled())notFound();const {projectId}=await params
 const db=await createServerDataClient();const membership=await db.from('workshop_members').select('workshop_id').eq('profile_id',profile.user.id)
 const ids=(membership.data??[]).map(r=>String(r.workshop_id));let groups:{id:string;title:string;slug:string}[]=[]
 if(ids.length){const rows=await db.from('workshops').select('id,title,slug').in('id',ids);groups=(rows.data??[]).map(r=>({id:String(r.id),title:String(r.title),slug:String(r.slug??'')})).sort((a,b)=>Number(a.slug==='authorised-basic-user')-Number(b.slug==='authorised-basic-user')||a.title.localeCompare(b.title))}
 const rows=await db.from('submissions').select('id,title,status,version,parent_submission_id').eq('author_id',profile.user.id)
 const pieces=rows.data??[];const revisionSources=pieces.filter(p=>p.status==='feedback_published'&&!pieces.some(q=>String(q.parent_submission_id??q.id)===String(p.parent_submission_id??p.id)&&Number(q.version)>Number(p.version))).map(p=>({id:String(p.id),title:String(p.title),version:Number(p.version)}))
 return <ProjectWorkspace ownerId={profile.user.id} projectId={projectId} groups={groups} revisionSources={revisionSources}/>
}
