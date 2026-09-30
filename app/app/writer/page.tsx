import WriterPage from '@/app/writer/page'
import { ProjectsEntry } from '@/components/projects/projects-entry'
import { projectsEnabled } from '@/lib/projects/server'

export default async function Page(props: Parameters<typeof WriterPage>[0]) {
	return (
		<>
			<ProjectsEntry enabled={projectsEnabled()} />
			<WriterPage {...props} />
		</>
	)
}
