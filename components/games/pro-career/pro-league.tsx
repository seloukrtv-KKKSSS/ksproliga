"use client"

import { useState } from "react"
import { ProCareer, ProClub, ProLeague } from "@/lib/pro-types"
import { Shield, Trophy, Award, MapPin } from "lucide-react"

interface ProLeagueProps {
  career: ProCareer
  currentClub: ProClub
  allClubs: ProClub[]
  leagues: ProLeague[]
}

export function ProLeagueStandings({
  career,
  currentClub,
  allClubs,
  leagues
}: ProLeagueProps) {
  const [selectedTier, setSelectedTier] = useState<number>(currentClub.tier)

  const activeLeague = leagues.find((l) => l.tier === selectedTier) || leagues[0]
  const tierClubs = allClubs.filter((c) => c.tier === selectedTier)

  // Generate mock standings table based on club strength and round
  const tableData = tierClubs.map((club, idx) => {
    const isPlayerClub = club.id === currentClub.id
    const played = career.current_fixture_round - 1
    const wins = isPlayerClub
      ? Math.floor(career.career_stats.season_matches * 0.6)
      : Math.floor(played * (club.squad_strength / 100))
    const draws = isPlayerClub ? 1 : Math.floor(Math.random() * 2)
    const losses = Math.max(0, played - wins - draws)
    const pts = wins * 3 + draws

    return {
      club,
      played,
      wins,
      draws,
      losses,
      gf: wins * 2 + Math.floor(Math.random() * 5),
      ga: losses * 2 + Math.floor(Math.random() * 3),
      pts: Math.max(0, pts),
      isPlayerClub
    }
  })

  // Sort by Points
  tableData.sort((a, b) => b.pts - a.pts)

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
      {/* Tier Selector Bar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg overflow-x-auto">
        {leagues.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setSelectedTier(l.tier)}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-black text-xs transition-all cursor-pointer ${
              selectedTier === l.tier
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>Рівень {l.tier}: {l.name.split("(")[0]}</span>
          </button>
        ))}
      </div>

      {/* Standings Table Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">
              {activeLeague.name}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Тур {career.current_fixture_round} з 18
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold">
                <th className="py-2.5 px-2 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Клуб</th>
                <th className="py-2.5 px-2 text-center">І</th>
                <th className="py-2.5 px-2 text-center">В</th>
                <th className="py-2.5 px-2 text-center">Н</th>
                <th className="py-2.5 px-2 text-center">П</th>
                <th className="py-2.5 px-2 text-center font-bold text-white">Очки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tableData.map((row, index) => (
                <tr
                  key={row.club.id}
                  className={`transition-colors ${
                    row.isPlayerClub
                      ? "bg-emerald-950/80 font-bold text-emerald-300 border-l-4 border-l-emerald-400"
                      : "hover:bg-slate-950/50 text-slate-200"
                  }`}
                >
                  <td className="py-3 px-2 text-center font-bold text-slate-400">
                    {index + 1}
                  </td>
                  <td className="py-3 px-3 flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white shadow-xs"
                      style={{
                        background: `linear-gradient(135deg, ${row.club.primary_color}, ${row.club.secondary_color})`
                      }}
                    >
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold">{row.club.name}</span>
                    {row.isPlayerClub && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950">
                        Твій клуб
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-mono">{row.played}</td>
                  <td className="py-3 px-2 text-center font-mono text-emerald-400">{row.wins}</td>
                  <td className="py-3 px-2 text-center font-mono text-amber-400">{row.draws}</td>
                  <td className="py-3 px-2 text-center font-mono text-rose-400">{row.losses}</td>
                  <td className="py-3 px-2 text-center font-mono font-black text-amber-300 text-sm">
                    {row.pts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
