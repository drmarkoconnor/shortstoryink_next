// Generates disposable routes outside the protected application. Never deploy
// these routes; CI removes them before a production build. No real accounts.
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile, rm, access } from 'node:fs/promises'
const paths=['app/project-browser-test','app/api/project-browser-test']
const backup='.project-browser-next-config.private'
if(process.argv[2]==='--clean'){
 for(const path of paths)await rm(path,{recursive:true,force:true})
 try{await writeFile('next.config.ts',await readFile(backup));await rm(backup)}catch{/* Already clean. */}
 process.exit(0)
}
assert.equal(process.env.PROJECT_BROWSER_FIXTURE,'true','Explicit synthetic-fixture permission required')
assert.notEqual(process.env.CONTEXT,'production','Refuse a production environment')
for(const path of paths){try{await access(path);throw new Error('Fixture route already exists: '+path)}catch(error){if(error.code!=='ENOENT')throw error};await mkdir(path,{recursive:true})}
await writeFile(backup,await readFile('next.config.ts'),{flag:'wx',mode:0o600})
const config=await readFile('next.config.ts','utf8')
await writeFile('next.config.ts',config.replace('const nextConfig: NextConfig = {',"const nextConfig: NextConfig = {\n serverExternalPackages: ['@electric-sql/pglite'],"))
await writeFile('app/api/project-browser-test/route.ts',"import {fixtureRequest} from '@/tests/project-browser-fixture'\nexport const runtime='nodejs'\nexport const dynamic='force-dynamic'\nexport const GET=fixtureRequest\nexport const POST=fixtureRequest\n")
await writeFile('app/project-browser-test/page.tsx',`import {ProjectWorkspace} from '@/components/projects/project-workspace'
import {fixtureOwner,fixtureGroup} from '@/tests/project-browser-fixture'
export const dynamic='force-dynamic'
export default async function Page({searchParams}:{searchParams:Promise<{projectId?:string}>}){
 if(process.env.PROJECT_BROWSER_FIXTURE!=='true'||process.env.CONTEXT==='production')throw new Error('Fixture disabled')
 const {projectId}=await searchParams
 return <div className="studio-shell studio-shell--writer"><header className="studio-header"><span className="literary-title text-3xl">shortstory.ink</span><span>Synthetic browser rehearsal</span></header><main className="app-shell-main studio-main"><ProjectWorkspace ownerId={fixtureOwner} projectId={projectId??''} groups={[{id:fixtureGroup,title:'Browser test writers'}]} apiBase="/api/project-browser-test"/></main></div>
}
`)
