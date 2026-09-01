import type { Match } from "@/lib/supabase"

export function getMatchDateTime(match: Pick<Match, "date" | "match_time">): Date {
  const time = match.match_time?.slice(0, 5) || "12:00"
  const value = new Date(`${match.date}T${time}:00`)
  return Number.isNaN(value.getTime()) ? new Date(match.date) : value
}

export function getNextMatchGroup(matches: Match[]): Match[] {
  const sortedMatches = [...matches].sort(
    (a, b) => getMatchDateTime(a).getTime() - getMatchDateTime(b).getTime() || a.id - b.id,
  )
  const firstMatchTime = sortedMatches[0] ? getMatchDateTime(sortedMatches[0]).getTime() : null
  if (firstMatchTime === null) return []
  return sortedMatches.filter((match) => getMatchDateTime(match).getTime() === firstMatchTime)
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
