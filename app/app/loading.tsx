export default function AppLoading() {
	return (
		<div className="mx-auto w-full max-w-6xl px-6 py-10 text-studio-ink">
			<div className="surface space-y-4 p-5">
				<div className="h-3 w-32 rounded bg-studio-tint" />
				<div className="h-7 w-64 rounded bg-studio-tint" />
				<div className="grid gap-3 md:grid-cols-3">
					<div className="h-24 rounded-lg border border-studio-line bg-studio-tint" />
					<div className="h-24 rounded-lg border border-studio-line bg-studio-tint" />
					<div className="h-24 rounded-lg border border-studio-line bg-studio-tint" />
				</div>
			</div>
		</div>
	)
}
