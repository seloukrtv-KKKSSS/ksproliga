"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
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
  User,
  Vote,
  CheckCircle2,
  RotateCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShoppingBag,
  X,
  Sparkles,
  Award,
  Search,
  Filter,
  Gamepad2,
  Mail,
  KeyRound,
  Tv,
} from "lucide-react"
import {
  buildLeagueTable,
  formatTime,
  getMatchStatusInfo,
  sortChampionships,
} from "@/lib/league-utils"
import type { Team, Match, Player, Championship, MatchGoal, MatchCard, MatchVoting, VotingCandidate, Product, Organizer } from "@/lib/supabase"
import type { LeagueStanding } from "@/lib/league-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TeamDisplay } from "@/components/team-display"
import { SportsOverview } from "@/components/sports-overview"

const loadDatabase = () => import("@/lib/database")

function ModuleLoading() {
  return (
    <div className="flex min-h-40 items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      <span className="sr-only">Завантаження модуля…</span>
    </div>
  )
}

const AdminPanel = dynamic(() => import("@/components/admin-panel").then((module) => module.AdminPanel), {
  loading: ModuleLoading,
  ssr: false,
})
const CupTournament = dynamic(() => import("@/components/cup-tournament").then((module) => module.CupTournament), {
  loading: ModuleLoading,
})
const ShopProductCard = dynamic(
  () => import("@/components/shop-product-card").then((module) => module.ShopProductCard),
  { loading: ModuleLoading },
)
const ShopLightbox = dynamic(() => import("@/components/shop-lightbox").then((module) => module.ShopLightbox), {
  ssr: false,
})
const KsGamesHub = dynamic(() => import("@/components/games/ks-games-hub").then((module) => module.KsGamesHub), {
  loading: ModuleLoading,
  ssr: false,
})

export default function KSLigaSite() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMainAdmin, setIsMainAdmin] = useState(false)
  const [allowedChampionshipIds, setAllowedChampionshipIds] = useState<number[] | "all">([])
  const [organizerName, setOrganizerName] = useState<string>("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginInfo, setLoginInfo] = useState<string | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  const [teams, setTeams] = useState<Team[]>([])
  const [table, setTable] = useState<LeagueStanding[]>([])
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
  const [productsLoaded, setProductsLoaded] = useState(false)
  const [shopImageIndexes, setShopImageIndexes] = useState<Record<number, number>>({})
  const [shopSubTab, setShopSubTab] = useState<"official" | "announcements">("official")
  const [shopSearchQuery, setShopSearchQuery] = useState("")
  const [shopAvailabilityFilter, setShopAvailabilityFilter] = useState<"all" | "available" | "discount">("all")
  const [lightboxProduct, setLightboxProduct] = useState<Product | null>(null)
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0)

  // Mobile Pull-to-Refresh states
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [isPullRefreshing, setIsPullRefreshing] = useState(false)
  const [refreshSuccess, setRefreshSuccess] = useState(false)

  // Round Spoiler states
  const [collapsedCalendarRounds, setCollapsedCalendarRounds] = useState<{ [round: number]: boolean }>({})
  const [collapsedResultsRounds, setCollapsedResultsRounds] = useState<{ [round: number]: boolean }>({})
  const [matchEventsLoadedFor, setMatchEventsLoadedFor] = useState<number | null>(null)
  const championshipRequestRef = useRef(0)

  // Session tracking & User Analytics — ONE row per page view, duration updated via heartbeat
  useEffect(() => {
    if (typeof window === "undefined") return

    // Persistent session ID with 30-min idle timeout (works across PWA restarts)
    const SESSION_KEY = "ks_pwa_session_id"
    const LAST_ACTIVE_KEY = "ks_pwa_last_active"
    const now = Date.now()

    let sessionId = localStorage.getItem(SESSION_KEY)
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY)

    if (!sessionId || !lastActive || now - Number.parseInt(lastActive, 10) > 30 * 60 * 1000) {
      sessionId = "sess_" + Math.random().toString(36).substring(2, 10) + "_" + now.toString(36)
      localStorage.setItem(SESSION_KEY, sessionId)
    }
    localStorage.setItem(LAST_ACTIVE_KEY, now.toString())

    const tabStartTime = Date.now()
    const currentTab = activeTab
    let analyticsRowId: number | null = null

    // Insert ONE analytics row for this page view (returns its DB id)
    const databasePromise = loadDatabase()
    void databasePromise.then(({ recordUserAnalytics }) =>
      recordUserAnalytics(sessionId, currentTab, 1).then((id) => {
        analyticsRowId = id
      }),
    )

    // Update the SAME row's duration via heartbeat (no new rows)
    const updateDuration = () => {
      const elapsedSec = Math.round((Date.now() - tabStartTime) / 1000)
      if (analyticsRowId && elapsedSec > 1) {
        void databasePromise.then(({ updateAnalyticsDuration }) =>
          updateAnalyticsDuration(analyticsRowId as number, elapsedSec, sessionId),
        )
      }
    }

    // Periodic heartbeat every 30s to update duration on existing row
    const heartbeatInterval = setInterval(() => {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
      updateDuration()
    }, 30000)

    // Handle Mobile PWA Background / App Switch / Lock Screen events
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        updateDuration()
      } else if (document.visibilityState === "visible") {
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
      }
    }

    const handleUnload = () => {
      updateDuration()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("beforeunload", handleUnload)
    window.addEventListener("pagehide", handleUnload)

    return () => {
      updateDuration()
      clearInterval(heartbeatInterval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleUnload)
      window.removeEventListener("pagehide", handleUnload)
    }
  }, [activeTab])

  // ===== MEMOIZED COMPUTATIONS =====
  // O(1) resilient team logo lookup with trimmed and case-insensitive fallback
  const teamLogoMap = useMemo(() => {
    const map = new Map<string, string>()
    teams.forEach((t) => {
      if (t.name) {
        const logo = t.logo || "/placeholder.svg?height=32&width=32"
        map.set(t.name, logo)
        map.set(t.name.trim(), logo)
        map.set(t.name.trim().toLowerCase(), logo)
      }
    })
    return map
  }, [teams])

  const getTeamLogo = useCallback(
    (teamName: string): string => {
      if (!teamName) return "/placeholder.svg?height=32&width=32"
      return (
        teamLogoMap.get(teamName) ||
        teamLogoMap.get(teamName.trim()) ||
        teamLogoMap.get(teamName.trim().toLowerCase()) ||
        "/placeholder.svg?height=32&width=32"
      )
    },
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
    const now = new Date()

    return votings.filter((voting) => {
      const startTime = voting.start_time ? new Date(voting.start_time) : null
      const endTime = voting.end_time ? new Date(voting.end_time) : null
      const isWithinTime = (!startTime || now >= startTime) && (!endTime || now <= endTime)

      if (showArchive) {
        const visibleCandidates = candidates.filter(
          (candidate) => candidate.match_id === voting.match_id && !candidate.is_hidden
        )
        const hasVotes = visibleCandidates.reduce((sum, candidate) => sum + (candidate.votes || 0), 0) > 0
        const isCompleted = !voting.is_active || Boolean(endTime && now > endTime)

        return isCompleted && visibleCandidates.length > 0 && hasVotes
      }

      return voting.is_active && isWithinTime
    })
  }, [votings, candidates, showArchive])

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


  // Poll live voting only while the voting tab is visible.
  useEffect(() => {
    if (!currentChampionshipId || activeTab !== "lion") return

    const refreshVoting = () => {
      if (document.visibilityState === "visible") {
        void loadVotingData(currentChampionshipId)
      }
    }

    refreshVoting()
    const pollInterval = window.setInterval(refreshVoting, 15000)
    window.addEventListener("focus", refreshVoting)

    return () => {
      window.clearInterval(pollInterval)
      window.removeEventListener("focus", refreshVoting)
    }
  }, [currentChampionshipId, activeTab])

  // Mobile Pull to Refresh gesture handling
  const PULL_THRESHOLD = 70

  useEffect(() => {
    if (typeof window === "undefined") return

    let startY = 0
    let isAtTop = false

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) {
        startY = e.touches[0].clientY
        isAtTop = true
      } else {
        isAtTop = false
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop || isPullRefreshing) return
      const currentY = e.touches[0].clientY
      const deltaY = currentY - startY

      if (deltaY > 0 && window.scrollY <= 0) {
        const distance = Math.min(110, Math.pow(deltaY, 0.82) * 0.9)
        setPullDistance(distance)
        setIsPulling(true)
      } else {
        setPullDistance(0)
        setIsPulling(false)
      }
    }

    const handleTouchEnd = () => {
      if (!isAtTop || isPullRefreshing) return

      setPullDistance((currentDist) => {
        if (currentDist >= PULL_THRESHOLD) {
          triggerPullRefresh()
        } else {
          setIsPulling(false)
        }
        return 0
      })
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    window.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [isPullRefreshing, currentChampionshipId])

  const triggerPullRefresh = async () => {
    setIsPullRefreshing(true)
    setIsPulling(false)
    setRefreshSuccess(false)

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(40) } catch {}
    }

    try {
      await loadInitialData()
      if (currentChampionshipId) {
        await loadDataForChampionship(currentChampionshipId, true)
      }
      if (activeTab === "lion") await loadVotingData(currentChampionshipId)
      if (activeTab === "shop") await loadProductsData()

      setRefreshSuccess(true)
      await new Promise((res) => setTimeout(res, 800))
    } catch (err) {
      console.error("Error on pull refresh:", err)
    } finally {
      setIsPullRefreshing(false)
      setRefreshSuccess(false)
      setPullDistance(0)
    }
  }

  // Load initial data (championships list)
  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const requestedSection = params.get("section")
    const validSections = new Set(["table", "cup", "calendar", "results", "scorers", "lion", "shop", "games", "admin"])
    if (params.get("admin") === "1") setActiveTab("admin")
    else if (requestedSection && validSections.has(requestedSection)) setActiveTab(requestedSection)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    url.searchParams.set("section", activeTab)
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
  }, [activeTab])

  // Load championship-specific data when championship changes
  useEffect(() => {
    if (currentChampionshipId) {
      loadDataForChampionship(currentChampionshipId)
    }
  }, [currentChampionshipId])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const { getChampionships } = await loadDatabase()
      const championshipsData = await getChampionships()

      setChampionships(championshipsData)

      const currentStillExists = championshipsData.some((championship) => championship.id === currentChampionshipId)
      const championshipId = currentStillExists
        ? currentChampionshipId
        : championshipsData.find((championship) => championship.is_active)?.id ?? championshipsData[0]?.id

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

  const loadDataForChampionship = async (championshipId: number, silent = false) => {
    const requestId = ++championshipRequestRef.current

    try {
      if (!silent) setLoading(true)
      const { getMatches, getPlayers, getTeams } = await loadDatabase()
      const [teamsData, matchesData, playersData] = await Promise.all([
        getTeams(championshipId),
        getMatches(championshipId),
        getPlayers(championshipId),
      ])

      if (requestId !== championshipRequestRef.current) return

      const finishedMatches = matchesData.filter((match) => match.is_finished)
      setTeams(teamsData)
      setTable(buildLeagueTable(matchesData, teamsData))
      setCalendar(matchesData.filter((match) => !match.is_finished))
      setResults(finishedMatches)
      setScorers(playersData)
      setMatchGoals({})
      setMatchCards({})
      setMatchEventsLoadedFor(null)

      // Set current championship info
      const championship = championships.find((c) => c.id === championshipId)
      setCurrentChampionship(championship || null)
      if (championship?.tournament_type === "cup" && activeTab === "table") {
        setActiveTab("cup")
      } else if (championship?.tournament_type === "league" && activeTab === "cup") {
        setActiveTab("table")
      }

      if (activeTab === "results") await loadMatchEvents(finishedMatches, championshipId)
      void loadVotingData(championshipId)
    } catch (error) {
      console.error("Error loading championship data:", error)
    } finally {
      if (!silent && requestId === championshipRequestRef.current) setLoading(false)
    }
  }

  const loadMatchEvents = async (finishedMatches: Match[], championshipId: number) => {
    const finishedMatchIds = finishedMatches.map((match) => match.id)
    const goalsData: Record<number, MatchGoal[]> = Object.fromEntries(
      finishedMatchIds.map((matchId) => [matchId, []]),
    )
    const cardsData: Record<number, MatchCard[]> = Object.fromEntries(
      finishedMatchIds.map((matchId) => [matchId, []]),
    )

    if (finishedMatchIds.length > 0) {
      const { getMatchesCards, getMatchesGoals } = await loadDatabase()
      const [allGoals, allCards] = await Promise.all([
        getMatchesGoals(finishedMatchIds),
        getMatchesCards(finishedMatchIds),
      ])

      allGoals.forEach((goal) => goalsData[goal.match_id]?.push(goal))
      allCards.forEach((card) => cardsData[card.match_id]?.push(card))
    }

    setMatchGoals(goalsData)
    setMatchCards(cardsData)
    setMatchEventsLoadedFor(championshipId)
  }

  const loadVotingData = async (championshipId = currentChampionshipId) => {
    if (!championshipId) return
    try {
      const { getChampionshipVotingData } = await loadDatabase()
      const votingData = await getChampionshipVotingData(championshipId)
      setVotings(votingData.votings)
      setCandidates(votingData.candidates)
    } catch (error) {
      console.error("Error loading voting data:", error)
    }
  }

  const loadProductsData = async () => {
    try {
      const { getProducts } = await loadDatabase()
      const productsData = await getProducts()
      setProducts(productsData)
      setProductsLoaded(true)
    } catch (error) {
      console.error("Error loading shop products:", error)
    }
  }

  const handleVoteSubmit = async (matchId: number) => {
    const candidateId = selectedCandidate[matchId]
    if (!candidateId) {
      alert("Будь ласка, оберіть гравця")
      return
    }

    // 1. Optimistic UI update immediately (0ms delay, no screen freezing)
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, votes: (c.votes || 0) + 1 } : c))
    )
    setVotedMatches((prev) => [...prev, matchId])

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`ksliga_voted_${matchId}`, "true")
      }
    } catch (e) {
      console.warn("Could not write to localStorage:", e)
    }

    try {
      // 2. Perform DB write in background
      const { incrementCandidateVotes } = await loadDatabase()
      await incrementCandidateVotes(candidateId)
      // 3. Silent background refresh of latest data from server
      await loadVotingData()
    } catch (error) {
      console.error("Error submitting vote:", error)
      alert("Помилка при голосуванні: " + (error instanceof Error ? error.message : String(error)))
      // Rollback optimistic vote if DB fails
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, votes: Math.max(0, (c.votes || 0) - 1) } : c))
      )
      setVotedMatches((prev) => prev.filter((id) => id !== matchId))
    }
  }

  const handleGoalsUpdated = async () => {
    if (currentChampionshipId) {
      await loadDataForChampionship(currentChampionshipId)
    }
  }

  // Callback for AdminPanel to notify that data changed
  const handleDataChange = useCallback(async () => {
    // Reload championship-specific data silently without triggering F5 or unmounting tabs
    if (currentChampionshipId) {
      await loadDataForChampionship(currentChampionshipId, true)
    }

    try {
      const { getChampionships } = await loadDatabase()
      const championshipsData = await getChampionships()
      setChampionships(championshipsData)
      if (productsLoaded) await loadProductsData()
    } catch (error) {
      console.error("Error refreshing data after admin change:", error)
    }
  }, [currentChampionshipId, productsLoaded])

  // Heavy secondary data is fetched only when its tab is opened.
  useEffect(() => {
    if (!currentChampionshipId) return

    if (activeTab === "results" && matchEventsLoadedFor !== currentChampionshipId) {
      void loadMatchEvents(results, currentChampionshipId)
    } else if (activeTab === "lion") {
      void loadVotingData(currentChampionshipId)
    } else if (activeTab === "shop" && !productsLoaded) {
      void loadProductsData()
    }
  }, [activeTab, currentChampionshipId, matchEventsLoadedFor, productsLoaded, results])

  const applyOrganizerProfile = useCallback((profile: Organizer | null) => {
    if (!profile?.is_active) {
      setIsAdmin(false)
      setIsMainAdmin(false)
      setAllowedChampionshipIds([])
      setOrganizerName("")
      return
    }

    const mainAdmin = profile.role === "admin"
    setIsAdmin(true)
    setIsMainAdmin(mainAdmin)
    setAllowedChampionshipIds(mainAdmin ? "all" : profile.championship_ids)
    setOrganizerName(profile.name)
    setAdminEmail(profile.email)

    if (
      !mainAdmin &&
      !profile.championship_ids.includes(currentChampionshipId || 0) &&
      profile.championship_ids.length > 0
    ) {
      setCurrentChampionshipId(profile.championship_ids[0])
    }
  }, [currentChampionshipId])

  useEffect(() => {
    let active = true
    let subscription: { unsubscribe: () => void } | undefined

    void Promise.all([loadDatabase(), import("@/lib/supabase")]).then(async ([database, supabaseModule]) => {
      if (!active) return

      const hasCredentialLink = typeof window !== "undefined"
        && /(?:^|[&#])type=(?:invite|recovery)(?:&|$)/.test(window.location.hash)

      const authListener = supabaseModule.supabase.auth.onAuthStateChange((event) => {
        if (
          typeof window !== "undefined" &&
          (event === "PASSWORD_RECOVERY" || (hasCredentialLink && event === "SIGNED_IN"))
        ) {
          window.location.replace("/auth/update-password")
        }
      })
      subscription = authListener.data.subscription

      try {
        const profile = await database.getCurrentOrganizerProfile()
        if (active) applyOrganizerProfile(profile)
      } catch (error) {
        console.error("Error restoring administrator session:", error)
        if (active) applyOrganizerProfile(null)
      } finally {
        if (active) setIsAuthChecking(false)
      }
    })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [applyOrganizerProfile])

  const handleLogin = async () => {
    setLoginError(null)
    setLoginInfo(null)
    if (!adminEmail.trim() || !adminPassword) {
      setLoginError("Введіть email і пароль")
      return
    }

    try {
      const { authenticateUser, logOrganizerAction } = await loadDatabase()
      const profile = await authenticateUser(adminEmail, adminPassword)
      applyOrganizerProfile(profile)
      void logOrganizerAction(profile.name, "login", "Успішний вхід у систему адміністрування")
      setAdminPassword("")
    } catch (error) {
      console.error("Administrator login failed:", error)
      const message = error instanceof Error ? error.message : ""
      setLoginError(
        message.includes("Invalid login credentials")
          ? "Невірний email або пароль"
          : message || "Не вдалося увійти. Спробуйте ще раз.",
      )
    }
  }

  const handleForgotPassword = async () => {
    setLoginError(null)
    setLoginInfo(null)
    if (!adminEmail.trim()) {
      setLoginError("Спочатку введіть email облікового запису")
      return
    }

    try {
      const { requestPasswordReset } = await loadDatabase()
      await requestPasswordReset(adminEmail)
      setLoginInfo("Якщо цей email зареєстрований, ми надіслали посилання для зміни пароля.")
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Не вдалося надіслати лист")
    }
  }

  const handleLogout = async () => {
    try {
      const { signOutUser } = await loadDatabase()
      await signOutUser()
    } catch (error) {
      console.error("Administrator logout failed:", error)
    } finally {
      applyOrganizerProfile(null)
      setAdminPassword("")
      setLoginInfo(null)
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

  const mobileNavigation = [
    currentChampionship?.tournament_type === "cup"
      ? { id: "cup", label: "Кубок", shortLabel: "Кубок", icon: Crown }
      : { id: "table", label: "Таблиця", shortLabel: "Таблиця", icon: Trophy },
    { id: "calendar", label: "Календар", shortLabel: "Календар", icon: Calendar },
    { id: "results", label: "Результати", shortLabel: "Результ.", icon: Zap },
    { id: "scorers", label: "Бомбардири", shortLabel: "Бомбард.", icon: Target },
    { id: "lion", label: "Лев матчу", shortLabel: "Лев", icon: Vote },
    { id: "shop", label: "KS Shop", shortLabel: "Shop", icon: ShoppingBag },
    { id: "games", label: "KS Games", shortLabel: "Ігри", icon: Gamepad2 },
    { id: "admin", label: "Панель адміністратора", shortLabel: "Адмін", icon: Settings },
  ]

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
    <div className="app-shell min-h-screen bg-transparent text-slate-900 flex flex-col font-sans">
      {/* ── Mobile Pull to Refresh Animated Floating Indicator ── */}
      {(isPulling || isPullRefreshing || refreshSuccess || pullDistance > 0) && (
        <div
          className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[100] transition-all duration-200 pointer-events-none"
          style={{
            transform: `translate(-50%, ${isPullRefreshing || refreshSuccess ? 16 : Math.min(pullDistance, 75)}px)`,
            opacity: isPullRefreshing || refreshSuccess ? 1 : Math.min(1, pullDistance / 35)
          }}
        >
          <div className="glass-hero flex items-center gap-2 text-white text-xs font-bold px-4 py-2 !rounded-full">
            {refreshSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                <span className="text-emerald-300">Дані оновлено ✓</span>
              </>
            ) : isPullRefreshing ? (
              <>
                <RotateCw className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-blue-200">Оновлення даних KS LIGA...</span>
              </>
            ) : (
              <>
                <ChevronDown
                  className={`w-4 h-4 text-blue-400 transition-transform duration-150 ${
                    pullDistance >= PULL_THRESHOLD ? 'rotate-180 text-emerald-400' : ''
                  }`}
                />
                <span className={pullDistance >= PULL_THRESHOLD ? 'text-emerald-300 font-black' : 'text-slate-200'}>
                  {pullDistance >= PULL_THRESHOLD ? 'Відпустіть для оновлення' : 'Потягніть для оновлення'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <header className="app-header liquid-glass-header fixed top-0 left-0 right-0 z-50 w-full pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <div className="app-header__inner max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="brand-mark w-9 h-9 sm:w-11 sm:h-11 rounded-[12px] sm:rounded-[14px] flex items-center justify-center overflow-hidden shrink-0">
              <Image
                src="/images/ks-logo.png"
                alt="Логотип KS LIGA"
                width={44}
                height={44}
                sizes="(min-width: 640px) 44px, 36px"
                preload
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-[-0.035em] text-slate-900 leading-tight">
                KS LIGA
              </h1>
              <p className="text-[8px] sm:text-[9px] text-slate-500 font-semibold uppercase tracking-[0.15em] hidden min-[360px]:block">
                Football · Community · Passion
              </p>
            </div>
          </div>

          {/* Championship Selector */}
          {championships.length > 0 && currentChampionshipId && (
            <div className="shrink-0 max-w-[58%] sm:max-w-xs">
              <Select value={currentChampionshipId.toString()} onValueChange={handleChampionshipChange}>
                <SelectTrigger className="w-full h-10 text-xs font-semibold px-2.5 sm:px-3 shadow-none">
                  <SelectValue placeholder="Оберіть чемпіонат">
                    {(() => {
                      const active = championships.find((c) => c.id === currentChampionshipId)
                      if (!active) return "Оберіть чемпіонат"
                      return (
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="shrink-0">
                            {active.tournament_type === "league" ? (
                              <Trophy className="h-3.5 w-3.5 text-[#007AFF]" />
                            ) : (
                              <Crown className="h-3.5 w-3.5 text-[#007AFF]" />
                            )}
                          </span>
                          <span className="truncate max-w-[110px] min-[400px]:max-w-[160px] sm:max-w-[200px] font-bold text-slate-900">{active.name}</span>
                          <span className="text-slate-500 text-[10px] hidden sm:inline shrink-0">({active.season})</span>
                        </span>
                      )
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)] min-w-[220px]">
                  {sortedChampionshipsList.map((championship: Championship) => (
                    <SelectItem
                      key={championship.id}
                      value={championship.id.toString()}
                      className="text-slate-900 hover:bg-slate-100/80 focus:bg-slate-100/80 text-xs font-medium cursor-pointer rounded-lg py-2 px-2 text-left"
                    >
                      <span className="flex items-center justify-between gap-2 w-full">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="shrink-0">
                            {championship.tournament_type === "league" ? (
                              <Trophy className="h-3.5 w-3.5 text-[#007AFF]" />
                            ) : (
                              <Crown className="h-3.5 w-3.5 text-[#007AFF]" />
                            )}
                          </span>
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
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:pt-[calc(5.5rem+env(safe-area-inset-top,0px))] md:py-8 md:pt-[calc(6.5rem+env(safe-area-inset-top,0px))] pb-24 md:pb-8 space-y-6">
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
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="email"
                        autoComplete="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="Email адміністратора або організатора"
                        className="glass-input h-11 pl-10 pr-4 text-sm"
                      />
                    </div>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="password"
                        autoComplete="current-password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Пароль"
                        onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
                        className="glass-input h-11 pl-10 pr-4 text-sm"
                      />
                    </div>
                    {loginError && <p className="text-xs font-semibold text-red-600 px-1">{loginError}</p>}
                    {loginInfo && <p className="text-xs font-semibold text-emerald-700 px-1">{loginInfo}</p>}
                    <Button
                      onClick={() => void handleLogin()}
                      disabled={isAuthChecking}
                      className="w-full ios-btn-primary text-xs font-bold h-11 ios-active-scale"
                    >
                      {isAuthChecking ? "Перевірка сесії…" : "Увійти"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => void handleForgotPassword()}
                      className="mx-auto block text-xs font-bold text-blue-600 transition-colors hover:text-blue-800"
                    >
                      Забули пароль?
                    </button>
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
            {loading && championships.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-slate-500">Завантаження даних...</p>
              </div>
            ) : (
              <>
              {currentChampionship && !["shop", "games", "admin"].includes(activeTab) && (
                <SportsOverview
                  championshipName={currentChampionship.name}
                  teams={teams}
                  standings={currentChampionship.tournament_type === "league" ? table : []}
                  upcomingMatches={calendar}
                  finishedMatches={results}
                  activeVotingMatchId={votings.find((voting) => {
                    const now = new Date()
                    return voting.is_active
                      && (!voting.start_time || now >= new Date(voting.start_time))
                      && (!voting.end_time || now <= new Date(voting.end_time))
                  })?.match_id}
                />
              )}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full space-y-6"
              >
                {/* iOS Liquid Glass Segmented Tab Bar for Desktop */}
                <div className="desktop-glass-nav hidden md:flex overflow-x-auto pb-2.5 scrollbar-none justify-center">
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
                    <TabsTrigger
                      value="games"
                      className="ios-segment flex items-center justify-center relative"
                    >
                      <Gamepad2 className="h-4 w-4 text-amber-500" />
                      <span className="ml-1.5">KS Games</span>
                      <span className="ml-1 px-1.5 py-0.2 text-[8px] font-black uppercase bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 rounded-full leading-none shadow-xs">
                        New
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* League Table Tab */}
                {currentChampionship?.tournament_type === "league" && (
                  <TabsContent value="table" className="liquid-module outline-none space-y-3">
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
                      <div className="bg-white/50 backdrop-blur-2xl border border-white/70 shadow-lg shadow-black/5 rounded-3xl overflow-hidden divide-y divide-slate-200/50">
                        {/* Table Header Legend (Mobile & Desktop) */}
                        <div className="bg-white/40 backdrop-blur-md px-2.5 sm:px-4 py-2.5 border-b border-slate-200/60 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                            <span className="w-6 sm:w-8 text-center shrink-0">#</span>
                            <span className="truncate">Команда</span>
                          </div>
                          <div className="flex items-center shrink-0 text-right">
                            {/* І */}
                            <span className="w-5 sm:w-6 text-center">І</span>
                            {/* Divider spacing */}
                            <span className="w-1.5 sm:w-2.5"></span>
                            {/* В / Н / П */}
                            <span className="w-[54px] sm:w-[72px] text-center">В/Н/П</span>
                            {/* spacing */}
                            <span className="w-1.5 sm:w-4"></span>
                            {/* З:П */}
                            <span className="w-9 sm:w-14 text-center">З:П</span>
                            {/* spacing */}
                            <span className="w-1.5 sm:w-4"></span>
                            {/* О */}
                            <span className="w-6 sm:w-9 text-right text-blue-600 font-extrabold">О</span>
                          </div>
                        </div>

                        {table.map((team, index) => {
                          const position = index + 1
                          const teamRecord = teams.find((item) => item.name === team.name)
                          let posBadgeClass = "bg-slate-100 text-slate-500 font-bold border border-slate-200/60"
                          if (position === 1) {
                            posBadgeClass = "bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black shadow-xs border border-amber-400"
                          } else if (position === 2) {
                            posBadgeClass = "bg-gradient-to-tr from-slate-200 to-slate-300 text-slate-900 font-bold border border-slate-300"
                          } else if (position === 3) {
                            posBadgeClass = "bg-gradient-to-tr from-amber-600 to-amber-700 text-white font-bold border border-amber-600 shadow-xs"
                          }

                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between px-2.5 sm:px-4 py-2.5 sm:py-3 hover:bg-white/60 transition-all gap-1.5 sm:gap-2 overflow-hidden"
                            >
                              {/* Left side: Position, Logo, Team Name (Truncates cleanly without shifting stats) */}
                              <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 overflow-hidden mr-1">
                                <span
                                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-sm shrink-0 ${posBadgeClass}`}
                                >
                                  {position}
                                </span>

                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0 p-0.5">
                                  <img
                                    src={getTeamLogo(team.name) || "/placeholder.svg"}
                                    alt={`${team.name} Logo`}
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </div>

                                <div className="flex flex-col min-w-0 flex-1 justify-center overflow-hidden">
                                  {teamRecord ? (
                                    <Link
                                      href={`/teams/${teamRecord.id}`}
                                      className="font-bold text-slate-900 text-xs sm:text-sm md:text-base truncate leading-tight hover:text-blue-600"
                                      title={`Профіль ${team.name}`}
                                    >
                                      {team.name}
                                    </Link>
                                  ) : (
                                    <span className="font-bold text-slate-900 text-xs sm:text-sm md:text-base truncate leading-tight" title={team.name}>
                                      {team.name}
                                    </span>
                                  )}
                                  {team.city && (
                                    <span
                                      className="text-[9px] sm:text-xs font-medium text-slate-500 truncate leading-none mt-0.5"
                                      title={team.city}
                                    >
                                      {team.city}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Right side: Stats & Points (Locked column positions) */}
                              <div className="flex items-center shrink-0 text-right text-xs sm:text-sm font-semibold select-none">
                                {/* Games played (І) */}
                                <span className="w-5 sm:w-6 text-center font-extrabold text-slate-800 shrink-0">{team.games}</span>

                                {/* Divider */}
                                <span className="text-slate-300 mx-0.5 sm:mx-1 shrink-0">|</span>

                                {/* Record (В / Н / П) */}
                                <div className="flex items-center justify-center w-[54px] sm:w-[72px] shrink-0 text-[11px] sm:text-sm">
                                  <span className="w-3.5 sm:w-5 text-center text-emerald-600 font-bold shrink-0">{team.wins}</span>
                                  <span className="text-slate-300 shrink-0">/</span>
                                  <span className="w-3.5 sm:w-5 text-center text-amber-600 font-bold shrink-0">{team.draws}</span>
                                  <span className="text-slate-300 shrink-0">/</span>
                                  <span className="w-3.5 sm:w-5 text-center text-red-500 font-bold shrink-0">{team.losses}</span>
                                </div>

                                {/* Divider */}
                                <span className="text-slate-300 mx-0.5 sm:mx-1 shrink-0">|</span>

                                {/* Goals (З:П) */}
                                <span className="w-9 sm:w-14 text-center text-slate-600 shrink-0 text-[11px] sm:text-sm truncate">
                                  {team.gf}:{team.ga}
                                </span>

                                {/* Divider */}
                                <span className="text-slate-300 mx-0.5 sm:mx-1 shrink-0">|</span>

                                {/* Points (О) */}
                                <span className="w-6 sm:w-9 text-right font-black text-blue-600 text-xs sm:text-base shrink-0">
                                  {team.pts}
                                </span>
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
                  <TabsContent value="cup" className="liquid-module outline-none">
                    <CupTournament championshipId={currentChampionshipId} />
                  </TabsContent>
                )}

                {/* Calendar Tab */}
                <TabsContent value="calendar" className="liquid-module outline-none space-y-4">
                  {calendar.length === 0 ? (
                    <Card className="liquid-glass-card py-12 text-center">
                      <CardContent className="p-6">
                        <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <div className="text-base font-semibold text-slate-900">Немає запланованих матчів</div>
                        <div className="text-xs text-slate-500 mt-1">Всі матчі завершені або ще не додані.</div>
                      </CardContent>
                    </Card>
                  ) : (
                    calendarRounds.map((round) => {
                      const isCollapsed = collapsedCalendarRounds[round]
                      const roundMatches = calendar.filter((m) => m.round === round)
                      const roundTitle = currentChampionship?.tournament_type === "cup"
                        ? calendar.find((m) => m.round === round)?.cup_stage || `Раунд ${round}`
                        : `Тур ${round}`

                      return (
                        <div key={round} className="space-y-3">
                          {/* Round Spoiler Header */}
                          <button
                            type="button"
                            onClick={() => setCollapsedCalendarRounds((prev) => ({ ...prev, [round]: !prev[round] }))}
                            className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:bg-white transition-all cursor-pointer select-none group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-2xs shrink-0"></span>
                              <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate">
                                {roundTitle}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60 shrink-0">
                                {roundMatches.length} {roundMatches.length === 1 ? "матч" : "матчів"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-800 transition-colors text-xs font-semibold shrink-0">
                              <span className="hidden min-[400px]:inline">{isCollapsed ? "Розгорнути" : "Згорнути"}</span>
                              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </div>
                          </button>

                          {/* Matches Grid (Shown when not collapsed) */}
                          {!isCollapsed && (
                            <div className="grid gap-3 sm:grid-cols-2 glass-animate-in">
                              {roundMatches.map((match) => {
                                const statusInfo = getMatchStatusInfo(match)
                                return (
                                  <Card key={match.id} className={`liquid-glass-card overflow-hidden transition-all ${statusInfo.isLive ? "border-red-300 ring-2 ring-red-400/20 shadow-md" : ""}`}>
                                    <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 overflow-hidden">
                                      <div className="flex-1 min-w-0 space-y-2.5 sm:space-y-3">
                                        {/* Team 1 */}
                                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 overflow-hidden">
                                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0 p-0.5">
                                            <img
                                              src={getTeamLogo(match.home_team)}
                                              alt="Home Team"
                                              className="w-full h-full object-contain"
                                              loading="lazy"
                                              decoding="async"
                                            />
                                          </div>
                                          <span
                                            className="text-xs sm:text-sm font-bold text-slate-900 truncate flex-1 min-w-0"
                                            title={match.home_team}
                                          >
                                            {match.home_team}
                                          </span>
                                        </div>
                                        {/* Team 2 */}
                                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 overflow-hidden">
                                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0 p-0.5">
                                            <img
                                              src={getTeamLogo(match.away_team)}
                                              alt="Away Team"
                                              className="w-full h-full object-contain"
                                              loading="lazy"
                                              decoding="async"
                                            />
                                          </div>
                                          <span
                                            className="text-xs sm:text-sm font-bold text-slate-900 truncate flex-1 min-w-0"
                                            title={match.away_team}
                                          >
                                            {match.away_team}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Date, Time & Status */}
                                      <div className="text-right border-l border-slate-100 pl-2.5 sm:pl-4 space-y-1 shrink-0 flex flex-col items-end justify-center min-w-[70px] sm:min-w-[85px]">
                                        <span className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full border shadow-2xs ${statusInfo.badgeClass}`}>
                                          {statusInfo.badgeText}
                                        </span>
                                        <div className="text-[10px] sm:text-[11px] font-bold text-slate-800 flex items-center justify-end gap-1 pt-0.5">
                                          <Clock className="h-3 w-3 text-slate-400" />
                                          {formatTime(match.match_time) || "—"}
                                        </div>
                                        <div className="text-[9px] sm:text-[10px] font-medium text-slate-500">
                                          {new Date(match.date).toLocaleDateString("uk-UA")}
                                        </div>
                                        {match.youtube_url && (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-extrabold text-red-600 ring-1 ring-red-100">
                                            <Tv className="h-3 w-3" /> Трансляція
                                          </span>
                                        )}
                                        <Link
                                          href={`/matches/${match.id}`}
                                          className="text-[9px] font-extrabold text-blue-600 hover:text-blue-800"
                                        >
                                          Центр матчу →
                                        </Link>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </TabsContent>

                {/* Results Tab */}
                <TabsContent value="results" className="liquid-module outline-none space-y-4">
                  {results.length === 0 ? (
                    <Card className="liquid-glass-card py-12 text-center">
                      <CardContent className="p-6">
                        <Zap className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <div className="text-base font-semibold text-slate-900">Немає результатів</div>
                        <div className="text-xs text-slate-500 mt-1">Зіграні матчі з'являться в цій вкладці.</div>
                      </CardContent>
                    </Card>
                  ) : (
                    resultsRounds.map((round) => {
                      const isCollapsed = collapsedResultsRounds[round]
                      const roundMatches = results.filter((m) => m.round === round)
                      const roundTitle = currentChampionship?.tournament_type === "cup"
                        ? results.find((m) => m.round === round)?.cup_stage || `Раунд ${round}`
                        : `Тур ${round}`

                      return (
                        <div key={round} className="space-y-3">
                          {/* Round Spoiler Header */}
                          <button
                            type="button"
                            onClick={() => setCollapsedResultsRounds((prev) => ({ ...prev, [round]: !prev[round] }))}
                            className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-2xs hover:bg-white transition-all cursor-pointer select-none group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs shrink-0"></span>
                              <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate">
                                {roundTitle}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60 shrink-0">
                                {roundMatches.length} {roundMatches.length === 1 ? "матч" : "матчів"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-800 transition-colors text-xs font-semibold shrink-0">
                              <span className="hidden min-[400px]:inline">{isCollapsed ? "Розгорнути" : "Згорнути"}</span>
                              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </div>
                          </button>

                          {/* Matches Grid (Shown when not collapsed) */}
                          {!isCollapsed && (
                            <div className="grid gap-3 sm:grid-cols-2 glass-animate-in">
                              {roundMatches.map((match) => {
                              const matchGoalList = matchGoals[match.id] || []
                              const matchCardList = matchCards[match.id] || []

                              const homeGoals = matchGoalList.filter((g) => g.team_name === match.home_team)
                              const awayGoals = matchGoalList.filter((g) => g.team_name === match.away_team)

                              const homeCards = matchCardList.filter((c) => c.team_name === match.home_team)
                              const awayCards = matchCardList.filter((c) => c.team_name === match.away_team)

                              const isHomeWinner = match.is_technical_defeat
                                ? match.technical_winner === match.home_team
                                : (match.home_score !== null && match.away_score !== null && match.home_score > match.away_score) || (match.penalty_winner === match.home_team)

                              const isAwayWinner = match.is_technical_defeat
                                ? match.technical_winner === match.away_team
                                : (match.home_score !== null && match.away_score !== null && match.away_score > match.home_score) || (match.penalty_winner === match.away_team)

                              return (
                                <Card
                                  key={match.id}
                                  className="liquid-glass-card overflow-hidden transition-all duration-300 hover:border-slate-300 shadow-xs"
                                >
                                  <CardContent className="p-3.5 space-y-2.5">
                                    {/* Main Compact Result Bar */}
                                    <div className="flex items-center justify-between gap-1.5 sm:gap-2 min-w-0 overflow-hidden">
                                      {/* Home Team */}
                                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 overflow-hidden">
                                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white flex items-center justify-center shrink-0 p-0.5 transition-all ${
                                          isHomeWinner
                                            ? "border-2 border-[#007AFF] ring-2 ring-[#007AFF]/20 shadow-xs scale-105"
                                            : "border border-slate-200 shadow-2xs opacity-85"
                                        }`}>
                                          <img
                                            src={getTeamLogo(match.home_team)}
                                            alt="Home Team"
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                            decoding="async"
                                          />
                                        </div>
                                        <span
                                          className={`text-xs sm:text-sm truncate transition-colors flex items-center gap-1 flex-1 min-w-0 ${
                                            isHomeWinner
                                              ? "font-black text-[#007AFF] tracking-tight"
                                              : isAwayWinner
                                              ? "font-semibold text-slate-500 opacity-80"
                                              : "font-extrabold text-slate-900"
                                          }`}
                                          title={match.home_team}
                                        >
                                          {isHomeWinner && <Crown className="h-3.5 w-3.5 text-[#007AFF] shrink-0" />}
                                          <span className="truncate flex-1 min-w-0">{match.home_team}</span>
                                        </span>
                                      </div>

                                      {/* Highlighted Score Badge */}
                                      <div className="flex flex-col items-center shrink-0 px-1 sm:px-2">
                                        <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl bg-[#007AFF] text-white font-black text-xs sm:text-sm shadow-xs tracking-tight">
                                          {formatMatchResult(match)}
                                        </span>
                                        {formatPenaltyResult(match) && (
                                          <span className="text-[9px] text-amber-600 font-bold mt-0.5">
                                            {formatPenaltyResult(match)}
                                          </span>
                                        )}
                                      </div>

                                      {/* Away Team */}
                                      <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-1 min-w-0 overflow-hidden text-right">
                                        <span
                                          className={`text-xs sm:text-sm truncate transition-colors flex items-center justify-end gap-1 flex-1 min-w-0 ${
                                            isAwayWinner
                                              ? "font-black text-[#007AFF] tracking-tight"
                                              : isHomeWinner
                                              ? "font-semibold text-slate-500 opacity-80"
                                              : "font-extrabold text-slate-900"
                                          }`}
                                          title={match.away_team}
                                        >
                                          <span className="truncate flex-1 min-w-0">{match.away_team}</span>
                                          {isAwayWinner && <Crown className="h-3.5 w-3.5 text-[#007AFF] shrink-0" />}
                                        </span>
                                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white flex items-center justify-center shrink-0 p-0.5 transition-all ${
                                          isAwayWinner
                                            ? "border-2 border-[#007AFF] ring-2 ring-[#007AFF]/20 shadow-xs scale-105"
                                            : "border border-slate-200 shadow-2xs opacity-85"
                                        }`}>
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
                                      <div className="flex items-center gap-2">
                                        {match.youtube_url && (
                                          <a
                                            href={match.youtube_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(event) => event.stopPropagation()}
                                            aria-label={`Відкрити запис матчу ${match.home_team} — ${match.away_team} на YouTube`}
                                            className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-extrabold text-red-600 ring-1 ring-red-100 transition-colors hover:bg-red-100 hover:text-red-700"
                                          >
                                            <Tv className="h-3 w-3" /> Запис
                                          </a>
                                        )}
                                        <Link href={`/matches/${match.id}`} className="text-[10px] font-extrabold text-blue-600 hover:text-blue-800">
                                          Протокол
                                        </Link>
                                        <button
                                          type="button"
                                          onClick={() => setExpandedMatchId(expandedMatchId === match.id ? null : match.id)}
                                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                                        >
                                          <span>{expandedMatchId === match.id ? "Сховати" : "Швидко"}</span>
                                          {expandedMatchId === match.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                        </button>
                                      </div>
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
                                            <Target className="h-3.5 w-3.5 text-[#007AFF]" />
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
                                                    <span className="text-[9px] text-[#007AFF] font-extrabold shrink-0">{g.minute ? `${g.minute}'` : "'"}</span>
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
                                                    <span className="text-[9px] text-[#007AFF] font-extrabold shrink-0">{g.minute ? `${g.minute}'` : "'"}</span>
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
                      )}
                    </div>
                  )
                })
              )}
            </TabsContent>

                {/* Scorers Tab */}
                <TabsContent value="scorers" className="liquid-module outline-none space-y-2">
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
                                    <Link href={`/players/${scorer.id}`} className="block text-sm font-bold text-slate-900 truncate hover:text-blue-600">
                                      {scorer.name}
                                    </Link>
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
                <TabsContent value="lion" className="liquid-module outline-none space-y-6">
                  {/* Hero Glass Banner for Lion of the Match */}
                  <div className="relative overflow-hidden rounded-3xl bg-white/60 backdrop-blur-2xl border border-slate-200/80 p-4 sm:p-6 shadow-sm">
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-[#007AFF]/10 border border-[#007AFF]/20 text-[#007AFF] shrink-0 flex items-center justify-center">
                          <Award className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Лев Матчу</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20">
                              Голосування
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">
                            Обирай MVP матчу серед номінантів. Твій голос визначає переможця!
                          </p>
                        </div>
                      </div>

                      {/* Apple Segmented Archive Control */}
                      {votings.length > 0 && (
                        <div className="w-full sm:w-auto flex justify-end shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowArchive(!showArchive)}
                            className={`w-full sm:w-auto flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-xs border select-none active:scale-[0.97] ${
                              showArchive
                                ? "bg-slate-900 text-white border-slate-800 shadow-md"
                                : "bg-white/80 backdrop-blur-md text-slate-700 border-slate-200/80 hover:bg-white"
                            }`}
                          >
                            <Sparkles className="h-3.5 w-3.5 text-[#007AFF]" />
                            <span>{showArchive ? "Показати активні" : "Архів голосувань"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {filteredVotings.length === 0 ? (
                    <Card className="liquid-glass-card py-12 text-center">
                      <CardContent className="p-6">
                        <Crown className="h-12 w-12 mx-auto mb-3 text-amber-400" />
                        <div className="text-base font-bold text-slate-900">
                          {showArchive ? "Завершених голосувань ще немає" : "Немає активних голосувань"}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          {showArchive
                            ? "Тут з’являться завершені голосування, у яких є кандидати та зараховані голоси."
                            : "Увімкніть архів, щоб переглянути результати минулих матчів."}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredVotings.map((voting) => {
                      const match = allMatches.find((m) => m.id === voting.match_id)
                      if (!match) return null
                      const matchCandidates = candidates
                        .filter((c) => c.match_id === voting.match_id && !c.is_hidden)
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
                        <Card key={voting.match_id} className="liquid-glass-card overflow-hidden border border-slate-200/80 shadow-md">
                          {/* Match Header Bar */}
                          <div className="border-b border-slate-200/60 p-4 sm:p-5 bg-white/40 backdrop-blur-md flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-500 tracking-wide uppercase flex items-center gap-1.5">
                                <Award className="h-3.5 w-3.5 text-amber-500" />
                                {currentChampionship?.tournament_type === "cup"
                                  ? match.cup_stage || `Раунд ${match.round}`
                                  : `Тур ${match.round}`}
                              </span>
                              <Badge
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-2xs ${
                                  isActive && isWithinTime
                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive && isWithinTime ? "bg-emerald-500" : "bg-slate-400"}`} />
                                {isActive && isWithinTime ? "Голосування відкрите" : "Голосування закрите"}
                              </Badge>
                            </div>

                            {/* Teams Row */}
                            <div className="flex items-center justify-between bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 shadow-2xs">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 p-0.5 shrink-0 flex items-center justify-center shadow-2xs">
                                  <img src={getTeamLogo(match.home_team)} alt="" className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">{match.home_team}</span>
                              </div>

                              <div className="px-3 py-1 bg-slate-900 text-white text-xs font-black rounded-xl shadow-xs shrink-0 mx-2">
                                {match.is_finished ? `${match.home_score} : ${match.away_score}` : "VS"}
                              </div>

                              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">{match.away_team}</span>
                                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 p-0.5 shrink-0 flex items-center justify-center shadow-2xs">
                                  <img src={getTeamLogo(match.away_team)} alt="" className="w-full h-full object-contain" loading="lazy" decoding="async" />
                                </div>
                              </div>
                            </div>

                            {/* Time info */}
                            {(startTime || endTime) && (
                              <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
                                <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                                {startTime && <span>Початок: {startTime.toLocaleString("uk-UA")}</span>}
                                {endTime && <span>Закриття: {endTime.toLocaleString("uk-UA")}</span>}
                              </div>
                            )}
                          </div>

                          <CardContent className="p-4 sm:p-6">
                            {matchCandidates.length === 0 ? (
                              <div className="text-center py-8">
                                <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                <div className="text-sm font-semibold text-slate-500">Кандидатів ще не додано</div>
                              </div>
                            ) : canVote ? (
                              /* Active Voting UI */
                              <div className="space-y-5">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                    <Vote className="h-4 w-4 text-[#007AFF]" />
                                    <span>Оберіть вашого номінанта:</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400">Торкніться для вибору</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {/* Home Team Candidates */}
                                  <div className="space-y-2.5">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 pb-2 border-b border-slate-100">
                                      <img src={getTeamLogo(match.home_team)} alt="" className="w-4 h-4 object-contain" loading="lazy" decoding="async" />
                                      <span>{match.home_team} (Господарі)</span>
                                    </div>
                                    {matchCandidates.filter((c) => c.team_name === match.home_team).length === 0 ? (
                                      <div className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-2xl bg-white/40">Гравців не додано</div>
                                    ) : (
                                      <div className="flex flex-col gap-2">
                                        {matchCandidates
                                          .filter((c) => c.team_name === match.home_team)
                                          .map((candidate) => {
                                            const isSelected = selectedCandidate[voting.match_id] === candidate.id
                                            return (
                                              <button
                                                type="button"
                                                key={candidate.id}
                                                onClick={() => setSelectedCandidate((prev) => ({ ...prev, [voting.match_id]: candidate.id }))}
                                                className={`relative w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
                                                  isSelected
                                                    ? "bg-[#007AFF] text-white border-[#007AFF] shadow-md shadow-[#007AFF]/20"
                                                    : "bg-white/80 backdrop-blur-md border-slate-200/90 text-slate-900 hover:border-[#007AFF]/50 hover:bg-white shadow-2xs"
                                                }`}
                                              >
                                                <div className="flex items-center justify-between gap-3">
                                                  <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"
                                                    }`}>
                                                      <User className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                      <div className="font-extrabold text-xs sm:text-sm truncate">{candidate.player_name}</div>
                                                      <div className={`text-[10px] font-medium truncate ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                                                        {candidate.team_name}
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-transform ${
                                                    isSelected ? "bg-white border-white text-[#007AFF] scale-110 shadow-xs" : "border-slate-300 bg-white"
                                                  }`}>
                                                    {isSelected && <CheckCircle2 className="h-4 w-4 fill-[#007AFF] text-white" />}
                                                  </div>
                                                </div>
                                              </button>
                                            )
                                          })}
                                      </div>
                                    )}
                                  </div>

                                  {/* Away Team Candidates */}
                                  <div className="space-y-2.5">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 pb-2 border-b border-slate-100">
                                      <img src={getTeamLogo(match.away_team)} alt="" className="w-4 h-4 object-contain" loading="lazy" decoding="async" />
                                      <span>{match.away_team} (Гості)</span>
                                    </div>
                                    {matchCandidates.filter((c) => c.team_name === match.away_team).length === 0 ? (
                                      <div className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-2xl bg-white/40">Гравців не додано</div>
                                    ) : (
                                      <div className="flex flex-col gap-2">
                                        {matchCandidates
                                          .filter((c) => c.team_name === match.away_team)
                                          .map((candidate) => {
                                            const isSelected = selectedCandidate[voting.match_id] === candidate.id
                                            return (
                                              <button
                                                type="button"
                                                key={candidate.id}
                                                onClick={() => setSelectedCandidate((prev) => ({ ...prev, [voting.match_id]: candidate.id }))}
                                                className={`relative w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
                                                  isSelected
                                                    ? "bg-[#007AFF] text-white border-[#007AFF] shadow-md shadow-[#007AFF]/20"
                                                    : "bg-white/80 backdrop-blur-md border-slate-200/90 text-slate-900 hover:border-[#007AFF]/50 hover:bg-white shadow-2xs"
                                                }`}
                                              >
                                                <div className="flex items-center justify-between gap-3">
                                                  <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"
                                                    }`}>
                                                      <User className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                      <div className="font-extrabold text-xs sm:text-sm truncate">{candidate.player_name}</div>
                                                      <div className={`text-[10px] font-medium truncate ${isSelected ? "text-blue-100" : "text-slate-500"}`}>
                                                        {candidate.team_name}
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-transform ${
                                                    isSelected ? "bg-white border-white text-[#007AFF] scale-110 shadow-xs" : "border-slate-300 bg-white"
                                                  }`}>
                                                    {isSelected && <CheckCircle2 className="h-4 w-4 fill-[#007AFF] text-white" />}
                                                  </div>
                                                </div>
                                              </button>
                                            )
                                          })}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Mobile Action Button */}
                                <Button
                                  type="button"
                                  onClick={() => handleVoteSubmit(voting.match_id)}
                                  disabled={!selectedCandidate[voting.match_id] || loading}
                                  className={`w-full h-12 rounded-2xl text-xs sm:text-sm font-extrabold shadow-md transition-all active:scale-[0.98] ${
                                    selectedCandidate[voting.match_id]
                                      ? "bg-[#007AFF] hover:bg-[#0062cc] text-white shadow-md shadow-[#007AFF]/25 cursor-pointer"
                                      : "bg-slate-200 text-slate-400 border border-slate-300/50 cursor-not-allowed opacity-70"
                                  }`}
                                >
                                  <Vote className="h-4 w-4 mr-2" />
                                  {selectedCandidate[voting.match_id] ? "ПІДТВЕРДИТИ ГОЛОС" : "ОБЕРІТЬ ГРАВЦЯ ДЛЯ ГОЛОСУВАННЯ"}
                                </Button>
                              </div>
                            ) : (
                              /* Results UI (closed or already voted) */
                              <div className="space-y-4">
                                {hasVoted && (
                                  <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-800 text-xs font-bold backdrop-blur-md shadow-2xs">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                                    <span>Дякуємо! Ваш голос успішно зараховано в загальну статистику.</span>
                                  </div>
                                )}

                                {matchCandidates.length > 0 && (
                                  <div className="space-y-3">
                                    {/* 1st Place - Winner */}
                                    {matchCandidates.slice(0, 1).map((candidate) => {
                                      const percentage = totalVotes > 0 ? ((candidate.votes / totalVotes) * 100).toFixed(1) : "0"
                                      return (
                                        <div
                                          key={candidate.id}
                                          className="relative overflow-hidden p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/90 shadow-sm space-y-3"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                              <div className="w-8 h-8 rounded-xl bg-[#007AFF] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                                                1
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-[10px] font-black uppercase tracking-wider text-[#007AFF] flex items-center gap-1">
                                                  <Award className="h-3 w-3 text-[#007AFF]" /> ЛЕВ МАТЧУ — 1 МІСЦЕ
                                                </div>
                                                <div className="text-sm font-black text-slate-900 truncate">{candidate.player_name}</div>
                                                <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5 mt-0.5 truncate">
                                                  <img src={getTeamLogo(candidate.team_name)} alt="" className="w-3.5 h-3.5 object-contain" loading="lazy" decoding="async" />
                                                  {candidate.team_name}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                              <div className="text-base font-black text-slate-900">{percentage}%</div>
                                              <div className="text-[10px] font-bold text-slate-500">{candidate.votes} голосів</div>
                                            </div>
                                          </div>

                                          {/* Blue Progress Bar */}
                                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden p-0.5 border border-slate-200/60">
                                            <div
                                              className="h-full rounded-full bg-[#007AFF] transition-all duration-700"
                                              style={{ width: `${percentage}%` }}
                                            />
                                          </div>
                                        </div>
                                      )
                                    })}

                                    {/* 2nd & 3rd Place */}
                                    {matchCandidates.slice(1, 3).map((candidate, index) => {
                                      const percentage = totalVotes > 0 ? ((candidate.votes / totalVotes) * 100).toFixed(1) : "0"

                                      return (
                                        <div key={candidate.id} className="p-3.5 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/70 shadow-2xs space-y-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                              <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                                                {index + 2}
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{candidate.player_name}</div>
                                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                                  <img src={getTeamLogo(candidate.team_name)} alt="" className="w-3 h-3 object-contain" loading="lazy" decoding="async" />
                                                  {candidate.team_name}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                              <div className="text-xs font-bold text-slate-900">{percentage}%</div>
                                              <div className="text-[10px] text-slate-400">{candidate.votes} гол.</div>
                                            </div>
                                          </div>

                                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div
                                              className="h-full rounded-full bg-slate-400 transition-all duration-500"
                                              style={{ width: `${percentage}%` }}
                                            />
                                          </div>
                                        </div>
                                      )
                                    })}

                                    {/* Rest of candidates */}
                                    {matchCandidates.length > 3 && (
                                      <details className="group border border-slate-200/80 rounded-2xl overflow-hidden bg-white/60 backdrop-blur-md shadow-2xs">
                                        <summary className="min-h-12 px-4 py-3 flex items-center justify-between gap-3 cursor-pointer list-none select-none text-xs font-bold text-slate-700 hover:bg-white/80 transition-colors [&::-webkit-details-marker]:hidden">
                                          <span className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-[#007AFF]" />
                                            <span className="group-open:hidden">Показати всіх кандидатів</span>
                                            <span className="hidden group-open:inline">Сховати список кандидатів</span>
                                          </span>
                                          <span className="flex items-center gap-2 shrink-0">
                                            <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] text-slate-500">
                                              Ще {matchCandidates.length - 3}
                                            </span>
                                            <ChevronDown className="h-4 w-4 text-slate-500 transition-transform duration-200 group-open:rotate-180" />
                                          </span>
                                        </summary>

                                        <div className="divide-y divide-slate-100 border-t border-slate-200/80">
                                          {matchCandidates.slice(3).map((candidate, index) => {
                                            const percentage = totalVotes > 0 ? ((candidate.votes / totalVotes) * 100).toFixed(1) : "0"
                                            return (
                                              <div key={candidate.id} className="p-3 flex items-center justify-between hover:bg-white/80 transition-colors">
                                                <div className="flex items-center gap-3 min-w-0">
                                                  <span className="text-xs text-slate-400 font-extrabold w-5 text-center shrink-0">{index + 4}</span>
                                                  <div className="min-w-0">
                                                    <div className="text-xs font-bold text-slate-800 truncate">{candidate.player_name}</div>
                                                    <div className="text-[10px] text-slate-400 truncate">{candidate.team_name}</div>
                                                  </div>
                                                </div>
                                                <div className="text-xs text-slate-600 font-bold shrink-0">{percentage}% <span className="text-[10px] font-normal text-slate-400">({candidate.votes})</span></div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </details>
                                    )}

                                    {totalVotes > 0 && (
                                      <div className="text-center text-[11px] font-semibold text-slate-400 mt-3 flex items-center justify-center gap-1.5">
                                        <Users className="h-3.5 w-3.5 text-slate-400" />
                                        <span>Всього в голосуванні взяли участь: <strong className="text-slate-700">{totalVotes}</strong> вболівальників</span>
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
                <TabsContent value="shop" className="liquid-module outline-none space-y-6">
                  {/* Shop Banner / Header */}
                  <div className="glass-hero rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 space-y-3 max-w-3xl">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold tracking-wide backdrop-blur-md">
                        <ShoppingBag className="h-4 w-4 text-blue-400" />
                        <span>KS FAN SHOP & ОГОЛОШЕННЯ</span>
                      </div>
                      <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                        {shopSubTab === "official" ? "Офіційний онлайн-магазин KS LIGA" : "Оголошення від організаторів"}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                        {shopSubTab === "official" ? (
                          <>
                            Фірмова фан-атрибутика. Швидке замовлення в один клік через Instagram{" "}
                            <a
                              href="https://www.instagram.com/ks_fan.shop/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-300 hover:text-cyan-200 font-bold underline decoration-cyan-300/40 underline-offset-2 transition-colors"
                            >
                              @ks_fan.shop
                            </a>
                            .
                          </>
                        ) : (
                          "Майданчик оголошень про продаж та обмін футбольного екіпірування від офіційних організаторів та команд."
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Navigation, Search & Filters Bar */}
                  <div className="glass-control-bar p-3 sm:p-4 !rounded-[22px] space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
                    {/* Sub-tabs Switcher */}
                    {(() => {
                      const officialCount = products.filter((p) => p.is_official !== false && p.is_approved !== false).length
                      const announcementCount = products.filter((p) => p.is_official === false && p.is_approved === true).length

                      return (
                        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => setShopSubTab("official")}
                            className={`flex-1 sm:flex-initial py-2 px-3.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              shopSubTab === "official"
                                ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <span>Офіційний магазин</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${shopSubTab === "official" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>
                              {officialCount}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShopSubTab("announcements")}
                            className={`flex-1 sm:flex-initial py-2 px-3.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              shopSubTab === "announcements"
                                ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <span>Оголошення</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${shopSubTab === "announcements" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>
                              {announcementCount}
                            </span>
                          </button>
                        </div>
                      )
                    })()}

                    {/* Search & Filter Inputs */}
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-1 sm:max-w-md">
                      {/* Search Bar */}
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="text"
                          placeholder="Пошук товарів..."
                          value={shopSearchQuery}
                          onChange={(e) => setShopSearchQuery(e.target.value)}
                          className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-slate-50 border-slate-200 rounded-xl focus:bg-white transition-colors"
                        />
                        {shopSearchQuery && (
                          <button
                            onClick={() => setShopSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Quick Filter Pill */}
                      <button
                        onClick={() => {
                          setShopAvailabilityFilter(prev => prev === "all" ? "available" : prev === "available" ? "discount" : "all")
                        }}
                        className={`h-9 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          shopAvailabilityFilter !== "all"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <Filter className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">
                          {shopAvailabilityFilter === "all" ? "Всі" : shopAvailabilityFilter === "available" ? "В наявності" : "Знижки"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Products Grid */}
                  {(() => {
                    let displayedProducts = products.filter((p) => {
                      if (shopSubTab === "official") {
                        return p.is_official !== false && p.is_approved !== false
                      } else {
                        return p.is_official === false && p.is_approved === true
                      }
                    })

                    // Apply Search Filter
                    if (shopSearchQuery.trim()) {
                      const q = shopSearchQuery.toLowerCase()
                      displayedProducts = displayedProducts.filter(
                        (p) => p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
                      )
                    }

                    // Apply Availability / Discount Filter
                    if (shopAvailabilityFilter === "available") {
                      displayedProducts = displayedProducts.filter((p) => p.is_available)
                    } else if (shopAvailabilityFilter === "discount") {
                      displayedProducts = displayedProducts.filter((p) => p.old_price && p.old_price > p.price)
                    }

                    if (displayedProducts.length === 0) {
                      return (
                        <Card className="liquid-glass-card overflow-hidden">
                          <CardContent className="p-10 sm:p-14 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                              <ShoppingBag className="h-6 w-6" />
                            </div>
                            <div className="text-base font-bold text-slate-900">
                              {shopSearchQuery
                                ? `За запитом "${shopSearchQuery}" нічого не знайдено`
                                : shopSubTab === "official"
                                ? "Наразі немає добавлених товарів в офіційному магазині"
                                : "Наразі немає опублікованих оголошень"}
                            </div>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                              {shopSearchQuery
                                ? "Спробуйте змінити пошуковий запит або скинути фільтри."
                                : shopSubTab === "official"
                                ? "Завітайте пізніше або зверніться до адміністратора."
                                : "Організатори можуть додати нові оголошення через панель керування."}
                            </p>
                            {shopSearchQuery && (
                              <button
                                onClick={() => setShopSearchQuery("")}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 underline pt-1 cursor-pointer"
                              >
                                Скинути пошук
                              </button>
                            )}
                          </CardContent>
                        </Card>
                      )
                    }

                    return (
                      <>
                        {/* ── Products Grid with Instagram/Tinder Smooth Swiping Cards ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                          {displayedProducts.map((product) => (
                            <ShopProductCard
                              key={product.id}
                              product={product}
                              currentImageIndex={shopImageIndexes[product.id] || 0}
                              onImageIndexChange={(idx) =>
                                setShopImageIndexes((prev) => ({ ...prev, [product.id]: idx }))
                              }
                              onOpenLightbox={(prod, idx) => {
                                setLightboxProduct(prod)
                                setLightboxImageIndex(idx)
                              }}
                            />
                          ))}
                        </div>

                        {/* ── Full-Screen Instagram / Tinder Lightbox ── */}
                        <ShopLightbox
                          product={lightboxProduct}
                          initialIndex={lightboxImageIndex}
                          onClose={() => setLightboxProduct(null)}
                        />
                      </>
                    )
                })()}
                </TabsContent>

                {/* KS Games Tab */}
                <TabsContent value="games" className="liquid-module outline-none space-y-4 w-full flex flex-col items-center">
                  <KsGamesHub teams={teams} />
                </TabsContent>

                {/* Admin Tab */}
                <TabsContent value="admin" className="liquid-module outline-none">
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
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              type="email"
                              autoComplete="email"
                              value={adminEmail}
                              onChange={(e) => setAdminEmail(e.target.value)}
                              placeholder="Email"
                              className="glass-input h-11 pl-10 pr-4 text-sm"
                            />
                          </div>
                          <div className="relative">
                            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              type="password"
                              autoComplete="current-password"
                              value={adminPassword}
                              onChange={(e) => setAdminPassword(e.target.value)}
                              placeholder="Пароль"
                              onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
                              className="glass-input h-11 pl-10 pr-4 text-sm"
                            />
                          </div>
                          {loginError && <p className="text-xs font-semibold text-red-600 text-center px-1">{loginError}</p>}
                          {loginInfo && <p className="text-xs font-semibold text-emerald-700 text-center px-1">{loginInfo}</p>}
                          <Button
                            onClick={() => void handleLogin()}
                            disabled={isAuthChecking}
                            className="w-full ios-btn-primary text-sm font-bold h-11 ios-active-scale"
                          >
                            {isAuthChecking ? "Перевірка сесії…" : "Увійти"}
                          </Button>
                          <button
                            type="button"
                            onClick={() => void handleForgotPassword()}
                            className="mx-auto block text-xs font-bold text-blue-600 transition-colors hover:text-blue-800"
                          >
                            Забули пароль?
                          </button>
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
              </>
            )}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="app-footer liquid-glass-header mt-16 py-8 text-xs text-slate-500 font-medium">
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

      {/* Mobile navigation: all destinations remain visible without an overflow menu. */}
      {championships.length > 0 && (
        <nav className="mobile-glass-nav md:hidden" aria-label="Основна навігація">
          <div className="mobile-nav-grid mx-auto max-w-md">
            {mobileNavigation.map(({ id, label, shortLabel, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id)
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }}
                className={`mobile-nav-button ${activeTab === id ? "is-active" : ""}`}
                aria-label={label}
                aria-current={activeTab === id ? "page" : undefined}
              >
                <Icon />
                <span>{shortLabel}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
