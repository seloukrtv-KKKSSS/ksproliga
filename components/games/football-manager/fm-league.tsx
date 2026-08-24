"use client"

import { useState, useEffect } from "react"
import type { FMClub, FMLeagueStanding, FMMatch } from "@/lib/fm-types"
import { fmGetLeagueStandings, fmGetRecentMatches } from "@/lib/fm-database"
import { Trophy, Calendar } from "lucide-react"

interface FMLeagueProps {
  club?: FMClub
  userClub?: FMClub
}

export function FMLeagueStandingsView({ club, userClub }: FMLeagueProps) {
  const activeClub = club || userClub
  const [standings, setStandings] = useState<FMLeagueStanding[]>([])
  const [recentMatches, setRecentMatches] = useState<FMMatch[]>([])

  useEffect(() => {
    if (!activeClub) return
    fmGetLeagueStandings(activeClub.league_id || 1).then(setStandings)
    fmGetRecentMatches(activeClub.id).then(setRecentMatches)
  }, [activeClub])

  if (!activeClub) return null

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-10 text-white">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-950 border border-amber-500/40 text-amber-400 flex items-center justify-center">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">KS Прем'єр Ліга</h2>
            <p className="text-xs text-slate-400">Сезон 2025/2026 • 1-й Дивізіон • 10 клубів</p>
          </div>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-black text-emerald-400">
          Ваш клуб: {activeClub.name}
        </div>
      </div>

      {/* Standings Table Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
          Турнірна таблиця чемпіонату:
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3 w-8">#</th>
                <th className="py-2.5 px-3">Клуб</th>
                <th className="py-2.5 px-3 text-center">І</th>
                <th className="py-2.5 px-3 text-center">В</th>
                <th className="py-2.5 px-3 text-center">Н</th>
                <th className="py-2.5 px-3 text-center">П</th>
                <th className="py-2.5 px-3 text-center">ЗМ-ПМ</th>
                <th className="py-2.5 px-3 text-center">РГ</th>
                <th className="py-2.5 px-3 text-right font-black text-white">Очки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {standings.map((row, idx) => {
                const isUserClub = row.club_id === activeClub.id
                const goalDiff = row.goals_for - row.goals_against

                return (
                  <tr
                    key={row.id || idx}
                    className={`transition-colors ${
                      isUserClub
                        ? "bg-emerald-950/60 font-bold border-l-2 border-emerald-400"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="py-3 px-3">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                          idx === 0
                            ? "bg-amber-500 text-slate-950 shadow-md"
                            : idx <= 2
                            ? "bg-blue-600 text-white"
                            : idx >= standings.length - 2
                            ? "bg-red-900 text-red-200"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-xs sm:text-sm">{row.club_name}</span>
                        {isUserClub && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950">
                            Ви
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300">{row.played}</td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-bold">{row.won}</td>
                    <td className="py-3 px-3 text-center text-amber-400">{row.drawn}</td>
                    <td className="py-3 px-3 text-center text-red-400">{row.lost}</td>
                    <td className="py-3 px-3 text-center text-slate-300">
                      {row.goals_for}:{row.goals_against}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-300">
                      {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sm text-emerald-400">{row.points}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500" />
            <span>Чемпіон KS Ліги</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-blue-600" />
            <span>Кваліфікація Єврокубків</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-red-900" />
            <span>Зона вильоту</span>
          </div>
        </div>
      </div>

      {/* Recent Matches Log */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="h-4 w-4 text-emerald-400" />
          <span>Останні зіграні матчі вашого клубу:</span>
        </div>

        {recentMatches.length === 0 ? (
          <div className="text-xs text-slate-500 py-4 text-center">
            Ще не зіграно жодного матчу. Перейдіть у Матч-Центр та почніть першу гру!
          </div>
        ) : (
          <div className="space-y-2">
            {recentMatches.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="font-bold text-white min-w-[120px] text-left">{m.home_club_name}</div>
                <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 font-black text-emerald-400 text-sm">
                  {m.home_score} : {m.away_score}
                </div>
                <div className="font-bold text-white min-w-[120px] text-right">{m.away_club_name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
