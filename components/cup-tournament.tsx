"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle } from "lucide-react"
import { getCupMatches, getTeams, formatTime } from "@/lib/database"
import type { Match, Team } from "@/lib/supabase"

interface CupTournamentProps {
  championshipId: number
}

const CUP_STAGES = ["1/32 фіналу", "1/16 фіналу", "1/8 фіналу", "1/4 фіналу", "1/2 фіналу", "Фінал"]

export function CupTournament({ championshipId }: CupTournamentProps) {
  const [matches, setMatches] = useState<{ [key: string]: Match[] }>({})
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCupData()
  }, [championshipId])

  const loadCupData = async () => {
    try {
      setLoading(true)
      const [teamsData, ...stageMatches] = await Promise.all([
        getTeams(championshipId),
        ...CUP_STAGES.map((stage) => getCupMatches(championshipId, stage)),
      ])

      setTeams(teamsData)

      const matchesByStage: { [key: string]: Match[] } = {}
      CUP_STAGES.forEach((stage, index) => {
        matchesByStage[stage] = stageMatches[index]
      })

      setMatches(matchesByStage)
    } catch (error) {
      console.error("Error loading cup data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getTeamLogo = (teamName: string): string => {
    const team = teams.find((t) => t.name === teamName)
    return team?.logo || "/placeholder.svg?height=32&width=32"
  }

  const formatMatchResult = (match: Match) => {
    if (match.is_technical_defeat) {
      return match.technical_winner === match.home_team ? "+:-" : "-:+"
    }
    return `${match.home_score} — ${match.away_score}`
  }

  const formatPenaltyResult = (match: Match) => {
    if (match.penalty_home !== null && match.penalty_away !== null) {
      return ` (${match.penalty_home}-${match.penalty_away} пен.)`
    }
    return ""
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500">Завантаження кубкового турніру...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {CUP_STAGES.map((stage) => {
        const stageMatches = matches[stage] || []
        if (stageMatches.length === 0) return null

        return (
          <div key={stage} className="space-y-2">
            <h3 className="ios-section-header pl-1">
              {stage}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {stageMatches.map((match, index) => (
                <Card key={index} className="liquid-glass-card overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-3 flex-1">
                        {/* Home Team */}
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden bg-slate-50 border border-slate-250/60 shadow-sm flex-shrink-0">
                            <img
                              src={getTeamLogo(match.home_team)}
                              alt="Home Team"
                              className="w-4 h-4 object-contain"
                            />
                          </div>
                          <span className={`text-sm ${match.home_score !== null && match.away_score !== null && match.home_score < match.away_score && !match.is_technical_defeat ? "text-slate-400 font-medium" : "text-slate-800 font-bold"}`}>
                            {match.home_team}
                          </span>
                        </div>
                        {/* Away Team */}
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden bg-slate-50 border border-slate-250/60 shadow-sm flex-shrink-0">
                            <img
                              src={getTeamLogo(match.away_team)}
                              alt="Away Team"
                              className="w-4 h-4 object-contain"
                            />
                          </div>
                          <span className={`text-sm ${match.home_score !== null && match.away_score !== null && match.away_score < match.home_score && !match.is_technical_defeat ? "text-slate-400 font-medium" : "text-slate-800 font-bold"}`}>
                            {match.away_team}
                          </span>
                        </div>
                      </div>

                      {/* Score or VS */}
                      <div className="text-right pl-4 flex-shrink-0 flex flex-col justify-center items-end">
                        {match.is_finished ? (
                          <div className="text-base font-black text-slate-900 tracking-tight">
                            {formatMatchResult(match)}
                            <span className="text-[10px] text-slate-550 block font-semibold mt-0.5">
                              {formatPenaltyResult(match)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded bg-indigo-50/50">
                            VS
                          </div>
                        )}
                        <div className="text-[9px] text-slate-400 font-semibold mt-1">
                          {new Date(match.date).toLocaleDateString("uk-UA")}
                        </div>
                      </div>
                    </div>

                    {/* Status & Info badges */}
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        {match.match_time && (
                          <span className="flex items-center gap-1 font-medium text-slate-450">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {formatTime(match.match_time)}
                          </span>
                        )}
                        {match.is_technical_defeat && (
                          <span className="flex items-center gap-1 text-red-650 font-bold">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                            Тех. поразка
                          </span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${
                          match.is_finished
                            ? "bg-slate-50 border-slate-200 text-slate-650"
                            : "bg-indigo-50 border-indigo-100/50 text-indigo-750"
                        }`}
                      >
                        {match.is_finished ? "Завершено" : "Заплановано"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
