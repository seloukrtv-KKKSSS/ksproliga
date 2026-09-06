"use client"

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react"
import {
  formatInstantForViewer,
  formatMatchDateTimeForViewer,
  getMatchStartIso,
  parseStoredUtcDateTime,
  TOURNAMENT_TIME_ZONE,
  type LocalDateStyle,
  type LocalDateTimeMode,
} from "@/lib/match-utils"
import type { Match } from "@/lib/supabase"

const ViewerTimeZoneContext = createContext<string | null>(null)

function getBrowserTimeZone() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  return timeZone === "Europe/Kiev" ? TOURNAMENT_TIME_ZONE : timeZone
}

function subscribeToTimeZoneChange(onChange: () => void) {
  window.addEventListener("focus", onChange)
  document.addEventListener("visibilitychange", onChange)
  return () => {
    window.removeEventListener("focus", onChange)
    document.removeEventListener("visibilitychange", onChange)
  }
}

const getServerTimeZone = () => null

export function ViewerTimeZoneProvider({ children }: { children: ReactNode }) {
  const timeZone = useSyncExternalStore(subscribeToTimeZoneChange, getBrowserTimeZone, getServerTimeZone)
  return <ViewerTimeZoneContext.Provider value={timeZone}>{children}</ViewerTimeZoneContext.Provider>
}

export function useViewerTimeZone() {
  return useContext(ViewerTimeZoneContext)
}

export function ViewerTimeZoneNote({ className }: { className?: string }) {
  const timeZone = useViewerTimeZone()
  return (
    <p className={className}>
      {timeZone
        ? `Час і дати подій — у вашому часовому поясі: ${timeZone} (за налаштуваннями пристрою).`
        : "Визначаємо ваш часовий пояс…"}
    </p>
  )
}

type DisplayProps = {
  mode?: LocalDateTimeMode
  dateStyle?: LocalDateStyle
  showTimeZone?: boolean
  className?: string
}

export function LocalDateTime({
  value,
  mode = "dateTime",
  dateStyle = "short",
  showTimeZone = false,
  className,
}: DisplayProps & { value?: string | null }) {
  const timeZone = useViewerTimeZone()
  const date = parseStoredUtcDateTime(value)
  if (!date) return <span className={className}>—</span>

  return (
    <time dateTime={date.toISOString()} className={className} title={timeZone ? `Ваш місцевий час (${timeZone})` : undefined}>
      {timeZone ? formatInstantForViewer(value, timeZone, mode, dateStyle) : "…"}
      {timeZone && showTimeZone && ` · ${timeZone}`}
    </time>
  )
}

export function LocalMatchDateTime({
  match,
  mode = "dateTime",
  dateStyle = "short",
  showTimeZone = false,
  className,
}: DisplayProps & { match: Pick<Match, "date" | "match_time"> }) {
  const timeZone = useViewerTimeZone()
  const start = getMatchStartIso(match)
  const title = !start
    ? "Дата за розкладом у Києві; час початку уточнюється"
    : timeZone ? `Ваш місцевий час (${timeZone})` : undefined

  return (
    <time dateTime={start || match.date} className={className} title={title}>
      {timeZone || !start
        ? formatMatchDateTimeForViewer(match, timeZone || "UTC", mode, dateStyle)
        : "…"}
      {timeZone && start && showTimeZone && ` · ${timeZone}`}
    </time>
  )
}
