"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Bell,
  BellRing,
  CalendarPlus,
  ChevronRight,
  Crown,
  Heart,
  Medal,
  Shield,
  Trophy,
  Vote,
} from "lucide-react"
import { TeamDisplay } from "@/components/team-display"
import { YouTubeExternalLink } from "@/components/youtube-external-link"
import { withReturnTo } from "@/lib/detail-navigation"
import type { LeagueStanding } from "@/lib/league-utils"
import { createMatchCalendarEvent, formatMatchScore, getMatchDateTime } from "@/lib/match-utils"
import type { Match, Player, Team } from "@/lib/supabase"

const FAVORITE_KEY = "ksliga_favorite_team"
const ALERTS_KEY = "ksliga_match_alerts"

interface SportsOverviewProps {
  tournamentType: "league" | "cup"
  teams: Team[]
  standings: LeagueStanding[]
  scorers: Player[]
  upcomingMatches: Match[]
  finishedMatches: Match[]
  activeVotingMatchId?: number
  onNavigate: (section: string) => void
}

export function SportsOverview({
  tournamentType,
  teams,
  standings,
  scorers,
  upcomingMatches,
  finishedMatches,
  activeVotingMatchId,
  onNavigate,
}: SportsOverviewProps) {
  const [favoriteTeamId, setFavoriteTeamId] = useState<number | null>(null)
  const [alertsEnabled, setAlertsEnabled] = useState(false)
  const [message, setMessage] = useState("")

  const nextMatch = useMemo(
    () => [...upcomingMatches].sort((a, b) => getMatchDateTime(a).getTime() - getMatchDateTime(b).getTime())[0],
    [upcomingMatches],
  )
  const lastResult = useMemo(
    () => [...finishedMatches].sort((a, b) => getMatchDateTime(b).getTime() - getMatchDateTime(a).getTime())[0],
    [finishedMatches],
  )
  const topScorer = useMemo(
    () => [...scorers].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, "uk"))[0],
    [scorers],
  )
  const favoriteTeam = teams.find((team) => team.id === favoriteTeamId) || null
  const favoriteMatch = useMemo(() => {
    if (!favoriteTeam) return null
    return [...upcomingMatches]
      .filter((match) => match.home_team === favoriteTeam.name || match.away_team === favoriteTeam.name)
      .sort((a, b) => getMatchDateTime(a).getTime() - getMatchDateTime(b).getTime())[0] || null
  }, [favoriteTeam, upcomingMatches])

  const nextHomeTeam = teams.find((team) => team.name === nextMatch?.home_team)
  const nextAwayTeam = teams.find((team) => team.name === nextMatch?.away_team)
  const leaderTeam = teams.find((team) => team.name === standings[0]?.name)
  const votingMatch = [...upcomingMatches, ...finishedMatches].find((match) => match.id === activeVotingMatchId)

  useEffect(() => {
    const storedTeam = Number.parseInt(localStorage.getItem(FAVORITE_KEY) || "", 10)
    const updateId = window.setTimeout(() => {
      setFavoriteTeamId(Number.isNaN(storedTeam) ? null : storedTeam)
      setAlertsEnabled(
        localStorage.getItem(ALERTS_KEY) === "1" &&
        "Notification" in window &&
        Notification.permission === "granted",
      )
    }, 0)
    return () => window.clearTimeout(updateId)
  }, [])

  const saveFavorite = (value: string) => {
    const teamId = value ? Number.parseInt(value, 10) : null
    setFavoriteTeamId(teamId)
    if (teamId) localStorage.setItem(FAVORITE_KEY, String(teamId))
    else localStorage.removeItem(FAVORITE_KEY)
    setMessage(teamId ? "Улюблену команду збережено на цьому пристрої." : "Вибір очищено.")
  }

  const maybeNotify = useCallback(async (match: Match | null, team: Team | null) => {
    if (!match || !team || Notification.permission !== "granted" || !("serviceWorker" in navigator)) return

    const startsIn = getMatchDateTime(match).getTime() - Date.now()
    if (startsIn <= 0 || startsIn > 24 * 60 * 60 * 1000) return

    const notifiedKey = `ksliga_notified_${match.id}`
    if (localStorage.getItem(notifiedKey)) return

    const registration = await navigator.serviceWorker.ready
    await registration.showNotification("Скоро матч KS LIGA", {
      body: `${match.home_team} — ${match.away_team}`,
      icon: "/images/ks-logo.png",
      badge: "/images/ks-logo.png",
      data: { url: `/matches/${match.id}` },
      tag: `ksliga-match-${match.id}`,
    })
    localStorage.setItem(notifiedKey, "1")
  }, [])

  useEffect(() => {
    if (alertsEnabled) void maybeNotify(favoriteMatch, favoriteTeam)
  }, [alertsEnabled, favoriteMatch, favoriteTeam, maybeNotify])

  const enableAlerts = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setMessage("Цей браузер не підтримує сповіщення.")
      return
    }
    if (!favoriteTeam) {
      setMessage("Спочатку оберіть улюблену команду.")
      return
    }

    const permission = await Notification.requestPermission()
    const enabled = permission === "granted"
    setAlertsEnabled(enabled)
    localStorage.setItem(ALERTS_KEY, enabled ? "1" : "0")
    setMessage(
      enabled
        ? "Нагадування ввімкнено. Воно перевіряється під час відкриття сайту."
        : "Дозвіл на сповіщення не надано.",
    )
    if (enabled) await maybeNotify(favoriteMatch, favoriteTeam)
  }

  const downloadCalendar = (match: Match) => {
    const blob = new Blob([createMatchCalendarEvent(match, window.location.origin)], {
      type: "text/calendar;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `ksliga-match-${match.id}.ics`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const navigateTo = (section: string) => {
    onNavigate(section)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const primarySection = tournamentType === "cup" ? "cup" : "table"

  return (
    <section className="sports-overview" aria-labelledby="sports-overview-title">
      <div className="sports-overview__heading">
        <h2 id="sports-overview-title">Головне зараз</h2>
        <p>Найближчий матч, свіжий результат і лідери сезону.</p>
      </div>

      {activeVotingMatchId && (
        <button type="button" className="sports-overview__vote-banner" onClick={() => navigateTo("lion")}>
          <span className="sports-overview__vote-icon"><Vote aria-hidden="true" /></span>
          <span className="sports-overview__vote-copy">
            <small>Голосування відкрите</small>
            <strong>
              {votingMatch
                ? `Оберіть Лева матчу ${votingMatch.home_team} — ${votingMatch.away_team}`
                : "Оберіть Лева матчу"}
            </strong>
          </span>
          <span className="sports-overview__vote-action">Проголосувати <ChevronRight aria-hidden="true" /></span>
        </button>
      )}

      <div className="sports-overview__grid">
        {nextMatch ? (
          <article className="sports-smart-card sports-smart-card--featured">
            <div className="sports-smart-card__topline">
              <div className="sports-smart-card__eyebrow"><CalendarPlus /> Наступний матч</div>
              <YouTubeExternalLink
                url={nextMatch.youtube_url}
                label="YouTube"
                ariaLabel={`Відкрити трансляцію матчу ${nextMatch.home_team} — ${nextMatch.away_team} на YouTube`}
                className="sports-smart-card__broadcast"
                showExternalIcon={false}
              />
            </div>
            <div className="sports-smart-card__matchup">
              <div>
                <TeamDisplay teamName={nextMatch.home_team} teamLogo={nextHomeTeam?.logo} size="lg" showName={false} />
                <strong>{nextMatch.home_team}</strong>
              </div>
              <span>VS</span>
              <div>
                <TeamDisplay teamName={nextMatch.away_team} teamLogo={nextAwayTeam?.logo} size="lg" showName={false} />
                <strong>{nextMatch.away_team}</strong>
              </div>
            </div>
            <span className="sports-smart-card__date">
              {getMatchDateTime(nextMatch).toLocaleString("uk-UA", { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <div className="sports-smart-card__actions">
              <Link href={withReturnTo(`/matches/${nextMatch.id}`, "/")}>Центр матчу <ChevronRight /></Link>
              <button type="button" onClick={() => downloadCalendar(nextMatch)} aria-label="Додати матч у календар">
                <CalendarPlus /> <span>У календар</span>
              </button>
            </div>
          </article>
        ) : (
          <article className="sports-smart-card sports-smart-card--muted sports-smart-card--featured">
            <div className="sports-smart-card__eyebrow"><CalendarPlus /> Найближчі матчі</div>
            <strong>Новий розклад готується</strong>
            <span>Матчі з’являться тут одразу після публікації організатором.</span>
            <button type="button" className="sports-smart-card__link" onClick={() => navigateTo("calendar")}>
              Перейти до календаря <ChevronRight />
            </button>
          </article>
        )}

        {lastResult ? (
          <Link className="sports-smart-card" href={withReturnTo(`/matches/${lastResult.id}`, "/")}>
            <div className="sports-smart-card__eyebrow"><Shield /> Останній результат</div>
            <strong>{lastResult.home_team} — {lastResult.away_team}</strong>
            <span className="sports-smart-card__score">{formatMatchScore(lastResult)}</span>
            <span>{getMatchDateTime(lastResult).toLocaleDateString("uk-UA", { dateStyle: "medium" })}</span>
            <span className="sports-smart-card__link">Протокол матчу <ChevronRight /></span>
          </Link>
        ) : (
          <article className="sports-smart-card sports-smart-card--muted">
            <div className="sports-smart-card__eyebrow"><Shield /> Результати</div>
            <strong>Сезон тільки починається</strong>
            <span>Перший результат з’явиться після завершення матчу.</span>
          </article>
        )}

        {standings[0] ? (
          <Link className="sports-smart-card" href={leaderTeam ? withReturnTo(`/teams/${leaderTeam.id}`, "/") : `/?section=${primarySection}`}>
            <div className="sports-smart-card__eyebrow"><Trophy /> Лідер турніру</div>
            <strong>{standings[0].name}</strong>
            <span>
              {standings[0].pts} очок · різниця {standings[0].gf - standings[0].ga > 0 ? "+" : ""}
              {standings[0].gf - standings[0].ga}
            </span>
            <span className="sports-smart-card__link">Профіль команди <ChevronRight /></span>
          </Link>
        ) : (
          <button type="button" className="sports-smart-card" onClick={() => navigateTo(primarySection)}>
            <div className="sports-smart-card__eyebrow"><Crown /> Кубковий шлях</div>
            <strong>Сітка турніру</strong>
            <span>Перегляньте пари, етапи та шлях команд до фіналу.</span>
            <span className="sports-smart-card__link">Відкрити кубок <ChevronRight /></span>
          </button>
        )}

        {topScorer && (
          <Link className="sports-smart-card" href={withReturnTo(`/players/${topScorer.id}`, "/")}>
            <div className="sports-smart-card__eyebrow"><Medal /> Найкращий бомбардир</div>
            <strong>{topScorer.name}</strong>
            <span>{topScorer.team}</span>
            <span className="sports-smart-card__score">{topScorer.goals} голів</span>
            <span className="sports-smart-card__link">Профіль гравця <ChevronRight /></span>
          </Link>
        )}

        <article className="sports-smart-card sports-smart-card--fan sports-smart-card--wide">
          <div className="sports-smart-card__eyebrow"><Heart /> Моя команда</div>
          <strong>{favoriteTeam ? favoriteTeam.name : "Стежте за своєю командою"}</strong>
          <label className="sr-only" htmlFor="favorite-team">Улюблена команда</label>
          <select id="favorite-team" value={favoriteTeamId ?? ""} onChange={(event) => saveFavorite(event.target.value)}>
            <option value="">Оберіть команду</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          {favoriteMatch ? (
            <Link href={withReturnTo(`/matches/${favoriteMatch.id}`, "/")} className="sports-smart-card__favorite-match">
              Наступний матч: {favoriteMatch.home_team} — {favoriteMatch.away_team}
            </Link>
          ) : (
            <span>Вибір зберігається лише на вашому пристрої.</span>
          )}
          <button type="button" className="sports-smart-card__notify" onClick={() => void enableAlerts()}>
            {alertsEnabled ? <BellRing /> : <Bell />}
            {alertsEnabled ? "Нагадування ввімкнено" : "Нагадувати про матчі"}
          </button>
          {message && <small role="status">{message}</small>}
        </article>
      </div>
    </section>
  )
}
