"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { CalendarPlus, Check, ImagePlus, Share2 } from "lucide-react"
import { createMatchCalendarEvent } from "@/lib/match-utils"
import type { Championship, Match, Team } from "@/lib/supabase"

const PosterEditor = dynamic(() => import("@/components/posters/poster-editor"), { ssr: false })

interface MatchDetailActionsProps {
  match: Match
  teams: Team[]
  championship?: Championship
}

export function MatchDetailActions({ match, teams, championship }: MatchDetailActionsProps) {
  const [copied, setCopied] = useState(false)
  const [showPoster, setShowPoster] = useState(false)

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
      {showPoster && (
        <PosterEditor mode="match" matches={[match]} teams={teams} championship={championship} onClose={() => setShowPoster(false)} />
      )}
      <button type="button" className="ios-btn-secondary" onClick={() => setShowPoster(true)}>
        <ImagePlus aria-hidden="true" />
        Афіша матчу
      </button>
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
