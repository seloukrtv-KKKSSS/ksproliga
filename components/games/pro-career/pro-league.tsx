"use client"

import { useState } from "react"
import { ProCareer, ProClub, ProLeague } from "@/lib/pro-types"
import { Shield, Trophy, Award, MapPin, Sparkles, Swords } from "lucide-react"

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
  const [activeTab, setActiveTab] = useState<"standings" | "cup">("standings")

  const activeLeague = leagues.find((l) => l.tier === selectedTier) || leagues[0]
  const tierClubs = allClubs.filter((c) => c.tier === selectedTier)

  // Generate dynamic simulated standings table
  const tableData = tierClubs.map((club, idx) => {
    const isPlayerClub = club.id === currentClub.id
    const played = Math.max(0, career.current_fixture_round - 1)

    // Player results vs AI simulation based on strength
    const wins = isPlayerClub
      ? Math.floor(career.career_stats.season_matches * 0.65)
      : Math.min(played, Math.floor(played * (club.squad_strength / 100) + ((idx % 3 === 0) ? 1 : 0)))
    const draws = isPlayerClub ? (played > wins ? 1 : 0) : Math.min(played - wins, Math.floor((played - wins) * 0.4))
    const losses = Math.max(0, played - wins - draws)
    const gf = wins * 2 + Math.floor(club.squad_strength / 20) + (isPlayerClub ? career.career_stats.season_goals : 0)
    const ga = losses * 2 + Math.floor(Math.random() * 2)
    const pts = wins * 3 + draws

    return {
      club,
      played,
      wins,
      draws,
      losses,
      gf,
      ga,
      gd: gf - ga,
      pts: Math.max(0, pts),
      isPlayerClub
    }
  })

  // Sort by Points, then Goal Difference
  tableData.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    return b.gd - a.gd
  })

  // Cup tournament bracket simulation for tier
  const cupStages = [
    {
      title: "1/4 Фіналу",
      match1: `${currentClub.name} 2:1 ${tierClubs[1]?.name || "Суперник"}`,
      match2: `${tierClubs[2]?.name || "Клуб А"} 1:0 ${tierClubs[3]?.name || "Клуб Б"}`,
      passed: true
    },
    {
      title: "Півфінал",
      match1: `${currentClub.name} vs ${tierClubs[2]?.name || "Клуб А"}`,
      match2: `${tierClubs[4]?.name || "Клуб В"} vs ${tierClubs[5]?.name || "Клуб Г"}`,
      passed: career.current_fixture_round >= 8
    },
    {
      title: "🏆 ФІНАЛ КУБКА",
      match1: `Переможець 1 vs Переможець 2`,
      match2: "",
      passed: career.current_fixture_round >= 16
    }
  ]

  return (
    <div className="max-w-[1500px] mx-auto w-full space-y-6 animate-fade-in">
      {/* Top Selector: Standings vs Cup */}
      <div className="flex items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-1 flex-1">
          <button
            type="button"
            onClick={() => setActiveTab("standings")}
            className={`flex-1 py-2 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "standings"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Турнірна Таблиця Ліги</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cup")}
            className={`flex-1 py-2 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "cup"
                ? "bg-amber-400 text-slate-950 shadow-md font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>Кубковий Турнір (Плей-оф)</span>
          </button>
        </div>
      </div>

      {activeTab === "standings" && (
        <div className="space-y-4">
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
                  {activeLeague?.name || "Ліга"}
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">
                Тур {career.current_fixture_round} з 18 (Сезон {career.current_season_number})
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
                    <th className="py-2.5 px-2 text-center">Р/М</th>
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
                        {row.club.logo_url ? (
                          <img
                            src={row.club.logo_url}
                            alt={row.club.name}
                            className="w-6 h-6 object-contain drop-shadow shrink-0"
                          />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] text-white shadow-xs shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${row.club.primary_color}, ${row.club.secondary_color})`
                            }}
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="font-bold truncate">{row.club.name}</span>
                        {row.isPlayerClub && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 shrink-0">
                            Твій клуб
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center font-mono">{row.played}</td>
                      <td className="py-3 px-2 text-center font-mono text-emerald-400">{row.wins}</td>
                      <td className="py-3 px-2 text-center font-mono text-amber-400">{row.draws}</td>
                      <td className="py-3 px-2 text-center font-mono text-rose-400">{row.losses}</td>
                      <td className="py-3 px-2 text-center font-mono text-slate-400">
                        {row.gf}:{row.ga}
                      </td>
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
      )}

      {/* ─── CUP TOURNAMENT PLAYOFF BRACKET ─── */}
      {activeTab === "cup" && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-black text-white">
                  Кубок {activeLeague?.name ? activeLeague.name.split("(")[0] : "Області"}
                </h3>
                <span className="text-xs text-slate-400">
                  Плей-оф турнір на вибування
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cupStages.map((stage, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 ${
                  stage.passed
                    ? "bg-slate-950 border-emerald-500/40"
                    : "bg-slate-950/50 border-slate-800 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-amber-400 text-xs uppercase tracking-wider">
                      {stage.title}
                    </h4>
                    {stage.passed && (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        ✓ Пройдено
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-bold">
                    {stage.match1}
                  </div>
                  {stage.match2 && (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 mt-2">
                      {stage.match2}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
