import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Award, CalendarDays, Clock, Goal, ShieldAlert, Users } from "lucide-react"
import { MatchDetailActions } from "@/components/match-detail-actions"
import { TeamDisplay } from "@/components/team-display"
import { YouTubeBroadcast } from "@/components/youtube-broadcast"
import {
  getChampionships,
  getMatchById,
  getMatchCards,
  getMatchGoals,
  getMatchVoting,
  getTeams,
  getVotingCandidates,
} from "@/lib/database"
import { formatTime } from "@/lib/league-utils"
import { formatMatchScore, getMatchDateTime } from "@/lib/match-utils"

type MatchPageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: MatchPageProps): Promise<Metadata> {
  const { id } = await params
  const match = await getMatchById(Number.parseInt(id, 10))
  if (!match) return { title: "Матч не знайдено | KS LIGA" }

  const title = `${match.home_team} — ${match.away_team} | KS LIGA`
  const description = match.is_finished
    ? `Результат ${formatMatchScore(match)}. Протокол матчу KS LIGA.${match.youtube_url ? " Доступний запис трансляції." : ""}`
    : `Матч ${getMatchDateTime(match).toLocaleString("uk-UA")}. Календар KS LIGA.${match.youtube_url ? " Доступна YouTube-трансляція." : ""}`

  return {
    title,
    description,
    openGraph: { title, description, images: [] },
    twitter: { title, description, images: [] },
  }
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params
  const matchId = Number.parseInt(id, 10)
  if (!Number.isFinite(matchId)) notFound()

  const match = await getMatchById(matchId)
  if (!match) notFound()

  const [teams, goals, cards, voting, candidates, championships] = await Promise.all([
    getTeams(match.championship_id),
    getMatchGoals(match.id),
    getMatchCards(match.id),
    getMatchVoting(match.id),
    getVotingCandidates(match.id),
    getChampionships(),
  ])
  const home = teams.find((team) => team.name === match.home_team)
  const away = teams.find((team) => team.name === match.away_team)
  const championship = championships.find((item) => item.id === match.championship_id)
  const homeGoals = goals.filter((goal) => goal.team_name === match.home_team)
  const awayGoals = goals.filter((goal) => goal.team_name === match.away_team)
  const homeCards = cards.filter((card) => card.team_name === match.home_team)
  const awayCards = cards.filter((card) => card.team_name === match.away_team)
  const votingWinner = [...candidates].sort((a, b) => b.votes - a.votes)[0]

  return (
    <main className="detail-page">
      <div className="detail-page__container">
        <Link href="/?section=results" className="detail-back"><ArrowLeft /> На головну</Link>

        <section className="match-hero glass-hero">
          <div className="match-hero__meta">
            <span>{championship?.name || "KS LIGA"}</span>
            <span>{match.cup_stage || `Тур ${match.round}`}</span>
          </div>
          <div className="match-hero__teams">
            <Link href={home ? `/teams/${home.id}` : "#"} className="match-hero__team">
              <TeamDisplay teamName={match.home_team} teamLogo={home?.logo} size="lg" showName={false} />
              <strong>{match.home_team}</strong>
              <span>Господарі</span>
            </Link>
            <div className="match-hero__score">
              <span>{formatMatchScore(match)}</span>
              <small>{match.is_finished ? "Матч завершено" : "Заплановано"}</small>
            </div>
            <Link href={away ? `/teams/${away.id}` : "#"} className="match-hero__team">
              <TeamDisplay teamName={match.away_team} teamLogo={away?.logo} size="lg" showName={false} />
              <strong>{match.away_team}</strong>
              <span>Гості</span>
            </Link>
          </div>
          <div className="match-hero__schedule">
            <span><CalendarDays /> {getMatchDateTime(match).toLocaleDateString("uk-UA", { dateStyle: "long" })}</span>
            <span><Clock /> {formatTime(match.match_time) || "Час уточнюється"}</span>
          </div>
          <MatchDetailActions match={match} />
        </section>

        {match.youtube_url && <YouTubeBroadcast match={match} />}

        <div className="detail-grid">
          <section className="detail-card">
            <div className="detail-card__title"><Goal /> Голи</div>
            <div className="event-columns">
              {[{ name: match.home_team, items: homeGoals }, { name: match.away_team, items: awayGoals }].map((column) => (
                <div key={column.name}>
                  <strong>{column.name}</strong>
                  {column.items.length ? column.items.map((goal) => (
                    <p key={goal.id}><span>{goal.minute ? `${goal.minute}′` : "—"}</span>{goal.player_name}</p>
                  )) : <p className="detail-empty">Немає записів</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card__title"><ShieldAlert /> Картки</div>
            <div className="event-columns">
              {[{ name: match.home_team, items: homeCards }, { name: match.away_team, items: awayCards }].map((column) => (
                <div key={column.name}>
                  <strong>{column.name}</strong>
                  {column.items.length ? column.items.map((card) => (
                    <p key={card.id}><span>{card.minute ? `${card.minute}′` : "—"}</span>{card.player_name}</p>
                  )) : <p className="detail-empty">Немає записів</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card__title"><Users /> Склади команд</div>
            <div className="event-columns">
              {[home, away].map((team, index) => (
                <div key={team?.id || index}>
                  <strong>{team?.name || (index === 0 ? match.home_team : match.away_team)}</strong>
                  {team?.roster?.length ? team.roster.map((player) => <p key={player}>{player}</p>) : <p className="detail-empty">Склад ще не опубліковано</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card__title"><Award /> Лев матчу</div>
            {voting && votingWinner ? (
              <div className="mvp-summary">
                <strong>{votingWinner.player_name}</strong>
                <span>{votingWinner.team_name}</span>
                <b>{votingWinner.votes} голосів</b>
              </div>
            ) : <p className="detail-empty">Голосування або результат ще не опубліковано.</p>}
          </section>
        </div>
      </div>
    </main>
  )
}
