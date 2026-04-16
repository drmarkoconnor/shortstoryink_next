import { requireTeacher } from '@/lib/auth/get-current-profile'

export default async function TeacherStudioPage() {
	await requireTeacher()

	return (
		<section className="surface p-8">
			<p className="text-xs uppercase tracking-[0.12em] text-silver-300">
				Teacher Studio
			</p>
			<h1 className="literary-title mt-2 text-3xl">Preparation workspace</h1>
			<p className="muted mt-4 max-w-prose">
				This next area will gather reusable teaching material: snippets,
				handouts, exercises, and saved references. The live review loop remains
				inside Workshop.
			</p>
		</section>
	)
}

