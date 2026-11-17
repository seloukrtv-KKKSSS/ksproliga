"use client"

import Link from "next/link"
import { SafeImage } from "@/components/safe-image"
import { LocalMatchDateTime } from "@/components/local-time"
import { getMatchStatusInfo } from "@/lib/league-utils"
import type { Match, Team } from "@/lib/supabase"
import { cupSourceLabel, type CupConfig, type CupFixture } from "@/lib/cup"

export function CupMatchLink({ match }: { match: Match }) {
  return <Link href={`/matches/${match.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs transition-colors hover:bg-blue-50"><span className="min-w-0 truncate">{match.home_team} — {match.away_team}</span><span className="shrink-0 font-bold">{match.is_finished ? getMatchStatusInfo(match).scoreText : <LocalMatchDateTime match={match} mode="dateTime" />}</span></Link>
}

export function CupBracket({ config, fixtures, matches, teams }: { config: CupConfig; fixtures: CupFixture[]; matches: Match[]; teams: Team[] }) {
  const stages = [...new Set(fixtures.filter((fixture) => fixture.stage > 0).map((fixture) => fixture.stage))].sort((a, b) => a - b)
  const byId = new Map(teams.map((team) => [team.id, team]))
  const final = fixtures.find((fixture) => fixture.stage === stages.at(-1) && fixture.id !== "third-place")
  const champion = final?.resolved && final.winner_team_id ? byId.get(final.winner_team_id) : null
  return <section className="space-y-4" aria-label="Сітка плейоф">
    {champion && <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5"><SafeImage src={champion.logo || "/placeholder.svg"} alt={champion.name} width={64} height={64} className="h-16 w-16 object-contain" /><div><p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Володар кубка</p><h3 className="text-xl font-black text-slate-900">{champion.name}</h3></div></div>}
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex min-w-max gap-7">
      {stages.map((stage) => <div key={stage} className="flex w-[290px] flex-col"><h3 className="mb-4 text-sm font-extrabold text-slate-800">{fixtures.find((fixture) => fixture.stage === stage)?.label}</h3><div className="flex flex-1 flex-col justify-around gap-5">
        {fixtures.filter((fixture) => fixture.stage === stage).map((fixture) => {
          const games = matches.filter((match) => match.cup_fixture_id === fixture.id).sort((a, b) => (a.cup_leg || 1) - (b.cup_leg || 1))
          const homeId = fixture.home_source.kind === "team" ? fixture.home_source.teamId : undefined
          const awayId = fixture.away_source.kind === "team" ? fixture.away_source.teamId : undefined
          const names = games.length ? [games[0].home_team, games[0].away_team] : [homeId ? byId.get(homeId)?.name || "Команду видалено" : cupSourceLabel(fixture.home_source, config, teams, fixtures), awayId ? byId.get(awayId)?.name || "Команду видалено" : cupSourceLabel(fixture.away_source, config, teams, fixtures)]
          const winner = fixture.winner_team_id ? byId.get(fixture.winner_team_id)?.name : null
          const drawPending = !fixture.resolved && games.length === fixture.legs && games.every((match) => match.is_finished)
          return <article key={fixture.id} className="relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex justify-between text-[10px] font-bold text-slate-400"><span>{fixture.id === "third-place" ? "За третє місце" : `Пара ${fixture.position + 1}`}</span><span>{fixture.legs === 2 ? "Два матчі" : "Один матч"}</span></div>
            {names.map((name, index) => {
              const team = teams.find((item) => item.name === name)
              const score = games.length === fixture.legs && games.every((match) => match.is_finished) ? games.reduce((sum, match) => sum + (match.is_technical_defeat ? match.technical_winner === name ? 3 : 0 : (match.home_team === name ? match.home_score : match.away_score) || 0), 0) : null
              return <div key={index} className={`flex items-center gap-2 rounded-lg px-1 py-2 text-xs ${winner === name ? "bg-emerald-50 font-extrabold text-emerald-800" : "text-slate-700"}`}>{team && <SafeImage src={team.logo || "/placeholder.svg"} alt="" width={28} height={28} className="h-7 w-7 shrink-0 object-contain" />}<span className="min-w-0 flex-1">{name}</span><strong className="text-sm">{score ?? "—"}</strong></div>
            })}
            {fixture.resolved && !games.length && winner && <p className="mt-2 text-[10px] text-emerald-700">{winner} проходить без гри</p>}
            {drawPending && <p className="mt-2 text-[10px] text-amber-800">Очікуємо результат серії пенальті</p>}
            <div className="mt-2 space-y-1">{games.map((match) => <CupMatchLink key={match.id} match={match} />)}</div>
          </article>
        })}
      </div></div>)}
    </div></div>
  </section>
}
