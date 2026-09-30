import { handleProjectRequest } from '@/lib/projects/http'
import { projectContext } from '@/lib/projects/server'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request) {return handleProjectRequest(request,await projectContext())}
export async function POST(request:Request) {return handleProjectRequest(request,await projectContext())}
