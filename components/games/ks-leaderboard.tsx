"use client"

import { useState, useEffect } from "react"
import {
  Trophy,
  Medal,
  Sparkles,
  RefreshCw,
  Flame,
  User,
  Crown,
  Wallet,
  Shield,
  Star,
  Coins,
  TrendingUp,
  Award
} from "lucide-react"
import { getGameLeaderboard } from "@/lib/database"
import { proGetLeaderboardCareers } from "@/lib/pro-database"
import { ProLeaderboardEntry } from "@/lib/pro-types"
import type { GameScore } from "@/lib/supabase"

interface KsLeaderboardProps {
  initialGameType?: "pro" | "dino" | "snake"
  currentPlayerName?: string
  lastSubmittedScoreId?: number
}

export function KsLeaderboard({
  initialGameType = "pro",
  currentPlayerName = "",
  lastSubmittedScoreId
}: KsLeaderboardProps) {
  const [activeGame, setActiveGame] = useState<"pro" | "dino" | "snake">(initialGameType)
  const [proSortBy, setProSortBy] = useState<"legacy" | "money" | "goals" | "ovr">("legacy")
  const [scores, setScores] = useState<GameScore[]>([])
  const [proEntries, setProEntries] = useState<ProLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    setActiveGame(initialGameType)
  }, [initialGameType])

  useEffect(() => {
    if (activeGame === "pro") {
      loadProLeaderboard(proSortBy)
    } else {
      loadArcadeLeaderboard(activeGame)
    }
  }, [activeGame, proSortBy, lastSubmittedScoreId])

  const loadProLeaderboard = async (sortBy: "legacy" | "money" | "goals" | "ovr", isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await proGetLeaderboardCareers(sortBy)
      setProEntries(data)
    } catch (err) {
      console.error("Error loading pro career leaderboard:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadArcadeLeaderboard = async (gameType: "dino" | "snake", isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await getGameLeaderboard(gameType, 10)
      setScores(data)
    } catch (error) {
      console.error("Error loading arcade leaderboard:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const getMedalBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-black text-xs shadow-md shadow-amber-400/30 ring-2 ring-amber-300/60 shrink-0 animate-pulse">
          🥇
        </span>
      )
    }
    if (rank === 2) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 text-slate-900 flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-slate-300/60 shrink-0">
          🥈
        </span>
      )
    }
    if (rank === 3) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-600 to-amber-700 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-amber-600/60 shrink-0">
          🥉
        </span>
      )
    }
    return (
      <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-200/80 shrink-0">
        {rank}
      </span>
    )
  }

  const getTierBadge = (tier: number) => {
    if (tier === 5) return { label: "УПЛ", bg: "bg-amber-400 text-slate-950" }
    if (tier === 4) return { label: "Перша Ліга", bg: "bg-blue-600 text-white" }
    if (tier === 3) return { label: "Друга Ліга", bg: "bg-emerald-600 text-white" }
    if (tier === 2) return { label: "Область", bg: "bg-purple-600 text-white" }
    return { label: "Село/Район", bg: "bg-slate-700 text-emerald-300" }
  }

  return (
    <div className="space-y-4 w-full">
      {/* Game Selector Tabs */}
      <div className="flex items-center justify-between gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveGame("pro")}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer select-none ${
            activeGame === "pro"
              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span>⚽</span>
          <span>Від Села до УПЛ</span>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 ml-1">
            RPG
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGame("dino")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer select-none ${
            activeGame === "dino"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>🏃</span>
          <span>Dino Runner</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveGame("snake")}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer select-none ${
            activeGame === "snake"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>🐍</span>
          <span>Retro Snake</span>
        </button>

        <button
          type="button"
          onClick={() =>
            activeGame === "pro"
              ? loadProLeaderboard(proSortBy, true)
              : loadArcadeLeaderboard(activeGame, true)
          }
          disabled={refreshing}
          title="Оновити таблицю"
          className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200/60 shadow-xs transition-all active:scale-95 shrink-0"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`}
          />
        </button>
      </div>

      {/* ─── 1. PRO CAREER LEADERBOARD ─── */}
      {activeGame === "pro" && (
        <div className="space-y-3">
          {/* Sub Filters */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-xs overflow-x-auto text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase px-2">
              Сортувати:
            </span>
            {[
              { id: "legacy", label: "🏆 Очки Кар'єри" },
              { id: "money", label: "💰 Капітал & Гроші" },
              { id: "goals", label: "⚽ Бомбардири" },
              { id: "ovr", label: "⭐ Рейтинг OVR" }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setProSortBy(f.id as any)}
                className={`py-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  proSortBy === f.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Leaderboard Table Card */}
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-xl rounded-3xl overflow-hidden divide-y divide-slate-100">
            <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span className="font-extrabold text-xs sm:text-sm tracking-tight">
                  Зал Слави «Від Села до УПЛ» · ТОП Футболістів
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                <Flame className="h-3 w-3" />
                Live Рейтинг
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">
                  Завантаження футбольного рейтингу...
                </p>
              </div>
            ) : proEntries.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-2">
                <Crown className="h-10 w-10 text-amber-300 mx-auto" />
                <div className="font-bold text-sm text-slate-800">
                  Кар'єр ще не зареєстровано!
                </div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Створіть футболіста у вкладці «Від Села до УПЛ» та станьте першою легендою!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold">
                      <th className="py-3 px-3 w-12 text-center">#</th>
                      <th className="py-3 px-3">Футболіст</th>
                      <th className="py-3 px-3">Клуб & Ліга</th>
                      <th className="py-3 px-2 text-center">OVR</th>
                      <th className="py-3 px-2 text-center">Матчі</th>
                      <th className="py-3 px-2 text-center">Голи (Ас)</th>
                      <th className="py-3 px-3 text-right">Капітал ₴</th>
                      <th className="py-3 px-3 text-right font-black text-slate-900">
                        Очки Слави
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proEntries.map((p, idx) => {
                      const rank = idx + 1
                      const tierBadge = getTierBadge(p.tier)
                      const isMe = p.is_current_user

                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${
                            isMe
                              ? "bg-emerald-50/80 font-bold border-l-4 border-l-emerald-500"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          <td className="py-3.5 px-3 text-center">
                            {getMedalBadge(rank)}
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-slate-900">
                                    {p.player_name}
                                  </span>
                                  {isMe && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                                      Ви
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {p.age} р. • {p.position}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">
                                {p.club_name}
                              </span>
                              <span
                                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full w-fit ${tierBadge.bg}`}
                              >
                                {tierBadge.label}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 font-mono font-black text-xs">
                              {p.overall_rating}
                            </span>
                          </td>

                          <td className="py-3.5 px-2 text-center font-mono font-bold text-slate-700">
                            {p.matches}
                          </td>

                          <td className="py-3.5 px-2 text-center font-mono">
                            <span className="font-bold text-amber-600">
                              {p.goals}
                            </span>{" "}
                            <span className="text-[10px] text-slate-400">
                              ({p.assists})
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {p.bank_balance.toLocaleString()} ₴
                          </td>

                          <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900 text-sm">
                            ⭐ {p.legacy_score.toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 2. ARCADE LEADERBOARD (DINO / SNAKE) ─── */}
      {activeGame !== "pro" && (
        <div className="bg-white/80 backdrop-blur-xl border border-white/80 shadow-lg shadow-black/5 rounded-3xl overflow-hidden divide-y divide-slate-100">
          <div className="px-4 sm:px-5 py-3.5 bg-white/50 backdrop-blur-md flex items-center justify-between border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">
                Зал Слави · ТОП-10 ({activeGame === "dino" ? "Dino Runner" : "Retro Snake"})
              </span>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
              <Flame className="h-3 w-3" />
              Live Рейтинг
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Завантаження рекордів...</p>
            </div>
          ) : scores.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <Crown className="h-10 w-10 text-amber-300 mx-auto" />
              <div className="font-bold text-sm text-slate-800">Рекордів ще немає!</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Зіграйте в гру прямо зараз, наберіть перші очки та станьте першим рекордсменом KS LIGA!
              </p>
            </div>
          ) : (
            scores.map((score, index) => {
              const rank = index + 1
              const isCurrentPlayer =
                currentPlayerName &&
                score.player_name.trim().toLowerCase() === currentPlayerName.trim().toLowerCase()
              const isJustAdded = lastSubmittedScoreId === score.id

              return (
                <div
                  key={score.id}
                  className={`flex items-center justify-between px-3.5 sm:px-5 py-3 transition-all ${
                    isJustAdded
                      ? "bg-blue-50/90 ring-2 ring-blue-400/40"
                      : isCurrentPlayer
                      ? "bg-amber-50/60"
                      : "hover:bg-white/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 overflow-hidden mr-2">
                    {getMedalBadge(rank)}

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {score.player_name}
                        </span>
                        {isCurrentPlayer && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-blue-600 text-white rounded-md shrink-0">
                            Ви
                          </span>
                        )}
                        {rank === 1 && (
                          <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(score.created_at).toLocaleDateString("uk-UA", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-black text-xs sm:text-sm shadow-xs tracking-tight">
                      {score.score} <span className="text-[10px] font-semibold text-slate-400">оч.</span>
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
