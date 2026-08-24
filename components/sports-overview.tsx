"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Bell, BellRing, CalendarPlus, ChevronRight, Heart, Shield, Sparkles, Trophy, Vote } from "lucide-react"
import type { LeagueStanding } from "@/lib/league-utils"
import { createMatchCalendarEvent, formatMatchScore, getMatchDateTime } from "@/lib/match-utils"
import type { Match, Team } from "@/lib/supabase"

const FAVORITE_KEY = "ksliga_favorite_team"
const ALERTS_KEY = "ksliga_match_alerts"

interface SportsOverviewProps {
  championshipName: string
  teams: Team[]
  standings: LeagueStanding[]
  upcomingMatches: Match[]
  finishedMatches: Match[]
  activeVotingMatchId?: number
}

export function SportsOverview({
  championshipName,
  teams,
  standings,
  upcomingMatches,
  finishedMatches,
  activeVotingMatchId,
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
  const favoriteTeam = teams.find((team) => team.id === favoriteTeamId) || null
  const favoriteMatch = useMemo(() => {
    if (!favoriteTeam) return null
    return [...upcomingMatches]
      .filter((match) => match.home_team === favoriteTeam.name || match.away_team === favoriteTeam.name)
      .sort((a, b) => getMatchDateTime(a).getTime() - getMatchDateTime(b).getTime())[0] || null
  }, [favoriteTeam, upcomingMatches])

  useEffect(() => {
    const storedTeam = Number.parseInt(localStorage.getItem(FAVORITE_KEY) || "", 10)
    setFavoriteTeamId(Number.isNaN(storedTeam) ? null : storedTeam)
    setAlertsEnabled(
      localStorage.getItem(ALERTS_KEY) === "1" &&
      "Notification" in window &&
      Notification.permission === "granted",
    )
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

  const leaderTeam = teams.find((team) => team.name === standings[0]?.name)

  return (
    <section className="sports-overview" aria-labelledby="sports-overview-title">
      <div className="sports-overview__heading">
        <div>
          <span className="ios-section-header">Огляд</span>
          <h2 id="sports-overview-title">Головне у {championshipName}</h2>
        </div>
        <span className="glass-badge"><Sparkles aria-hidden="true" /> Оновлюється після внесення даних</span>
      </div>

      <div className="sports-overview__grid">
        {nextMatch ? (
          <article className="sports-smart-card sports-smart-card--primary">
            <div className="sports-smart-card__eyebrow"><CalendarPlus /> Наступний матч</div>
            <strong>{nextMatch.home_team} — {nextMatch.away_team}</strong>
            <span>{getMatchDateTime(nextMatch).toLocaleString("uk-UA", { dateStyle: "medium", timeStyle: "short" })}</span>
            <div className="sports-smart-card__actions">
              <Link href={`/matches/${nextMatch.id}`}>Центр матчу <ChevronRight /></Link>
              <button type="button" onClick={() => downloadCalendar(nextMatch)} aria-label="Додати матч у календар">
                <CalendarPlus />
              </button>
            </div>
          </article>
        ) : (
          <article className="sports-smart-card sports-smart-card--muted">
            <div className="sports-smart-card__eyebrow"><CalendarPlus /> Календар</div>
            <strong>Нові матчі ще не додані</strong>
            <span>Розклад з’явиться після публікації організатором.</span>
          </article>
        )}

        {lastResult && (
          <Link className="sports-smart-card" href={`/matches/${lastResult.id}`}>
            <div className="sports-smart-card__eyebrow"><Shield /> Останній результат</div>
            <strong>{lastResult.home_team} — {lastResult.away_team}</strong>
            <span className="sports-smart-card__score">{formatMatchScore(lastResult)}</span>
            <span className="sports-smart-card__link">Протокол матчу <ChevronRight /></span>
          </Link>
        )}

        {standings[0] && (
          <Link className="sports-smart-card" href={leaderTeam ? `/teams/${leaderTeam.id}` : "?section=table"}>
            <div className="sports-smart-card__eyebrow"><Trophy /> Лідер турніру</div>
            <strong>{standings[0].name}</strong>
            <span>
              {standings[0].pts} очок · різниця {standings[0].gf - standings[0].ga > 0 ? "+" : ""}
              {standings[0].gf - standings[0].ga}
            </span>
            <span className="sports-smart-card__link">Профіль команди <ChevronRight /></span>
          </Link>
        )}

        {activeVotingMatchId && (
          <Link className="sports-smart-card" href="/?section=lion">
            <div className="sports-smart-card__eyebrow"><Vote /> Голосування</div>
            <strong>Лев матчу</strong>
            <span>Оберіть найкращого гравця серед опублікованих номінантів.</span>
            <span className="sports-smart-card__link">Проголосувати <ChevronRight /></span>
          </Link>
        )}

        <article className="sports-smart-card sports-smart-card--fan">
          <div className="sports-smart-card__eyebrow"><Heart /> Моя команда</div>
          <label className="sr-only" htmlFor="favorite-team">Улюблена команда</label>
          <select id="favorite-team" value={favoriteTeamId ?? ""} onChange={(event) => saveFavorite(event.target.value)}>
            <option value="">Оберіть команду</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          {favoriteMatch ? (
            <Link href={`/matches/${favoriteMatch.id}`} className="sports-smart-card__favorite-match">
              Наступний: {favoriteMatch.home_team} — {favoriteMatch.away_team}
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
