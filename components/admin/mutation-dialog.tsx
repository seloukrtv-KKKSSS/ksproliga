"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { tournamentError } from "@/lib/tournaments"

export function MutationDialog({ title, children, confirmLabel, disabled, error: loadError, onConfirm, onClose }: {
  title: string; children: ReactNode; confirmLabel: string; disabled?: boolean; error?: string; onConfirm: () => Promise<void>; onClose: () => void
}) {
  const id = useId(), dialog = useRef<HTMLDialogElement>(null), busy = useRef(false)
  const [saving, setSaving] = useState(false), [error, setError] = useState("")
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow, element = dialog.current
    document.body.style.overflow = "hidden"; element?.showModal()
    return () => { element?.close(); document.body.style.overflow = overflow; if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [])
  async function confirm() {
    if (busy.current || disabled) return
    busy.current = true; setSaving(true); setError("")
    try { await onConfirm(); onClose() }
    catch (cause) { setError(tournamentError(cause)) }
    finally { busy.current = false; setSaving(false) }
  }
  return createPortal(<dialog ref={dialog} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); if (!busy.current) onClose() }} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(94vw,34rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-black/50">
    <h3 id={id} className="mb-4 text-lg font-bold">{title}</h3>
    <fieldset disabled={saving} className="space-y-3 text-sm">{children}</fieldset>
    {(error || loadError) && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error || loadError}</p>}
    <div className="mt-5 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" autoFocus disabled={saving} onClick={onClose}>Скасувати</Button><Button type="button" variant="destructive" disabled={saving || disabled} onClick={() => void confirm()}>{saving ? "Видалення…" : confirmLabel}</Button></div>
  </dialog>, document.body)
}
