import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Award, Goal, ShieldAlert, Target, UserRound } from "lucide-react"
import { getMatches, getPlayerById, getPlayerCards, getPlayerGoals, getTeams } from "@/lib/database"
import { getMatchDateTime } from "@/lib/match-utils"

type PlayerPageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { id } = await params
  const player = await getPlayerById(Number.parseInt(id, 10))
  if (!player) return { title: "Гравця не знайдено | KS LIGA" }
  const description = `Профіль ${player.name}: команда ${player.team}, голи та матчі KS LIGA.`
  return { title: `${player.name} | KS LIGA`, description, openGraph: { title: `${player.name} | KS LIGA`, description, images: [] }, twitter: { title: `${player.name} | KS LIGA`, description, images: [] } }
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params
  const playerId = Number.parseInt(id, 10)
  if (!Number.isFinite(playerId)) notFound()
  const player = await getPlayerById(playerId)
  if (!player) notFound()

  const [goals, cards, matches, teams] = await Promise.all([
    getPlayerGoals(player.name),
    getPlayerCards(player.name),
    getMatches(player.championship_id),
    getTeams(player.championship_id),
  ])
  const team = teams.find((item) => item.name === player.team)
  const matchById = new Map(matches.map((match) => [match.id, match]))

  return (
    <main className="detail-page">
      <div className="detail-page__container">
        <Link href="/?section=scorers" className="detail-back"><ArrowLeft /> До бомбардирів</Link>
        <section className="profile-hero liquid-glass-card">
          <div className="profile-hero__avatar"><UserRound /></div>
          <div>
            <span className="glass-badge"><Award /> Профіль гравця</span>
            <h1>{player.name}</h1>
            <p>{team ? <Link href={`/teams/${team.id}`}>{team.name}</Link> : player.team}</p>
          </div>
        </section>

        <div className="profile-stats profile-stats--three">
          <div><Goal /><strong>{player.goals}</strong><span>голів у рейтингу</span></div>
          <div><Target /><strong>{goals.length}</strong><span>подій гола</span></div>
          <div><ShieldAlert /><strong>{cards.length}</strong><span>карток</span></div>
        </div>

        <section className="detail-card">
          <div className="detail-card__title"><Goal /> Події у матчах</div>
          <div className="player-events">
            {goals.map((goal) => {
              const match = matchById.get(goal.match_id)
              if (!match) return null
              return (
                <Link href={`/matches/${match.id}`} key={goal.id}>
                  <span>{getMatchDateTime(match).toLocaleDateString("uk-UA")}</span>
                  <strong>{match.home_team} — {match.away_team}</strong>
                  <b>{goal.minute ? `${goal.minute}′` : "Гол"}</b>
                </Link>
              )
            })}
            {!goals.length && <p className="detail-empty">Детальні події голів ще не внесено.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
