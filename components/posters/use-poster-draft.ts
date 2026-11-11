"use client"

import { useRef, useState } from "react"
import { createPosterOptions, type PosterData } from "@/lib/posters/model"
import { getPosterDraftKey, loadPosterDraft, removePosterDraft, savePosterDraft, type PosterDraft } from "@/lib/posters/drafts"

function browserStorage() {
  try { return typeof window === "undefined" ? undefined : window.localStorage } catch { return undefined }
}

export function usePosterDraft(data: PosterData) {
  const key = getPosterDraftKey(data)
  const [initial] = useState(() => loadPosterDraft(browserStorage(), key, createPosterOptions(data)))
  const [draft, setDraft] = useState(initial.draft)
  const current = useRef(draft)
  const [status, setStatus] = useState<"ready" | "restored" | "saved" | "reset" | "unavailable">(initial.available ? initial.restored ? "restored" : "ready" : "unavailable")
  const [resetCount, setResetCount] = useState(0)

  function commit(update: (previous: PosterDraft) => PosterDraft) {
    const next = update(current.current)
    current.current = next
    // Write inside the input event, so immediate Escape/close/reload cannot
    // discard a pending debounced save or an effect that hasn't run yet.
    setStatus(savePosterDraft(browserStorage(), key, next) ? "saved" : "unavailable")
    setDraft(next)
  }

  function reset() {
    const next = { options: createPosterOptions(data), imageUrls: {} }
    current.current = next
    setDraft(next)
    setResetCount((count) => count + 1)
    setStatus(removePosterDraft(browserStorage(), key) ? "reset" : "unavailable")
  }

  return { ...draft, commit, reset, resetCount, status }
}
