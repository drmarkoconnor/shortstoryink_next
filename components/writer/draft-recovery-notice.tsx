'use client'
export function DraftRecoveryNotice({ message, download }: { message: string; download: () => void }) {
	return <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-silver-200">
		<p role="status" className="max-w-prose">{message}</p>
		<button type="button" onClick={download} className="text-accent-200 underline underline-offset-4">Download draft</button>
	</div>
}
