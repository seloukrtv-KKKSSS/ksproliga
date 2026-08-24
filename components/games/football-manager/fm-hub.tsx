"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import type {
  FMUser,
  FMClub,
  FMPlayer,
  FMTactics,
  FMStadium
} from "@/lib/fm-types"
import {
  fmGetStoredUser,
  fmGetClubByUserId,
  fmGetClubPlayers,
  fmGetTactics,
  fmGetStadium,
  fmLogout
} from "@/lib/fm-database"
import { fmAudio } from "@/lib/fm-audio"
import {
  Shield,
  LayoutDashboard,
  SlidersHorizontal,
  Trophy,
  Dumbbell,
  Building2,
  ShoppingBag,
  GraduationCap,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  LogOut,
  Sparkles,
  Award,
  Zap,
  Lock
} from "lucide-react"

const fmModuleOptions = {
  loading: () => <div className="flex min-h-64 items-center justify-center text-sm font-bold text-slate-400">Завантаження…</div>,
}

const FMOnboarding = dynamic(() => import("./fm-onboarding").then((module) => module.FMOnboarding), fmModuleOptions)
const FMLockScreen = dynamic(() => import("./fm-lock-screen").then((module) => module.FMLockScreen), fmModuleOptions)
const FMDashboard = dynamic(() => import("./fm-dashboard").then((module) => module.FMDashboard), fmModuleOptions)
const FMSquadTactics = dynamic(() => import("./fm-squad-tactics").then((module) => module.FMSquadTactics), fmModuleOptions)
const FMTournamentsView = dynamic(() => import("./fm-tournaments").then((module) => module.FMTournamentsView), fmModuleOptions)
const FMTraining = dynamic(() => import("./fm-training").then((module) => module.FMTraining), fmModuleOptions)
const FMStadiumInfrastructure = dynamic(() => import("./fm-stadium").then((module) => module.FMStadiumInfrastructure), fmModuleOptions)
const FMTransferMarket = dynamic(() => import("./fm-transfers").then((module) => module.FMTransferMarket), fmModuleOptions)
const FMYouthAcademy = dynamic(() => import("./fm-youth").then((module) => module.FMYouthAcademy), fmModuleOptions)
const FMLeagueStandingsView = dynamic(() => import("./fm-league").then((module) => module.FMLeagueStandingsView), fmModuleOptions)

export function FMHub() {
  const [currentUser, setCurrentUser] = useState<FMUser | null>(null)
  const [club, setClub] = useState<FMClub | null>(null)
  const [players, setPlayers] = useState<FMPlayer[]>([])
  const [tactics, setTactics] = useState<FMTactics | null>(null)
  const [stadium, setStadium] = useState<FMStadium | null>(null)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "squad" | "tournaments" | "training" | "city" | "transfers" | "youth" | "league"
  >("dashboard")

  const [isMuted, setIsMuted] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Password Lock state check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const unlocked =
        sessionStorage.getItem("ks_fm_unlocked") === "true" ||
        localStorage.getItem("ks_fm_unlocked") === "true"
      setIsUnlocked(unlocked)
    }
  }, [])

  // Fullscreen event listener to sync state with native browser Esc / F11
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement
      setIsFullScreen(isCurrentlyFullscreen)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Initialize session
  useEffect(() => {
    const stored = fmGetStoredUser()
    if (stored) {
      setCurrentUser(stored)
      loadClubData(stored.id)
    } else {
      setLoading(false)
    }
  }, [])

  const loadClubData = async (userId: number) => {
    setLoading(true)
    try {
      const userClub = await fmGetClubByUserId(userId)
      if (userClub) {
        setClub(userClub)
        const [pList, tData, sData] = await Promise.all([
          fmGetClubPlayers(userClub.id),
          fmGetTactics(userClub.id),
          fmGetStadium(userClub.id)
        ])
        setPlayers(pList)
        setTactics(tData)
        setStadium(sData)
      }
    } catch (err) {
      console.error("Error loading club data:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSoundToggle = () => {
    const newMuted = fmAudio.toggleMute()
    setIsMuted(newMuted)
    if (!newMuted) fmAudio.playClick()
  }

  // Native HTML5 Fullscreen API Handler
  const toggleFullScreen = async () => {
    fmAudio.playClick()
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
      console.warn("Native fullscreen toggle error, falling back to CSS overlay:", err)
      setIsFullScreen(!isFullScreen)
    }
  }

  const handleTabChange = (tab: any) => {
    fmAudio.playClick()
    setActiveTab(tab)
  }

  const handleLogout = () => {
    fmAudio.playClick()
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ks_fm_unlocked")
      localStorage.removeItem("ks_fm_unlocked")
    }
    setIsUnlocked(false)
    fmLogout()
    setCurrentUser(null)
    setClub(null)
    setPlayers([])
    setTactics(null)
    setStadium(null)
  }

  // 1. Password Lock Gate (PIN: 1100)
  if (!isUnlocked) {
    return <FMLockScreen onUnlock={() => setIsUnlocked(true)} />
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4 text-emerald-400">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium tracking-wide text-slate-300">
          Завантаження клубу KSLIGA FM (11x11)...
        </p>
      </div>
    )
  }

  // If no user or no club found, show Onboarding Wizard
  if (!currentUser || !club) {
    return (
      <FMOnboarding
        onComplete={(user, newClub) => {
          setCurrentUser(user)
          setClub(newClub)
          loadClubData(user.id)
        }}
      />
    )
  }

  const navItems = [
    { id: "dashboard", label: "Огляд", icon: LayoutDashboard },
    { id: "squad", label: "Склад & Поле", icon: SlidersHorizontal },
    { id: "tournaments", label: "Кубки 11x11", icon: Trophy, badge: "ТОП" },
    { id: "city", label: "Футбольне Місто", icon: Building2 },
    { id: "training", label: "Тренування & СПА", icon: Dumbbell },
    { id: "transfers", label: "Аукціон", icon: ShoppingBag },
    { id: "youth", label: "Академія", icon: GraduationCap },
    { id: "league", label: "Чемпіонат", icon: Award }
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
      {/* TOP MASTER HUD BAR */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/30 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Club Info & Crest */}
          <div className="flex items-center gap-3.5">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg border-2 border-emerald-400/40"
              style={{
                background: `linear-gradient(135deg, ${club.primary_color}, ${club.secondary_color})`
              }}
            >
              <Shield className="w-7 h-7 text-white drop-shadow-md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow">
                  {club.name}
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Рівень {club.manager_level}
                </span>
                {(club.cups_won || 0) > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    🏆 {club.cups_won}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Тренер: <span className="text-slate-200 font-semibold">{currentUser.username}</span> | {club.city}
              </p>
            </div>
          </div>

          {/* Wallet & HUD Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
            {/* Club Balance */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 shadow-inner">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Бюджет:
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-300">
                {club.balance.toLocaleString()} ₴
              </span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={handleSoundToggle}
              title={isMuted ? "Увімкнути звук" : "Вимкнути звук"}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 transition-colors shadow-md"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Lock Game Screen */}
            <button
              onClick={() => {
                fmAudio.playClick()
                if (typeof window !== "undefined") {
                  sessionStorage.removeItem("ks_fm_unlocked")
                  localStorage.removeItem("ks_fm_unlocked")
                }
                setIsUnlocked(false)
              }}
              title="Заблокувати доступ до гри"
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-amber-400 transition-colors shadow-md"
            >
              <Lock className="w-5 h-5" />
            </button>

            {/* Native Fullscreen Button */}
            <button
              onClick={toggleFullScreen}
              title={isFullScreen ? "Вийти з повного екрану (Esc)" : "Повноекранний режим"}
              className={`p-2.5 rounded-xl border transition-all shadow-md ${
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
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500 text-slate-400 hover:text-rose-300 transition-colors shadow-md"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="mt-5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-800/80 pt-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950 border border-emerald-400/50 scale-[1.02]"
                    : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800/80"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-200" : "text-slate-400"}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.2 text-[10px] font-black uppercase rounded-md bg-amber-500 text-slate-950 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ACTIVE TAB CONTENT */}
      <div className="w-full">
        {activeTab === "dashboard" && (
          <FMDashboard
            club={club}
            players={players}
            stadium={stadium}
            onNavigate={(tab) => handleTabChange(tab)}
          />
        )}

        {activeTab === "squad" && (
          <FMSquadTactics
            club={club}
            players={players}
            tactics={tactics}
            onSquadUpdated={() => loadClubData(currentUser.id)}
          />
        )}

        {activeTab === "tournaments" && (
          <FMTournamentsView
            club={club}
            players={players}
            tactics={tactics}
            stadium={stadium}
            onClubUpdated={() => loadClubData(currentUser.id)}
          />
        )}

        {activeTab === "city" && (
          <FMStadiumInfrastructure
            club={club}
            stadium={stadium}
            onUpdated={() => loadClubData(currentUser.id)}
          />
        )}

        {activeTab === "training" && (
          <FMTraining
            club={club}
            players={players}
            stadium={stadium}
            onSquadUpdated={() => loadClubData(currentUser.id)}
          />
        )}

        {activeTab === "transfers" && (
          <FMTransferMarket
            club={club}
            players={players}
            onPurchased={() => loadClubData(currentUser.id)}
          />
        )}

        {activeTab === "youth" && (
          <FMYouthAcademy
            club={club}
            stadium={stadium}
            onSigned={() => loadClubData(currentUser.id)}
          />
        )}

        {activeTab === "league" && (
          <FMLeagueStandingsView
            club={club}
          />
        )}
      </div>
    </div>
  )
}
