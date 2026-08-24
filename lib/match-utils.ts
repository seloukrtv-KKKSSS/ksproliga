import type { Match } from "@/lib/supabase"

export function getMatchDateTime(match: Pick<Match, "date" | "match_time">): Date {
  const time = match.match_time?.slice(0, 5) || "12:00"
  const value = new Date(`${match.date}T${time}:00`)
  return Number.isNaN(value.getTime()) ? new Date(match.date) : value
}

export function formatMatchScore(match: Match): string {
  if (!match.is_finished) return "VS"
  if (match.is_technical_defeat) {
    return match.technical_winner === match.home_team ? "+:-" : "-:+"
  }

  const score = `${match.home_score ?? 0} : ${match.away_score ?? 0}`
  if (match.penalty_home === null || match.penalty_away === null) return score
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
