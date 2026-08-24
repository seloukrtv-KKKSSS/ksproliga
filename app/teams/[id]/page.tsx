import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarDays, MapPin, Shield, Target, Trophy, Users } from "lucide-react"
import { getChampionships, getMatchesForTeam, getPlayers, getTeamById, getTeams } from "@/lib/database"
import { buildLeagueTable } from "@/lib/league-utils"
import { formatMatchScore, getMatchDateTime } from "@/lib/match-utils"
import { SafeImage } from "@/components/safe-image"

type TeamPageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { id } = await params
  const team = await getTeamById(Number.parseInt(id, 10))
  if (!team) return { title: "Команду не знайдено | KS LIGA" }
  const description = `Профіль команди ${team.name}: матчі, форма, склад і статистика KS LIGA.`
  return {
    title: `${team.name} | KS LIGA`,
    description,
    openGraph: { title: `${team.name} | KS LIGA`, description, images: team.logo ? [{ url: team.logo }] : [] },
    twitter: { title: `${team.name} | KS LIGA`, description, images: team.logo ? [team.logo] : [] },
  }
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { id } = await params
  const teamId = Number.parseInt(id, 10)
  if (!Number.isFinite(teamId)) notFound()
  const team = await getTeamById(teamId)
  if (!team) notFound()

  const [matches, teams, players, championships] = await Promise.all([
    getMatchesForTeam(team.name, team.championship_id),
    getTeams(team.championship_id),
    getPlayers(team.championship_id),
    getChampionships(),
  ])
  const standing = buildLeagueTable(matches, teams).find((row) => row.name === team.name)
  const championship = championships.find((item) => item.id === team.championship_id)
  const teamPlayers = players.filter((player) => player.team === team.name)
  const finished = matches.filter((match) => match.is_finished)
  const upcoming = matches.filter((match) => !match.is_finished).sort((a, b) => getMatchDateTime(a).getTime() - getMatchDateTime(b).getTime())
  const recent = [...finished].sort((a, b) => getMatchDateTime(b).getTime() - getMatchDateTime(a).getTime()).slice(0, 5)

  return (
    <main className="detail-page">
      <div className="detail-page__container">
        <Link href="/?section=table" className="detail-back"><ArrowLeft /> До таблиці</Link>
        <section className="profile-hero liquid-glass-card">
          <div className="profile-hero__logo">
            <SafeImage src={team.logo || "/placeholder-logo.png"} alt={`Логотип ${team.name}`} width={160} height={160} />
          </div>
          <div>
            <span className="glass-badge"><Shield /> {championship?.name || "KS LIGA"}</span>
            <h1>{team.name}</h1>
            <p>{team.city ? <><MapPin /> {team.city}</> : "Офіційний профіль команди"}</p>
          </div>
        </section>

        <div className="profile-stats">
          <div><Trophy /><strong>{standing?.pts ?? 0}</strong><span>очок</span></div>
          <div><CalendarDays /><strong>{standing?.games ?? finished.length}</strong><span>матчів</span></div>
          <div><Target /><strong>{standing?.gf ?? 0}:{standing?.ga ?? 0}</strong><span>голи</span></div>
          <div><Users /><strong>{team.roster?.length || teamPlayers.length}</strong><span>гравців</span></div>
        </div>

        <div className="detail-grid">
          <section className="detail-card">
            <div className="detail-card__title"><CalendarDays /> Наступні матчі</div>
            <div className="profile-match-list">
              {upcoming.length ? upcoming.slice(0, 4).map((match) => (
                <Link href={`/matches/${match.id}`} key={match.id}>
                  <span>{getMatchDateTime(match).toLocaleDateString("uk-UA", { day: "2-digit", month: "short" })}</span>
                  <strong>{match.home_team} — {match.away_team}</strong>
                  <b>VS</b>
                </Link>
              )) : <p className="detail-empty">Матчі ще не заплановано.</p>}
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card__title"><Trophy /> Остання форма</div>
            <div className="profile-match-list">
              {recent.length ? recent.map((match) => (
                <Link href={`/matches/${match.id}`} key={match.id}>
                  <span>{getMatchDateTime(match).toLocaleDateString("uk-UA", { day: "2-digit", month: "short" })}</span>
                  <strong>{match.home_team} — {match.away_team}</strong>
                  <b>{formatMatchScore(match)}</b>
                </Link>
              )) : <p className="detail-empty">Зіграних матчів ще немає.</p>}
            </div>
          </section>

          <section className="detail-card detail-card--wide">
            <div className="detail-card__title"><Users /> Склад</div>
            <div className="roster-grid">
              {(team.roster?.length ? team.roster : teamPlayers.map((player) => player.name)).map((name, index) => {
                const player = teamPlayers.find((item) => item.name === name)
                return player
                  ? <Link href={`/players/${player.id}`} key={player.id}><span>{index + 1}</span>{name}</Link>
                  : <div key={`${name}-${index}`}><span>{index + 1}</span>{name}</div>
              })}
              {!team.roster?.length && !teamPlayers.length && <p className="detail-empty">Склад ще не опубліковано.</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
