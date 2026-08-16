"use client"

import { useState, useEffect, useRef } from "react"
import {
  ProCareer,
  ProClub,
  ProLeague,
  ProMatchResult,
  ProStoryEvent,
  ProStoryChoice
} from "@/lib/pro-types"
import {
  proGetStoredUser,
  proGetCareerByUserId,
  proCreateCareer,
  proUpdateCareer,
  proSaveMatch,
  proGetClubs,
  proGetLeagues,
  proRegister,
  proLogout
} from "@/lib/pro-database"
import { generateStoryEvent } from "@/lib/pro-engine"
import { proAudio } from "@/lib/pro-audio"
import { ProLockScreen } from "./pro-lock-screen"
import { ProCreation } from "./pro-creation"
import { ProMatch } from "./pro-match"
import { ProTraining } from "./pro-training"
import { ProLifestyle } from "./pro-lifestyle"
import { ProTransfers } from "./pro-transfers"
import { ProProfile } from "./pro-profile"
import { ProLeagueStandings } from "./pro-league"
import { ProStoryModal } from "./pro-story-modal"
import { ProCard } from "./pro-card"
import {
  Shield,
  LayoutDashboard,
  Play,
  Dumbbell,
  ShoppingBag,
  History,
  Trophy,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Lock,
  LogOut,
  Sparkles,
  Zap,
  Flame,
  Star,
  ArrowRight,
  Wallet,
  Coins
} from "lucide-react"

interface ProHubProps {
  playerName?: string
}

export function ProHub({ playerName = "" }: ProHubProps) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [career, setCareer] = useState<ProCareer | null>(null)
  const [clubs, setClubs] = useState<ProClub[]>([])
  const [leagues, setLeagues] = useState<ProLeague[]>([])

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "match" | "training" | "lifestyle" | "transfers" | "profile" | "league"
  >("dashboard")

  const [activeStoryEvent, setActiveStoryEvent] = useState<ProStoryEvent | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. Check Passcode Lock on Mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const unlocked =
        sessionStorage.getItem("ks_fm_unlocked") === "true" ||
        localStorage.getItem("ks_fm_unlocked") === "true"
      setIsUnlocked(unlocked)
    }
  }, [])

  // 2. Fullscreen Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // 3. Load Data
  useEffect(() => {
    async function initData() {
      setLoading(true)
      try {
        const [allClubs, allLeagues] = await Promise.all([
          proGetClubs(),
          proGetLeagues()
        ])
        setClubs(allClubs)
        setLeagues(allLeagues)

        const gamerName = playerName.trim() || "Гравець"
        let user = proGetStoredUser()
        if (!user || (playerName && user.username !== gamerName)) {
          user = await proRegister(gamerName, `${gamerName.toLowerCase().replace(/\s+/g, "_")}@ksliga.com`)
        }
        setCurrentUser(user)

        if (user) {
          const userCareer = await proGetCareerByUserId(user.id)
          if (userCareer) {
            setCareer(userCareer)
            // Trigger debut story event if 0 matches
            if (userCareer.career_stats.total_matches === 0) {
              const debutEvent = generateStoryEvent(userCareer)
              if (debutEvent) setActiveStoryEvent(debutEvent)
            }
          }
        }
      } catch (err) {
        console.error("Init data error:", err)
      } finally {
        setLoading(false)
      }
    }

    initData()
  }, [playerName])

  const handleSoundToggle = () => {
    const next = proAudio.toggleMute()
    setIsMuted(next)
    if (!next) proAudio.playClick()
  }

  const toggleFullScreen = async () => {
    proAudio.playClick()
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen()
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle fallback:", err)
      setIsFullScreen(!isFullScreen)
    }
  }

  const handleLockGame = () => {
    proAudio.playClick()
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ks_fm_unlocked")
      localStorage.removeItem("ks_fm_unlocked")
    }
    setIsUnlocked(false)
  }

  const handleLogout = () => {
    proAudio.playClick()
    handleLockGame()
    proLogout()
    setCurrentUser(null)
    setCareer(null)
  }

  const handleCreateCareer = async (careerData: Partial<ProCareer>) => {
    if (!currentUser) return
    setLoading(true)
    try {
      const newCareer = await proCreateCareer(currentUser.id, careerData)
      setCareer(newCareer)
      const debutEvent = generateStoryEvent(newCareer)
      if (debutEvent) setActiveStoryEvent(debutEvent)
    } catch (err) {
      console.error("Create career error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleFinishMatch = async (result: ProMatchResult) => {
    if (!career) return
    const updatedCareer = await proSaveMatch(career, result)
    setCareer(updatedCareer)
    setActiveTab("dashboard")

    // Check for story event
    const nextEvent = generateStoryEvent(updatedCareer, result)
    if (nextEvent) {
      setActiveStoryEvent(nextEvent)
    }
  }

  const handleResolveStoryChoice = async (choice: ProStoryChoice) => {
    if (!career) return
    const updatedCareer: ProCareer = {
      ...career,
      morale: Math.min(100, career.morale + (choice.morale_delta || 0)),
      form: Math.min(100, career.form + (choice.form_delta || 0)),
      reputation: career.reputation + (choice.rep_delta || 0),
      bank_balance: (career.bank_balance || 0) + (choice.money_delta || 0)
    }
    await proUpdateCareer(updatedCareer)
    setCareer(updatedCareer)
    setActiveStoryEvent(null)
  }

  const handleAcceptTransfer = async (
    newClub: ProClub,
    wage: number,
    signingBonus: number = 0
  ) => {
    if (!career) return
    const updatedHistory = [
      ...career.clubs_history,
      {
        club_id: newClub.id,
        club_name: newClub.name,
        city: newClub.city,
        tier: newClub.tier,
        from_year: 2026 + career.current_season_number - 1,
        seasons_count: 1,
        matches: 0,
        goals: 0,
        assists: 0
      }
    ]

    const updatedCareer: ProCareer = {
      ...career,
      current_club_id: newClub.id,
      wage_per_week: wage,
      bank_balance: (career.bank_balance || 0) + signingBonus,
      clubs_history: updatedHistory,
      reputation: career.reputation + 40
    }

    await proUpdateCareer(updatedCareer)
    setCareer(updatedCareer)
  }

  // 1. Password Lock Guard
  if (!isUnlocked) {
    return <ProLockScreen onUnlock={() => setIsUnlocked(true)} />
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4 text-emerald-400">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold tracking-wide text-slate-300">
          Завантаження карʼєри «Від Села до УПЛ»...
        </p>
      </div>
    )
  }

  // 2. Character Creation Wizard if no career exists
  if (!career) {
    return (
      <ProCreation
        clubs={clubs}
        onComplete={handleCreateCareer}
      />
    )
  }

  const currentClub =
    clubs.find((c) => c.id === career.current_club_id) || clubs[0] || {
      id: 1,
      name: "ФК Тучапи",
      city: "Тучапи",
      tier: 1,
      primary_color: "#166534",
      secondary_color: "#FACC15",
      stadium_name: "Стадіон «Колос»"
    }

  // Generate Next Opponent in same tier
  const tierOpponents = clubs.filter(
    (c) => c.tier === currentClub.tier && c.id !== currentClub.id
  )
  const nextOpponent =
    tierOpponents[(career.current_fixture_round - 1) % (tierOpponents.length || 1)] ||
    clubs[1] ||
    currentClub

  const navItems = [
    { id: "dashboard", label: "Головна", icon: LayoutDashboard },
    { id: "match", label: "Наступний Матч", icon: Play, badge: "LIVE" },
    { id: "training", label: "Тренування & СПА", icon: Dumbbell },
    { id: "lifestyle", label: "Магазин & Життя", icon: ShoppingBag },
    { id: "transfers", label: "Трансфери", icon: Sparkles },
    { id: "profile", label: "Хроніка Карʼєри", icon: History },
    { id: "league", label: "Таблиця Ліги", icon: Trophy }
  ]

  return (
    <div
      ref={containerRef}
      className={`w-full transition-all duration-300 ${
        isFullScreen
          ? "fixed inset-0 z-[100] bg-slate-950 overflow-y-auto p-4 sm:p-6"
          : "space-y-6"
      }`}
    >
      {/* ─── FLOATING TOP MASTER HUD ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/30 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Player & Club Identity */}
          <div className="flex items-center gap-3.5">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg border-2 border-emerald-400/40"
              style={{
                background: `linear-gradient(135deg, ${currentClub.primary_color}, ${currentClub.secondary_color})`
              }}
            >
              <Shield className="w-7 h-7 text-white drop-shadow-md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow">
                  {career.first_name} {career.last_name}
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-amber-400 text-slate-950 font-mono">
                  {career.overall_rating} OVR
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {career.position}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Клуб: <span className="text-slate-200 font-bold">{currentClub.name}</span> ({currentClub.city}) • {career.age} років
              </p>
            </div>
          </div>

          {/* Player Live Status Badges & HUD Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 ml-auto flex-wrap">
            {/* Bank Balance Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs shadow-inner">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Баланс:</span>
              <strong className="text-emerald-300 font-mono font-black">
                {(career.bank_balance || 0).toLocaleString()} ₴
              </strong>
            </div>

            {/* Form */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400">Форма:</span>
              <strong className="text-emerald-300 font-mono">{career.form}%</strong>
            </div>

            {/* Energy */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Енергія:</span>
              <strong className="text-amber-300 font-mono">{career.energy}%</strong>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={handleSoundToggle}
              title={isMuted ? "Увімкнути звук" : "Вимкнути звук"}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 transition-colors shadow-md cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Lock Game Screen */}
            <button
              onClick={handleLockGame}
              title="Заблокувати гру"
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-amber-400 transition-colors shadow-md cursor-pointer"
            >
              <Lock className="w-5 h-5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullScreen}
              title={isFullScreen ? "Вийти з повного екрану (Esc)" : "Повноекранний режим"}
              className={`p-2.5 rounded-xl border transition-all shadow-md cursor-pointer ${
                isFullScreen
                  ? "bg-emerald-600 text-white border-emerald-400 animate-pulse"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-emerald-400"
              }`}
            >
              {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Вийти з профілю"
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500 text-slate-400 hover:text-rose-300 transition-colors shadow-md cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-800/80 pt-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => {
                  proAudio.playClick()
                  setActiveTab(item.id as any)
                }}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950 border border-emerald-400/50 scale-[1.02]"
                    : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800/80"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── TAB CONTENT (ZERO-RELOAD SPA) ─── */}
      <div className="w-full">
        {/* 1. DASHBOARD OVERVIEW */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            {/* Hero Match Center CTA Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  Тур {career.current_fixture_round} • Рівень {currentClub.tier}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {currentClub.name} проти {nextOpponent.name}
                </h3>
                <p className="text-xs text-slate-300 max-w-md">
                  Стадіон «{currentClub.stadium_name}». Заробляй преміальні за голи та прокладай шлях до великого футболу!
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  proAudio.playClick()
                  setActiveTab("match")
                }}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-slate-950 font-black text-sm flex items-center gap-2.5 shadow-2xl shadow-emerald-950 transition-all active:scale-95 cursor-pointer animate-pulse shrink-0"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>Зіграти Матч Зараз</span>
              </button>
            </div>

            {/* Cards & Stats Snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: 3D Holographic Card (5 Cols) */}
              <div className="md:col-span-5 flex justify-center">
                <ProCard career={career} club={currentClub} />
              </div>

              {/* Right Column: Quick Career Stats (7 Cols) */}
              <div className="md:col-span-7 space-y-4">
                <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Показники сезону та доходи
                  </h3>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Матчі
                      </div>
                      <div className="text-xl font-black text-white font-mono">
                        {career.career_stats.season_matches}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Голи
                      </div>
                      <div className="text-xl font-black text-amber-300 font-mono">
                        {career.career_stats.season_goals}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Асисти
                      </div>
                      <div className="text-xl font-black text-emerald-300 font-mono">
                        {career.career_stats.season_assists}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Lifestyle Shortcut Card */}
                <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-emerald-400" />
                      Магазин Прокачки & Стиль Життя
                    </h4>
                    <p className="text-xs text-slate-400">
                      Купуй бутси (+OVR), наймай персональних тренерів та купуй авто
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      proAudio.playClick()
                      setActiveTab("lifestyle")
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 text-xs font-black transition-all cursor-pointer shrink-0"
                  >
                    В Магазин →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. MATCH SIMULATOR */}
        {activeTab === "match" && (
          <ProMatch
            career={career}
            playerClub={currentClub}
            opponentClub={nextOpponent}
            isHome={true}
            onFinishMatch={handleFinishMatch}
          />
        )}

        {/* 3. TRAINING & SPA */}
        {activeTab === "training" && (
          <ProTraining
            career={career}
            onUpdateCareer={async (updated) => {
              await proUpdateCareer(updated)
              setCareer(updated)
            }}
          />
        )}

        {/* 4. LIFESTYLE & STORE */}
        {activeTab === "lifestyle" && (
          <ProLifestyle
            career={career}
            onUpdateCareer={async (updated) => {
              await proUpdateCareer(updated)
              setCareer(updated)
            }}
          />
        )}

        {/* 5. TRANSFERS & SCOUTS */}
        {activeTab === "transfers" && (
          <ProTransfers
            career={career}
            currentClub={currentClub}
            allClubs={clubs}
            onAcceptTransfer={handleAcceptTransfer}
          />
        )}

        {/* 6. CAREER CHRONICLE PROFILE */}
        {activeTab === "profile" && (
          <ProProfile career={career} currentClub={currentClub} />
        )}

        {/* 7. LEAGUE STANDINGS */}
        {activeTab === "league" && (
          <ProLeagueStandings
            career={career}
            currentClub={currentClub}
            allClubs={clubs}
            leagues={leagues}
          />
        )}
      </div>

      {/* ─── NARRATIVE STORY MODAL SCENE ─── */}
      {activeStoryEvent && (
        <ProStoryModal
          event={activeStoryEvent}
          onResolve={handleResolveStoryChoice}
        />
      )}
    </div>
  )
}
