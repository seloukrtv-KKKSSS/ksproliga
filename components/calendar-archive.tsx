import Link from "next/link"
import { Archive, CheckCircle2, ChevronDown, History } from "lucide-react"

import { SafeImage } from "@/components/safe-image"
import { YouTubeExternalLink } from "@/components/youtube-external-link"
import { withReturnTo } from "@/lib/detail-navigation"
import { formatTime } from "@/lib/league-utils"
import { formatMatchScore } from "@/lib/match-utils"
import type { Match, Team } from "@/lib/supabase"

interface CalendarArchiveProps {
  matches: Match[]
  teams: Team[]
  tournamentType: "league" | "cup"
}

type Winner = "home" | "away" | null

function pluralize(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function parseMatchDate(value: string) {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value)
}

function formatDate(value: string) {
  return parseMatchDate(value).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatRoundDateRange(matches: Match[]) {
  const dates = [...matches].sort((a, b) => parseMatchDate(a.date).getTime() - parseMatchDate(b.date).getTime())
  if (dates.length === 0) return ""
  if (dates[0].date === dates.at(-1)?.date) return formatDate(dates[0].date)
  return `${formatDate(dates[0].date)} — ${formatDate(dates.at(-1)!.date)}`
}

function getWinner(match: Match): Winner {
  if (match.is_technical_defeat) {
    if (match.technical_winner === match.home_team) return "home"
    if (match.technical_winner === match.away_team) return "away"
    return null
  }

  if (match.penalty_winner === match.home_team) return "home"
  if (match.penalty_winner === match.away_team) return "away"
  if ((match.home_score ?? 0) > (match.away_score ?? 0)) return "home"
  if ((match.away_score ?? 0) > (match.home_score ?? 0)) return "away"
  return null
}

export function CalendarArchive({ matches, teams, tournamentType }: CalendarArchiveProps) {
  const finishedMatches = matches.filter((match) => match.is_finished)
  if (finishedMatches.length === 0) return null

  const teamLogos = new Map(teams.map((team) => [team.name.trim().toLocaleLowerCase("uk-UA"), team.logo]))
  const getTeamLogo = (teamName: string) =>
    teamLogos.get(teamName.trim().toLocaleLowerCase("uk-UA")) || "/placeholder.svg?height=32&width=32"

  const archivedRounds = [...new Set(finishedMatches.map((match) => match.round))]
    .sort((a, b) => b - a)
    .map((round) => {
      const roundMatches = matches.filter((match) => match.round === round)
      const finishedRoundMatches = roundMatches
        .filter((match) => match.is_finished)
        .sort((a, b) => parseMatchDate(b.date).getTime() - parseMatchDate(a.date).getTime())
      const isComplete = roundMatches.length > 0 && roundMatches.every((match) => match.is_finished)
      const roundTitle = tournamentType === "cup"
        ? roundMatches.find((match) => match.cup_stage)?.cup_stage || `Раунд ${round}`
        : `Тур ${round}`

      return { round, roundMatches, finishedRoundMatches, isComplete, roundTitle }
    })

  const completedRoundCount = archivedRounds.filter((round) => round.isComplete).length
  const roundNoun = tournamentType === "cup"
    ? pluralize(completedRoundCount, "етап", "етапи", "етапів")
    : pluralize(completedRoundCount, "тур", "тури", "турів")
  const matchNoun = pluralize(finishedMatches.length, "матч", "матчі", "матчів")

  return (
    <details className="calendar-archive">
      <summary className="calendar-archive__summary">
        <span className="calendar-archive__icon" aria-hidden="true">
          <Archive />
        </span>
        <span className="calendar-archive__heading">
          <strong>Архів календаря</strong>
          <small>Історія завершених турів і матчів</small>
        </span>
        <span className="calendar-archive__count">
          {completedRoundCount} {roundNoun} · {finishedMatches.length} {matchNoun}
        </span>
        <ChevronDown className="calendar-archive__chevron" aria-hidden="true" />
      </summary>

      <div className="calendar-archive__body">
        <div className="calendar-archive__intro">
          <History aria-hidden="true" />
          <p>Відкрийте потрібний тур, щоб переглянути рахунки, записи трансляцій і протоколи матчів.</p>
        </div>

        <div className="calendar-archive__rounds">
          {archivedRounds.map(({ round, roundMatches, finishedRoundMatches, isComplete, roundTitle }) => {
            const finishedNoun = pluralize(finishedRoundMatches.length, "матч", "матчі", "матчів")

            return (
              <details key={round} className="calendar-archive-round">
                <summary className="calendar-archive-round__summary">
                  <span className={`calendar-archive-round__status ${isComplete ? "is-complete" : "is-partial"}`} aria-hidden="true">
                    {isComplete ? <CheckCircle2 /> : <span />}
                  </span>
                  <span className="calendar-archive-round__heading">
                    <strong>{roundTitle}</strong>
                    <small>{formatRoundDateRange(finishedRoundMatches)}</small>
                  </span>
                  <span className="calendar-archive-round__progress">
                    {isComplete
                      ? `${finishedRoundMatches.length} ${finishedNoun}`
                      : `${finishedRoundMatches.length} із ${roundMatches.length} зіграно`}
                  </span>
                  <ChevronDown className="calendar-archive-round__chevron" aria-hidden="true" />
                </summary>

                <div className="calendar-archive-round__matches">
                  {finishedRoundMatches.map((match) => {
                    const winner = getWinner(match)

                    return (
                      <article key={match.id} className="calendar-archive-match">
                        <div className="calendar-archive-match__date">
                          <span>{formatDate(match.date)}</span>
                          {match.match_time && <time dateTime={`${match.date}T${match.match_time}`}>{formatTime(match.match_time)}</time>}
                        </div>

                        <div className="calendar-archive-match__matchup">
                          <div className={winner === "home" ? "is-winner" : ""}>
                            <SafeImage
                              src={getTeamLogo(match.home_team)}
                              alt={`Емблема ${match.home_team}`}
                              width={32}
                              height={32}
                              className="calendar-archive-match__logo"
                              loading="lazy"
                            />
                            <strong title={match.home_team}>{match.home_team}</strong>
                          </div>

                          <span className="calendar-archive-match__score" aria-label={`Рахунок ${formatMatchScore(match)}`}>
                            {formatMatchScore(match)}
                          </span>

                          <div className={winner === "away" ? "is-winner" : ""}>
                            <SafeImage
                              src={getTeamLogo(match.away_team)}
                              alt={`Емблема ${match.away_team}`}
                              width={32}
                              height={32}
                              className="calendar-archive-match__logo"
                              loading="lazy"
                            />
                            <strong title={match.away_team}>{match.away_team}</strong>
                          </div>
                        </div>

                        <div className="calendar-archive-match__actions">
                          <YouTubeExternalLink
                            url={match.youtube_url}
                            label="Запис"
                            ariaLabel={`Відкрити запис матчу ${match.home_team} — ${match.away_team} на YouTube`}
                            className="calendar-archive-match__youtube"
                          />
                          <Link href={withReturnTo(`/matches/${match.id}`, "/?section=calendar")}>
                            Протокол матчу
                          </Link>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </details>
            )
          })}
        </div>
      </div>
    </details>
  )
}
