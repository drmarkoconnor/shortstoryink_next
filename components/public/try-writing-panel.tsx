'use client'

import { useRef, useState } from 'react'
import { ManuscriptTextarea } from '@/components/writer/manuscript-textarea'

export function TryWritingPanel({
	action,
}: {
	action: (formData: FormData) => void
}) {
	const [showEmail, setShowEmail] = useState(false)
	const emailRef = useRef<HTMLInputElement | null>(null)

	const handleSubmitCapture = (event: React.FormEvent<HTMLFormElement>) => {
		if (showEmail) {
			return
		}

		event.preventDefault()
		setShowEmail(true)
		window.requestAnimationFrame(() => {
			emailRef.current?.focus()
		})
	}

	return (
		<form
			action={action}
			onSubmitCapture={handleSubmitCapture}
			className="space-y-4">
			<label className="block">
				<span className="mb-2 block text-sm text-silver-200">Title</span>
				<input
					name="title"
					required
					className="w-full rounded-xl border border-white/15 bg-ink-900 px-4 py-2.5 text-parchment-100 outline-none ring-accent-400 transition focus:ring"
					placeholder="Draft title"
				/>
			</label>

			<label className="block">
				<span className="mb-2 block text-sm text-silver-200">Body text</span>
				<div className="folio-page p-5">
					<ManuscriptTextarea
						name="body"
						required
						rows={14}
						className="w-full resize-y border-none bg-transparent font-serif text-[18px] leading-8 text-ink-900/90 outline-none"
						placeholder="Start writing here"
					/>
				</div>
			</label>

			{showEmail ? (
				<label className="block">
					<span className="mb-2 block text-sm text-silver-200">
						Email to send your draft into the workshop
					</span>
					<input
						ref={emailRef}
						name="email"
						type="email"
						required
						className="w-full rounded-xl border border-white/15 bg-ink-900 px-4 py-2.5 text-parchment-100 outline-none ring-accent-400 transition focus:ring"
						placeholder="you@example.com"
					/>
					<p className="mt-2 text-xs text-silver-300">
						We will email a magic link to confirm the address before the draft
						enters the teacher queue.
					</p>
				</label>
			) : (
				<p className="text-sm text-silver-300">
					When you are ready to send this piece into the workshop, we will ask
					for your email address.
				</p>
			)}

			<button
				type="submit"
				className="rounded-full border border-accent-400/70 bg-accent-400/20 px-5 py-2.5 text-sm text-parchment-100 transition hover:bg-accent-400/30">
				{showEmail ? 'Email me a magic link to submit' : 'Continue to submit'}
			</button>
		</form>
	)
}