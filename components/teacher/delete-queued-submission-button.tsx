'use client'

export function DeleteQueuedSubmissionButton({
	disabled = false,
}: {
	disabled?: boolean
}) {
	return (
		<button
			type="submit"
			disabled={disabled}
			onClick={(event) => {
				if (
					!window.confirm(
						'Remove the selected submission from the review queue? This is only allowed before feedback has been added.',
					)
				) {
					event.preventDefault()
				}
			}}
			className="w-full rounded-full border border-rose-300/50 bg-rose-300/10 px-4 py-2 text-xs uppercase tracking-[0.1em] text-rose-100 transition hover:bg-rose-300/20 disabled:cursor-not-allowed disabled:opacity-50">
			Remove selected
		</button>
	)
}
