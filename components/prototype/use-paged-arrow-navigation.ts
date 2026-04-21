'use client'

import { useEffect } from 'react'

function shouldIgnoreArrowPaging(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false
	}

	const tagName = target.tagName.toLowerCase()
	return (
		tagName === 'input' ||
		tagName === 'textarea' ||
		tagName === 'select' ||
		target.isContentEditable
	)
}

function hasActiveTextSelection() {
	const selection = window.getSelection()
	return Boolean(selection && !selection.isCollapsed)
}

export function usePagedArrowNavigation({
	pageIndex,
	totalPages,
	onPageChange,
}: {
	pageIndex: number
	totalPages: number
	onPageChange: (pageIndex: number) => void
}) {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (totalPages <= 1) {
				return
			}

			if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
				return
			}

			if (
				(event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') ||
				shouldIgnoreArrowPaging(event.target) ||
				hasActiveTextSelection()
			) {
				return
			}

			event.preventDefault()
			const direction = event.key === 'ArrowLeft' ? -1 : 1
			const nextPage = Math.max(
				0,
				Math.min(pageIndex + direction, totalPages - 1),
			)

			if (nextPage !== pageIndex) {
				onPageChange(nextPage)
			}
		}

		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [onPageChange, pageIndex, totalPages])
}
