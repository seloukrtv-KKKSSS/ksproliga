"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Search, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { TeamDisplay } from "@/components/team-display"
import { withReturnTo } from "@/lib/detail-navigation"
import type { Player, Team } from "@/lib/supabase"

type Statistic = "goals" | "yellow_cards" | "red_cards"

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("uk")

export function PlayerStatistics({ players, teams }: { players: Player[]; teams: Team[] }) {
  const [search, setSearch] = useState("")
  const [selectedTeam, setSelectedTeam] = useState("")
  const [sortBy, setSortBy] = useState<Statistic>("goals")
  const activePlayers = useMemo(
    () => players.filter((player) => player.goals > 0 || (player.yellow_cards ?? 0) > 0 || (player.red_cards ?? 0) > 0),
    [players],
  )
  const teamNames = useMemo(
    () => [...new Set(activePlayers.map((player) => player.team))].sort((a, b) => a.localeCompare(b, "uk")),
    [activePlayers],
  )
  const visiblePlayers = useMemo(() => activePlayers
    .filter((player) => (!selectedTeam || player.team === selectedTeam) && normalize(player.name).includes(normalize(search)))
    .sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0) || b.goals - a.goals || a.name.localeCompare(b.name, "uk") || a.id - b.id),
  [activePlayers, selectedTeam, search, sortBy])

  return (
    <section className="space-y-3" aria-label="Статистика гравців">
      <div className="ios-section-header">Статистика гравців</div>
      <p className="px-1 text-xs text-slate-600">Гравці з голами або картками у вибраному турнірі.</p>
      <div className="liquid-glass-card space-y-3 p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1 text-xs font-semibold text-slate-700">
            <span>Знайти гравця</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ім’я або прізвище" className="h-10 bg-white/70 pl-9" type="search" />
            </span>
          </label>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">
            <span>Команда</span>
            <select value={selectedTeam} onChange={(event) => setSelectedTeam(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white/70 px-3 text-sm text-slate-900">
              <option value="">Усі команди</option>
              {teamNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">
            <span>Сортувати за</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as Statistic)} className="h-10 w-full rounded-md border border-slate-200 bg-white/70 px-3 text-sm text-slate-900">
              <option value="goals">Голами</option>
              <option value="yellow_cards">Жовтими картками</option>
              <option value="red_cards">Червоними картками</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-slate-500" role="status">Гравців: {visiblePlayers.length} із {activePlayers.length}</p>
      </div>

      <div className="liquid-glass-card overflow-hidden">
        {visiblePlayers.length ? (
          <table className="w-full table-fixed text-left text-sm">
            <caption className="sr-only">Голи, жовті та червоні картки гравців вибраного турніру</caption>
            <thead className="border-b border-slate-200/70 bg-white/30 text-[11px] text-slate-600 sm:text-xs">
              <tr>
                <th scope="col" className="px-3 py-3 font-semibold sm:px-4">Гравець / команда</th>
                <th scope="col" className="w-14 px-1 py-3 text-center font-semibold sm:w-20">Голи</th>
                <th scope="col" className="w-12 px-1 py-3 text-center font-semibold sm:w-20"><span aria-hidden="true">ЖК</span><span className="sr-only">Жовті картки</span></th>
                <th scope="col" className="w-12 px-1 py-3 text-center font-semibold sm:w-20"><span aria-hidden="true">ЧК</span><span className="sr-only">Червоні картки</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visiblePlayers.map((player) => (
                <tr key={player.id} className="hover:bg-white/20">
                  <th scope="row" className="min-w-0 px-3 py-3 font-normal sm:px-4">
                    <Link href={withReturnTo(`/players/${player.id}`, "/?section=scorers")} className="block break-words font-bold text-slate-900 hover:text-blue-600">{player.name}</Link>
                    <div className="mt-1 text-xs text-slate-500">
                      <TeamDisplay teamName={player.team} teamLogo={teams.find((team) => team.name === player.team)?.logo} size="sm" showName className="min-w-0 [&>span]:min-w-0 [&>span]:break-words [&>span]:text-xs" />
                    </div>
                  </th>
                  <td className="px-1 py-3 text-center font-bold tabular-nums text-blue-700">{player.goals}</td>
                  <td className="px-1 py-3 text-center font-bold tabular-nums text-amber-700">{player.yellow_cards ?? 0}</td>
                  <td className="px-1 py-3 text-center font-bold tabular-nums text-red-700">{player.red_cards ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="font-semibold text-slate-900">{activePlayers.length ? "Гравців не знайдено" : "Статистику ще не внесено"}</p>
            <p className="mt-1 text-xs text-slate-500">{activePlayers.length ? "Змініть пошук або виберіть іншу команду." : "Тут з’являться гравці, які забили голи або отримали картки."}</p>
            {(search || selectedTeam) && <button type="button" onClick={() => { setSearch(""); setSelectedTeam("") }} className="mt-4 rounded-lg border border-slate-200 bg-white/60 px-4 py-2 text-xs font-semibold text-blue-700">Скинути фільтри</button>}
          </div>
        )}
      </div>
      <p className="px-1 text-[11px] text-slate-500">ЖК — жовті картки · ЧК — червоні картки</p>
    </section>
  )
}
