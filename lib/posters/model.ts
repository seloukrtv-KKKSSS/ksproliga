import type { Championship, Match, Team, MatchGoal } from "../supabase"

export type PosterMode = "match" | "round"
export type PosterFormat = "post" | "story" | "square"
export type PosterTemplate = "stadium" | "editorial" | "minimal"
export type PosterFont = "sans" | "condensed" | "serif"

export interface PosterData {
  mode: PosterMode
  matches: Match[]
  teams: Team[]
  championship?: Championship | null
  goals?: MatchGoal[]
}

export interface PosterSponsor { id: string; name: string; url: string }

export interface PosterOptions {
  template: PosterTemplate
  format: PosterFormat
  accent: string
  title: string
  subtitle: string
  venue: string
  footer: string
  font: PosterFont
  showTime: boolean
  showVenue: boolean
  showScores: boolean
  showScorers: boolean
  sponsors: PosterSponsor[]
  mainSponsorId?: string
  backgroundOpacity: number
  backgroundPosition: number
  backgroundUrl?: string
  page: number
}

export const POSTER_FORMATS: { id: PosterFormat; label: string; width: number; height: number }[] = [
  { id: "post", label: "Допис Instagram", width: 1080, height: 1350 },
  { id: "story", label: "Сторіз", width: 1080, height: 1920 },
  { id: "square", label: "Квадрат", width: 1080, height: 1080 },
]

export const POSTER_TEMPLATES: { id: PosterTemplate; label: string; description: string }[] = [
  { id: "stadium", label: "Вечірній матч", description: "Темний фон і яскраві акценти" },
  { id: "editorial", label: "Світла трибуна", description: "Світлий фон і спортивна графіка" },
  { id: "minimal", label: "Мінімал", description: "Чиста типографіка та емблеми" },
]

export function createPosterOptions(data: PosterData): PosterOptions {
  const match = data.matches[0]
  const allFinished = data.matches.length > 0 && data.matches.every((item) => item.is_finished)
  const roundLabel = data.championship?.tournament_type === "cup" ? match?.cup_stage || `Раунд ${match?.round || 1}` : `Тур ${match?.round || 1}`
  return {
    template: "stadium",
    format: "post",
    accent: "#f2bd3e",
    title: data.mode === "match"
      ? (allFinished ? "РЕЗУЛЬТАТ МАТЧУ" : "МАТЧ ДНЯ")
      : (data.championship?.tournament_type === "cup" ? match?.cup_stage || `РАУНД ${match?.round || 1}` : `ТУР ${match?.round || 1}`),
    subtitle: [data.mode === "match" ? roundLabel : "", data.championship?.season ? `Сезон ${data.championship.season}` : "Футбол, який нас об’єднує"].filter(Boolean).join(" · "),
    venue: "",
    footer: "KSLIGA.COM",
    font: "sans",
    showTime: true,
    showVenue: true,
    showScores: allFinished,
    showScorers: false,
    sponsors: [],
    backgroundOpacity: 80,
    backgroundPosition: 50,
    page: 0,
  }
}

type LayoutOptions = Pick<PosterOptions, "format"> & Partial<Pick<PosterOptions, "showScorers" | "sponsors" | "showVenue" | "venue">>

export function getPosterSponsors(options: Partial<Pick<PosterOptions, "sponsors" | "mainSponsorId">>) {
  const active = options.sponsors?.filter((sponsor) => sponsor.url.trim()) || []
  const main = active.find((sponsor) => sponsor.id === options.mainSponsorId) || active[0]
  return { main, partners: active.filter((sponsor) => sponsor.id !== main?.id) }
}

// Only secondary partners need space above the footer. The main sponsor uses
// the existing accent band, including when it is the only sponsor.
export function getPosterSponsorHeight(options: Pick<LayoutOptions, "sponsors">): number {
  const count = getPosterSponsors(options).partners.length
  return count === 0 ? 0 : count <= 4 ? 88 : 152
}

export function getPosterScorerRows(data: PosterData, options: LayoutOptions, match: Match): number {
  if (!options.showScorers || !match.is_finished) return 0
  const length = Math.max(...[match.home_team, match.away_team].map((team) => getPosterScorers(data.goals || [], match.id, team).length))
  return Math.min(3, Math.ceil(length / 42))
}

// Pagination and drawing share the same bounds; sponsor flags alone never
// force a small round onto another page.
export function getPosterRoundLayout(data: PosterData, options: LayoutOptions) {
  const height = (POSTER_FORMATS.find((format) => format.id === options.format) || POSTER_FORMATS[0]).height
  const top = 300
  const bottom = height - 92 - getPosterSponsorHeight(options) - (options.showVenue && options.venue?.trim() ? 32 : 16)
  const gap = 8
  const multipleDates = new Set(data.matches.map((match) => match.date)).size > 1
  const minimumRowHeight = (match: Match) => {
    const detailHeight = multipleDates || (match.is_finished && (match.is_technical_defeat || (match.penalty_home != null && match.penalty_away != null))) ? 16 : 0
    const scorerRows = getPosterScorerRows(data, options, match)
    return 52 + detailHeight + (scorerRows ? scorerRows * 16 + 4 : 0)
  }
  return { top, bottom, gap, minimumRowHeight, maxMatches: options.format === "story" ? 16 : options.format === "square" ? 8 : 10 }
}

export function getPosterPages(data: PosterData, options: LayoutOptions): Match[][] {
  const sorted = [...data.matches].sort((a, b) =>
    a.date.localeCompare(b.date) || (a.match_time || "99:99").localeCompare(b.match_time || "99:99") || a.id - b.id,
  )
  if (data.mode === "match") return [sorted.slice(0, 1)]
  const layout = getPosterRoundLayout(data, options)
  const pages: Match[][] = [[]]
  let used = 0
  for (const match of sorted) {
    let page = pages[pages.length - 1]
    const rowHeight = layout.minimumRowHeight(match)
    const nextHeight = rowHeight + (page.length ? layout.gap : 0)
    if (page.length && (page.length >= layout.maxMatches || used + nextHeight > layout.bottom - layout.top)) {
      pages.push([])
      page = pages[pages.length - 1]
      used = 0
    }
    used += rowHeight + (page.length ? layout.gap : 0)
    page.push(match)
  }
  return pages
}

export function getPosterScorers(goals: MatchGoal[], matchId: number, team: string): string {
  const grouped = new Map<string, string[]>()
  for (const goal of goals.filter((item) => item.match_id === matchId && item.team_name === team)) {
    const name = `${goal.player_name}${goal.goal_type === "own_goal" ? " (АГ)" : goal.goal_type === "penalty" ? " (пен.)" : ""}`
    const entries = grouped.get(name) || []
    entries.push(goal.minute == null ? "" : `${goal.minute}′`)
    grouped.set(name, entries)
  }
  return [...grouped].map(([name, entries]) => `${name}${entries.length > 1 ? ` ×${entries.length}` : ""}${entries.some(Boolean) ? ` (${entries.filter(Boolean).join(", ")})` : ""}`).join(" · ")
}

export function getPosterDateLabel(matches: Pick<Match, "date">[]): string {
  const dates = [...new Set(matches.map((match) => match.date).filter(Boolean))].sort()
  const format = (date: string) => {
    // A scheduled match date is a calendar date in Kyiv, not the viewer's timezone.
    const instant = new Date(`${date}T12:00:00Z`)
    return Number.isNaN(instant.getTime()) ? "Дату уточнюємо" : new Intl.DateTimeFormat("uk-UA", {
      day: "numeric", month: "long", timeZone: "UTC",
    }).format(instant)
  }
  if (!dates.length) return "Дату уточнюємо"
  return dates.length === 1 ? format(dates[0]) : `${format(dates[0])} — ${format(dates[dates.length - 1])}`
}

export function getPosterMatchTime(match: Pick<Match, "match_time">): string {
  const time = match.match_time?.slice(0, 5)
  return time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "Час уточнюємо"
}

export function getPosterMatchScore(match: Match): string | null {
  if (!match.is_finished) return null
  if (match.is_technical_defeat) {
    if (match.technical_winner === match.home_team) return "+ : −"
    if (match.technical_winner === match.away_team) return "− : +"
    return "ТЕХ."
  }
  return `${match.home_score ?? "—"} : ${match.away_score ?? "—"}`
}

export function getPosterFilename(data: PosterData, options: PosterOptions): string {
  const pageMatches = getPosterPages(data, options)[options.page] || []
  const match = pageMatches[0] || data.matches[0]
  const identifier = data.mode === "match" ? `match-${match?.id || "preview"}` : `round-${match?.round || "preview"}`
  const pages = getPosterPages(data, options).length
  return `ksliga-${identifier}-${options.format}${pages > 1 ? `-${options.page + 1}` : ""}.png`
}
