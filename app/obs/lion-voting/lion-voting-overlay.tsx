"use client"

import { memo, useEffect, useMemo, useState } from "react"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"
import type { VotingCandidate } from "@/lib/supabase"
import styles from "./lion-voting.module.css"

const SAFETY_REFRESH_MS = 60_000
const FALLBACK_REFRESH_MS = 4_000
const CONNECTION_TIMEOUT_MS = 8_000

type TeamLogo = {
  name: string
  logo: string
}

type LionVotingOverlayProps = {
  matchId: number
  homeTeam: string
  awayTeam: string
  initialCandidates: VotingCandidate[]
  teamLogos: TeamLogo[]
}

type CandidateRowProps = {
  candidate: VotingCandidate
  logo?: string
  percent: number
  rank: number
}

function normalizeTeamName(teamName: string): string {
  return teamName.trim().toLocaleLowerCase("uk-UA")
}

function sortCandidates(candidates: VotingCandidate[]): VotingCandidate[] {
  return [...candidates].sort(
    (left, right) => right.votes - left.votes || left.id - right.id,
  )
}

function areCandidatesEqual(
  previous: VotingCandidate[],
  next: VotingCandidate[],
): boolean {
  return previous.length === next.length && previous.every((candidate, index) => {
    const nextCandidate = next[index]

    return candidate.id === nextCandidate.id
      && candidate.votes === nextCandidate.votes
      && candidate.player_name === nextCandidate.player_name
      && candidate.team_name === nextCandidate.team_name
      && Boolean(candidate.is_hidden) === Boolean(nextCandidate.is_hidden)
  })
}

function replaceCandidates(
  previous: VotingCandidate[],
  received: VotingCandidate[],
): VotingCandidate[] {
  const next = sortCandidates(received.filter((candidate) => !candidate.is_hidden))
  return areCandidatesEqual(previous, next) ? previous : next
}

function updateCandidate(
  previous: VotingCandidate[],
  received: VotingCandidate,
  matchId: number,
): VotingCandidate[] {
  if (received.match_id !== matchId) return previous

  const withoutReceived = previous.filter((candidate) => candidate.id !== received.id)
  const next = received.is_hidden
    ? withoutReceived
    : sortCandidates([...withoutReceived, received])

  return areCandidatesEqual(previous, next) ? previous : next
}

function removeCandidate(previous: VotingCandidate[], candidateId: number): VotingCandidate[] {
  if (!previous.some((candidate) => candidate.id === candidateId)) return previous
  return previous.filter((candidate) => candidate.id !== candidateId)
}

function getTeamInitials(teamName: string): string {
  return teamName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("uk-UA")
}

function formatVotes(votes: number): string {
  const lastTwo = votes % 100
  const last = votes % 10

  if (lastTwo >= 11 && lastTwo <= 14) return `${votes} голосів`
  if (last === 1) return `${votes} голос`
  if (last >= 2 && last <= 4) return `${votes} голоси`
  return `${votes} голосів`
}

const CandidateRow = memo(function CandidateRow({
  candidate,
  logo,
  percent,
  rank,
}: CandidateRowProps) {
  return (
    <article className={`${styles.candidate} ${rank === 1 ? styles.leader : ""}`}>
      <span className={styles.rank} aria-label={`Місце ${rank}`}>{rank}</span>

      <span className={styles.logoFrame} aria-hidden="true">
        {logo ? (
          // Direct rendering avoids the extra Next Image runtime in a persistent broadcast overlay.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            width={34}
            height={34}
            decoding="async"
            draggable={false}
          />
        ) : (
          <span>{getTeamInitials(candidate.team_name)}</span>
        )}
      </span>

      <span className={styles.candidateCopy}>
        <strong>{candidate.player_name}</strong>
        <small>{candidate.team_name}</small>
      </span>

      <span className={styles.result}>
        <strong>{percent}%</strong>
        <small>{formatVotes(candidate.votes)}</small>
      </span>

      <span className={styles.progressTrack} aria-hidden="true">
        <span
          className={styles.progressFill}
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </span>
    </article>
  )
})

export function LionVotingOverlay({
  matchId,
  homeTeam,
  awayTeam,
  initialCandidates,
  teamLogos,
}: LionVotingOverlayProps) {
  const [candidates, setCandidates] = useState(() => sortCandidates(initialCandidates))

  const logoByTeam = useMemo(
    () => new Map(teamLogos.map((team) => [normalizeTeamName(team.name), team.logo])),
    [teamLogos],
  )

  const totalVotes = useMemo(
    () => candidates.reduce((total, candidate) => total + candidate.votes, 0),
    [candidates],
  )
  const leaders = candidates.slice(0, 3)

  useEffect(() => {
    document.documentElement.classList.add("obs-overlay-page")
    document.body.classList.add("obs-overlay-page")

    return () => {
      document.documentElement.classList.remove("obs-overlay-page")
      document.body.classList.remove("obs-overlay-page")
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let disposed = false
    let refreshInFlight = false
    let fallbackTimer: ReturnType<typeof setInterval> | undefined

    const refreshCandidates = async () => {
      if (disposed || refreshInFlight || document.hidden) return
      refreshInFlight = true

      const { data, error } = await supabase
        .from("voting_candidates")
        .select("id,match_id,player_name,team_name,votes,is_hidden,created_at")
        .eq("match_id", matchId)
        .order("votes", { ascending: false })

      refreshInFlight = false

      if (disposed) return
      if (error) {
        console.warn("Не вдалося синхронізувати OBS-голосування:", error.message)
        return
      }

      setCandidates((previous) => replaceCandidates(previous, data ?? []))
    }

    const stopFallback = () => {
      if (!fallbackTimer) return
      clearInterval(fallbackTimer)
      fallbackTimer = undefined
    }

    const startFallback = () => {
      if (disposed || fallbackTimer) return
      void refreshCandidates()
      fallbackTimer = setInterval(() => void refreshCandidates(), FALLBACK_REFRESH_MS)
    }

    const filter = `match_id=eq.${matchId}`
    const channel = supabase
      .channel(`obs-lion-voting-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "voting_candidates", filter },
        (payload) => {
          setCandidates((previous) => updateCandidate(
            previous,
            payload.new as VotingCandidate,
            matchId,
          ))
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "voting_candidates", filter },
        (payload) => {
          setCandidates((previous) => updateCandidate(
            previous,
            payload.new as VotingCandidate,
            matchId,
          ))
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "voting_candidates" },
        (payload) => {
          const deletedId = Number((payload.old as { id?: unknown }).id)
          if (!Number.isSafeInteger(deletedId)) return
          setCandidates((previous) => removeCandidate(previous, deletedId))
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          stopFallback()
          void refreshCandidates()
          return
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          startFallback()
        }
      })

    const connectionTimer = setTimeout(startFallback, CONNECTION_TIMEOUT_MS)
    const safetyTimer = setInterval(() => void refreshCandidates(), SAFETY_REFRESH_MS)
    const syncWhenVisible = () => {
      if (!document.hidden) void refreshCandidates()
    }
    const syncWhenOnline = () => void refreshCandidates()

    document.addEventListener("visibilitychange", syncWhenVisible)
    window.addEventListener("online", syncWhenOnline)

    return () => {
      disposed = true
      stopFallback()
      clearTimeout(connectionTimer)
      clearInterval(safetyTimer)
      document.removeEventListener("visibilitychange", syncWhenVisible)
      window.removeEventListener("online", syncWhenOnline)
      void supabase.removeChannel(channel)
    }
  }, [matchId])

  return (
    <main className={styles.stage}>
      <section className={styles.widget} aria-label="Результати голосування за лева матчу">
        <div className={styles.accentLine} aria-hidden="true" />

        <header className={styles.header}>
          <span className={styles.brandMark} aria-hidden="true">KS</span>
          <span className={styles.heading}>
            <strong>Лев матчу</strong>
            <small>{homeTeam} <b>—</b> {awayTeam}</small>
          </span>
          <span className={styles.liveBadge}>
            <i aria-hidden="true" /> LIVE
          </span>
        </header>

        {leaders.length > 0 ? (
          <div className={styles.candidateList} aria-live="polite">
            {leaders.map((candidate, index) => {
              const percent = totalVotes > 0
                ? Math.round((candidate.votes / totalVotes) * 100)
                : 0

              return (
                <CandidateRow
                  key={candidate.id}
                  candidate={candidate}
                  logo={logoByTeam.get(normalizeTeamName(candidate.team_name))}
                  percent={percent}
                  rank={index + 1}
                />
              )
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>Очікуємо кандидатів</div>
        )}

        <footer className={styles.footer}>
          <span>Топ-3</span>
          <span>Усього голосів <strong>{totalVotes}</strong></span>
        </footer>
      </section>
    </main>
  )
}
