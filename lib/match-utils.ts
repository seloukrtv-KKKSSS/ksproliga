import type { Match } from "@/lib/supabase"

export const TOURNAMENT_TIME_ZONE = "Europe/Kyiv"

type ZonedDateTimeParts = {
  year: string
  month: string
  day: string
  hour: string
  minute: string
}

function getZonedDateTimeParts(value: Date, timeZone: string): ZonedDateTimeParts {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<keyof ZonedDateTimeParts, string>

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour === "24" ? "00" : values.hour,
    minute: values.minute,
  }
}

function getTimeZoneOffsetMs(value: Date, timeZone: string): number {
  const parts = getZonedDateTimeParts(value, timeZone)
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  ) - value.getTime()
}

export function parseStoredUtcDateTime(value?: string | null): Date | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)
  const date = new Date(hasTimeZone ? trimmed : `${trimmed}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTimeForTimeZoneInput(
  value?: string | null,
  timeZone = TOURNAMENT_TIME_ZONE,
): string {
  const date = parseStoredUtcDateTime(value)
  if (!date) return ""

  const parts = getZonedDateTimeParts(date, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function parseDateTimeInTimeZone(
  value: string,
  timeZone = TOURNAMENT_TIME_ZONE,
): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null

  const [, year, month, day, hour, minute] = match
  const intendedUtcTime = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  let candidate = new Date(intendedUtcTime - getTimeZoneOffsetMs(new Date(intendedUtcTime), timeZone))
  candidate = new Date(intendedUtcTime - getTimeZoneOffsetMs(candidate, timeZone))

  return formatDateTimeForTimeZoneInput(candidate.toISOString(), timeZone) === value
    ? candidate.toISOString()
    : null
}

export function formatDateTimeForViewer(
  value?: string | null,
  locale = "uk-UA",
  timeZone?: string,
): string {
  const date = parseStoredUtcDateTime(value)
  if (!date) return ""

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date)
}

export function getMatchDateTime(match: Pick<Match, "date" | "match_time">): Date {
  const time = match.match_time?.slice(0, 5) || "12:00"
  const value = parseDateTimeInTimeZone(`${match.date}T${time}`)
  if (value) return new Date(value)

  const fallback = new Date(`${match.date}T${time}:00`)
  return Number.isNaN(fallback.getTime()) ? new Date(match.date) : fallback
}

export function getNextMatchGroup(matches: Match[]): Match[] {
  const matchesWithStartTime = matches
    .map((match) => ({ match, startTime: getMatchDateTime(match).getTime() }))
    .sort((a, b) => a.startTime - b.startTime || a.match.id - b.match.id)
  const firstMatch = matchesWithStartTime[0]
  if (!firstMatch) return []

  return matchesWithStartTime
    .filter(({ startTime }) => startTime === firstMatch.startTime)
    .map(({ match }) => match)
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

export function getYouTubeVideoId(value?: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null

    const hostname = url.hostname.toLowerCase().replace(/^www\./, "")
    let candidate: string | null = null

    if (hostname === "youtu.be") {
      candidate = url.pathname.split("/").filter(Boolean)[0] || null
    } else if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(hostname)) {
      const parts = url.pathname.split("/").filter(Boolean)
      if (parts[0] === "watch") {
        candidate = url.searchParams.get("v")
      } else if (["embed", "live", "shorts", "v"].includes(parts[0])) {
        candidate = parts[1] || null
      }
    }

    return candidate && YOUTUBE_VIDEO_ID_PATTERN.test(candidate) ? candidate : null
  } catch {
    return null
  }
}

export function normalizeYouTubeUrl(value?: string | null): string | null {
  const videoId = getYouTubeVideoId(value)
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null
}

export function getYouTubeEmbedUrl(value?: string | null): string | null {
  const videoId = getYouTubeVideoId(value)
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null
}

export type MatchBroadcastState = "scheduled" | "broadcast" | "recording"

export function getMatchBroadcastState(
  match: Pick<Match, "date" | "match_time" | "is_finished">,
  now = new Date(),
): MatchBroadcastState {
  if (match.is_finished) return "recording"
  return getMatchDateTime(match).getTime() > now.getTime() ? "scheduled" : "broadcast"
}

export function getMatchBroadcastLabel(
  match: Pick<Match, "date" | "match_time" | "is_finished">,
  now = new Date(),
): string {
  const state = getMatchBroadcastState(match, now)
  if (state === "recording") return "Запис трансляції"
  if (state === "scheduled") return "Запланована трансляція"
  return "Трансляція матчу"
}

export function formatMatchScore(match: Match): string {
  if (!match.is_finished) return "VS"
  if (match.is_technical_defeat) {
    return match.technical_winner === match.home_team ? "+:-" : "-:+"
  }

  const score = `${match.home_score ?? 0} : ${match.away_score ?? 0}`
  if (match.penalty_home == null || match.penalty_away == null) return score
  return `${score} (${match.penalty_home}:${match.penalty_away} пен.)`
}

function toIcsDate(value: Date): string {
  return value.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z")
}

function escapeIcs(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n")
}

export function createMatchCalendarEvent(match: Match, origin = "https://ksliga.com"): string {
  const start = getMatchDateTime(match)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const title = `${match.home_team} — ${match.away_team}`
  const url = `${origin.replace(/\/$/, "")}/matches/${match.id}`

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KS LIGA//Match Calendar//UK",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:match-${match.id}@ksliga.com`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(`Матч KS LIGA. Деталі: ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(`Скоро матч ${title}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
}
