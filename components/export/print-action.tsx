'use client'

import { useEffect } from 'react'

export function PrintAction({
	filename,
}: {
	filename?: string
}) {
	useEffect(() => {
		if (!filename) {
			return
		}

		const previousTitle = document.title
		document.title = filename

		return () => {
			document.title = previousTitle
		}
	}, [filename])

	return (
		<button
			type="button"
			onClick={() => {
				if (filename) {
					document.title = filename
				}
				window.print()
			}}
			className="rounded-full border border-ink-900/15 bg-white px-4 py-2 text-xs uppercase tracking-[0.1em] text-ink-900 transition hover:bg-parchment-50">
			Print or save PDF
		</button>
	)
}
