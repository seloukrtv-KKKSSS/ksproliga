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

export function getPosterPages(data: PosterData, options: Pick<PosterOptions, "format"> & Partial<Pick<PosterOptions, "showScorers" | "sponsors">>): Match[][] {
  const sorted = [...data.matches].sort((a, b) =>
    a.date.localeCompare(b.date) || (a.match_time || "99:99").localeCompare(b.match_time || "99:99") || a.id - b.id,
  )
  if (data.mode === "match") return [sorted.slice(0, 1)]
  const dense = options.showScorers || options.sponsors?.some((sponsor) => sponsor.url)
  const both = options.showScorers && options.sponsors?.some((sponsor) => sponsor.url)
  const perPage = both ? (options.format === "story" ? 4 : options.format === "square" ? 1 : 2) : dense ? (options.format === "story" ? 5 : options.format === "square" ? 2 : 3) : options.format === "story" ? 9 : options.format === "square" ? 5 : 6
  return Array.from({ length: Math.max(1, Math.ceil(sorted.length / perPage)) }, (_, index) =>
    sorted.slice(index * perPage, (index + 1) * perPage),
  )
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
