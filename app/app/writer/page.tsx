import Link from 'next/link'
import WriterPage from '@/app/writer/page'
import { projectsEnabled } from '@/lib/projects/server'
export default async function Page(props:Parameters<typeof WriterPage>[0]){
 return <>{projectsEnabled()&&<aside className="mb-6 border-b border-studio-line pb-4"><Link href="/app/writer/projects" className="studio-link">Your projects — organise sections, snapshots and compiled manuscripts</Link></aside>}<WriterPage {...props}/></>
}
