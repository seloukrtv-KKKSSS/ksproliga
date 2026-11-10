import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Award, Goal, ShieldAlert, UserRound } from "lucide-react"
import { getMatches, getPlayerById, getPlayerCards, getPlayerGoals, getTeams } from "@/lib/database"
import { LocalMatchDateTime, ViewerTimeZoneNote } from "@/components/local-time"
import { getSafeReturnTo, withReturnTo, type ReturnToParam } from "@/lib/detail-navigation"
import { getMatchDateTime } from "@/lib/match-utils"

type PlayerPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: ReturnToParam }>
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { id } = await params
  const player = await getPlayerById(Number.parseInt(id, 10))
  if (!player) return { title: "Гравця не знайдено | KS LIGA" }
  const description = `Статистика ${player.name}: команда ${player.team}, голи, жовті та червоні картки KS LIGA.`
  return { title: `${player.name} | KS LIGA`, description, openGraph: { title: `${player.name} | KS LIGA`, description, images: [] }, twitter: { title: `${player.name} | KS LIGA`, description, images: [] } }
}

export default async function PlayerPage({ params, searchParams }: PlayerPageProps) {
  const { id } = await params
  const { returnTo } = await searchParams
  const playerId = Number.parseInt(id, 10)
  if (!Number.isFinite(playerId)) notFound()
  const player = await getPlayerById(playerId)
  if (!player) notFound()

  const [goals, cards, matches, teams] = await Promise.all([
    getPlayerGoals(player.name, player.team, player.championship_id),
    getPlayerCards(player.name, player.team, player.championship_id),
    getMatches(player.championship_id),
    getTeams(player.championship_id),
  ])
  const team = teams.find((item) => item.name === player.team)
  const matchById = new Map(matches.map((match) => [match.id, match]))
  const events = [
    ...goals.map((goal) => ({
      key: `goal-${goal.id}`,
      matchId: goal.match_id,
      minute: goal.minute,
      label: goal.goal_type === "own_goal" ? "Автогол" : goal.goal_type === "penalty" ? "Гол з пенальті" : "Гол",
      color: "text-blue-700",
    })),
    ...cards.map((card) => ({
      key: `card-${card.id}`,
      matchId: card.match_id,
      minute: card.minute,
      label: card.card_type === "yellow" ? "Жовта картка" : card.card_type === "yellow_red" ? "Друга жовта" : "Червона картка",
      color: card.card_type === "yellow" ? "text-amber-700" : "text-red-700",
    })),
  ].filter((event) => matchById.has(event.matchId)).sort((a, b) =>
    getMatchDateTime(matchById.get(b.matchId)!).getTime() - getMatchDateTime(matchById.get(a.matchId)!).getTime()
    || (b.minute ?? 0) - (a.minute ?? 0),
  )
  const backHref = getSafeReturnTo(returnTo, "/?section=scorers")
  const currentHref = withReturnTo(`/players/${player.id}`, backHref)

  return (
    <main className="detail-page">
      <div className="detail-page__container">
        <Link href={backHref} className="detail-back"><ArrowLeft /> Назад</Link>
        <section className="profile-hero liquid-glass-card">
          <div className="profile-hero__avatar"><UserRound /></div>
          <div>
            <span className="glass-badge"><Award /> Профіль гравця</span>
            <h1>{player.name}</h1>
            <p>{team ? <Link href={withReturnTo(`/teams/${team.id}`, currentHref)}>{team.name}</Link> : player.team}</p>
          </div>
        </section>

        <div className="profile-stats profile-stats--three">
          <div><Goal /><strong>{player.goals}</strong><span>голів</span></div>
          <div><ShieldAlert className="text-amber-600" /><strong>{player.yellow_cards ?? 0}</strong><span>жовтих карток</span></div>
          <div><ShieldAlert className="text-red-600" /><strong>{player.red_cards ?? 0}</strong><span>червоних карток</span></div>
        </div>

        <section className="detail-card">
          <div className="detail-card__title"><Goal /> Події у матчах</div>
          <ViewerTimeZoneNote className="mb-3 text-xs text-slate-500" />
          <div className="player-events">
            {events.map((event) => {
              const match = matchById.get(event.matchId)
              if (!match) return null
              return (
                <Link href={withReturnTo(`/matches/${match.id}`, currentHref)} key={event.key}>
                  <span><LocalMatchDateTime match={match} mode="date" showTimeZone={false} /></span>
                  <div className="min-w-0">
                    <strong className="block">{match.home_team} — {match.away_team}</strong>
                    <small className={`block text-[11px] font-semibold ${event.color}`}>{event.label}</small>
                  </div>
                  <b>{event.minute != null ? `${event.minute}′` : "—"}</b>
                </Link>
              )
            })}
            {!events.length && <p className="detail-empty">Детальні події матчів ще не внесено.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
