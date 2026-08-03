"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getMatchById, getMatchVoting, getVotingCandidates } from "@/lib/database"
import type { Match, MatchVoting, VotingCandidate } from "@/lib/supabase"
import { Trophy, Crown, Flame, Sparkles, Award } from "lucide-react"

function OBSLionVotingContent() {
  const searchParams = useSearchParams()
  const matchIdParam = searchParams.get("matchId")
  const matchId = matchIdParam ? parseInt(matchIdParam, 10) : null

  const [match, setMatch] = useState<Match | null>(null)
  const [voting, setVoting] = useState<MatchVoting | null>(null)
  const [candidates, setCandidates] = useState<VotingCandidate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!matchId || isNaN(matchId)) {
      setLoading(false)
      return
    }
    try {
      const [m, v, c] = await Promise.all([
        getMatchById(matchId),
        getMatchVoting(matchId),
        getVotingCandidates(matchId),
      ])
      setMatch(m)
      setVoting(v)
      setCandidates(c.sort((a, b) => b.votes - a.votes))
    } catch (e) {
      console.error("Error fetching OBS voting data:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Realtime polling for OBS Studio & vMix (refetches every 3 seconds)
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [matchId])

  if (!matchId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl space-y-3 backdrop-blur-xl">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold">OBS / vMix Віджет «Лев Матчу»</h2>
          <p className="text-xs text-slate-400">
            Для відображення голосування у прямому ефірі додайте параметр <code className="text-amber-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded">?matchId=ID</code> у посилання джерела браузера.
          </p>
        </div>
      </div>
    )
  }

  if (loading && !match) {
    return (
      <div className="w-full h-screen bg-transparent flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-400 border-t-transparent" />
      </div>
    )
  }

  const totalVotes = candidates.reduce((acc, c) => acc + (c.votes || 0), 0)
  // ALWAYS SHOW ONLY TOP 3 TO PREVENT OVERFLOW ON LIVE BROADCAST
  const topCandidates = candidates.slice(0, 3)

  return (
    <div className="w-full h-screen bg-transparent p-3 sm:p-4 flex flex-col justify-start items-start font-sans select-none overflow-hidden">
      
      {/* iOS Liquid Glass Card Container */}
      <div className="w-full max-w-[360px] bg-slate-950/40 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] p-4 space-y-3.5 text-white animate-in zoom-in-95 duration-300 relative overflow-hidden">
        
        {/* Ambient Top Glow Effect */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header Stream Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <Trophy className="w-4 h-4 fill-slate-950" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
                <span>ЛЕВ МАТЧУ</span>
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
              </div>
              <div className="text-[10px] font-bold text-slate-300 truncate max-w-[170px]">
                {match ? `${match.home_team} — ${match.away_team}` : 'Голосування'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 text-[9px] font-black tracking-wider uppercase backdrop-blur-md animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>LIVE</span>
          </div>
        </div>

        {/* TOP 3 Candidates List */}
        {topCandidates.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 italic">
            Очікування кандидатів...
          </div>
        ) : (
          <div className="space-y-2.5 relative z-10">
            {topCandidates.map((candidate, index) => {
              const percent = totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0
              const isFirst = index === 0 && candidate.votes > 0
              const isSecond = index === 1
              const isThird = index === 2

              // Liquid Glass Row Card Styles
              let rowStyle = "bg-slate-900/40 border-white/10"
              let badgeStyle = "bg-slate-800 text-slate-300 border-white/10"
              let barGradient = "from-blue-500 to-indigo-500"

              if (isFirst) {
                rowStyle = "bg-gradient-to-r from-amber-500/25 via-amber-600/15 to-slate-900/40 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                badgeStyle = "bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-md font-black"
                barGradient = "from-amber-400 via-amber-300 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              } else if (isSecond) {
                rowStyle = "bg-gradient-to-r from-slate-300/20 via-slate-400/10 to-slate-900/40 border-slate-300/60"
                badgeStyle = "bg-slate-300 text-slate-950 font-black"
                barGradient = "from-slate-300 to-slate-400"
              } else if (isThird) {
                rowStyle = "bg-gradient-to-r from-amber-700/20 via-amber-800/10 to-slate-900/40 border-amber-600/50"
                badgeStyle = "bg-amber-600 text-white font-black"
                barGradient = "from-amber-600 to-amber-700"
              }

              return (
                <div
                  key={candidate.id || index}
                  className={`relative p-2.5 rounded-2xl border backdrop-blur-xl transition-all duration-500 overflow-hidden ${rowStyle}`}
                >
                  {/* Progress Fill Bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out opacity-25 bg-white"
                    style={{ width: `${percent}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Rank Badge */}
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] shrink-0 border ${badgeStyle}`}>
                        {isFirst ? <Crown className="w-3.5 h-3.5 fill-slate-950" /> : index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-white truncate flex items-center gap-1">
                          <span className="truncate">{candidate.player_name}</span>
                          {isFirst && <Flame className="w-3 h-3 text-amber-400 shrink-0 animate-bounce" />}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-300/80 truncate">
                          {candidate.team_name}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-xs font-black ${isFirst ? "text-amber-300" : "text-slate-200"}`}>
                        {percent}%
                      </div>
                      <div className="text-[9px] font-bold text-slate-400">
                        {candidate.votes} {candidate.votes === 1 ? "голос" : "голосів"}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar Indicator */}
                  <div className="relative z-10 mt-1.5 w-full h-1 rounded-full bg-slate-950/60 overflow-hidden border border-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${barGradient}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer info: TOP 3 Tag */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-white/10 font-bold uppercase tracking-wider relative z-10">
          <span className="flex items-center gap-1 text-amber-400">
            <Award className="w-3 h-3" />
            <span>ТОП 3 КАНДИДАТІВ</span>
          </span>
          <span>Всього: <strong className="text-white">{totalVotes}</strong></span>
        </div>

      </div>
    </div>
  )
}

export default function OBSLionVotingPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen bg-transparent flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-400 border-t-transparent" />
      </div>
    }>
      <OBSLionVotingContent />
    </Suspense>
  )
}
