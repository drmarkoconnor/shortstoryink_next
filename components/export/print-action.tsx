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
			className="studio-secondary">
			Print or save PDF
		</button>
	)
}
