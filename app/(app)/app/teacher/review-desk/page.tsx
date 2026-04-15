'use client'

import { useMemo, useState } from 'react'
import { MenuTabs } from '@/components/prototype/menu-tabs'
import { ProtoCard } from '@/components/prototype/card'
import { StoryFolio } from '@/components/prototype/story-folio'
import { ProtoButton } from '@/components/prototype/button'
import {
	linkedFeedback,
	reviewQueue,
	teacherTabs,
} from '@/lib/mock/teacher-prototype'

export default function TeacherReviewDeskPage() {
	const [activeId, setActiveId] = useState<string | null>(
		linkedFeedback[0]?.id ?? null,
	)
	const active = useMemo(
		() => linkedFeedback.find((item) => item.id === activeId) ?? null,
		[activeId],
	)

	return (
		<section className="space-y-5">
			<MenuTabs tabs={teacherTabs} active="/app/teacher/review-desk" />

			<div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
				<aside className="space-y-3">
					<ProtoCard title="Queue" meta="Submissions">
						<ul className="space-y-2">
							{reviewQueue.map((item) => (
								<li
									key={item.id}
									className="rounded-xl border border-white/10 bg-ink-900/40 p-3">
									<p className="text-xs uppercase tracking-[0.09em] text-silver-300">
										{item.status}
									</p>
									<p className="mt-1 text-sm text-parchment-100">
										{item.title}
									</p>
									<p className="mt-1 text-xs text-silver-300">
										{item.writer} · {item.submitted}
									</p>
								</li>
							))}
						</ul>
					</ProtoCard>

					<ProtoCard title="Review tools" meta="High density">
						<div className="flex flex-wrap gap-2">
							<ProtoButton variant="primary">Publish feedback</ProtoButton>
							<ProtoButton variant="secondary">Save draft notes</ProtoButton>
							<ProtoButton variant="ghost">Request revision</ProtoButton>
						</div>
					</ProtoCard>
				</aside>

				<main className="relative">
					<div
						className={`mb-3 overflow-hidden transition-all duration-300 ${
							active ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
						}`}>
						{active ? (
							<div className="surface border-burgundy-300/35 p-4">
								<div className="mb-2 flex items-center justify-between gap-2">
									<p className="text-xs uppercase tracking-[0.11em] text-silver-300">
										{active.title}
									</p>
									<ProtoButton variant="text" onClick={() => setActiveId(null)}>
										Dismiss
									</ProtoButton>
								</div>
								<p className="text-sm leading-relaxed text-silver-200">
									{active.note}
								</p>
							</div>
						) : null}
					</div>

					<StoryFolio title="The Orchard at Dusk">
						<p id="para-1">
							We walked down the lane before evening had properly arrived, each
							hedge holding the last small light and a smell of wet leaves.{' '}
							<button
								type="button"
								onMouseEnter={() => setActiveId('c1')}
								onClick={() => setActiveId('c1')}
								className="mark-grammar rounded px-1 transition hover:opacity-90">
								He don’t notice
							</button>{' '}
							the frost glazing the gate, only the dog waiting on the far side.
						</p>
						<p id="para-2">
							At the bend, the orchard opened like a chapel: branches arched,
							apples gone to windfall, and a hush so full I could hear my own
							sleeve brush against itself.{' '}
							<button
								type="button"
								onMouseEnter={() => setActiveId('c2')}
								onClick={() => setActiveId('c2')}
								className="mark-craft rounded px-1 transition hover:opacity-90">
								I thought of my mother’s hands
							</button>
							, red from washing pears in a bowl too small for the season.
						</p>
						<p id="para-3">
							We stood there longer than the weather allowed. Then he said the
							one sentence I had rehearsed never hearing, and the air seemed to
							tilt, not violently, but with the quiet certainty of a
							<button
								type="button"
								onMouseEnter={() => setActiveId('c3')}
								onClick={() => setActiveId('c3')}
								className="mark-craft rounded px-1 transition hover:opacity-90">
								page turned for good
							</button>
							.
						</p>
					</StoryFolio>
				</main>
			</div>
		</section>
	)
}

