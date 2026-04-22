'use client'

import type { ChangeEvent, KeyboardEvent } from 'react'

function indentSelectedLines(
	value: string,
	selectionStart: number,
	selectionEnd: number,
) {
	const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
	const selectedText = value.slice(lineStart, selectionEnd)
	const indentedText = selectedText.replace(/^/gm, '\t')

	return {
		nextValue:
			value.slice(0, lineStart) + indentedText + value.slice(selectionEnd),
		nextSelectionStart: selectionStart + 1,
		nextSelectionEnd:
			selectionEnd + (indentedText.length - selectedText.length),
	}
}

function outdentSelectedLines(
	value: string,
	selectionStart: number,
	selectionEnd: number,
) {
	const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
	const selectedText = value.slice(lineStart, selectionEnd)
	let removedBeforeStart = 0
	let removedTotal = 0

	const outdentedText = selectedText.replace(
		/^(\t| {1,4})/gm,
		(match, _indent, offset) => {
			removedTotal += match.length
			if (offset < selectionStart - lineStart) {
				removedBeforeStart += match.length
			}
			return ''
		},
	)

	return {
		nextValue:
			value.slice(0, lineStart) + outdentedText + value.slice(selectionEnd),
		nextSelectionStart: Math.max(
			lineStart,
			selectionStart - removedBeforeStart,
		),
		nextSelectionEnd: Math.max(lineStart, selectionEnd - removedTotal),
	}
}

export function ManuscriptTextarea({
	name,
	defaultValue,
	placeholder,
	rows,
	className,
	required,
	form,
	onValueChange,
}: {
	name: string
	defaultValue?: string
	placeholder?: string
	rows?: number
	className?: string
	required?: boolean
	form?: string
	onValueChange?: (value: string) => void
}) {
	const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		onValueChange?.(event.currentTarget.value)
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key !== 'Tab') {
			return
		}

		event.preventDefault()

		const textarea = event.currentTarget
		const { selectionStart, selectionEnd, value } = textarea

		if (selectionStart !== selectionEnd) {
			const result = event.shiftKey
				? outdentSelectedLines(value, selectionStart, selectionEnd)
				: indentSelectedLines(value, selectionStart, selectionEnd)

			textarea.value = result.nextValue
			textarea.setSelectionRange(
				result.nextSelectionStart,
				result.nextSelectionEnd,
			)
			onValueChange?.(textarea.value)
			return
		}

		if (event.shiftKey) {
			const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
			const linePrefix = value.slice(lineStart, selectionStart)
			const indentMatch = linePrefix.match(/(\t| {1,4})$/)

			if (!indentMatch) {
				return
			}

			const removeLength = indentMatch[0].length
			textarea.value =
				value.slice(0, selectionStart - removeLength) +
				value.slice(selectionEnd)
			textarea.setSelectionRange(
				selectionStart - removeLength,
				selectionEnd - removeLength,
			)
			onValueChange?.(textarea.value)
			return
		}

		textarea.value =
			value.slice(0, selectionStart) + '\t' + value.slice(selectionEnd)
		textarea.setSelectionRange(selectionStart + 1, selectionStart + 1)
		onValueChange?.(textarea.value)
	}

	return (
		<textarea
			name={name}
			defaultValue={defaultValue}
			placeholder={placeholder}
			rows={rows}
			className={className}
			required={required}
			form={form}
			onChange={handleChange}
			onKeyDown={handleKeyDown}
		/>
	)
}
