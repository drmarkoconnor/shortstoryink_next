export default function AppLoading() {
	return (
		<div className="mx-auto w-full max-w-6xl px-6 py-10 text-parchment-100">
			<div className="surface space-y-4 p-5">
				<div className="h-3 w-32 rounded-full bg-white/10" />
				<div className="h-7 w-64 rounded-full bg-white/10" />
				<div className="grid gap-3 md:grid-cols-3">
					<div className="h-24 rounded-lg border border-white/10 bg-white/[0.03]" />
					<div className="h-24 rounded-lg border border-white/10 bg-white/[0.03]" />
					<div className="h-24 rounded-lg border border-white/10 bg-white/[0.03]" />
				</div>
			</div>
		</div>
	)
}
