"use client"

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { getTeams, getChampionships } from "@/lib/database"
import type { Championship, Team } from "@/lib/supabase"
import { buildCupGroupTable, type CupState } from "@/lib/cup"
import { getCupState, tournamentError } from "@/lib/tournaments"
import { CupBracket, CupMatchLink } from "@/components/cup-bracket"
import type { PosterData } from "@/lib/posters/model"

const PosterEditor = dynamic(() => import("@/components/posters/poster-editor"), { ssr: false })

export function CupTournament({ championshipId }: { championshipId: number }) {
  const [state, setState] = useState<CupState | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [championship, setChampionship] = useState<Championship | null>(null)
  const [poster, setPoster] = useState<PosterData | null>(null)
  const [error, setError] = useState("")
  const load = useCallback(async (cancelled: () => boolean = () => false) => {
    try {
      const [next, teamData, championships] = await Promise.all([getCupState(championshipId), getTeams(championshipId), getChampionships()])
      if (cancelled()) return
      setState(next); setTeams(teamData); setChampionship(championships.find((item) => item.id === championshipId) || null); setError("")
    } catch (e) { if (!cancelled()) setError(tournamentError(e)) }
  }, [championshipId])
  useEffect(() => { let cancelled = false; const timer = window.setTimeout(() => void load(() => cancelled), 0); return () => { cancelled = true; window.clearTimeout(timer) } }, [load])
  if (error) return <div role="alert" className="space-y-3 rounded-2xl border p-5 text-sm"><p>{error}</p><Button variant="outline" onClick={() => void load()}>Спробувати ще раз</Button></div>
  if (!state) return <p className="py-12 text-center text-sm text-slate-500">Завантаження кубкового турніру…</p>
  const config = state.format?.config
  const legacy = state.matches.filter((match) => !match.cup_fixture_id)
  return <div className="space-y-6">
    {poster && <PosterEditor {...poster} onClose={() => setPoster(null)} />}
    {config && config.mode !== "knockout" && <section className="space-y-4" aria-label="Груповий етап">
      <h2 className="ios-section-header">Груповий етап</h2>
      <div className="grid items-start gap-4 lg:grid-cols-2">{config.groups.map((group) => {
        const rows = buildCupGroupTable(config, group, state.fixtures, state.matches, teams)
        const groupIds = new Set(state.fixtures.filter((fixture) => fixture.group_id === group.id).map((fixture) => fixture.id))
        const matches = state.matches.filter((match) => groupIds.has(match.cup_fixture_id || ""))
        return <article key={group.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-2 p-4"><h3 className="font-extrabold">{group.name}</h3><Button size="sm" variant="outline" onClick={() => setPoster({ mode: "standings", championship, matches, teams: teams.filter((team) => group.teamIds.includes(team.id)), standings: rows, draftId: group.id, defaultTitle: group.name.toLocaleUpperCase("uk") })}>Афіша таблиці</Button></div>
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 text-left">Команда</th><th className="px-2">І</th><th className="px-2">В/Н/П</th><th className="px-2">З:П</th><th className="px-3">О</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.teamId} className={`border-t border-slate-100 ${config.mode === "groups_knockout" && index < config.qualifiers ? "bg-emerald-50/60" : ""}`}><td className="p-3 font-semibold"><span className="mr-2 text-slate-400">{index + 1}</span>{row.name}</td><td className="px-2 text-center">{row.games}</td><td className="px-2 text-center">{row.wins}/{row.draws}/{row.losses}</td><td className="px-2 text-center">{row.gf}:{row.ga}</td><td className="px-3 text-center font-extrabold">{row.pts}</td></tr>)}</tbody></table></div>
          <details className="border-t p-4"><summary className="cursor-pointer text-xs font-bold text-slate-600">Матчі групи ({matches.length})</summary><div className="mt-3 space-y-2">{matches.map((match) => <CupMatchLink key={match.id} match={match} />)}</div></details>
        </article>
      })}</div><p className="text-xs text-slate-500">Очки: перемога {config.points.win}, нічия {config.points.draw}, поразка {config.points.loss}. За рівності: {config.tieBreak === "wins" ? "перемоги, різниця голів" : "різниця голів, перемоги"}, забиті голи, порядок посіву. {config.mode === "groups_knockout" ? `У плейоф виходять по ${config.qualifiers} з групи (або учасники ручного посіву).` : ""}</p>
    </section>}
    {config && config.mode !== "groups" && <CupBracket config={config} fixtures={state.fixtures} matches={state.matches} teams={teams} />}
    {legacy.length > 0 && <section className="space-y-4">{config && <h2 className="ios-section-header">Інші матчі кубка</h2>}{[...new Set(legacy.map((match) => match.cup_stage || `Раунд ${match.round}`))].map((stage) => <div key={stage} className="space-y-2"><h3 className="font-bold text-slate-700">{stage}</h3><div className="grid gap-2 sm:grid-cols-2">{legacy.filter((match) => (match.cup_stage || `Раунд ${match.round}`) === stage).map((match) => <CupMatchLink key={match.id} match={match} />)}</div></div>)}</section>}
    {!config && !legacy.length && <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-slate-500">Кубок ще не налаштовано. Організатор може створити групи та сітку в адмінпанелі.</div>}
  </div>
}
