"use client"

import { useState } from "react"
import { CalendarPlus, Check, Share2 } from "lucide-react"
import { createMatchCalendarEvent } from "@/lib/match-utils"
import type { Match } from "@/lib/supabase"

export function MatchDetailActions({ match }: { match: Match }) {
  const [copied, setCopied] = useState(false)

  const shareMatch = async () => {
    const url = window.location.href
    const title = `${match.home_team} — ${match.away_team} | KS LIGA`

    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined)
      return
    }

    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const addToCalendar = () => {
    const content = createMatchCalendarEvent(match, window.location.origin)
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ksliga-match-${match.id}.ics`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="detail-actions">
      <button type="button" className="ios-btn-secondary" onClick={() => void shareMatch()}>
        {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
        {copied ? "Посилання скопійовано" : "Поділитися"}
      </button>
      {!match.is_finished && (
        <button type="button" className="ios-btn-primary" onClick={addToCalendar}>
          <CalendarPlus aria-hidden="true" />
          Додати в календар
        </button>
      )}
    </div>
  )
}
