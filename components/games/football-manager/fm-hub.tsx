"use client"

import { useState, useEffect } from "react"
import {
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
import { FMOnboarding } from "./fm-onboarding"
import { FMDashboard } from "./fm-dashboard"
import { FMSquadTactics } from "./fm-squad-tactics"
import { FMMatchCenter } from "./fm-match-center"
import { FMTraining } from "./fm-training"
import { FMStadiumInfrastructure } from "./fm-stadium"
import { FMTransferMarket } from "./fm-transfers"
import { FMYouthAcademy } from "./fm-youth"
import { FMLeagueStandingsView } from "./fm-league"
import {
  Shield,
  LayoutDashboard,
  SlidersHorizontal,
  PlayCircle,
  Dumbbell,
  Building2,
  ShoppingBag,
  GraduationCap,
  Trophy,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  LogOut,
  Sparkles,
  DollarSign,
  Award
} from "lucide-react"

export function FMHub() {
  const [currentUser, setCurrentUser] = useState<FMUser | null>(null)
  const [club, setClub] = useState<FMClub | null>(null)
  const [players, setPlayers] = useState<FMPlayer[]>([])
  const [tactics, setTactics] = useState<FMTactics | null>(null)
  const [stadium, setStadium] = useState<FMStadium | null>(null)
  const [activeTab, setActiveTab] = useState<string>("dashboard")

  const [isLoading, setIsLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Initialize session and club data
  const loadClubData = async (user: FMUser) => {
    setIsLoading(true)
    try {
      const userClub = await fmGetClubByUserId(user.id)
      if (userClub) {
        setClub(userClub)
        const [clubPlayers, clubTactics, clubStadium] = await Promise.all([
          fmGetClubPlayers(userClub.id),
          fmGetTactics(userClub.id),
          fmGetStadium(userClub.id)
        ])
        setPlayers(clubPlayers)
        setTactics(clubTactics)
        setStadium(clubStadium)
      } else {
        setClub(null)
      }
    } catch (err) {
      console.error("Error loading FM club data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const stored = fmGetStoredUser()
    setIsMuted(fmAudio.isMuted)
    if (stored) {
      setCurrentUser(stored)
      loadClubData(stored)
    } else {
      setIsLoading(false)
    }
  }, [])

  const handleOnboardingSuccess = (user: FMUser, newClub: FMClub, initialPlayers?: FMPlayer[]) => {
    setCurrentUser(user)
    setClub(newClub)
    if (initialPlayers) {
      setPlayers(initialPlayers)
    }
    loadClubData(user)
  }

  const handleLogout = () => {
    fmAudio.playClick()
    fmLogout()
    setCurrentUser(null)
    setClub(null)
    setPlayers([])
  }

  const handleToggleMute = () => {
    const next = fmAudio.toggleMute()
    setIsMuted(next)
  }

  // If loading session
  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-3 text-white">
        <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-spin">
          <Shield className="h-6 w-6" />
        </div>
        <div className="text-xs font-bold text-slate-400">Завантаження KSLIGA Football Manager...</div>
      </div>
    )
  }

  // If not logged in or no club created yet
  if (!currentUser || !club || !tactics || !stadium) {
    return <FMOnboarding onSuccess={handleOnboardingSuccess} />
  }

  return (
    <div
      className={`w-full transition-all duration-300 ${
        isFullScreen
          ? "fixed inset-0 z-50 bg-slate-950/98 overflow-y-auto p-4 sm:p-6"
          : "space-y-6"
      }`}
    >
      {/* ─── Top Master HUD Bar ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950/90 border border-emerald-950/80 shadow-2xl p-4 sm:p-5 text-white backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Left: Club Crest, Name & Manager Level */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border shrink-0"
              style={{
                background: `linear-gradient(135deg, ${club.primary_color}, ${club.secondary_color})`,
                borderColor: club.secondary_color
              }}
            >
              <Shield className="h-6 w-6 text-white drop-shadow" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white truncate">{club.name}</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 shrink-0">
                  Рівень {club.manager_level}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate">
                Менеджер: {currentUser.username} • {club.city}
              </div>
            </div>
          </div>

          {/* Center/Right: Balance, Controls & Actions */}
          <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap">
            {/* Club Balance Chip */}
            <div className="p-2.5 px-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 flex items-center gap-2 shadow-inner">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <div className="text-xs sm:text-sm font-black text-emerald-400">
                {club.balance.toLocaleString()} ₴
              </div>
            </div>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={handleToggleMute}
              title={isMuted ? "Увімкнути звук" : "Вимкнути звук"}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all active:scale-95 border border-slate-800"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsFullScreen(!isFullScreen)
                fmAudio.playClick()
              }}
              title={isFullScreen ? "Звичайний режим" : "Повноекранний режим менеджера"}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all active:scale-95 border border-slate-800"
            >
              {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4 text-emerald-400" />}
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              title="Вийти з клубу"
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-all active:scale-95 border border-slate-800"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs Bar ─── */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 shadow-lg overflow-x-auto select-none">
        {[
          { id: "dashboard", label: "Огляд", icon: LayoutDashboard },
          { id: "squad", label: "Склад & Тактика", icon: SlidersHorizontal },
          { id: "matches", label: "Матч-Центр", icon: PlayCircle },
          { id: "training", label: "Тренування", icon: Dumbbell },
          { id: "stadium", label: "Стадіон", icon: Building2 },
          { id: "transfers", label: "Трансфери", icon: ShoppingBag },
          { id: "youth", label: "Академія", icon: GraduationCap },
          { id: "league", label: "Ліга", icon: Trophy }
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id)
                fmAudio.playClick()
              }}
              className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                isActive
                  ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-950 scale-102"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ─── Active Tab Content ─── */}
      <div className="animate-in fade-in duration-200">
        {activeTab === "dashboard" && (
          <FMDashboard
            club={club}
            players={players}
            stadium={stadium}
            tactics={tactics}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === "squad" && (
          <FMSquadTactics
            club={club}
            players={players}
            tactics={tactics}
            onUpdateSquad={setPlayers}
            onUpdateTactics={setTactics}
            onUpdateClub={setClub}
          />
        )}

        {activeTab === "matches" && (
          <FMMatchCenter
            userClub={club}
            userPlayers={players}
            userTactics={tactics}
            userStadium={stadium}
            onMatchFinished={(updatedClub, updatedPlayers) => {
              setClub(updatedClub)
              setPlayers(updatedPlayers)
            }}
          />
        )}

        {activeTab === "training" && (
          <FMTraining
            club={club}
            players={players}
            stadium={stadium}
            onSquadUpdated={setPlayers}
          />
        )}

        {activeTab === "stadium" && (
          <FMStadiumInfrastructure
            club={club}
            stadium={stadium}
            onClubUpdated={setClub}
            onStadiumUpdated={setStadium}
          />
        )}

        {activeTab === "transfers" && (
          <FMTransferMarket
            club={club}
            onClubUpdated={setClub}
            onSquadUpdated={setPlayers}
          />
        )}

        {activeTab === "youth" && (
          <FMYouthAcademy
            club={club}
            stadium={stadium}
            onSquadUpdated={setPlayers}
          />
        )}

        {activeTab === "league" && <FMLeagueStandingsView userClub={club} />}
      </div>
    </div>
  )
}
