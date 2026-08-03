"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getMatchById, getMatchVoting, getVotingCandidates } from "@/lib/database"
import type { Match, MatchVoting, VotingCandidate } from "@/lib/supabase"
import { Trophy, Crown, Flame, Sparkles } from "lucide-react"

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
        <div className="max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-3">
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

  return (
    <div className="w-full h-screen bg-transparent p-4 sm:p-6 flex flex-col justify-start items-center font-sans select-none overflow-hidden">
      
      {/* Container Widget Box */}
      <div className="w-full max-w-md bg-slate-950/85 backdrop-blur-xl border border-amber-500/40 rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.25)] p-5 space-y-4 text-white animate-in zoom-in-95 duration-300">
        
        {/* Header Stream Bar */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md">
              <Trophy className="w-4 h-4 fill-slate-950" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <span>ЛЕВ МАТЧУ</span>
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {match ? `${match.home_team} — ${match.away_team}` : 'Голосування'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black tracking-wider uppercase animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Candidates List */}
        {candidates.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 italic">
            Очікування кандидатів голосування...
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map((candidate, index) => {
              const percent = totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0
              const isLeader = index === 0 && candidate.votes > 0

              return (
                <div
                  key={candidate.id || index}
                  className={`relative p-3 rounded-2xl border transition-all duration-500 overflow-hidden ${
                    isLeader
                      ? "bg-gradient-to-r from-amber-950/60 to-slate-900/90 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                      : "bg-slate-900/80 border-slate-800"
                  }`}
                >
                  {/* Progress Fill Bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out opacity-20 ${
                      isLeader ? "bg-amber-400" : "bg-blue-500"
                    }`}
                    style={{ width: `${percent}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isLeader ? "bg-amber-400 text-slate-950 shadow-md" : "bg-slate-800 text-slate-300"
                      }`}>
                        {isLeader ? <Crown className="w-4 h-4 fill-slate-950" /> : `#${index + 1}`}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate flex items-center gap-1.5">
                          <span className="truncate">{candidate.player_name}</span>
                          {isLeader && <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 truncate">
                          {candidate.team_name}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-sm font-black ${isLeader ? "text-amber-300" : "text-slate-200"}`}>
                        {percent}%
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">
                        {candidate.votes} {candidate.votes === 1 ? "голос" : candidate.votes > 1 && candidate.votes < 5 ? "голоси" : "голосів"}
                      </div>
                    </div>
                  </div>

                  {/* Top Bar Indicator */}
                  <div className="relative z-10 mt-2 w-full h-1.5 rounded-full bg-slate-950/80 overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        isLeader ? "bg-gradient-to-r from-amber-400 to-amber-200 shadow-sm" : "bg-blue-500"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer Statistics */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-amber-500/20 font-bold uppercase tracking-wider">
          <span>Всього голосів: <strong className="text-amber-400">{totalVotes}</strong></span>
          <span className="text-[10px] text-slate-400 font-normal lowercase">ks-liga live widget</span>
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
