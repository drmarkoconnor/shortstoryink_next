import 'server-only'
import { getStudioUser } from '@/lib/auth/studio-user'
import { studioDatabase } from '@/lib/data/connection'
import { sendSubmissionReceivedNotification } from '@/lib/notifications/email'
import { countWords } from './model'
import { executeProjectCommand } from './store'
import type { ProjectContext } from './http'

export function projectsEnabled() {
 if(process.env.WRITER_PROJECTS_ENABLED==='false')return false
 return process.env.WRITER_PROJECTS_ENABLED==='true' || process.env.CONTEXT==='deploy-preview'
}
export async function projectContext(): Promise<ProjectContext> {
 const user=await getStudioUser()
 if(!user)return {actorId:null,role:null,enabled:projectsEnabled(),execute:async()=>{throw new Error('Sign in required')}}
 const db=studioDatabase()
 const roleResult=await db.pool.query('select role::text as role from public.profiles where id=$1',[user.id])
 return {
  actorId:user.id,role:String(roleResult.rows[0]?.role??''),enabled:projectsEnabled(),
  async execute(actor,projectId,action,input) {
   if(actor!==user.id)throw new Error('Invalid actor')
   const client=await db.pool.connect()
   try{return await executeProjectCommand(client,user.id,projectId,action,input)}finally{client.release()}
  },
  async afterSubmit(result) {
   const submission=result.submission as {id?:string;created?:boolean}|undefined
   if(!submission?.id || !submission.created || result.replayed)return
   const row=(await db.pool.query('select s.title,s.body,w.title as group_title,p.display_name,u.email from public.submissions s join public.workshops w on w.id=s.workshop_id join public.profiles p on p.id=s.author_id join studio_auth.users u on u.id=p.id where s.id=$1 and s.author_id=$2',[submission.id,user.id])).rows[0]
   if(!row)return
   const editors=await db.pool.query("select u.email from public.profiles p join studio_auth.users u on u.id=p.id where p.role::text in ('teacher','admin') and not u.blocked")
   await sendSubmissionReceivedNotification({emails:editors.rows.map((r:{email:unknown})=>String(r.email)),title:String(row.title),writerLabel:String(row.display_name??'Writer'),writerEmail:String(row.email),workshopTitle:String(row.group_title),wordCount:countWords(String(row.body)),submissionId:submission.id})
  },
 }
}
