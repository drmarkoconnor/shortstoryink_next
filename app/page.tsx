import Image from 'next/image'
import Link from 'next/link'
import penImage from '@/assets/images/piltopen.jpg'
import { BrandWordmark } from '@/components/brand/brand-wordmark'

const steps = [
	{
		title: 'Send the draft',
		body: 'Paste the piece into a quiet manuscript space, with the text kept at the centre rather than lost in a dashboard.',
	},
	{
		title: 'Read with a teacher',
		body: 'Feedback is anchored to the line, sentence, or passage it belongs to, so the response stays close to the writing.',
	},
	{
		title: 'Revise with continuity',
		body: 'The next draft begins from the conversation already made: what was noticed, what was strengthened, and what still asks for care.',
	},
]

export default function HomePage() {
	return (
		<main className="min-h-screen bg-ink-900 text-parchment-100">
			<section className="relative isolate overflow-hidden border-b border-white/10">
				<Image
					src={penImage}
					alt=""
					priority
					className="absolute inset-0 -z-20 h-full w-full object-cover opacity-[0.88] brightness-[1.32] contrast-[1.04]"
				/>
				<div className="absolute inset-0 -z-10 bg-ink-950/20" />
				<div className="absolute inset-y-0 left-0 -z-10 w-full bg-gradient-to-r from-ink-950/95 via-ink-950/55 to-ink-950/5" />
				<div className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-ink-900/90 to-transparent" />

				<div className="mx-auto flex min-h-[88vh] w-full max-w-6xl flex-col justify-center px-6 py-20 sm:py-24">
					<nav className="mb-16 flex flex-wrap items-center justify-between gap-4">
						<BrandWordmark />
						<div className="flex flex-wrap items-center gap-2 text-sm text-silver-100">
							<Link
								href="/auth/sign-in"
								className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-parchment-100 transition hover:bg-white/15">
								Sign in
							</Link>
						</div>
					</nav>

					<div className="max-w-3xl">
						<p className="mb-5 text-sm uppercase tracking-[0.18em] text-accent-300">
							Teacher-led close reading for short fiction
						</p>
						<h1 className="literary-title text-5xl leading-[1.04] text-parchment-100 sm:text-6xl lg:text-7xl">
							A better place for a serious draft to be read.
						</h1>
						<p className="mt-7 max-w-2xl text-lg leading-8 text-silver-100 sm:text-xl sm:leading-9">
							shortstory.ink is a calm writing studio for writers who want more
							than a quick note in the margin: close attention, exact feedback,
							and a clear way back into revision.
						</p>
					</div>
				</div>
			</section>

			<section className="mx-auto grid w-full max-w-6xl gap-5 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
				<div>
					<p className="text-xs uppercase tracking-[0.14em] text-accent-300">
						What it is
					</p>
					<h2 className="literary-title mt-3 max-w-xl text-3xl leading-tight text-parchment-100 sm:text-4xl">
						Not a content platform. Not a course portal. A room for reading
						properly.
					</h2>
				</div>
				<div className="space-y-5 text-[17px] leading-8 text-silver-100">
					<p>
						A short story asks to be read with judgement, patience, and a good
						ear. The app is built around that small but demanding exchange:
						writer, teacher, text, response, revision.
					</p>
					<p>
						Comments stay attached to the passage that earned them. Writers see
						feedback in context. Teachers can build a private store of examples,
						craft notes, and responses without turning the work into admin.
					</p>
				</div>
			</section>

			<section className="border-y border-white/10 bg-ink-950/35">
				<div className="mx-auto grid w-full max-w-6xl gap-4 px-6 py-14 md:grid-cols-3">
					{steps.map((step, index) => (
						<section
							key={step.title}
							className="rounded-2xl border border-white/15 bg-ink-800/90 p-5 shadow-glow">
							<p className="text-xs uppercase tracking-[0.14em] text-accent-300">
								0{index + 1}
							</p>
							<h3 className="literary-title mt-3 text-2xl text-parchment-100">
								{step.title}
							</h3>
							<p className="mt-3 text-[15px] leading-7 text-silver-100">
								{step.body}
							</p>
						</section>
					))}
				</div>
			</section>

			<section className="mx-auto grid w-full max-w-6xl gap-5 px-6 py-16 lg:grid-cols-2 lg:py-20">
				<div className="rounded-2xl border border-white/15 bg-ink-800/90 p-6 shadow-glow lg:p-8">
					<p className="text-xs uppercase tracking-[0.14em] text-accent-300">
						For writers
					</p>
					<h2 className="literary-title mt-3 text-3xl text-parchment-100">
						Know what to work on next.
					</h2>
					<p className="mt-4 text-[16px] leading-8 text-silver-100">
						No vague encouragement dressed up as feedback. The aim is to help
						you see what is working, what is nearly working, and where the next
						draft can become more precise.
					</p>
				</div>

				<div className="rounded-2xl border border-white/15 bg-ink-800/90 p-6 shadow-glow lg:p-8">
					<p className="text-xs uppercase tracking-[0.14em] text-accent-300">
						For teachers
					</p>
					<h2 className="literary-title mt-3 text-3xl text-parchment-100">
						Keep the teaching close to the text.
					</h2>
					<p className="mt-4 text-[16px] leading-8 text-silver-100">
						Read the draft in a calm folio, leave anchored comments, save useful
						excerpts, and prepare responses that feel considered rather than
						assembled in haste.
					</p>
				</div>
			</section>

			<section className="mx-auto w-full max-w-6xl px-6 pb-20">
				<div className="rounded-2xl border border-accent-300/25 bg-accent-400/10 p-6 lg:p-8">
					<p className="text-xs uppercase tracking-[0.14em] text-accent-300">
						A quiet invitation
					</p>
					<div className="mt-3 flex flex-wrap items-end justify-between gap-5">
						<div className="max-w-2xl">
							<h2 className="literary-title text-3xl text-parchment-100">
								If the draft matters, give it a reader who will stay with it.
							</h2>
							<p className="mt-4 text-[16px] leading-8 text-silver-100">
								Start with one piece. Read the feedback in place. Revise with
								the conversation still visible.
							</p>
						</div>
						<div className="flex flex-wrap gap-3">
							<div className="space-y-2">
								<p className="text-sm leading-6 text-silver-100">
									Why not send something for our feedback?
								</p>
								<Link
									href="/auth/sign-up"
									className="inline-flex rounded-full border border-accent-400/70 bg-accent-400/25 px-6 py-3 text-sm font-medium text-parchment-100 transition hover:bg-accent-400/35">
									Create a free account
								</Link>
							</div>
							<div className="space-y-2">
								<p className="text-sm leading-6 text-silver-100">
									Writer returning to your work?
								</p>
								<Link
									href="/auth/sign-in"
									className="inline-flex rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-medium text-parchment-100 transition hover:bg-white/15">
									Welcome back
								</Link>
							</div>
						</div>
					</div>
				</div>
			</section>
		</main>
	)
}
