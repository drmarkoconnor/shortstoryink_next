import { ProtoCard } from '@/components/prototype/card'
import { ProtoButton } from '@/components/prototype/button'

export function CarouselRail({
	title,
	items,
}: {
	title: string
	items: { id: string; label: string; note: string; url?: string }[]
}) {
	return (
		<section className="space-y-3">
			<h3 className="text-sm uppercase tracking-[0.12em] text-silver-300">
				{title}
			</h3>
			<div className="flex gap-3 overflow-x-auto pb-2">
				{items.map((item) => (
					<div key={item.id} className="min-w-[260px] max-w-[260px]">
						<ProtoCard
							title={item.label}
							meta="Reading resource"
							action={
								item.url ? (
									<ProtoButton as="a" href={item.url} variant="text">
										Open
									</ProtoButton>
								) : null
							}>
							{item.note}
						</ProtoCard>
					</div>
				))}
			</div>
		</section>
	)
}

