"use client"

import { useCallback, useEffect, useState } from "react"
import { Crown, Flame, RefreshCw, Sparkles, Trophy } from "lucide-react"
import { getGameLeaderboard } from "@/lib/database"
import type { GameScore } from "@/lib/supabase"

type ArcadeGame = "dino" | "snake"

interface KsLeaderboardProps {
  initialGameType?: ArcadeGame
  currentPlayerName?: string
  lastSubmittedScoreId?: number
}

export function KsLeaderboard({
  initialGameType = "dino",
  currentPlayerName = "",
  lastSubmittedScoreId,
}: KsLeaderboardProps) {
  const [activeGame, setActiveGame] = useState<ArcadeGame>(initialGameType)
  const [scores, setScores] = useState<GameScore[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const updateId = window.setTimeout(() => setActiveGame(initialGameType), 0)
    return () => window.clearTimeout(updateId)
  }, [initialGameType])

  const loadLeaderboard = useCallback(async (gameType: ArcadeGame, isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      setScores(await getGameLeaderboard(gameType, 10))
    } catch (error) {
      console.error("Error loading arcade leaderboard:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const loadId = window.setTimeout(() => void loadLeaderboard(activeGame), 0)
    return () => window.clearTimeout(loadId)
  }, [activeGame, lastSubmittedScoreId, loadLeaderboard])

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

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto">
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
          onClick={() => loadLeaderboard(activeGame, true)}
          disabled={refreshing}
          title="Оновити таблицю"
          className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200/60 shadow-xs transition-all active:scale-95 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
        </button>
      </div>

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
                      {rank === 1 && <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />}
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

                <span className="px-3 py-1 rounded-xl bg-slate-900 text-white font-black text-xs sm:text-sm shadow-xs tracking-tight shrink-0">
                  {score.score} <span className="text-[10px] font-semibold text-slate-400">оч.</span>
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
