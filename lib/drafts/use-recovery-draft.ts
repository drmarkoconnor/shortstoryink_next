'use client'
import { useEffect, useRef, useState } from 'react'
import { draftKey, readDraft, removeSavedDraft, type RecoveryDraft } from './recovery'

type Fields = Pick<RecoveryDraft, 'title' | 'body' | 'workshopId'>
export function useRecoveryDraft(ownerId: string, scope: string, initial: Fields) {
	const initialRef = useRef(initial)
	const [draft, setDraft] = useState<RecoveryDraft>({ ...initial, ownerId, scope, requestId: '', updatedAt: 0 })
	const [ready, setReady] = useState(false)
	const [message, setMessage] = useState('Preparing draft recovery…')
	const [unsafe, setUnsafe] = useState(false)
	const lastStoredId = useRef<string | null>(null)
	useEffect(() => {
		try {
			const saved = readDraft(window.localStorage, ownerId, scope)
			lastStoredId.current = saved?.requestId ?? null
			setDraft(saved ?? { ...initialRef.current, ownerId, scope, requestId: crypto.randomUUID(), updatedAt: 0 })
			setMessage(saved ? 'Your unfinished draft has been recovered from this device.' : 'A recovery copy will be kept on this device until you log out, for up to 7 days.')
		} catch {
			setDraft({ ...initialRef.current, ownerId, scope, requestId: crypto.randomUUID(), updatedAt: 0 })
			setMessage('Recovery storage is unavailable. Keep a separate copy of your writing.')
			setUnsafe(true)
		}
		setReady(true)
	}, [ownerId, scope])
	useEffect(() => {
		if (!unsafe) return
		const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
		window.addEventListener('beforeunload', warn)
		return () => window.removeEventListener('beforeunload', warn)
	}, [unsafe])
	function edit(fields: Partial<Fields>) {
		const next = { ...draft, ...fields, requestId: crypto.randomUUID(), updatedAt: Date.now() }
		setDraft(next)
		try {
			const existing = readDraft(window.localStorage, ownerId, scope)
			if (existing && existing.requestId !== lastStoredId.current) throw new Error('Another tab changed this draft')
			window.localStorage.setItem(draftKey(ownerId, scope), JSON.stringify(next))
			lastStoredId.current = next.requestId
			setUnsafe(false)
			setMessage('Recovery copy saved on this device. Not submitted.')
		} catch {
			setUnsafe(true)
			setMessage('This recovery copy could not be saved; storage may be full or another tab has changed it. Download a copy before leaving.')
		}
	}
	function submitted(saved: RecoveryDraft) {
		try { removeSavedDraft(window.localStorage, saved) } catch { /* Keep the manuscript in memory; submission is already durable. */ }
		lastStoredId.current = null
		setUnsafe(false)
		setDraft({ ...initialRef.current, ownerId, scope, requestId: crypto.randomUUID(), updatedAt: 0 })
		setMessage('Submission saved. You can begin another draft.')
	}
	function download() {
		const blob = new Blob([`${draft.title}\n\n${draft.body}`], { type: 'text/plain;charset=utf-8' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url; link.download = 'my-writing-draft.txt'; link.click()
		setTimeout(() => URL.revokeObjectURL(url), 1000)
	}
	return { draft, ready, message, unsafe, edit, submitted, download }
}
