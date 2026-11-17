import type { Championship, Match, Team, MatchGoal, Player } from "../supabase"
import type { LeagueStanding } from "../league-utils"
import type { CupConfig, CupFixture, CupSource } from "../cup"

export type PosterMode = "match" | "round" | "standings" | "scorers" | "cup"
export type PosterFormat = "post" | "story" | "square" | "landscape"
export type PosterTemplate = "stadium" | "editorial" | "minimal"
export type PosterFont = "sans" | "condensed" | "serif"

export interface PosterData {
  mode: PosterMode
  matches: Match[]
  teams: Team[]
  championship?: Championship | null
  goals?: MatchGoal[]
  players?: Player[]
  standings?: LeagueStanding[]
  draftId?: string
  defaultTitle?: string
  defaultSponsors?: PosterSponsor[]
  cup?: { fixtures: CupFixture[]; config?: CupConfig | null }
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
  teamLogos: Record<string, string>
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
  { id: "landscape", label: "Кубкова сітка · горизонтальна", width: 1920, height: 1350 },
]

export const POSTER_TEMPLATES: { id: PosterTemplate; label: string; description: string }[] = [
  { id: "stadium", label: "Вечірній матч", description: "Темний фон і яскраві акценти" },
  { id: "editorial", label: "Світла трибуна", description: "Світлий фон і спортивна графіка" },
  { id: "minimal", label: "Мінімал", description: "Чиста типографіка та емблеми" },
]

export function createPosterOptions(data: PosterData): PosterOptions {
  const match = data.matches[0]
  const allFinished = data.matches.length > 0 && data.matches.every((item) => item.is_finished)
  const multipleStages = new Set(data.matches.map((item) => item.cup_stage).filter(Boolean)).size > 1
  const roundLabel = data.championship?.tournament_type === "cup" ? multipleStages ? `Раунд ${match?.round || 1}` : match?.cup_stage || `Раунд ${match?.round || 1}` : `Тур ${match?.round || 1}`
  return {
    template: "stadium",
    format: data.mode === "cup" ? "landscape" : "post",
    accent: data.mode === "cup" ? "#ed3044" : "#f2bd3e",
    title: data.defaultTitle || (data.mode === "cup" ? data.championship?.name.toLocaleUpperCase("uk-UA") || "КУБОК KS LIGA" : data.mode === "standings" ? "ТУРНІРНА ТАБЛИЦЯ" : data.mode === "scorers" ? "БОМБАРДИРИ" : data.mode === "match"
      ? (allFinished ? "РЕЗУЛЬТАТ МАТЧУ" : "МАТЧ ДНЯ")
      : roundLabel.toLocaleUpperCase("uk-UA")),
    subtitle: [data.mode === "match" ? roundLabel : "", data.championship?.season ? `Сезон ${data.championship.season}` : "Футбол, який нас об’єднує"].filter(Boolean).join(" · "),
    venue: "",
    footer: "KSLIGA.COM",
    font: "sans",
    showTime: true,
    showVenue: true,
    showScores: data.mode === "cup" || allFinished,
    showScorers: false,
    sponsors: data.defaultSponsors || [],
    mainSponsorId: data.defaultSponsors?.[0]?.id,
    teamLogos: {},
    backgroundOpacity: 80,
    backgroundPosition: 50,
    page: 0,
  }
}

export function getPosterTeamKey(championshipId: number, name: string): string {
  return `team:${championshipId}:${name.trim().toLocaleLowerCase("uk-UA")}`
}

export function getPosterTeamLogo(data: PosterData, options: Pick<PosterOptions, "teamLogos">, championshipId: number, name: string): string | undefined {
  const key = getPosterTeamKey(championshipId, name)
  return options.teamLogos[key] || data.teams.find((team) => team.championship_id === championshipId && getPosterTeamKey(team.championship_id, team.name) === key)?.logo
}

export function getPosterTeams(data: PosterData) {
  const unique = new Map<string, { key: string; name: string; championshipId: number; logo?: string }>()
  if (data.mode === "standings" || data.mode === "scorers" || data.mode === "cup") return data.teams.map((team) => ({ key: getPosterTeamKey(team.championship_id, team.name), name: team.name, championshipId: team.championship_id, logo: team.logo }))
  const matches = data.mode === "match" ? getPosterPages(data, { format: "post" })[0] : data.matches
  for (const match of matches) {
    for (const name of [match.home_team, match.away_team]) {
      const key = getPosterTeamKey(match.championship_id, name)
      if (!unique.has(key)) unique.set(key, { key, name, championshipId: match.championship_id, logo: getPosterTeamLogo(data, { teamLogos: {} }, match.championship_id, name) })
    }
  }
  return [...unique.values()]
}

export function getPosterRankingRows(data: PosterData) {
  if (data.mode === "scorers") {
    const players = [...(data.players || [])].filter((player) => player.goals > 0).sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, "uk") || a.id - b.id)
    return players.map((player, index) => ({ position: index && players[index - 1].goals === player.goals ? players.findIndex((item) => item.goals === player.goals) + 1 : index + 1, name: player.name, team: player.team, goals: player.goals, standing: undefined as LeagueStanding | undefined }))
  }
  return (data.standings || []).map((standing, index) => ({ position: index + 1, name: standing.name, team: standing.name, goals: undefined as number | undefined, standing }))
}

export function getPosterRankingPages(data: PosterData, options: LayoutOptions) {
  const rows = getPosterRankingRows(data)
  const layout = getPosterRoundLayout(data, options)
  const capacity = Math.max(1, Math.floor((layout.bottom - layout.top - 44) / 64))
  return Array.from({ length: Math.max(1, Math.ceil(rows.length / capacity)) }, (_, index) => rows.slice(index * capacity, (index + 1) * capacity))
}

export function getPosterPageCount(data: PosterData, options: LayoutOptions): number {
  if (data.mode === "cup") return getCupPosterPages(data, options).length
  return data.mode === "standings" || data.mode === "scorers" ? getPosterRankingPages(data, options).length : getPosterPages(data, options).length
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
  const multipleStages = new Set(data.matches.map((match) => match.cup_stage).filter(Boolean)).size > 1
  const minimumRowHeight = (match: Match) => {
    const detailHeight = multipleDates || multipleStages || (match.is_finished && (match.is_technical_defeat || (match.penalty_home != null && match.penalty_away != null))) ? 16 : 0
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
  const identifier = data.mode === "standings" || data.mode === "scorers" || data.mode === "cup" ? `${data.mode}-${data.championship?.id || "preview"}` : data.mode === "match" ? `match-${match?.id || "preview"}` : `round-${match?.round || "preview"}`
  const pages = getPosterPageCount(data, options)
  return `ksliga-${identifier}-${options.format}${pages > 1 ? `-${options.page + 1}` : ""}.png`
}

export interface CupPosterFixture extends CupFixture { matchIds?: number[] }
export interface CupPosterSide { name: string; teamId?: number; pending?: boolean; bye?: boolean }
export interface CupPosterEntry {
  fixture: CupPosterFixture
  home: CupPosterSide
  away: CupPosterSide
  games: Match[]
  homeScore: string
  awayScore: string
  winner?: string
  loser?: string
  complete: boolean
  detail: string
}

const cupTeamKey = (name: string) => name.trim().toLocaleLowerCase("uk-UA")
const thirdPlaceLabel = (name: string) => /трет|3\s*[-єе]?\s*місц/iu.test(name)

export function getCupPosterFixtures(data: PosterData): CupPosterFixture[] {
  if (data.cup?.fixtures.length) return data.cup.fixtures.filter((fixture) => fixture.stage > 0).map((fixture) => ({ ...fixture }))
  // Older cups have ordinary matches with a stage label. Preserve their games
  // and identify return legs without changing any stored match or tournament.
  const groups = new Map<string, Match[]>()
  for (const match of [...data.matches].sort((a, b) => a.round - b.round || a.date.localeCompare(b.date) || a.id - b.id)) {
    if (/груп/iu.test(match.cup_stage || "")) continue
    const label = match.cup_stage?.trim() || `Раунд ${match.round}`
    const key = JSON.stringify([label, [cupTeamKey(match.home_team), cupTeamKey(match.away_team)].sort()])
    groups.set(key, [...(groups.get(key) || []), match])
  }
  const labels = [...new Map([...groups.values()].map((games) => [games[0].cup_stage?.trim() || `Раунд ${games[0].round}`, games[0].round])).entries()].filter(([label]) => !thirdPlaceLabel(label)).sort((a, b) => a[1] - b[1]).map(([label]) => label)
  const positions = new Map<number, number>()
  return [...groups.values()].map((games): CupPosterFixture => {
    const match = games[0], label = match.cup_stage?.trim() || `Раунд ${match.round}`
    const third = thirdPlaceLabel(label)
    const stage = third ? Math.max(1, labels.length) : labels.indexOf(label) + 1
    const position = third ? 1 : positions.get(stage) || 0
    if (!third) positions.set(stage, position + 1)
    return { id: third ? "third-place" : `legacy-${match.id}`, stage, position, round: match.round, label, group_id: null, home_source: { kind: "team", teamId: data.teams.find((team) => cupTeamKey(team.name) === cupTeamKey(match.home_team))?.id || -match.id * 2 }, away_source: { kind: "team", teamId: data.teams.find((team) => cupTeamKey(team.name) === cupTeamKey(match.away_team))?.id || -match.id * 2 - 1 }, legs: games.length > 1 ? 2 : 1, scheduled_date: match.date, scheduled_time: match.match_time || null, leg_gap_days: 7, matchIds: games.map((item) => item.id) }
  }).sort((a, b) => a.stage - b.stage || a.position - b.position)
}

export function getCupPosterEntries(data: PosterData): CupPosterEntry[] {
  const entries: CupPosterEntry[] = []
  const teams = new Map(data.teams.map((team) => [team.id, team]))
  const participant = (source: CupSource): CupPosterSide => {
    if (source.kind === "team") return { name: teams.get(source.teamId)?.name || "Учасника уточнюємо", teamId: source.teamId }
    if (source.kind === "bye") return { name: "Пропуск раунду", bye: true }
    if (source.kind === "group") return { name: `${source.rank} місце · ${data.cup?.config?.groups.find((group) => group.id === source.groupId)?.name || source.groupId}`, pending: true }
    const parent = entries.find((entry) => entry.fixture.id === source.fixtureId)
    const name = source.kind === "winner" ? parent?.winner : parent?.loser
    return name ? { name, teamId: data.teams.find((team) => cupTeamKey(team.name) === cupTeamKey(name))?.id } : { name: `${source.kind === "winner" ? "Переможець" : "Переможений"} · ${parent?.fixture.label || "попередній раунд"} · ${parent ? parent.fixture.position + 1 : "?"}`, pending: true }
  }
  for (const raw of getCupPosterFixtures(data)) {
    const fixture = { ...raw }
    const games = data.matches.filter((match) => raw.matchIds ? raw.matchIds.includes(match.id) : match.cup_fixture_id === fixture.id).sort((a, b) => (a.cup_leg || 1) - (b.cup_leg || 1) || a.round - b.round || a.date.localeCompare(b.date) || a.id - b.id)
    const home: CupPosterSide = games.length ? { name: games[0].home_team, teamId: data.teams.find((team) => cupTeamKey(team.name) === cupTeamKey(games[0].home_team))?.id } : participant(fixture.home_source)
    const away: CupPosterSide = games.length ? { name: games[0].away_team, teamId: data.teams.find((team) => cupTeamKey(team.name) === cupTeamKey(games[0].away_team))?.id } : participant(fixture.away_source)
    let homeTotal = 0, awayTotal = 0, played = 0
    for (const match of games) {
      if (!match.is_finished) continue
      let h = match.home_score, a = match.away_score
      if (match.is_technical_defeat && [match.home_team, match.away_team].includes(match.technical_winner || "")) { h = match.technical_winner === match.home_team ? 3 : 0; a = match.technical_winner === match.away_team ? 3 : 0 }
      if (h == null || a == null) continue
      const forward = cupTeamKey(match.home_team) === cupTeamKey(home.name)
      homeTotal += forward ? h : a; awayTotal += forward ? a : h; played++
    }
    const complete = played === fixture.legs
    const last = games.at(-1)
    let winner = complete && homeTotal !== awayTotal ? homeTotal > awayTotal ? home.name : away.name : undefined
    if (complete && !winner && last?.penalty_home != null && last.penalty_away != null && last.penalty_home !== last.penalty_away) winner = last.penalty_home > last.penalty_away ? last.home_team : last.away_team
    if (!winner && fixture.resolved && fixture.winner_team_id) winner = teams.get(fixture.winner_team_id)?.name
    const loser = winner ? cupTeamKey(winner) === cupTeamKey(home.name) ? away.bye ? undefined : away.name : home.bye ? undefined : home.name : undefined
    const technical = fixture.legs === 1 && games[0]?.is_finished && games[0].is_technical_defeat && winner
    const homeScore = technical && winner ? cupTeamKey(winner) === cupTeamKey(home.name) ? "+" : "−" : played ? String(homeTotal) : "—"
    const awayScore = technical && winner ? cupTeamKey(winner) === cupTeamKey(away.name) ? "+" : "−" : played ? String(awayTotal) : "—"
    const penalties = complete && last?.penalty_home != null && last.penalty_away != null ? `пен. ${last.penalty_home}:${last.penalty_away}` : ""
    const detail = [fixture.legs === 2 ? played < 2 ? `2 матчі · зіграно ${played}` : games.map((match, index) => `${index + 1}-й: ${getPosterMatchScore(match) || "—"}`).join(" · ") : "", penalties, technical ? "Технічний результат" : "", !games.length && winner ? "Прохід без гри" : ""].filter(Boolean).join(" · ")
    if (raw.matchIds) {
      // Connect older, manually entered rounds by their actual participants.
      for (const side of ["home", "away"] as const) {
        const name = side === "home" ? home.name : away.name
        const previous = entries.filter((entry) => entry.fixture.stage < fixture.stage && [entry.home.name, entry.away.name].some((item) => cupTeamKey(item) === cupTeamKey(name))).at(-1)
        if (previous) fixture[side === "home" ? "home_source" : "away_source"] = { kind: fixture.id === "third-place" ? "loser" : "winner", fixtureId: previous.fixture.id }
      }
    }
    entries.push({ fixture, home, away, games, homeScore, awayScore, winner, loser, complete, detail })
  }
  return entries
}

export function getCupPosterLayout(data: PosterData, options: LayoutOptions) {
  const format = POSTER_FORMATS.find((item) => item.id === options.format) || POSTER_FORMATS[0]
  const entries = getCupPosterEntries(data)
  const stages = [...new Set(entries.filter((entry) => entry.fixture.id !== "third-place").map((entry) => entry.fixture.stage))].sort((a, b) => a - b)
  const maximum = Math.max(0, ...stages.map((stage) => entries.filter((entry) => entry.fixture.stage === stage && entry.fixture.id !== "third-place").length))
  const firstFull = stages.find((stage) => entries.filter((entry) => entry.fixture.stage === stage && entry.fixture.id !== "third-place").length === maximum) || 1
  const preliminary = entries.filter((entry) => entry.fixture.stage < firstFull && entries.filter((item) => item.fixture.stage === entry.fixture.stage).length <= 2)
  const top = 306
  const noteHeight = preliminary.length * 24 + (options.showVenue && options.venue?.trim() ? 28 : 0)
  const bottom = format.height - 92 - getPosterSponsorHeight(options) - 24 - noteHeight
  const rawCapacity = Math.max(1, Math.floor((bottom - top + 10) / 94))
  const capacity = Math.min(8, 2 ** Math.floor(Math.log2(rawCapacity)))
  return { width: format.width, height: format.height, top, bottom, preliminary, entries, stages, capacity }
}

export function getCupPosterPages(data: PosterData, options: LayoutOptions) {
  const layout = getCupPosterLayout(data, options)
  const preliminaryIds = new Set(layout.preliminary.map((entry) => entry.fixture.id))
  const entries = layout.entries.filter((entry) => !preliminaryIds.has(entry.fixture.id))
  const stages = [...new Set(entries.filter((entry) => entry.fixture.id !== "third-place").map((entry) => entry.fixture.stage))].sort((a, b) => a - b)
  const pages: { entries: CupPosterEntry[]; stages: number[] }[] = []
  for (let offset = 0; offset < stages.length; offset += 4) {
    // Keep the deciding rounds together when the early bracket needs pages.
    const window = offset > 0 && stages.length - offset < 3 ? stages.slice(-3) : stages.slice(offset, offset + 4)
    const roots = entries.filter((entry) => entry.fixture.stage === window[0] && entry.fixture.id !== "third-place")
    for (let start = 0; start < roots.length; start += layout.capacity) {
      const visible = roots.slice(start, start + layout.capacity)
      const ids = new Set(visible.map((entry) => entry.fixture.id))
      for (const stage of window.slice(1)) for (const entry of entries.filter((item) => item.fixture.stage === stage)) {
        if ([entry.fixture.home_source, entry.fixture.away_source].some((source) => (source.kind === "winner" || source.kind === "loser") && ids.has(source.fixtureId)) || !entry.fixture.home_source.kind.match(/winner|loser/) && !entry.fixture.away_source.kind.match(/winner|loser/)) { visible.push(entry); ids.add(entry.fixture.id) }
      }
      const third = entries.find((entry) => entry.fixture.id === "third-place" && window.includes(entry.fixture.stage))
      if (third && !ids.has(third.fixture.id)) visible.push(third)
      pages.push({ entries: visible, stages: window })
    }
  }
  if (!pages.length) pages.push({ entries, stages: [...new Set(entries.map((entry) => entry.fixture.stage))] })
  const covered = new Set(pages.flatMap((page) => page.entries.map((entry) => entry.fixture.id)))
  for (const stage of stages) {
    const missing = entries.filter((entry) => entry.fixture.stage === stage && !covered.has(entry.fixture.id))
    for (let index = 0; index < missing.length; index += layout.capacity) pages.push({ entries: missing.slice(index, index + layout.capacity), stages: [stage] })
  }
  return pages
}
