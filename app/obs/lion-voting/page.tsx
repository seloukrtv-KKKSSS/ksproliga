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
      setCandidates(c.filter((cand) => !cand.is_hidden).sort((a, b) => b.votes - a.votes))
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
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center p-6 text-center font-sans">
        <style jsx global>{`
          html, body {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
          }
        `}</style>
        <div className="max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-3 backdrop-blur-xl">
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
        <style jsx global>{`
          html, body {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
          }
        `}</style>
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-400 border-t-transparent" />
      </div>
    )
  }

  const totalVotes = candidates.reduce((acc, c) => acc + (c.votes || 0), 0)
  // SHOW TOP 3 CANDIDATES
  const topCandidates = candidates.slice(0, 3)

  return (
    <div className="w-full h-screen bg-transparent p-4 flex flex-col justify-start items-center font-sans select-none overflow-hidden">
      {/* Global CSS to strip html/body background completely */}
      <style jsx global>{`
        html, body {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
      `}</style>

      {/* Container Widget Box — Liquid Glass iOS Container */}
      <div className="w-full max-w-[420px] bg-slate-950/85 backdrop-blur-2xl border border-amber-500/40 rounded-3xl shadow-[0_0_35px_rgba(245,158,11,0.3)] p-5 space-y-4 text-white animate-in zoom-in-95 duration-300 relative overflow-hidden">
        
        {/* Ambient Top Glow Effect */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Header Stream Bar */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shrink-0 shadow-md">
              <Trophy className="w-5 h-5 fill-slate-950" />
            </div>
            
            <div className="min-w-0">
              <div className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 leading-none mb-1">
                <span>ЛЕВ МАТЧУ</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              </div>
              
              {/* Match Teams with Crests */}
              {match ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 truncate">
                  <img src={getTeamLogo(match.home_team)} alt="" className="w-4 h-4 object-contain shrink-0" />
                  <span className="truncate max-w-[85px]">{match.home_team}</span>
                  <span className="text-amber-400 font-extrabold text-[10px]">vs</span>
                  <img src={getTeamLogo(match.away_team)} alt="" className="w-4 h-4 object-contain shrink-0" />
                  <span className="truncate max-w-[85px]">{match.away_team}</span>
                </div>
              ) : (
                <div className="text-xs font-bold text-slate-400">Голосування</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-black tracking-wider uppercase shrink-0 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>LIVE</span>
          </div>
        </div>

        {/* TOP 3 Candidates List */}
        {topCandidates.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 italic">
            Очікування кандидатів голосування...
          </div>
        ) : (
          <div className="space-y-3 relative z-10">
            {topCandidates.map((candidate, index) => {
              const percent = totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0
              const isFirst = index === 0 && candidate.votes > 0
              const isSecond = index === 1
              const isThird = index === 2

              let borderStyle = "border-slate-800 bg-slate-900/80"
              let badgeStyle = "bg-slate-800 text-slate-200 border-slate-700"
              let barGradient = "from-blue-500 to-indigo-600"

              if (isFirst) {
                borderStyle = "border-amber-400/90 bg-gradient-to-r from-amber-950/70 to-slate-900/90 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                badgeStyle = "bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black border-amber-300 shadow-md"
                barGradient = "from-amber-400 via-amber-300 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
              } else if (isSecond) {
                borderStyle = "border-slate-300/60 bg-slate-900/80"
                badgeStyle = "bg-slate-300 text-slate-950 font-black border-slate-200"
                barGradient = "from-slate-300 to-slate-400"
              } else if (isThird) {
                borderStyle = "border-amber-600/50 bg-slate-900/80"
                badgeStyle = "bg-amber-600 text-white font-black border-amber-500"
                barGradient = "from-amber-600 to-amber-700"
              }

              return (
                <div
                  key={candidate.id || index}
                  className={`relative p-3 rounded-2xl border backdrop-blur-xl transition-all duration-500 overflow-hidden shadow-xl ${borderStyle}`}
                >
                  {/* Background Progress Fill Overlay */}
                  <div
                    className="absolute left-0 top-0 bottom-0 transition-all duration-700 ease-out opacity-25 bg-white"
                    style={{ width: `${percent}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Badge */}
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0 border ${badgeStyle}`}>
                        {isFirst ? <Crown className="w-4 h-4 fill-slate-950" /> : `#${index + 1}`}
                      </div>

                      {/* Candidate Team Crest */}
                      <div className="w-7 h-7 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/20">
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
                        <div className="text-sm sm:text-base font-black text-white truncate flex items-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                          <span className="truncate">{candidate.player_name}</span>
                          {isFirst && <Flame className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />}
                        </div>
                        <div className="text-xs font-semibold text-slate-300 truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                          {candidate.team_name}
                        </div>
                      </div>
                    </div>

                    {/* Votes Count & Percentage */}
                    <div className="text-right shrink-0">
                      <div className={`text-base sm:text-lg font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${isFirst ? "text-amber-300" : "text-white"}`}>
                        {percent}%
                      </div>
                      <div className="text-xs font-bold text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                        {candidate.votes} {candidate.votes === 1 ? "голос" : "голосів"}
                      </div>
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="relative z-10 mt-2 w-full h-1.5 rounded-full bg-slate-950/80 overflow-hidden border border-white/10">
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

        {/* Footer Stream Bar */}
        <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-amber-500/20 font-bold uppercase tracking-wider relative z-10">
          <span className="flex items-center gap-1 text-amber-400">
            <Award className="w-3.5 h-3.5" />
            <span>ТОП-3 ЛІДЕРІВ</span>
          </span>
          <span>Всього голосів: <strong className="text-white text-sm font-black">{totalVotes}</strong></span>
        </div>

      </div>
    </div>
  )
}

export default function OBSLionVotingPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen bg-transparent flex items-center justify-center">
        <style jsx global>{`
          html, body {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
          }
        `}</style>
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-400 border-t-transparent" />
      </div>
    }>
      <OBSLionVotingContent />
    </Suspense>
  )
}
