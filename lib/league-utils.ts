import type { Championship, Match, Team } from "./supabase"
import { getMatchDateTime } from "./match-utils"

export function formatTime(timeStr?: string): string {
  if (!timeStr) return ""
  const parts = timeStr.trim().split(":")
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`
  }
  return timeStr
}

export function sortChampionships(championships: Championship[]): Championship[] {
  return [...championships].sort((a, b) => {
    const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) return orderA - orderB
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
    if (a.tournament_type !== b.tournament_type) return a.tournament_type === "league" ? -1 : 1
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })
}

export type MatchStatusInfo = {
  status: "finished" | "ongoing" | "upcoming"
  badgeText: string
  scoreText: string
  badgeClass: string
  isLive: boolean
}

export function getMatchStatusInfo(match: Match): MatchStatusInfo {
  if (match.is_finished) {
    if (match.is_technical_defeat) {
      const isHomeWinner = match.technical_winner === match.home_team
      return {
        status: "finished",
        badgeText: `Технічна поразка (${isHomeWinner ? "+:-" : "-:+"})`,
        scoreText: isHomeWinner ? "+ : -" : "- : +",
        badgeClass: "bg-red-50 text-red-700 border-red-200",
        isLive: false,
      }
    }

    const hasPenalties = match.penalty_home != null && match.penalty_away != null
    const penaltyText = hasPenalties ? ` (${match.penalty_home}-${match.penalty_away} пен.)` : ""
    return {
      status: "finished",
      badgeText: "Завершено",
      scoreText: `${match.home_score ?? 0} : ${match.away_score ?? 0}${penaltyText}`,
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      isLive: false,
    }
  }

  if (match.home_score != null && match.away_score != null) {
    return {
      status: "finished",
      badgeText: "Завершено",
      scoreText: `${match.home_score} : ${match.away_score}`,
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      isLive: false,
    }
  }

  const matchDateTime = match.date ? getMatchDateTime(match) : null

  if (matchDateTime && !Number.isNaN(matchDateTime.getTime()) && Date.now() >= matchDateTime.getTime()) {
    return {
      status: "ongoing",
      badgeText: "🔴 Матч триває",
      scoreText: "Матч триває",
      badgeClass: "bg-red-50 text-red-700 border-red-200 animate-pulse font-extrabold",
      isLive: true,
    }
  }

  return {
    status: "upcoming",
    badgeText: "Очікується",
    scoreText: "VS",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    isLive: false,
  }
}

export interface LeagueStanding {
  name: string
  city?: string
  logo?: string
  games: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
  pts: number
}

export function buildLeagueTable(matches: Match[], teams: Team[]): LeagueStanding[] {
  const table = teams.map((team) => ({
    name: team.name,
    city: team.city,
    logo: team.logo,
    games: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    pts: 0,
  }))
  const standingByTeam = new Map(table.map((standing) => [standing.name.trim().toLowerCase(), standing]))

  matches.forEach((match) => {
    if (!match.is_finished) return

    const homeTeam = standingByTeam.get(match.home_team.trim().toLowerCase())
    const awayTeam = standingByTeam.get(match.away_team.trim().toLowerCase())
    if (!homeTeam || !awayTeam) return

    homeTeam.games += 1
    awayTeam.games += 1

    if (match.is_technical_defeat) {
      const technicalWinner = match.technical_winner?.trim().toLowerCase()
      if (technicalWinner === match.home_team.trim().toLowerCase()) {
        homeTeam.wins += 1
        homeTeam.pts += 3
        awayTeam.losses += 1
      } else if (technicalWinner === match.away_team.trim().toLowerCase()) {
        awayTeam.wins += 1
        awayTeam.pts += 3
        homeTeam.losses += 1
      }
      return
    }

    if (match.home_score == null || match.away_score == null) return

    homeTeam.gf += match.home_score
    homeTeam.ga += match.away_score
    awayTeam.gf += match.away_score
    awayTeam.ga += match.home_score

    if (match.home_score > match.away_score) {
      homeTeam.wins += 1
      homeTeam.pts += 3
      awayTeam.losses += 1
    } else if (match.home_score < match.away_score) {
      awayTeam.wins += 1
      awayTeam.pts += 3
      homeTeam.losses += 1
    } else {
      homeTeam.draws += 1
      awayTeam.draws += 1
      homeTeam.pts += 1
      awayTeam.pts += 1
    }
  })

  return table.sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga))
}
