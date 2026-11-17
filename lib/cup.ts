import type { Match, Team } from "./supabase"
import type { LeagueStanding } from "./league-utils"

export type CupSource = { kind: "team"; teamId: number } | { kind: "group"; groupId: string; rank: number } | { kind: "winner" | "loser"; fixtureId: string } | { kind: "bye" }
export interface CupGroup { id: string; name: string; teamIds: number[] }
export interface CupConfig {
  version: 1
  mode: "knockout" | "groups_knockout" | "groups"
  teamIds: number[]
  groups: CupGroup[]
  groupLegs: 1 | 2
  qualifiers: number
  points: { win: number; draw: number; loss: number }
  tieBreak: "difference" | "wins"
  knockoutLegs: 1 | 2
  finalLegs: 1 | 2
  thirdPlace: boolean
  startDate: string
  intervalDays: number
  time: string
  seeds: CupSource[]
  stageNames: Record<string, string>
  stageLegs?: Record<string, 1 | 2>
}
export interface CupFixture {
  championship_id?: number
  id: string
  stage: number
  position: number
  round: number
  label: string
  group_id: string | null
  home_source: CupSource
  away_source: CupSource
  legs: 1 | 2
  scheduled_date: string
  scheduled_time: string | null
  leg_gap_days: number
  resolved?: boolean
  winner_team_id?: number | null
  loser_team_id?: number | null
}
export interface CupFormat { championship_id: number; config: CupConfig; revision: number }
export interface CupState { format: CupFormat | null; fixtures: CupFixture[]; matches: Match[] }

export function createCupConfig(teams: Team[]): CupConfig {
  return { version: 1, mode: "knockout", teamIds: teams.map((team) => team.id), groups: [], groupLegs: 1, qualifiers: 2, points: { win: 3, draw: 1, loss: 0 }, tieBreak: "difference", knockoutLegs: 1, finalLegs: 1, thirdPlace: false, startDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()), intervalDays: 7, time: "12:00", seeds: [], stageNames: {}, stageLegs: {} }
}

export function getCupStageLegs(config: CupConfig, stage: number, isFinal: boolean): 1 | 2 {
  return config.stageLegs?.[String(stage)] ?? (isFinal ? config.finalLegs : config.knockoutLegs)
}

export function distributeCupGroups(teamIds: number[], count: number): CupGroup[] {
  return Array.from({ length: count }, (_, index) => ({ id: `g${index + 1}`, name: `Група ${String.fromCharCode(65 + index)}`, teamIds: teamIds.filter((_, teamIndex) => teamIndex % count === index) }))
}

export function getCupSeeds(config: CupConfig): CupSource[] {
  if (config.seeds.length) return config.seeds
  if (config.mode === "knockout") return config.teamIds.map((teamId) => ({ kind: "team", teamId }))
  return Array.from({ length: config.qualifiers }, (_, index) => config.groups.map((group): CupSource => ({ kind: "group", groupId: group.id, rank: index + 1 }))).flat()
}

function dateOffset(date: string, days: number): string {
  const instant = new Date(`${date}T12:00:00Z`)
  instant.setUTCDate(instant.getUTCDate() + days)
  return instant.toISOString().slice(0, 10)
}

export function validateCupConfig(config: CupConfig, teams: Team[]): void {
  if (config.stageLegs && (typeof config.stageLegs !== "object" || Array.isArray(config.stageLegs) || Object.entries(config.stageLegs).some(([key, legs]) => !/^([1-8]|third-place)$/.test(key) || ![1, 2].includes(legs)))) throw new Error("Для кожної стадії оберіть один або два матчі.")
  if (!["knockout", "groups_knockout", "groups"].includes(config.mode) || ![1, 2].includes(config.groupLegs) || ![1, 2].includes(config.knockoutLegs) || ![1, 2].includes(config.finalLegs) || !["difference", "wins"].includes(config.tieBreak)) throw new Error("Перевірте формат і кількість матчів.")
  const validIds = new Set(teams.map((team) => team.id))
  if (config.teamIds.length < 2 || config.teamIds.length > 128 || new Set(config.teamIds).size !== config.teamIds.length || config.teamIds.some((id) => !validIds.has(id))) throw new Error("Оберіть від 2 до 128 різних команд цього турніру.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.startDate) || Number.isNaN(Date.parse(`${config.startDate}T12:00:00Z`))) throw new Error("Вкажіть дату початку.")
  if (!Number.isInteger(config.intervalDays) || config.intervalDays < 0 || config.intervalDays > 60) throw new Error("Інтервал між турами має бути від 0 до 60 днів.")
  if (config.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(config.time)) throw new Error("Вкажіть час у форматі ГГ:ХХ.")
  for (const points of Object.values(config.points)) if (!Number.isInteger(points) || points < 0 || points > 10) throw new Error("За результат можна нараховувати від 0 до 10 очок.")
  if (config.mode !== "knockout") {
    if (!config.groups.length || config.groups.length > 32 || new Set(config.groups.map((group) => group.id)).size !== config.groups.length) throw new Error("Створіть різні групи.")
    const assigned = config.groups.flatMap((group) => group.teamIds)
    if (assigned.length !== config.teamIds.length || new Set(assigned).size !== assigned.length || assigned.some((id) => !config.teamIds.includes(id))) throw new Error("Розподіліть кожну обрану команду рівно в одну групу.")
    for (const group of config.groups) {
      if (group.teamIds.length < 2 || !group.name.trim() || group.name.length > 80) throw new Error("Кожна група повинна мати назву та щонайменше 2 команди.")
      if (config.mode === "groups_knockout" && (!Number.isInteger(config.qualifiers) || config.qualifiers < 1 || config.qualifiers > group.teamIds.length)) throw new Error("Кількість команд, що виходять, не може перевищувати розмір групи.")
    }
  }
  if (config.mode !== "groups") {
    const seeds = getCupSeeds(config)
    if (seeds.filter((source) => source.kind !== "bye").length < 2 || seeds.length > 128) throw new Error("Для плейоф потрібно від 2 до 128 учасників.")
    const keys = seeds.filter((source) => source.kind !== "bye").map((source) => JSON.stringify(source))
    if (new Set(keys).size !== keys.length) throw new Error("Учасник плейоф не може повторюватись у посіві.")
    for (const source of seeds) {
      if (source.kind === "team" && config.mode !== "knockout") throw new Error("У посіві після групового етапу обирайте місця груп, щоб одна команда не потрапила в сітку двічі.")
      if (source.kind === "team" && !config.teamIds.includes(source.teamId)) throw new Error("Команда посіву не бере участі в цьому кубку.")
      if (source.kind === "group" && (config.mode === "knockout" || !config.groups.some((group) => group.id === source.groupId && source.rank >= 1 && source.rank <= group.teamIds.length))) throw new Error("Перевірте місця груп у посіві.")
      if (source.kind === "winner" || source.kind === "loser") throw new Error("У першому раунді оберіть команду або місце групи.")
    }
    if (config.thirdPlace && seeds.length < 4) throw new Error("Матч за третє місце доступний від 4 учасників плейоф.")
  }
}

export function buildCupFixtures(config: CupConfig, teams: Team[]): CupFixture[] {
  validateCupConfig(config, teams)
  const result: CupFixture[] = []
  let groupRounds = 0
  if (config.mode !== "knockout") config.groups.forEach((group) => {
    const rotation: (number | null)[] = [...group.teamIds]
    if (rotation.length % 2) rotation.push(null)
    const rounds = rotation.length - 1
    groupRounds = Math.max(groupRounds, rounds * config.groupLegs)
    for (let turn = 0; turn < rounds; turn++) {
      for (let pair = 0; pair < rotation.length / 2; pair++) {
        const a = rotation[pair], b = rotation[rotation.length - 1 - pair]
        if (a === null || b === null) continue
        for (let leg = 0; leg < config.groupLegs; leg++) {
          const reverse = (turn % 2 === 1 && pair === 0) !== (leg === 1)
          const round = turn + 1 + leg * rounds
          result.push({ id: `${group.id}-${round}-${pair + 1}`, stage: 0, position: result.length, round, label: group.name, group_id: group.id, home_source: { kind: "team", teamId: reverse ? b : a }, away_source: { kind: "team", teamId: reverse ? a : b }, legs: 1, scheduled_date: dateOffset(config.startDate, (round - 1) * config.intervalDays), scheduled_time: config.time || null, leg_gap_days: config.intervalDays })
        }
      }
      rotation.splice(1, 0, rotation.pop()!)
    }
  })
  if (result.length > 2048) throw new Error("У конфігурації понад 2048 матчів. Збільште кількість груп або зменште кількість учасників чи кіл.")
  if (config.mode === "groups") return result
  const seeds = getCupSeeds(config)
  const size = 2 ** Math.ceil(Math.log2(seeds.length))
  let order = [1, 2]
  while (order.length < size) order = order.flatMap((seed) => [seed, order.length * 2 + 1 - seed])
  let sources: CupSource[] = order.map((seed) => seeds[seed - 1] || { kind: "bye" })
  let stage = 1, round = groupRounds + 1
  while (sources.length > 1) {
    const count = sources.length / 2
    const defaultName = count === 1 ? "Фінал" : count === 2 ? "1/2 фіналу" : `1/${count} фіналу`
    const label = config.stageNames[String(stage)]?.trim() || defaultName
    const legs = getCupStageLegs(config, stage, count === 1)
    const next: CupSource[] = []
    for (let pair = 0; pair < count; pair++) {
      const id = `ko-${stage}-${pair + 1}`
      result.push({ id, stage, position: pair, round, label, group_id: null, home_source: sources[pair * 2], away_source: sources[pair * 2 + 1], legs, scheduled_date: dateOffset(config.startDate, (round - 1) * config.intervalDays), scheduled_time: config.time || null, leg_gap_days: config.intervalDays })
      next.push({ kind: "winner", fixtureId: id })
    }
    if (count === 1 && config.thirdPlace) result.push({ id: "third-place", stage, position: 1, round, label: "За третє місце", group_id: null, home_source: { kind: "loser", fixtureId: `ko-${stage - 1}-1` }, away_source: { kind: "loser", fixtureId: `ko-${stage - 1}-2` }, legs: config.stageLegs?.["third-place"] ?? 1, scheduled_date: dateOffset(config.startDate, (round - 1) * config.intervalDays), scheduled_time: config.time || null, leg_gap_days: config.intervalDays })
    sources = next
    stage++
    round += legs
  }
  return result
}

export function cupSourceLabel(source: CupSource, config: CupConfig, teams: Team[], fixtures: CupFixture[] = []): string {
  if (source.kind === "team") return teams.find((team) => team.id === source.teamId)?.name || "Команду видалено"
  if (source.kind === "group") return `${source.rank} місце · ${config.groups.find((group) => group.id === source.groupId)?.name || source.groupId}`
  if (source.kind === "bye") return "Пропуск раунду"
  const fixture = fixtures.find((item) => item.id === source.fixtureId)
  return `${source.kind === "winner" ? "Переможець" : "Переможений"} ${fixture ? `${fixture.label} · пара ${fixture.position + 1}` : source.fixtureId}`
}

export function buildCupGroupTable(config: CupConfig, group: CupGroup, fixtures: CupFixture[], matches: Match[], teams: Team[]): (LeagueStanding & { teamId: number })[] {
  const fixtureIds = new Set(fixtures.filter((fixture) => fixture.group_id === group.id).map((fixture) => fixture.id))
  const rows = teams.filter((team) => group.teamIds.includes(team.id)).map((team) => ({ teamId: team.id, name: team.name, logo: team.logo, games: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, pts: 0 }))
  for (const match of matches.filter((match) => match.is_finished && fixtureIds.has(match.cup_fixture_id || ""))) {
    const home = rows.find((row) => row.name === match.home_team), away = rows.find((row) => row.name === match.away_team)
    if (!home || !away) continue
    let h = match.home_score, a = match.away_score
    if (match.is_technical_defeat) { if (![match.home_team, match.away_team].includes(match.technical_winner || "")) continue; h = match.technical_winner === match.home_team ? 3 : 0; a = match.technical_winner === match.away_team ? 3 : 0 }
    if (h == null || a == null) continue
    home.games++; away.games++; home.gf += h; home.ga += a; away.gf += a; away.ga += h
    if (h > a) { home.wins++; away.losses++; home.pts += config.points.win; away.pts += config.points.loss }
    else if (h < a) { away.wins++; home.losses++; away.pts += config.points.win; home.pts += config.points.loss }
    else { home.draws++; away.draws++; home.pts += config.points.draw; away.pts += config.points.draw }
  }
  return rows.sort((a, b) => b.pts - a.pts || (config.tieBreak === "wins" ? b.wins - a.wins : (b.gf - b.ga) - (a.gf - a.ga)) || (config.tieBreak === "wins" ? (b.gf - b.ga) - (a.gf - a.ga) : b.wins - a.wins) || b.gf - a.gf || group.teamIds.indexOf(a.teamId) - group.teamIds.indexOf(b.teamId))
}
