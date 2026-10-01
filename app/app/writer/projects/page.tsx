import { notFound } from 'next/navigation'
import { requireWriter } from '@/lib/auth/get-current-profile'
import { projectsEnabled } from '@/lib/projects/server'
import { ProjectsHome } from '@/components/projects/project-workspace'
export const dynamic='force-dynamic'
export default async function Page(){await requireWriter();if(!projectsEnabled())notFound();return <ProjectsHome/>}
