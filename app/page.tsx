"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShoppingBag,
  Tag,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
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
  getMatchesCards,
  formatTime,
  sortChampionships,
  authenticateUser,
  getProducts,
} from "@/lib/database"
import { AdminPanel } from "@/components/admin-panel"
import { CupTournament } from "@/components/cup-tournament"
import type { Team, Match, Player, Championship, MatchGoal, MatchCard, MatchVoting, VotingCandidate, Product } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TeamDisplay } from "@/components/team-display"

export default function KSLigaSite() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMainAdmin, setIsMainAdmin] = useState(true)
  const [allowedChampionshipIds, setAllowedChampionshipIds] = useState<number[] | "all">("all")
  const [organizerName, setOrganizerName] = useState<string>("")
  const [adminPassword, setAdminPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)

  const [teams, setTeams] = useState<Team[]>([])
  const [table, setTable] = useState<any[]>([])
  const [calendar, setCalendar] = useState<Match[]>([])
  const [results, setResults] = useState<Match[]>([])
  const [scorers, setScorers] = useState<Player[]>([])
  const [matchGoals, setMatchGoals] = useState<{ [key: number]: MatchGoal[] }>({})
  const [matchCards, setMatchCards] = useState<{ [key: number]: MatchCard[] }>({})
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<string>("table")
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

  // KS Shop states
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)

  // ===== MEMOIZED COMPUTATIONS =====
  // O(1) team logo lookup via Map instead of O(N) .find() on every render
  const teamLogoMap = useMemo(() => {
    const map = new Map<string, string>()
    teams.forEach((t) => map.set(t.name, t.logo || "/placeholder.svg?height=32&width=32"))
    return map
  }, [teams])

  const getTeamLogo = useCallback(
    (teamName: string): string => teamLogoMap.get(teamName) || "/placeholder.svg?height=32&width=32",
    [teamLogoMap]
  )

  // Pre-sorted championships for dropdown
  const sortedChampionshipsList = useMemo(() => sortChampionships(championships), [championships])

  // Pre-grouped calendar rounds
  const calendarRounds = useMemo(
    () => [...new Set(calendar.map((m) => m.round))].sort((a, b) => a - b),
    [calendar]
  )

  // Pre-grouped results rounds (reverse order)
  const resultsRounds = useMemo(
    () => [...new Set(results.map((m) => m.round))].sort((a, b) => b - a),
    [results]
  )

  // Filtered votings — computed once, used in both empty-check and render
  const filteredVotings = useMemo(() => {
    return votings.filter((voting) => {
      if (showArchive) return true
      const now = new Date()
      const startTime = voting.start_time ? new Date(voting.start_time) : null
      const endTime = voting.end_time ? new Date(voting.end_time) : null
      const isWithinTime = (!startTime || now >= startTime) && (!endTime || now <= endTime)
      return voting.is_active && isWithinTime
    })
  }, [votings, showArchive])

  // All matches merged for voting match lookup
  const allMatches = useMemo(() => [...calendar, ...results], [calendar, results])

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
      const [championshipsData, activeChampionship, productsData] = await Promise.all([
        getChampionships(),
        getActiveChampionship(),
        getProducts(),
      ])

      setChampionships(championshipsData)
      setProducts(productsData)

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
      if (championship?.tournament_type === "cup" && activeTab === "table") {
        setActiveTab("cup")
      } else if (championship?.tournament_type === "league" && activeTab === "cup") {
        setActiveTab("table")
      }

      // Load match goals and cards for finished matches in batch queries
      const finishedMatches = matchesData.filter((m) => m.is_finished)
      const finishedMatchIds = finishedMatches.map((m) => m.id)
      const goalsData: { [key: number]: MatchGoal[] } = {}
      const cardsData: { [key: number]: MatchCard[] } = {}

      // Initialize all finished matches with empty arrays
      finishedMatches.forEach((m) => {
        goalsData[m.id] = []
        cardsData[m.id] = []
      })

      if (finishedMatchIds.length > 0) {
        try {
          const [allGoals, allCards] = await Promise.all([
            getMatchesGoals(finishedMatchIds),
            getMatchesCards(finishedMatchIds),
          ])
          allGoals.forEach((goal) => {
            if (goalsData[goal.match_id]) {
              goalsData[goal.match_id].push(goal)
            }
          })
          allCards.forEach((card) => {
            if (cardsData[card.match_id]) {
              cardsData[card.match_id].push(card)
            }
          })
        } catch (error) {
          console.error("Error loading match events in batch:", error)
        }
      }

      setMatchGoals(goalsData)
      setMatchCards(cardsData)
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

  // Callback for AdminPanel to notify that data changed
  const handleDataChange = useCallback(async () => {
    // Reload championship-specific data and products
    if (currentChampionshipId) {
      await loadDataForChampionship(currentChampionshipId)
    }
    // Also refresh products and championships list
    try {
      const [championshipsData, productsData] = await Promise.all([
        getChampionships(),
        getProducts(),
      ])
      setChampionships(championshipsData)
      setProducts(productsData)
    } catch (error) {
      console.error("Error refreshing data after admin change:", error)
    }
  }, [currentChampionshipId])

  const handleLogin = async () => {
    setLoginError(null)
    if (!adminPassword) return

    const authResult = await authenticateUser(adminPassword)
    if (authResult) {
      setIsAdmin(true)
      if (authResult.type === "main") {
        setIsMainAdmin(true)
        setAllowedChampionshipIds("all")
        setOrganizerName("Головний адміністратор")
      } else {
        setIsMainAdmin(false)
        setAllowedChampionshipIds(authResult.organizer.championship_ids)
        setOrganizerName(authResult.organizer.name)

        if (
          !authResult.organizer.championship_ids.includes(currentChampionshipId || 0) &&
          authResult.organizer.championship_ids.length > 0
        ) {
          const firstAllowed = authResult.organizer.championship_ids[0]
          setCurrentChampionshipId(firstAllowed)
          loadDataForChampionship(firstAllowed)
        }
      }
      setAdminPassword("")
    } else {
      setLoginError("Невірний пароль доступу. Перевірте пароль та спробуйте ще раз.")
    }
  }

  const handleLogout = () => {
    setIsAdmin(false)
    setIsMainAdmin(true)
    setAllowedChampionshipIds("all")
    setOrganizerName("")
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="liquid-glass-card p-8 text-center glass-animate-in">
          <div className="w-10 h-10 border-2 border-[var(--lg-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-bold text-slate-900">KS LIGA</div>
          <div className="text-xs text-slate-500 mt-1">Завантаження матчів...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-900 flex flex-col font-sans">
      <header className="liquid-glass-header fixed top-0 left-0 right-0 z-50 w-full backdrop-blur-xl bg-white/80 border-b border-slate-200/50 shadow-xs pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <div className="max-w-6xl mx-auto px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 liquid-glass-card !rounded-[12px] sm:!rounded-[14px] flex items-center justify-center overflow-hidden shrink-0">
              <img src="/images/ks-logo.png" alt="KS Logo" className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
                KS LIGA
              </h1>
              <p className="text-[8px] sm:text-[9px] text-slate-500 font-semibold uppercase tracking-[0.15em] hidden min-[360px]:block">
                Karpiuk Sport League
              </p>
            </div>
          </div>

          {/* Championship Selector */}
          {championships.length > 0 && currentChampionshipId && (
            <div className="shrink-0 max-w-[58%] sm:max-w-xs">
              <Select value={currentChampionshipId.toString()} onValueChange={handleChampionshipChange}>
                <SelectTrigger className="w-full glass-input h-9 sm:h-10 text-xs font-semibold !rounded-[var(--glass-radius-sm)] px-2.5 sm:px-3 bg-white/60 border-slate-200/80 shadow-xs hover:bg-white/80 transition-colors">
                  <SelectValue placeholder="Оберіть чемпіонат">
                    {(() => {
                      const active = championships.find((c) => c.id === currentChampionshipId)
                      if (!active) return "Оберіть чемпіонат"
                      return (
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="shrink-0">{active.tournament_type === "league" ? "🏆" : "👑"}</span>
                          <span className="truncate max-w-[110px] min-[400px]:max-w-[160px] sm:max-w-[200px] font-bold text-slate-900">{active.name}</span>
                          <span className="text-slate-500 text-[10px] hidden sm:inline shrink-0">({active.season})</span>
                        </span>
                      )
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="liquid-glass-card !rounded-[var(--glass-radius-sm)] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] max-w-[calc(100vw-2rem)] min-w-[220px]">
                  {sortedChampionshipsList.map((championship) => (
                    <SelectItem
                      key={championship.id}
                      value={championship.id.toString()}
                      className="text-slate-900 hover:bg-slate-100/80 focus:bg-slate-100/80 text-xs font-medium cursor-pointer rounded-lg py-2 px-2 text-left"
                    >
                      <span className="flex items-center justify-between gap-2 w-full">
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{championship.tournament_type === "league" ? "🏆" : "👑"}</span>
                          <span className="font-semibold text-slate-900 truncate">{championship.name}</span>
                          <span className="text-slate-500 text-[10px]">({championship.season})</span>
                        </span>
                        {championship.is_active && (
                          <span className="text-emerald-600 font-bold text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 shrink-0 ml-1">
                            Активний
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 pt-16 sm:pt-20 md:py-8 md:pt-24 pb-24 md:pb-8 space-y-6">
        {/* No championships state */}
        {championships.length === 0 && (
          <div className="max-w-md mx-auto text-center py-12 px-4 space-y-6">
            <div className="w-16 h-16 mx-auto liquid-glass-card !rounded-full flex items-center justify-center text-slate-400">
              <Trophy className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Чемпіонат не створено</h2>
              <p className="text-sm text-slate-500">Увійдіть в адмін-панель нижче, щоб додати перший турнір.</p>
            </div>

            <Card className="liquid-glass-card overflow-hidden text-left">
              <CardHeader className="border-b border-slate-200/50 py-4 px-6 bg-white/40">
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
                      placeholder="Пароль доступу (адмін або організатор)"
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                      className="glass-input text-sm h-10 px-4"
                    />
                    {loginError && <p className="text-xs font-semibold text-red-600 px-1">{loginError}</p>}
                    <Button
                      onClick={handleLogin}
                      className="w-full ios-btn-primary text-xs font-bold h-10 ios-active-scale"
                    >
                      Увійти
                    </Button>
                  </div>
                ) : (
                  <AdminPanel
                    onLogout={handleLogout}
                    currentChampionshipId={0}
                    onChampionshipChange={(id) => {
                      setCurrentChampionshipId(id)
                      loadInitialData()
                    }}
                    onDataChange={handleDataChange}
                    isMainAdmin={isMainAdmin}
                    allowedChampionshipIds={allowedChampionshipIds}
                    organizerName={organizerName}
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
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full space-y-6"
              >
                {/* iOS Liquid Glass Segmented Tab Bar for Desktop */}
                <div className="hidden md:flex overflow-x-auto pb-2.5 scrollbar-none justify-start">
                  <TabsList className="ios-segmented-control w-max">
                    {currentChampionship?.tournament_type === "league" && (
                      <TabsTrigger
                        value="table"
                        className="ios-segment flex items-center justify-center"
                      >
                        <Trophy className="h-4 w-4" />
                        <span className="ml-1.5">Таблиця</span>
                      </TabsTrigger>
                    )}
                    {currentChampionship?.tournament_type === "cup" && (
                      <TabsTrigger
                        value="cup"
                        className="ios-segment flex items-center justify-center"
                      >
                        <Crown className="h-4 w-4" />
                        <span className="ml-1.5">Кубок</span>
                      </TabsTrigger>
                    )}
                    <TabsTrigger
                      value="calendar"
                      className="ios-segment flex items-center justify-center"
                    >
                      <Calendar className="h-4 w-4" />
                      <span className="ml-1.5">Календар</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="results"
                      className="ios-segment flex items-center justify-center"
                    >
                      <Zap className="h-4 w-4" />
                      <span className="ml-1.5">Результати</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="scorers"
                      className="ios-segment flex items-center justify-center"
                    >
                      <Target className="h-4 w-4" />
                      <span className="ml-1.5">Бомбардири</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="lion"
                      className="ios-segment flex items-center justify-center"
                    >
                      <Vote className="h-4 w-4" />
                      <span className="ml-1.5">Лев матчу</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="shop"
                      className="ios-segment flex items-center justify-center"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span className="ml-1.5">KS Shop</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* League Table Tab */}
                {currentChampionship?.tournament_type === "league" && (
                  <TabsContent value="table" className="outline-none space-y-3">
                    <div className="ios-section-header">Турнірна таблиця</div>

                    {table.length === 0 ? (
                      <Card className="liquid-glass-card overflow-hidden">
                        <CardContent className="p-6 text-center py-16">
                          <Trophy className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                          <div className="text-base font-semibold text-slate-900">Немає даних таблиці</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Додайте команди та результати матчів для формування таблиці.
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-150">
                        {/* Table Header Legend (Mobile & Desktop) */}
                        <div className="bg-slate-100/90 px-3 sm:px-4 py-2 border-b border-slate-200/90 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-7 sm:w-8 text-center shrink-0">#</span>
                            <span className="truncate">Команда</span>
                          </div>
                          <div className="flex items-center shrink-0 text-right">
                            {/* І */}
                            <span className="w-5 sm:w-6 text-center">І</span>
                            {/* Divider spacing */}
                            <span className="w-2.5"></span>
                            {/* В / Н / П */}
                            <span className="w-[58px] sm:w-[72px] text-center">В/Н/П</span>
                            {/* spacing */}
                            <span className="w-2 sm:w-4"></span>
                            {/* З:П */}
                            <span className="w-10 sm:w-14 text-center">З:П</span>
                            {/* spacing */}
                            <span className="w-2 sm:w-4"></span>
                            {/* О */}
                            <span className="w-7 sm:w-9 text-right text-blue-600 font-extrabold">О</span>
                          </div>
                        </div>

                        {table.map((team, index) => {
                          const position = index + 1
                          let posBadgeClass = "bg-slate-100 text-slate-500 font-bold"
                          if (position === 1) {
                            posBadgeClass = "bg-[#FACC15] text-slate-900 font-extrabold shadow-xs"
                          } else if (position === 2) {
                            posBadgeClass = "bg-[#CBD5E1] text-slate-800 font-extrabold"
                          } else if (position === 3) {
                            posBadgeClass = "bg-[#D97706] text-white font-extrabold shadow-xs"
                          }

                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between px-3 sm:px-4 py-3 hover:bg-slate-50/80 transition-colors gap-2"
                            >
                              {/* Left side: Position, Logo, Team Name (Truncates smoothly without shifting stats) */}
                              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden mr-1">
                                <span
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm shrink-0 ${posBadgeClass}`}
                                >
                                  {position}
                                </span>

                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0 p-0.5">
                                  <img
                                    src={getTeamLogo(team.name) || "/placeholder.svg"}
                                    alt={`${team.name} Logo`}
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </div>

                                <span className="font-bold text-slate-900 text-xs min-[380px]:text-sm sm:text-base truncate min-w-0 flex-1">
                                  {team.name}
                                </span>
                              </div>

                              {/* Right side: Stats & Points (Completely locked column positions) */}
                              <div className="flex items-center shrink-0 text-right text-xs sm:text-sm font-semibold select-none">
                                {/* Games played (І) */}
                                <span className="w-5 sm:w-6 text-center font-extrabold text-slate-800 shrink-0">{team.games}</span>

                                {/* Divider */}
                                <span className="text-slate-300 mx-0.5 sm:mx-1 shrink-0">|</span>

                                {/* Record (В / Н / П) */}
                                <div className="flex items-center justify-center w-[58px] sm:w-[72px] shrink-0">
                                  <span className="w-4 sm:w-5 text-center text-emerald-600 font-bold shrink-0">{team.wins}</span>
                                  <span className="text-slate-300 shrink-0">/</span>
                                  <span className="w-4 sm:w-5 text-center text-amber-600 font-bold shrink-0">{team.draws}</span>
                                  <span className="text-slate-300 shrink-0">/</span>
                                  <span className="w-4 sm:w-5 text-center text-red-500 font-bold shrink-0">{team.losses}</span>
                                </div>

                                {/* Divider spacing */}
                                <span className="w-2 sm:w-4 shrink-0"></span>

                                {/* Goals ratio (З:П) */}
                                <span className="w-10 sm:w-14 text-center text-slate-500 font-medium shrink-0">{team.gf}:{team.ga}</span>

                                {/* Divider spacing */}
                                <span className="w-2 sm:w-4 shrink-0"></span>

                                {/* Points (О) */}
                                <span className="w-7 sm:w-9 text-right font-extrabold text-blue-600 text-sm sm:text-base shrink-0">{team.pts}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
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
                    <Card className="liquid-glass-card py-12 text-center">
                      <CardContent className="p-6">
                        <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <div className="text-base font-semibold text-slate-900">Немає запланованих матчів</div>
                        <div className="text-xs text-slate-500 mt-1">Всі матчі завершені або ще не додані.</div>
                      </CardContent>
                    </Card>
                  ) : (
                    calendarRounds.map((round) => (
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
                              <Card key={match.id} className="liquid-glass-card overflow-hidden">
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                  <div className="flex-1 space-y-3">
                                    {/* Team 1 */}
                                    <div className="flex items-center gap-3">
                                      <div className="w-7 h-7 rounded-md bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0 p-0.5">
                                        <img
                                          src={getTeamLogo(match.home_team)}
                                          alt="Home Team"
                                          className="w-full h-full object-contain"
                                          loading="lazy"
                                          decoding="async"
                                        />
                                      </div>
                                      <span className="text-sm font-bold text-slate-900 truncate">{match.home_team}</span>
                                    </div>
                                    {/* Team 2 */}
                                    <div className="flex items-center gap-3">
                                      <div className="w-7 h-7 rounded-md bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0 p-0.5">
                                        <img
                                          src={getTeamLogo(match.away_team)}
                                          alt="Away Team"
                                          className="w-full h-full object-contain"
                                        />
                                      </div>
                                      <span className="text-sm font-bold text-slate-900 truncate">{match.away_team}</span>
                                    </div>
                                  </div>

                                  {/* Date & Time */}
                                  <div className="text-right border-l border-slate-100 pl-4 space-y-1 flex-shrink-0">
                                    <div className="text-[11px] font-bold text-slate-800 flex items-center justify-end gap-1.5">
                                      <Clock className="h-3 w-3 text-slate-400" />
                                      {formatTime(match.match_time) || "—"}
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
                    <Card className="liquid-glass-card py-12 text-center">
                      <CardContent className="p-6">
                        <Zap className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <div className="text-base font-semibold text-slate-900">Немає результатів</div>
                        <div className="text-xs text-slate-500 mt-1">Зіграні матчі з'являться в цій вкладці.</div>
                      </CardContent>
                    </Card>
                  ) : (
                    resultsRounds.map((round) => (
                      <div key={round} className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">
                          {currentChampionship?.tournament_type === "cup"
                            ? results.find((m) => m.round === round)?.cup_stage || `Раунд ${round}`
                            : `Тур ${round}`}
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {results
                            .filter((m) => m.round === round)
                            .map((match) => {
                              const matchGoalList = matchGoals[match.id] || []
                              const matchCardList = matchCards[match.id] || []

                              const homeGoals = matchGoalList.filter((g) => g.team_name === match.home_team)
                              const awayGoals = matchGoalList.filter((g) => g.team_name === match.away_team)

                              const homeCards = matchCardList.filter((c) => c.team_name === match.home_team)
                              const awayCards = matchCardList.filter((c) => c.team_name === match.away_team)

                              return (
                                <Card
                                  key={match.id}
                                  className="liquid-glass-card overflow-hidden transition-all duration-300 hover:border-slate-300 shadow-xs"
                                >
                                  <CardContent className="p-3.5 space-y-2.5">
                                    {/* Main Compact Result Bar */}
                                    <div className="flex items-center justify-between gap-2">
                                      {/* Home Team */}
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 p-0.5">
                                          <img
                                            src={getTeamLogo(match.home_team)}
                                            alt="Home Team"
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                            decoding="async"
                                          />
                                        </div>
                                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                                          {match.home_team}
                                        </span>
                                      </div>

                                      {/* Highlighted Score Badge */}
                                      <div className="flex flex-col items-center shrink-0 px-1.5">
                                        <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs sm:text-sm shadow-xs tracking-tight">
                                          {formatMatchResult(match)}
                                        </span>
                                        {formatPenaltyResult(match) && (
                                          <span className="text-[9px] text-amber-600 font-bold mt-0.5">
                                            {formatPenaltyResult(match)}
                                          </span>
                                        )}
                                      </div>

                                      {/* Away Team */}
                                      <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-right">
                                        <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                                          {match.away_team}
                                        </span>
                                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 p-0.5">
                                          <img
                                            src={getTeamLogo(match.away_team)}
                                            alt="Away Team"
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                            decoding="async"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Date & Expand trigger */}
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100/80">
                                      <span>
                                        {match.match_time ? `${formatTime(match.match_time)} · ` : ""}
                                        {new Date(match.date).toLocaleDateString("uk-UA")}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setExpandedMatchId(expandedMatchId === match.id ? null : match.id)}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                                      >
                                        <span>{expandedMatchId === match.id ? "Сховати" : "Деталі"}</span>
                                        {expandedMatchId === match.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                      </button>
                                    </div>

                                    {/* Expanded Details: Two-Column Scorers & Cards */}
                                    {expandedMatchId === match.id && (
                                      <div
                                        className="border-t border-slate-200/80 pt-2.5 space-y-2.5 glass-animate-in text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {/* Goals Section (Two Columns) */}
                                        <div className="space-y-1.5">
                                          <div className="font-bold text-slate-700 text-[10px] uppercase tracking-wider flex items-center gap-1">
                                            <Target className="h-3.5 w-3.5 text-blue-600" />
                                            <span>Автори голів ({matchGoalList.length})</span>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2 bg-slate-50/90 p-2 rounded-xl border border-slate-200/60">
                                            {/* Home Team Goals */}
                                            <div className="space-y-1 pr-1.5 border-r border-slate-200/80">
                                              <div className="text-[9px] font-black text-slate-400 truncate mb-1">
                                                {match.home_team}
                                              </div>
                                              {homeGoals.length === 0 ? (
                                                <div className="text-[10px] text-slate-400 italic">—</div>
                                              ) : (
                                                homeGoals.map((g) => (
                                                  <div key={g.id} className="text-[10px] font-semibold text-slate-800 flex items-center gap-1 truncate">
                                                    <span className="text-[9px] text-blue-600 font-extrabold shrink-0">{g.minute ? `${g.minute}'` : "⚽"}</span>
                                                    <span className="truncate">{g.player_name}</span>
                                                    {g.goal_type === "penalty" && <span className="text-[8px] text-amber-600 font-bold shrink-0">(пен)</span>}
                                                    {g.goal_type === "own_goal" && <span className="text-[8px] text-red-500 font-bold shrink-0">(авт)</span>}
                                                  </div>
                                                ))
                                              )}
                                            </div>

                                            {/* Away Team Goals */}
                                            <div className="space-y-1 pl-1.5 text-right">
                                              <div className="text-[9px] font-black text-slate-400 truncate mb-1">
                                                {match.away_team}
                                              </div>
                                              {awayGoals.length === 0 ? (
                                                <div className="text-[10px] text-slate-400 italic">—</div>
                                              ) : (
                                                awayGoals.map((g) => (
                                                  <div key={g.id} className="text-[10px] font-semibold text-slate-800 flex items-center justify-end gap-1 truncate">
                                                    {g.goal_type === "penalty" && <span className="text-[8px] text-amber-600 font-bold shrink-0">(пен)</span>}
                                                    {g.goal_type === "own_goal" && <span className="text-[8px] text-red-500 font-bold shrink-0">(авт)</span>}
                                                    <span className="truncate">{g.player_name}</span>
                                                    <span className="text-[9px] text-blue-600 font-extrabold shrink-0">{g.minute ? `${g.minute}'` : "⚽"}</span>
                                                  </div>
                                                ))
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Cards Section (Two Columns) */}
                                        {matchCardList.length > 0 && (
                                          <div className="space-y-1.5">
                                            <div className="font-bold text-slate-700 text-[10px] uppercase tracking-wider flex items-center gap-1">
                                              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                              <span>Картки ({matchCardList.length})</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 bg-slate-50/90 p-2 rounded-xl border border-slate-200/60">
                                              {/* Home Cards */}
                                              <div className="space-y-1 pr-1.5 border-r border-slate-200/80">
                                                {homeCards.length === 0 ? (
                                                  <div className="text-[10px] text-slate-400 italic">—</div>
                                                ) : (
                                                  homeCards.map((c) => (
                                                    <div key={c.id} className="text-[10px] font-semibold text-slate-800 flex items-center gap-1 truncate">
                                                      {c.card_type === "yellow" && <span className="w-1.5 h-2.5 bg-amber-400 rounded-2xs inline-block shrink-0"></span>}
                                                      {c.card_type === "red" && <span className="w-1.5 h-2.5 bg-red-500 rounded-2xs inline-block shrink-0"></span>}
                                                      {c.card_type === "yellow_red" && (
                                                        <span className="flex gap-0.5 shrink-0">
                                                          <span className="w-1 h-2.5 bg-amber-400 rounded-2xs inline-block"></span>
                                                          <span className="w-1 h-2.5 bg-red-500 rounded-2xs inline-block"></span>
                                                        </span>
                                                      )}
                                                      <span className="truncate">{c.player_name}</span>
                                                      <span className="text-[8px] text-slate-400 shrink-0">{c.minute ? `${c.minute}'` : ""}</span>
                                                    </div>
                                                  ))
                                                )}
                                              </div>

                                              {/* Away Cards */}
                                              <div className="space-y-1 pl-1.5 text-right">
                                                {awayCards.length === 0 ? (
                                                  <div className="text-[10px] text-slate-400 italic">—</div>
                                                ) : (
                                                  awayCards.map((c) => (
                                                    <div key={c.id} className="text-[10px] font-semibold text-slate-800 flex items-center justify-end gap-1 truncate">
                                                      <span className="text-[8px] text-slate-400 shrink-0">{c.minute ? `${c.minute}'` : ""}</span>
                                                      <span className="truncate">{c.player_name}</span>
                                                      {c.card_type === "yellow" && <span className="w-1.5 h-2.5 bg-amber-400 rounded-2xs inline-block shrink-0"></span>}
                                                      {c.card_type === "red" && <span className="w-1.5 h-2.5 bg-red-500 rounded-2xs inline-block shrink-0"></span>}
                                                      {c.card_type === "yellow_red" && (
                                                        <span className="flex gap-0.5 shrink-0">
                                                          <span className="w-1 h-2.5 bg-amber-400 rounded-2xs inline-block"></span>
                                                          <span className="w-1 h-2.5 bg-red-500 rounded-2xs inline-block"></span>
                                                        </span>
                                                      )}
                                                    </div>
                                                  ))
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )
                            })}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Scorers Tab */}
                <TabsContent value="scorers" className="outline-none space-y-2">
                  <div className="ios-section-header">Рейтинг бомбардирів</div>
                  <Card className="liquid-glass-card overflow-hidden">
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
                            let badgeStyle = "bg-white/40 text-slate-700"
                            if (position === 1) badgeStyle = "bg-amber-400 text-amber-900 font-bold shadow-[0_4px_10px_rgba(251,191,36,0.3)]"
                            else if (position === 2) badgeStyle = "bg-slate-300 text-slate-800 font-bold shadow-[0_4px_10px_rgba(203,213,225,0.3)]"
                            else if (position === 3) badgeStyle = "bg-orange-300 text-orange-900 font-bold shadow-[0_4px_10px_rgba(253,186,116,0.3)]"

                            return (
                              <div key={scorer.id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/15 transition-colors">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${badgeStyle}`}>
                                    {position}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-900 truncate">
                                      {scorer.name}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
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
                                  <span className="inline-flex items-center justify-center bg-[var(--lg-blue)] text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-[0_4px_12px_rgba(0,122,255,0.25)]">
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
                      <label className="flex items-center gap-3 cursor-pointer select-none text-xs font-semibold text-slate-700 bg-white/70 backdrop-blur-md border border-slate-200/50 rounded-xl px-4 py-2.5 shadow-sm hover:bg-white transition-all">
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={showArchive}
                            onChange={(e) => setShowArchive(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#34c759]"></div>
                        </div>
                        <span>Архів голосувань</span>
                      </label>
                    </div>
                  )}

                  {filteredVotings.length === 0 ? (
                    <Card className="liquid-glass-card py-12 text-center">
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
                    filteredVotings
                      .map((voting) => {
                      const match = allMatches.find((m) => m.id === voting.match_id)
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
                        <Card key={voting.match_id} className="liquid-glass-card overflow-hidden">
                          {/* Match Header */}
                          <div className="border-b border-slate-200/50 px-6 py-4 bg-white/40">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <img src={getTeamLogo(match.home_team)} alt="" className="w-5 h-5 object-contain" loading="lazy" decoding="async" />
                                  <span className="text-sm font-semibold text-slate-900">{match.home_team}</span>
                                </div>
                                <span className="text-xs text-slate-400 font-medium">
                                  {match.is_finished
                                    ? `${match.home_score} — ${match.away_score}`
                                    : "vs"}
                                </span>
                                <div className="flex items-center gap-2">
                                  <img src={getTeamLogo(match.away_team)} alt="" className="w-5 h-5 object-contain" loading="lazy" decoding="async" />
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
                                      <img src={getTeamLogo(match.home_team)} alt="" className="w-4 h-4 object-contain" loading="lazy" decoding="async" />
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
                                              className={`p-3 rounded-xl border text-left text-xs font-semibold ios-active-scale ${
                                                selectedCandidate[voting.match_id] === candidate.id
                                                  ? "bg-[var(--lg-blue)] text-white border-transparent shadow-[0_4px_14px_rgba(0,122,255,0.3)]"
                                                  : "bg-white/12 border-white/25 text-slate-800 hover:bg-white/22"
                                              }`}
                                            >
                                              <div className="flex items-center justify-between">
                                                <span>{candidate.player_name}</span>
                                                {selectedCandidate[voting.match_id] === candidate.id && (
                                                  <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0" />
                                                )}
                                              </div>
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Away Team Candidates */}
                                  <div className="space-y-3">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 pb-1.5 border-b border-slate-100">
                                      <img src={getTeamLogo(match.away_team)} alt="" className="w-4 h-4 object-contain" loading="lazy" decoding="async" />
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
                                              className={`p-3 rounded-xl border text-left text-xs font-semibold ios-active-scale ${
                                                selectedCandidate[voting.match_id] === candidate.id
                                                  ? "bg-[var(--lg-blue)] text-white border-transparent shadow-[0_4px_14px_rgba(0,122,255,0.3)]"
                                                  : "bg-white/12 border-white/25 text-slate-800 hover:bg-white/22"
                                              }`}
                                            >
                                              <div className="flex items-center justify-between">
                                                <span>{candidate.player_name}</span>
                                                {selectedCandidate[voting.match_id] === candidate.id && (
                                                  <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0" />
                                                )}
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
                                  className="w-full ios-btn-primary text-xs font-bold h-10 ios-active-scale disabled:opacity-50 disabled:cursor-not-allowed mt-4"
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
                                                  <img src={getTeamLogo(candidate.team_name)} alt="" className="w-3 h-3 object-contain" loading="lazy" decoding="async" />
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

                {/* KS Shop Tab */}
                <TabsContent value="shop" className="outline-none space-y-6">
                  {/* Shop Banner / Header */}
                  <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)] pointer-events-none" />
                    <div className="relative z-10 space-y-2 max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Офіційний фан-шоп KS LIGA
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        Екіпірування та атрибутика
                      </h2>
                      <p className="text-xs sm:text-sm text-blue-100/80">
                        Обирайте фірмові м'ячі, ігрову форму, худі та аксесуари. Оформлення замовлень здійснюється через офіційний Instagram сторінку <span className="font-bold text-white">@ks_fan.shop</span>.
                      </p>
                    </div>
                  </div>

                  {/* Products Grid */}
                  {products.length === 0 ? (
                    <Card className="liquid-glass-card overflow-hidden">
                      <CardContent className="p-12 text-center">
                        <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <div className="text-base font-semibold text-slate-900">Наразі немає добавлених товарів</div>
                        <div className="text-xs text-slate-500 mt-1">Завітайте пізніше або зверніться до адміністратора.</div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {products.map((product) => {
                        const hasDiscount = product.old_price && product.old_price > product.price
                        const discountPercent = hasDiscount
                          ? Math.round(((product.old_price! - product.price) / product.old_price!) * 100)
                          : 0

                        return (
                          <div
                            key={product.id}
                            className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 flex flex-col overflow-hidden"
                          >
                            {/* Product Image Area */}
                            <div className="relative aspect-4/3 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => { setSelectedProduct(product); setSelectedImageIndex(0); }}>
                              <img
                                src={product.images && product.images.length > 0 ? product.images[0] : "/placeholder.svg"}
                                alt={product.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                                decoding="async"
                              />
                              
                              {/* Badges Overlay */}
                              <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                                {product.badge && (
                                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 shadow-sm border border-amber-300 uppercase tracking-wider">
                                    {product.badge}
                                  </span>
                                )}
                                {hasDiscount && (
                                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-sm border border-red-500">
                                    -{discountPercent}%
                                  </span>
                                )}
                              </div>

                              <div className="absolute top-3 right-3">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md ${
                                  product.is_available
                                    ? "bg-emerald-500/90 text-white border border-emerald-400/50"
                                    : "bg-red-500/90 text-white border border-red-400/50"
                                }`}>
                                  {product.is_available ? "В наявності" : "Продано"}
                                </span>
                              </div>

                              {/* Multi-photo indicator */}
                              {product.images && product.images.length > 1 && (
                                <div className="absolute bottom-3 right-3 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                                  📷 {product.images.length} фото
                                </div>
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                              <div className="space-y-1.5">
                                <h3
                                  onClick={() => { setSelectedProduct(product); setSelectedImageIndex(0); }}
                                  className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1 cursor-pointer"
                                >
                                  {product.title}
                                </h3>
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                  {product.description}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="text-xs text-slate-400 font-medium">Ціна</div>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-lg font-extrabold text-blue-600">
                                      {product.price} грн
                                    </span>
                                    {product.old_price && (
                                      <span className="text-xs font-semibold text-slate-400 line-through">
                                        {product.old_price} грн
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setSelectedProduct(product); setSelectedImageIndex(0); }}
                                    className="text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-2.5 rounded-xl"
                                  >
                                    Детальніше
                                  </Button>
                                  <a
                                    href={product.instagram_url || "https://www.instagram.com/ks_fan.shop/"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 transition-opacity h-9 px-3 rounded-xl shadow-xs shrink-0"
                                  >
                                    <span>Замовити</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Product Detail Modal */}
                  {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
                      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200">
                        {/* Close button */}
                        <button
                          onClick={() => setSelectedProduct(null)}
                          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-900/40 text-white hover:bg-slate-900/70 transition-colors backdrop-blur-xs cursor-pointer"
                        >
                          <X className="h-5 w-5" />
                        </button>

                        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
                          {/* Image Viewer */}
                          <div className="space-y-3">
                            <div className="relative aspect-4/3 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                              <img
                                src={selectedProduct.images && selectedProduct.images.length > 0 ? selectedProduct.images[selectedImageIndex] : "/placeholder.svg"}
                                alt={selectedProduct.title}
                                className="w-full h-full object-contain"
                                loading="lazy"
                                decoding="async"
                              />

                              {/* Navigation arrows for images */}
                              {selectedProduct.images && selectedProduct.images.length > 1 && (
                                <>
                                  <button
                                    onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : selectedProduct.images.length - 1))}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/50 text-white hover:bg-slate-900/80 transition-colors backdrop-blur-xs cursor-pointer"
                                  >
                                    <ChevronLeft className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => setSelectedImageIndex((prev) => (prev < selectedProduct.images.length - 1 ? prev + 1 : 0))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/50 text-white hover:bg-slate-900/80 transition-colors backdrop-blur-xs cursor-pointer"
                                  >
                                    <ChevronRight className="h-5 w-5" />
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Thumbnail strip */}
                            {selectedProduct.images && selectedProduct.images.length > 1 && (
                              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                                {selectedProduct.images.map((img, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setSelectedImageIndex(idx)}
                                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                                      selectedImageIndex === idx ? "border-blue-600 scale-105" : "border-slate-200 opacity-60 hover:opacity-100"
                                    }`}
                                  >
                                    <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Product Details Header */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {selectedProduct.badge && (
                                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-400 text-slate-900 shadow-xs border border-amber-300">
                                  {selectedProduct.badge}
                                </span>
                              )}
                              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                selectedProduct.is_available ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                              }`}>
                                {selectedProduct.is_available ? "В наявності" : "Під замовлення / Немає в наявності"}
                              </span>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                              {selectedProduct.title}
                            </h2>

                            <div className="flex items-baseline gap-3">
                              <span className="text-2xl sm:text-3xl font-black text-blue-600">
                                {selectedProduct.price} грн
                              </span>
                              {selectedProduct.old_price && (
                                <span className="text-base font-semibold text-slate-400 line-through">
                                  {selectedProduct.old_price} грн
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          <div className="space-y-2 border-t border-slate-100 pt-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Опис товару:
                            </h4>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                              {selectedProduct.description}
                            </p>
                          </div>

                          {/* Order Action Button */}
                          <div className="pt-4 border-t border-slate-100">
                            <a
                              href={selectedProduct.instagram_url || "https://www.instagram.com/ks_fan.shop/"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-extrabold text-base shadow-lg hover:opacity-95 transition-opacity"
                            >
                              <span>Придбати в Instagram @ks_fan.shop</span>
                              <ExternalLink className="h-5 w-5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Admin Tab */}
                <TabsContent value="admin" className="outline-none">
                  <Card className="liquid-glass-card overflow-hidden">
                    <CardHeader className="border-b border-slate-200/50 py-4 px-6 bg-white/40">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <Settings className="h-4 w-4 text-slate-500" />
                        Панель керування турніром
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {!isAdmin ? (
                        <div className="space-y-3 max-w-sm mx-auto py-6">
                          <Input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Введіть пароль доступу"
                            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                            className="glass-input text-sm h-10 px-4"
                          />
                          {loginError && <p className="text-xs font-semibold text-red-600 text-center px-1">{loginError}</p>}
                          <Button
                            onClick={handleLogin}
                            className="w-full ios-btn-primary text-sm font-bold h-10 ios-active-scale"
                          >
                            Увійти
                          </Button>
                        </div>
                      ) : (
                        <AdminPanel
                          onLogout={handleLogout}
                          currentChampionshipId={currentChampionshipId || 0}
                          onChampionshipChange={(id) => {
                            setCurrentChampionshipId(id)
                          }}
                          onDataChange={handleDataChange}
                          isMainAdmin={isMainAdmin}
                          allowedChampionshipIds={allowedChampionshipIds}
                          organizerName={organizerName}
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
      <footer className="liquid-glass-header mt-16 py-8 border-t border-white/30 text-xs text-slate-500 font-medium">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            &copy; {new Date().getFullYear()} KS LIGA — Karpiuk Sport League. Всі права захищені.
          </div>
          <div>
            <button
              onClick={() => {
                setActiveTab("admin")
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className="text-xs text-slate-500 hover:text-slate-900 font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/40 transition-all cursor-pointer border border-transparent hover:border-white/40"
            >
              <Settings className="h-3.5 w-3.5" />
              {isAdmin ? "Панель керування (Авторизовано)" : "Панель адміністратора"}
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile App Bottom Navigation Bar */}
      {championships.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/90 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pl-[max(0.25rem,env(safe-area-inset-left,0px))] pr-[max(0.25rem,env(safe-area-inset-right,0px))] py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
          <div className="flex items-center justify-around max-w-md mx-auto">
            {currentChampionship?.tournament_type === "league" && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("table")
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 ${
                  activeTab === "table"
                    ? "text-[var(--lg-blue)] font-bold bg-blue-50/80 shadow-xs"
                    : "text-slate-500 font-medium hover:text-slate-900"
                }`}
              >
                <Trophy className="h-5 w-5" />
                <span className="text-[10px] leading-tight mt-1">Таблиця</span>
              </button>
            )}

            {currentChampionship?.tournament_type === "cup" && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("cup")
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 ${
                  activeTab === "cup"
                    ? "text-[var(--lg-blue)] font-bold bg-blue-50/80 shadow-xs"
                    : "text-slate-500 font-medium hover:text-slate-900"
                }`}
              >
                <Crown className="h-5 w-5" />
                <span className="text-[10px] leading-tight mt-1">Кубок</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setActiveTab("calendar")
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 ${
                activeTab === "calendar"
                  ? "text-[var(--lg-blue)] font-bold bg-blue-50/80 shadow-xs"
                  : "text-slate-500 font-medium hover:text-slate-900"
              }`}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-[10px] leading-tight mt-1">Календар</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("results")
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 ${
                activeTab === "results"
                  ? "text-[var(--lg-blue)] font-bold bg-blue-50/80 shadow-xs"
                  : "text-slate-500 font-medium hover:text-slate-900"
              }`}
            >
              <Zap className="h-5 w-5" />
              <span className="text-[10px] leading-tight mt-1">Результати</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("scorers")
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 ${
                activeTab === "scorers"
                  ? "text-[var(--lg-blue)] font-bold bg-blue-50/80 shadow-xs"
                  : "text-slate-500 font-medium hover:text-slate-900"
              }`}
            >
              <Target className="h-5 w-5" />
              <span className="text-[10px] leading-tight mt-1">Бомбардири</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("lion")
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 ${
                activeTab === "lion"
                  ? "text-[var(--lg-blue)] font-bold bg-blue-50/80 shadow-xs"
                  : "text-slate-500 font-medium hover:text-slate-900"
              }`}
            >
              <Vote className="h-5 w-5" />
              <span className="text-[10px] leading-tight mt-1">Лев матчу</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("shop")
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 ${
                activeTab === "shop"
                  ? "text-[var(--lg-blue)] font-bold bg-blue-50/80 shadow-xs"
                  : "text-slate-500 font-medium hover:text-slate-900"
              }`}
            >
              <ShoppingBag className="h-5 w-5" />
              <span className="text-[10px] leading-tight mt-1">KS Shop</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("admin")
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 ${
                activeTab === "admin"
                  ? "text-[var(--lg-blue)] font-bold bg-blue-50/80 shadow-xs"
                  : "text-slate-500 font-medium hover:text-slate-900"
              }`}
            >
              <Settings className="h-5 w-5" />
              <span className="text-[10px] leading-tight mt-1">Адмін</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}
