"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Trophy,
  Calendar,
  Target,
  Settings,
  Clock,
  Zap,
  Crown,
  Users,
  Vote,
  CheckCircle2,
} from "lucide-react"
import {
  getTeams,
  getMatches,
  getPlayers,
  calculateLeagueTable,
  getChampionships,
  getActiveChampionship,
  getChampionshipVotings,
  getChampionshipCandidates,
  incrementCandidateVotes,
  getMatchesGoals,
} from "@/lib/database"
import { AdminPanel } from "@/components/admin-panel"
import { CupTournament } from "@/components/cup-tournament"
import type { Team, Match, Player, Championship, MatchGoal, MatchVoting, VotingCandidate } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TeamDisplay } from "@/components/team-display"

export default function KSLigaSite() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")

  const [teams, setTeams] = useState<Team[]>([])
  const [table, setTable] = useState<any[]>([])
  const [calendar, setCalendar] = useState<Match[]>([])
  const [results, setResults] = useState<Match[]>([])
  const [scorers, setScorers] = useState<Player[]>([])
  const [matchGoals, setMatchGoals] = useState<{ [key: number]: MatchGoal[] }>({})
  const [loading, setLoading] = useState(true)

  const [currentChampionshipId, setCurrentChampionshipId] = useState<number | null>(null)
  const [championships, setChampionships] = useState<Championship[]>([])
  const [currentChampionship, setCurrentChampionship] = useState<Championship | null>(null)

  // Lion of the Match states
  const [votings, setVotings] = useState<MatchVoting[]>([])
  const [candidates, setCandidates] = useState<VotingCandidate[]>([])
  const [votedMatches, setVotedMatches] = useState<number[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<{ [matchId: number]: number }>({})
  const [showArchive, setShowArchive] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage)
      const votedIds = keys
        .filter((key) => key.startsWith("ksliga_voted_"))
        .map((key) => Number(key.replace("ksliga_voted_", "")))
        .filter((id) => !isNaN(id))
      setVotedMatches(votedIds)
    }
  }, [])


  // Load initial data (championships list)
  useEffect(() => {
    loadInitialData()
  }, [])

  // Load championship-specific data when championship changes
  useEffect(() => {
    if (currentChampionshipId) {
      loadDataForChampionship(currentChampionshipId)
    }
  }, [currentChampionshipId])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [championshipsData, activeChampionship] = await Promise.all([getChampionships(), getActiveChampionship()])

      setChampionships(championshipsData)

      // Set the current championship
      const championshipId = activeChampionship?.id || championshipsData[0]?.id
      if (championshipId) {
        setCurrentChampionshipId(championshipId)
      } else {
        setCurrentChampionshipId(null)
      }
    } catch (error) {
      console.error("Error loading initial data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadDataForChampionship = async (championshipId: number) => {
    try {
      setLoading(true)
      const [teamsData, matchesData, playersData, tableData, votingsData, candidatesData] = await Promise.all([
        getTeams(championshipId),
        getMatches(championshipId),
        getPlayers(championshipId),
        calculateLeagueTable(championshipId),
        getChampionshipVotings(championshipId),
        getChampionshipCandidates(championshipId),
      ])

      setTeams(teamsData)
      setTable(tableData)
      setCalendar(matchesData.filter((m) => !m.is_finished))
      setResults(matchesData.filter((m) => m.is_finished))
      setScorers(playersData)
      setVotings(votingsData)
      setCandidates(candidatesData)

      // Set current championship info
      const championship = championships.find((c) => c.id === championshipId)
      setCurrentChampionship(championship || null)

      // Load match goals for finished matches in one single query
      const finishedMatches = matchesData.filter((m) => m.is_finished)
      const finishedMatchIds = finishedMatches.map((m) => m.id)
      const goalsData: { [key: number]: MatchGoal[] } = {}

      // Initialize all finished matches with empty arrays
      finishedMatches.forEach((m) => {
        goalsData[m.id] = []
      })

      if (finishedMatchIds.length > 0) {
        try {
          const allGoals = await getMatchesGoals(finishedMatchIds)
          allGoals.forEach((goal) => {
            if (goalsData[goal.match_id]) {
              goalsData[goal.match_id].push(goal)
            }
          })
        } catch (error) {
          console.error("Error loading matches goals in batch:", error)
        }
      }

      setMatchGoals(goalsData)
    } catch (error) {
      console.error("Error loading championship data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadVotingData = async () => {
    if (!currentChampionshipId) return
    try {
      const [votingsData, candidatesData] = await Promise.all([
        getChampionshipVotings(currentChampionshipId),
        getChampionshipCandidates(currentChampionshipId),
      ])
      setVotings(votingsData)
      setCandidates(candidatesData)
    } catch (error) {
      console.error("Error loading voting data:", error)
    }
  }

  const handleVoteSubmit = async (matchId: number) => {
    const candidateId = selectedCandidate[matchId]
    if (!candidateId) {
      alert("Будь ласка, оберіть гравця")
      return
    }

    try {
      setLoading(true)
      await incrementCandidateVotes(candidateId)
      
      // Store in localStorage
      localStorage.setItem(`ksliga_voted_${matchId}`, "true")
      setVotedMatches((prev) => [...prev, matchId])

      // Reload voting data
      await loadVotingData()
      alert("Дякуємо за ваш голос!")
    } catch (error) {
      console.error("Error submitting vote:", error)
      alert("Помилка при голосуванні: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  const handleGoalsUpdated = async () => {
    if (currentChampionshipId) {
      await loadDataForChampionship(currentChampionshipId)
    }
  }

  const getTeamLogo = (teamName: string): string => {
    const team = teams.find((t) => t.name === teamName)
    return team?.logo || "/placeholder.svg?height=32&width=32"
  }

  const handleLogin = () => {
    if (adminPassword === "ks2025") {
      setIsAdmin(true)
      setAdminPassword("")
    } else {
      alert("Невірний пароль")
    }
  }

  const handleChampionshipChange = (value: string) => {
    const newChampionshipId = Number.parseInt(value)

    setCurrentChampionshipId(newChampionshipId)
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

  // Loading state
  if (loading && championships.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-bold text-slate-900">KS LIGA</div>
          <div className="text-xs text-slate-500 mt-1">Завантаження матчів...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/images/ks-logo.png" alt="KS Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">KS LIGA</h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                Karpiuk Sport League
              </p>
            </div>
          </div>

          {/* Championship Selector */}
          {championships.length > 1 && currentChampionshipId && (
            <div>
              <Select value={currentChampionshipId.toString()} onValueChange={handleChampionshipChange}>
                <SelectTrigger className="w-48 bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-9 text-xs focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Оберіть чемпіонат" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {championships.map((championship) => (
                    <SelectItem
                      key={championship.id}
                      value={championship.id.toString()}
                      className="text-slate-900 hover:bg-slate-50 focus:bg-slate-50 text-xs cursor-pointer"
                    >
                      {championship.name} ({championship.season})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:py-8 space-y-6">
        {/* No championships state */}
        {championships.length === 0 && (
          <div className="max-w-md mx-auto text-center py-12 px-4 space-y-6">
            <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 text-slate-400">
              <Trophy className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Чемпіонат не створено</h2>
              <p className="text-sm text-slate-500">Увійдіть в адмін-панель нижче, щоб додати перший турнір.</p>
            </div>

            <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden text-left">
              <CardHeader className="border-b border-slate-100 py-4 px-6 bg-slate-50">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-slate-500" />
                  Авторизація адміністратора
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {!isAdmin ? (
                  <div className="space-y-3">
                    <Input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Пароль доступу"
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      className="bg-slate-50 border-slate-200 rounded-lg text-sm"
                    />
                    <Button
                      onClick={handleLogin}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Увійти
                    </Button>
                  </div>
                ) : (
                  <AdminPanel
                    onLogout={() => setIsAdmin(false)}
                    currentChampionshipId={0}
                    onChampionshipChange={(id) => {
                      setCurrentChampionshipId(id)
                      loadInitialData()
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Championships and Tabs */}
        {championships.length > 0 && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-slate-500">Оновлення даних...</p>
              </div>
            ) : (
              <Tabs
                defaultValue={currentChampionship?.tournament_type === "cup" ? "cup" : "table"}
                className="w-full space-y-6"
              >
                {/* Minimalist Tabs Trigger */}
                <div className="border-b border-slate-200 overflow-x-auto">
                  <TabsList className="bg-transparent h-auto p-0 gap-6 flex justify-start rounded-none w-max border-none">
                    {currentChampionship?.tournament_type === "league" && (
                      <TabsTrigger
                        value="table"
                        className="bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-950 data-[state=active]:bg-transparent rounded-none px-0 py-3 text-sm font-semibold text-slate-500 data-[state=active]:text-slate-950 shadow-none transition-all"
                      >
                        Таблиця
                      </TabsTrigger>
                    )}
                    {currentChampionship?.tournament_type === "cup" && (
                      <TabsTrigger
                        value="cup"
                        className="bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-950 data-[state=active]:bg-transparent rounded-none px-0 py-3 text-sm font-semibold text-slate-500 data-[state=active]:text-slate-950 shadow-none transition-all"
                      >
                        Кубок
                      </TabsTrigger>
                    )}
                    <TabsTrigger
                      value="calendar"
                      className="bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-950 data-[state=active]:bg-transparent rounded-none px-0 py-3 text-sm font-semibold text-slate-500 data-[state=active]:text-slate-950 shadow-none transition-all"
                    >
                      Календар
                    </TabsTrigger>
                    <TabsTrigger
                      value="results"
                      className="bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-950 data-[state=active]:bg-transparent rounded-none px-0 py-3 text-sm font-semibold text-slate-500 data-[state=active]:text-slate-950 shadow-none transition-all"
                    >
                      Результати
                    </TabsTrigger>
                    <TabsTrigger
                      value="scorers"
                      className="bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-950 data-[state=active]:bg-transparent rounded-none px-0 py-3 text-sm font-semibold text-slate-500 data-[state=active]:text-slate-950 shadow-none transition-all"
                    >
                      Бомбардири
                    </TabsTrigger>
                    <TabsTrigger
                      value="lion"
                      className="bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-950 data-[state=active]:bg-transparent rounded-none px-0 py-3 text-sm font-semibold text-slate-500 data-[state=active]:text-slate-950 shadow-none transition-all"
                    >
                      Лев матчу
                    </TabsTrigger>
                    <TabsTrigger
                      value="admin"
                      className="bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-950 data-[state=active]:bg-transparent rounded-none px-0 py-3 text-sm font-semibold text-slate-500 data-[state=active]:text-slate-950 shadow-none transition-all"
                    >
                      Панель керування
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* League Table Tab */}
                {currentChampionship?.tournament_type === "league" && (
                  <TabsContent value="table" className="outline-none">
                    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                      <CardContent className="p-0">
                        {table.length === 0 ? (
                          <div className="text-center py-12 p-6">
                            <Trophy className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <div className="text-base font-semibold text-slate-900">Немає даних таблиці</div>
                            <div className="text-xs text-slate-500 mt-1">
                              Додайте команди та результати матчів для формування таблиці.
                            </div>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                  <th className="py-3 px-4 w-12 text-center">#</th>
                                  <th className="py-3 px-4">Команда</th>
                                  <th className="py-3 px-4 w-16 text-center">Ігри</th>
                                  <th className="py-3 px-4 w-28 text-center hidden sm:table-cell">В / Н / П</th>
                                  <th className="py-3 px-4 w-24 text-center hidden sm:table-cell">РМ</th>
                                  <th className="py-3 px-4 w-20 text-center">Очки</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-sm">
                                {table.map((team, index) => {
                                  const position = index + 1
                                  let rowStyle = "text-slate-900 hover:bg-slate-50/50"
                                  let positionBadgeStyle = "text-slate-700 font-semibold"
                                  
                                  if (position === 1) {
                                    rowStyle = "bg-emerald-50/20 hover:bg-emerald-50/40 text-slate-900"
                                    positionBadgeStyle = "bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded"
                                  } else if (position <= 3) {
                                    rowStyle = "bg-blue-50/10 hover:bg-blue-50/30 text-slate-900"
                                    positionBadgeStyle = "bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded"
                                  }

                                  return (
                                    <tr key={index} className={rowStyle}>
                                      <td className="py-3 px-4 text-center">
                                        <span className={positionBadgeStyle}>{position}</span>
                                      </td>
                                      <td className="py-3 px-4 font-medium">
                                        <div className="flex items-center gap-3">
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden bg-slate-100 border border-slate-200">
                                            <img
                                              src={getTeamLogo(team.name) || "/placeholder.svg"}
                                              alt={`${team.name} Logo`}
                                              className="w-4 h-4 object-contain"
                                            />
                                          </div>
                                          <span className="truncate max-w-[120px] sm:max-w-xs">{team.name}</span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-4 text-center font-medium text-slate-600">{team.games}</td>
                                      <td className="py-3 px-4 text-center text-xs text-slate-500 hidden sm:table-cell">
                                        <span className="text-emerald-700 font-medium">{team.wins}</span>
                                        <span className="mx-1">/</span>
                                        <span className="text-amber-700 font-medium">{team.draws}</span>
                                        <span className="mx-1">/</span>
                                        <span className="text-red-700 font-medium">{team.losses}</span>
                                      </td>
                                      <td className="py-3 px-4 text-center font-medium text-slate-600 hidden sm:table-cell">
                                        {team.gf} : {team.ga}
                                      </td>
                                      <td className="py-3 px-4 text-center font-bold text-slate-900">{team.pts}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Cup Tournament Tab */}
                {currentChampionship?.tournament_type === "cup" && currentChampionshipId && (
                  <TabsContent value="cup" className="outline-none">
                    <CupTournament championshipId={currentChampionshipId} />
                  </TabsContent>
                )}

                {/* Calendar Tab */}
                <TabsContent value="calendar" className="outline-none space-y-4">
                  {calendar.length === 0 ? (
                    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl py-12 text-center">
                      <CardContent className="p-6">
                        <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <div className="text-base font-semibold text-slate-900">Немає запланованих матчів</div>
                        <div className="text-xs text-slate-500 mt-1">Всі матчі завершені або ще не додані.</div>
                      </CardContent>
                    </Card>
                  ) : (
                    [...new Set(calendar.map((m) => m.round))].sort((a, b) => a - b).map((round) => (
                      <div key={round} className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">
                          {currentChampionship?.tournament_type === "cup"
                            ? calendar.find((m) => m.round === round)?.cup_stage || `Раунд ${round}`
                            : `Тур ${round}`}
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {calendar
                            .filter((m) => m.round === round)
                            .map((match) => (
                              <Card key={match.id} className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                  <div className="flex-1 space-y-3">
                                    {/* Team 1 */}
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={getTeamLogo(match.home_team)}
                                        alt="Home Team"
                                        className="w-5 h-5 object-contain"
                                      />
                                      <span className="text-sm font-semibold text-slate-900 truncate">{match.home_team}</span>
                                    </div>
                                    {/* Team 2 */}
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={getTeamLogo(match.away_team)}
                                        alt="Away Team"
                                        className="w-5 h-5 object-contain"
                                      />
                                      <span className="text-sm font-semibold text-slate-900 truncate">{match.away_team}</span>
                                    </div>
                                  </div>

                                  {/* Date & Time */}
                                  <div className="text-right border-l border-slate-100 pl-4 space-y-1 flex-shrink-0">
                                    <div className="text-[11px] font-bold text-slate-800 flex items-center justify-end gap-1.5">
                                      <Clock className="h-3 w-3 text-slate-400" />
                                      {match.match_time || "—"}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      {new Date(match.date).toLocaleDateString("uk-UA")}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Results Tab */}
                <TabsContent value="results" className="outline-none space-y-4">
                  {results.length === 0 ? (
                    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl py-12 text-center">
                      <CardContent className="p-6">
                        <Zap className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <div className="text-base font-semibold text-slate-900">Немає результатів</div>
                        <div className="text-xs text-slate-500 mt-1">Зіграні матчі з'являться в цій вкладці.</div>
                      </CardContent>
                    </Card>
                  ) : (
                    [...new Set(results.map((m) => m.round))].sort((a, b) => b - a).map((round) => (
                      <div key={round} className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">
                          {currentChampionship?.tournament_type === "cup"
                            ? results.find((m) => m.round === round)?.cup_stage || `Раунд ${round}`
                            : `Тур ${round}`}
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {results
                            .filter((m) => m.round === round)
                            .map((match) => (
                              <Card key={match.id} className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                                <CardContent className="p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="space-y-3 flex-1">
                                      {/* Home Team */}
                                      <div className="flex items-center gap-3">
                                        <img
                                          src={getTeamLogo(match.home_team)}
                                          alt="Home Team"
                                          className="w-5 h-5 object-contain"
                                        />
                                        <span className={`text-sm ${match.home_score !== null && match.away_score !== null && match.home_score < match.away_score && !match.is_technical_defeat ? "text-slate-400" : "text-slate-900 font-semibold"}`}>
                                          {match.home_team}
                                        </span>
                                      </div>
                                      {/* Away Team */}
                                      <div className="flex items-center gap-3">
                                        <img
                                          src={getTeamLogo(match.away_team)}
                                          alt="Away Team"
                                          className="w-5 h-5 object-contain"
                                        />
                                        <span className={`text-sm ${match.home_score !== null && match.away_score !== null && match.away_score < match.home_score && !match.is_technical_defeat ? "text-slate-400" : "text-slate-900 font-semibold"}`}>
                                          {match.away_team}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Score */}
                                    <div className="text-right pl-4 flex-shrink-0 flex flex-col justify-center items-end">
                                      <div className="text-base font-bold text-slate-900">
                                        {formatMatchResult(match)}
                                        <span className="text-xs text-slate-500 block font-normal">
                                          {formatPenaltyResult(match)}
                                        </span>
                                      </div>
                                      <div className="text-[9px] text-slate-400 mt-1">
                                        {new Date(match.date).toLocaleDateString("uk-UA")}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Goals Details if any */}
                                  {matchGoals[match.id] && matchGoals[match.id].length > 0 && (
                                    <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 space-y-1">
                                      {matchGoals[match.id].map((goal) => (
                                        <div key={goal.id} className="flex justify-between items-center text-[11px]">
                                          <div className="flex items-center gap-1.5">
                                            <Target className="h-3 w-3 text-slate-400" />
                                            <span>{goal.player_name}</span>
                                            <span className="text-[10px] text-slate-400">({goal.team_name})</span>
                                          </div>
                                          <span className="font-medium text-slate-700">
                                            {goal.minute}' {goal.goal_type === "penalty" ? "(пен.)" : goal.goal_type === "own_goal" ? "(авт.)" : ""}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Scorers Tab */}
                <TabsContent value="scorers" className="outline-none">
                  <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                      {scorers.length === 0 ? (
                        <div className="text-center py-12 p-6">
                          <Target className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                          <div className="text-base font-semibold text-slate-900">Список бомбардирів пустий</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Статистика з'явиться після додавання голів у зіграні матчі.
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {scorers.map((scorer, index) => {
                            const position = index + 1
                            let badgeStyle = "bg-slate-100 text-slate-800"
                            if (position === 1) badgeStyle = "bg-amber-100 text-amber-800"
                            else if (position === 2) badgeStyle = "bg-slate-200 text-slate-800"
                            else if (position === 3) badgeStyle = "bg-orange-100 text-orange-800"

                            return (
                              <div key={scorer.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/30">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${badgeStyle}`}>
                                    {position}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-900 truncate">
                                      {scorer.name}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                      <TeamDisplay
                                        teamName={scorer.team}
                                        teamLogo={getTeamLogo(scorer.team)}
                                        size="sm"
                                        showName={true}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="inline-flex items-center justify-center bg-slate-900 text-white font-bold text-xs px-3 py-1.5 rounded-lg">
                                    {scorer.goals} голів
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Lion of the Match Tab */}
                <TabsContent value="lion" className="outline-none space-y-6">
                  {votings.length > 0 && (
                    <div className="flex justify-end">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm hover:bg-slate-50 transition-all">
                        <input
                          type="checkbox"
                          checked={showArchive}
                          onChange={(e) => setShowArchive(e.target.checked)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                        />
                        <span>Показати архів голосувань</span>
                      </label>
                    </div>
                  )}

                  {votings.filter((voting) => {
                    if (showArchive) return true
                    const now = new Date()
                    const startTime = voting.start_time ? new Date(voting.start_time) : null
                    const endTime = voting.end_time ? new Date(voting.end_time) : null
                    const isWithinTime = (!startTime || now >= startTime) && (!endTime || now <= endTime)
                    return voting.is_active && isWithinTime
                  }).length === 0 ? (
                    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl py-12 text-center">
                      <CardContent className="p-6">
                        <Crown className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <div className="text-base font-semibold text-slate-900">
                          {showArchive ? "Голосувань ще немає" : "Немає активних голосувань"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {showArchive 
                            ? "Адміністратор ще не створив голосування за Лева матчу." 
                            : "Увімкніть архів, щоб переглянути результати минулих матчів."}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    votings
                      .filter((voting) => {
                        if (showArchive) return true
                        const now = new Date()
                        const startTime = voting.start_time ? new Date(voting.start_time) : null
                        const endTime = voting.end_time ? new Date(voting.end_time) : null
                        const isWithinTime = (!startTime || now >= startTime) && (!endTime || now <= endTime)
                        return voting.is_active && isWithinTime
                      })
                      .map((voting) => {
                      const match = [...calendar, ...results].find((m) => m.id === voting.match_id)
                      if (!match) return null
                      const matchCandidates = candidates
                        .filter((c) => c.match_id === voting.match_id)
                        .sort((a, b) => b.votes - a.votes)
                      const totalVotes = matchCandidates.reduce((sum, c) => sum + c.votes, 0)
                      const hasVoted = votedMatches.includes(voting.match_id)
                      const isActive = voting.is_active

                      // Check time constraints
                      const now = new Date()
                      const startTime = voting.start_time ? new Date(voting.start_time) : null
                      const endTime = voting.end_time ? new Date(voting.end_time) : null
                      const isWithinTime = (!startTime || now >= startTime) && (!endTime || now <= endTime)
                      const canVote = isActive && isWithinTime && !hasVoted

                      return (
                        <Card key={voting.match_id} className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                          {/* Match Header */}
                          <div className="border-b border-slate-100 px-6 py-4 bg-slate-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <img src={getTeamLogo(match.home_team)} alt="" className="w-5 h-5 object-contain" />
                                  <span className="text-sm font-semibold text-slate-900">{match.home_team}</span>
                                </div>
                                <span className="text-xs text-slate-400 font-medium">
                                  {match.is_finished
                                    ? `${match.home_score} — ${match.away_score}`
                                    : "vs"}
                                </span>
                                <div className="flex items-center gap-2">
                                  <img src={getTeamLogo(match.away_team)} alt="" className="w-5 h-5 object-contain" />
                                  <span className="text-sm font-semibold text-slate-900">{match.away_team}</span>
                                </div>
                              </div>
                              <Badge
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                  isActive && isWithinTime
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {isActive && isWithinTime ? "Голосування відкрите" : "Голосування закрите"}
                              </Badge>
                            </div>
                            {/* Time info */}
                            {(startTime || endTime) && (
                              <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                                <Clock className="h-3 w-3" />
                                {startTime && <span>Початок: {startTime.toLocaleString("uk-UA")}</span>}
                                {endTime && <span>Кінець: {endTime.toLocaleString("uk-UA")}</span>}
                              </div>
                            )}
                          </div>

                          <CardContent className="p-6">
                            {matchCandidates.length === 0 ? (
                              <div className="text-center py-6">
                                <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                <div className="text-sm text-slate-500">Кандидатів ще не додано</div>
                              </div>
                            ) : canVote ? (
                              /* Active Voting UI */
                              <div className="space-y-6">
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                  Оберіть найкращого гравця матчу
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                  {/* Home Team Candidates */}
                                  <div className="space-y-3">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                      <img src={getTeamLogo(match.home_team)} alt="" className="w-4 h-4 object-contain" />
                                      <span>{match.home_team} (Господарі)</span>
                                    </div>
                                    {matchCandidates.filter((c) => c.team_name === match.home_team).length === 0 ? (
                                      <div className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-100 rounded-lg">Гравців не додано</div>
                                    ) : (
                                      <div className="flex flex-col gap-2">
                                        {matchCandidates
                                          .filter((c) => c.team_name === match.home_team)
                                          .map((candidate) => (
                                            <button
                                              key={candidate.id}
                                              onClick={() => setSelectedCandidate((prev) => ({ ...prev, [voting.match_id]: candidate.id }))}
                                              className={`p-3 rounded-lg border text-left transition-all text-sm font-medium ${
                                                selectedCandidate[voting.match_id] === candidate.id
                                                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                                  : "border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                {selectedCandidate[voting.match_id] === candidate.id && (
                                                  <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0" />
                                                )}
                                                <span>{candidate.player_name}</span>
                                              </div>
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Away Team Candidates */}
                                  <div className="space-y-3">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                      <img src={getTeamLogo(match.away_team)} alt="" className="w-4 h-4 object-contain" />
                                      <span>{match.away_team} (Гості)</span>
                                    </div>
                                    {matchCandidates.filter((c) => c.team_name === match.away_team).length === 0 ? (
                                      <div className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-100 rounded-lg">Гравців не додано</div>
                                    ) : (
                                      <div className="flex flex-col gap-2">
                                        {matchCandidates
                                          .filter((c) => c.team_name === match.away_team)
                                          .map((candidate) => (
                                            <button
                                              key={candidate.id}
                                              onClick={() => setSelectedCandidate((prev) => ({ ...prev, [voting.match_id]: candidate.id }))}
                                              className={`p-3 rounded-lg border text-left transition-all text-sm font-medium ${
                                                selectedCandidate[voting.match_id] === candidate.id
                                                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                                  : "border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                {selectedCandidate[voting.match_id] === candidate.id && (
                                                  <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0" />
                                                )}
                                                <span>{candidate.player_name}</span>
                                              </div>
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <Button
                                  onClick={() => handleVoteSubmit(voting.match_id)}
                                  disabled={!selectedCandidate[voting.match_id] || loading}
                                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                                >
                                  <Vote className="h-4 w-4 mr-2" />
                                  Проголосувати
                                </Button>
                              </div>
                            ) : (
                              /* Results UI (closed or already voted) */
                              <div className="space-y-4">
                                {hasVoted && isActive && (
                                  <div className="text-center text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-2 px-3 font-medium">
                                    ✓ Ви вже проголосували у цьому матчі
                                  </div>
                                )}

                                {/* TOP-3 Winners */}
                                {matchCandidates.length > 0 && (
                                  <div className="space-y-3">
                                    {matchCandidates.slice(0, 3).map((candidate, index) => {
                                      const percentage = totalVotes > 0 ? ((candidate.votes / totalVotes) * 100).toFixed(1) : "0"
                                      const medals = ["🥇", "🥈", "🥉"]
                                      const bgStyles = [
                                        "bg-amber-50 border-amber-200",
                                        "bg-slate-50 border-slate-200",
                                        "bg-orange-50 border-orange-200",
                                      ]
                                      const barColors = ["bg-amber-400", "bg-slate-400", "bg-orange-400"]

                                      return (
                                        <div
                                          key={candidate.id}
                                          className={`p-4 rounded-xl border ${bgStyles[index]} transition-all`}
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                              <span className="text-xl">{medals[index]}</span>
                                              <div>
                                                <div className="text-sm font-bold text-slate-900">
                                                  {index === 0 && "Лев матчу — "}
                                                  {candidate.player_name}
                                                </div>
                                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                  <img src={getTeamLogo(candidate.team_name)} alt="" className="w-3 h-3 object-contain" />
                                                  {candidate.team_name}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-sm font-bold text-slate-900">{percentage}%</div>
                                              <div className="text-[10px] text-slate-500">{candidate.votes} голосів</div>
                                            </div>
                                          </div>
                                          <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${barColors[index]} transition-all duration-500`}
                                              style={{ width: `${percentage}%` }}
                                            />
                                          </div>
                                        </div>
                                      )
                                    })}

                                    {/* Rest of candidates */}
                                    {matchCandidates.length > 3 && (
                                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                                        {matchCandidates.slice(3).map((candidate, index) => {
                                          const percentage = totalVotes > 0 ? ((candidate.votes / totalVotes) * 100).toFixed(1) : "0"
                                          return (
                                            <div key={candidate.id} className="p-3 flex items-center justify-between bg-white">
                                              <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-400 font-bold w-6 text-center">{index + 4}</span>
                                                <div>
                                                  <div className="text-sm font-medium text-slate-700">{candidate.player_name}</div>
                                                  <div className="text-[10px] text-slate-400">{candidate.team_name}</div>
                                                </div>
                                              </div>
                                              <div className="text-xs text-slate-500 font-medium">{percentage}% ({candidate.votes})</div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}

                                    {totalVotes > 0 && (
                                      <div className="text-center text-[11px] text-slate-400 mt-2">
                                        Всього голосів: {totalVotes}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </TabsContent>

                {/* Admin Tab */}
                <TabsContent value="admin" className="outline-none">
                  <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                    <CardHeader className="border-b border-slate-100 py-4 px-6 bg-slate-50">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <Settings className="h-4 w-4 text-slate-500" />
                        Панель керування турніром
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {!isAdmin ? (
                        <div className="space-y-3 max-w-sm mx-auto">
                          <Input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Введіть пароль доступу"
                            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                            className="bg-slate-50 border-slate-200 rounded-lg text-sm"
                          />
                          <Button
                            onClick={handleLogin}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Увійти
                          </Button>
                        </div>
                      ) : (
                        <AdminPanel
                          onLogout={() => setIsAdmin(false)}
                          currentChampionshipId={currentChampionshipId || 0}
                          onChampionshipChange={(id) => {
                            setCurrentChampionshipId(id)
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-400 font-medium">
        &copy; {new Date().getFullYear()} KS LIGA. All rights reserved.
      </footer>
    </div>
  )
}
