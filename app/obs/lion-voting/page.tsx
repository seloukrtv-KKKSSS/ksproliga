import type { Metadata } from "next"
import { getMatchById, getTeams, getVotingCandidates } from "@/lib/database"
import type { VotingCandidate } from "@/lib/supabase"
import { LionVotingOverlay } from "./lion-voting-overlay"
import styles from "./lion-voting.module.css"

export const metadata: Metadata = {
  title: "Лев матчу — трансляція",
  robots: {
    index: false,
    follow: false,
  },
}

type LionVotingPageProps = {
  searchParams: Promise<{
    matchId?: string | string[]
  }>
}

function parseMatchId(value: string | string[] | undefined): number | null {
  const candidate = Array.isArray(value) ? value[0] : value

  if (!candidate || !/^\d+$/.test(candidate)) return null

  const matchId = Number(candidate)
  return Number.isSafeInteger(matchId) && matchId > 0 ? matchId : null
}

function prepareCandidates(candidates: VotingCandidate[]): VotingCandidate[] {
  return candidates
    .filter((candidate) => !candidate.is_hidden)
    .sort((left, right) => right.votes - left.votes || left.id - right.id)
}

function OverlayMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.stage}>
      <section className={styles.messageCard}>{children}</section>
    </main>
  )
}

export default async function LionVotingPage({ searchParams }: LionVotingPageProps) {
  const matchId = parseMatchId((await searchParams).matchId)

  if (!matchId) {
    return (
      <OverlayMessage>
        <span className={styles.messageMark} aria-hidden="true">KS</span>
        <h1>Лев матчу</h1>
        <p>
          Додайте до адреси параметр <code>?matchId=ID</code>.
        </p>
      </OverlayMessage>
    )
  }

  const [match, candidates] = await Promise.all([
    getMatchById(matchId),
    getVotingCandidates(matchId),
  ])

  if (!match) {
    return (
      <OverlayMessage>
        <span className={styles.messageMark} aria-hidden="true">!</span>
        <h1>Матч не знайдено</h1>
        <p>Перевірте значення параметра <code>matchId</code>.</p>
      </OverlayMessage>
    )
  }

  const teams = await getTeams(match.championship_id)
  const teamLogos = teams
    .filter((team) => Boolean(team.logo))
    .map((team) => ({ name: team.name, logo: team.logo as string }))

  return (
    <LionVotingOverlay
      matchId={matchId}
      homeTeam={match.home_team}
      awayTeam={match.away_team}
      initialCandidates={prepareCandidates(candidates)}
      teamLogos={teamLogos}
    />
  )
}
