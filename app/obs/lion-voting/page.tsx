"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getMatchById, getMatchVoting, getVotingCandidates, getTeams } from "@/lib/database"
import type { Match, MatchVoting, VotingCandidate, Team } from "@/lib/supabase"
import { Trophy, Crown, Flame, Sparkles, Award } from "lucide-react"

function OBSLionVotingContent() {
  const searchParams = useSearchParams()
  const matchIdParam = searchParams.get("matchId")
  const matchId = matchIdParam ? parseInt(matchIdParam, 10) : null

  const [match, setMatch] = useState<Match | null>(null)
  const [voting, setVoting] = useState<MatchVoting | null>(null)
  const [candidates, setCandidates] = useState<VotingCandidate[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!matchId || isNaN(matchId)) {
      setLoading(false)
      return
    }
    try {
      const [m, v, c, t] = await Promise.all([
        getMatchById(matchId),
        getMatchVoting(matchId),
        getVotingCandidates(matchId),
        getTeams(),
      ])
      setMatch(m)
      setVoting(v)
      setCandidates(c.sort((a, b) => b.votes - a.votes))
      setTeams(t)
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

  // Helper for team logo
  const getTeamLogo = (teamName: string): string => {
    const found = teams.find((t) => t.name.trim().toLowerCase() === teamName.trim().toLowerCase())
    return found?.logo || "/placeholder.svg"
  }

  if (!matchId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md p-6 bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl space-y-3 backdrop-blur-xl">
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
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-amber-400 border-t-transparent" />
      </div>
    )
  }

  const totalVotes = candidates.reduce((acc, c) => acc + (c.votes || 0), 0)
  // SHOW ONLY TOP 3 TO PREVENT OVERFLOW ON STREAM
  const topCandidates = candidates.slice(0, 3)

  return (
    <div className="w-full h-screen bg-transparent p-2 flex flex-col justify-start items-start font-sans select-none overflow-hidden">
      
      {/* NO OUTER BACKGROUND CONTAINER - FLOATING STREAM GRAPHICS */}
      <div className="w-full max-w-[340px] space-y-2 text-white animate-in zoom-in-95 duration-200">
        
        {/* Header Stream Glass Pill */}
        <div className="bg-slate-950/85 backdrop-blur-xl border border-white/20 rounded-2xl px-3.5 py-2.5 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shrink-0 shadow-md">
              <Trophy className="w-4 h-4 fill-slate-950" />
            </div>
            
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1 leading-none mb-1">
                <span>ЛЕВ МАТЧУ</span>
                <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
              </div>
              
              {/* Match teams with Crests */}
              {match ? (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-200 truncate">
                  <img src={getTeamLogo(match.home_team)} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                  <span className="truncate max-w-[65px]">{match.home_team}</span>
                  <span className="text-amber-400 font-extrabold text-[9px]">vs</span>
                  <img src={getTeamLogo(match.away_team)} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                  <span className="truncate max-w-[65px]">{match.away_team}</span>
                </div>
              ) : (
                <div className="text-[10px] font-bold text-slate-400">Голосування</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[9px] font-black tracking-wider uppercase shrink-0 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>LIVE</span>
          </div>
        </div>

        {/* TOP 3 Floating Candidate Bars */}
        {topCandidates.length === 0 ? (
          <div className="bg-slate-950/85 backdrop-blur-xl border border-white/15 rounded-2xl p-3 text-center text-xs text-slate-400 italic">
            Очікування кандидатів...
          </div>
        ) : (
          <div className="space-y-2">
            {topCandidates.map((candidate, index) => {
              const percent = totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0
              const isFirst = index === 0 && candidate.votes > 0
              const isSecond = index === 1
              const isThird = index === 2

              let borderStyle = "border-white/15 bg-slate-950/85"
              let badgeStyle = "bg-slate-800 text-slate-200 border-white/20"
              let barGradient = "from-blue-500 to-indigo-600"

              if (isFirst) {
                borderStyle = "border-amber-400/90 bg-slate-950/90 shadow-[0_0_18px_rgba(245,158,11,0.35)]"
                badgeStyle = "bg-amber-400 text-slate-950 font-black border-amber-300 shadow-md"
                barGradient = "from-amber-400 via-amber-300 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"
              } else if (isSecond) {
                borderStyle = "border-slate-300/60 bg-slate-950/85"
                badgeStyle = "bg-slate-300 text-slate-950 font-black border-slate-200"
                barGradient = "from-slate-300 to-slate-400"
              } else if (isThird) {
                borderStyle = "border-amber-600/50 bg-slate-950/85"
                badgeStyle = "bg-amber-600 text-white font-black border-amber-500"
                barGradient = "from-amber-600 to-amber-700"
              }

              return (
                <div
                  key={candidate.id || index}
                  className={`relative p-2.5 rounded-2xl border backdrop-blur-xl transition-all duration-500 overflow-hidden shadow-xl ${borderStyle}`}
                >
                  {/* Background Progress Fill Overlay */}
                  <div
                    className="absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out opacity-20 bg-white"
                    style={{ width: `${percent}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Rank Badge */}
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] shrink-0 border ${badgeStyle}`}>
                        {isFirst ? <Crown className="w-3.5 h-3.5 fill-slate-950" /> : index + 1}
                      </div>

                      {/* Candidate Team Crest */}
                      <div className="w-5 h-5 rounded-md bg-white/10 p-0.5 flex items-center justify-center shrink-0 border border-white/10">
                        <img
                          src={getTeamLogo(candidate.team_name)}
                          alt=""
                          className="w-full h-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>

                      {/* Candidate Info */}
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate flex items-center gap-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                          <span className="truncate">{candidate.player_name}</span>
                          {isFirst && <Flame className="w-3 h-3 text-amber-400 shrink-0 animate-bounce" />}
                        </div>
                        <div className="text-[9px] font-semibold text-slate-300/80 truncate">
                          {candidate.team_name}
                        </div>
                      </div>
                    </div>

                    {/* Votes Count & Percentage */}
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-black drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${isFirst ? "text-amber-300" : "text-slate-100"}`}>
                        {percent}%
                      </div>
                      <div className="text-[9px] font-bold text-slate-400">
                        {candidate.votes} {candidate.votes === 1 ? "голос" : "голосів"}
                      </div>
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="relative z-10 mt-1.5 w-full h-1 rounded-full bg-slate-900/90 overflow-hidden border border-white/10">
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

        {/* Footer Stream Glass Tag */}
        <div className="bg-slate-950/85 backdrop-blur-xl border border-white/15 rounded-xl px-3 py-1.5 flex items-center justify-between text-[9px] font-extrabold uppercase tracking-wider text-slate-300 shadow-lg">
          <span className="flex items-center gap-1 text-amber-400">
            <Award className="w-3 h-3" />
            <span>ТОП-3 КАНДИДАТІВ</span>
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
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-amber-400 border-t-transparent" />
      </div>
    }>
      <OBSLionVotingContent />
    </Suspense>
  )
}
