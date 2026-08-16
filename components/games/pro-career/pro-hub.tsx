"use client"

import { useState, useEffect } from "react"
import {
  ProCareer,
  ProClub,
  ProLeague,
  ProMatchResult,
  ProStoryEvent,
  ProStoryChoice
} from "@/lib/pro-types"
import {
  proGetStoredCareer,
  proSaveStoredCareer,
  proGetStoredUser,
  proCreateCareer,
  proUpdateCareer,
  proSaveMatch,
  proGetClubs,
  proGetLeagues,
  proLogout
} from "@/lib/pro-database"
import { proAudio } from "@/lib/pro-audio"
import { ProCreation } from "./pro-creation"
import { ProDashboard } from "./pro-dashboard"
import { ProMatch } from "./pro-match"
import { ProTraining } from "./pro-training"
import { ProTransfers } from "./pro-transfers"
import { ProLifestyle } from "./pro-lifestyle"
import { ProLeagueStandings } from "./pro-league"
import { ProProfile } from "./pro-profile"
import { ProStoryModal } from "./pro-story-modal"
import { ProAvatarRenderer } from "./pro-avatar"
import {
  User,
  Activity,
  Zap,
  ShoppingBag,
  Trophy,
  Award,
  Sparkles,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  LogOut,
  Shield,
  Play,
  RotateCcw,
  Wallet
} from "lucide-react"

export interface ProHubProps {
  clubs?: ProClub[]
  leagues?: ProLeague[]
  initialCareer?: ProCareer | null
  onExit?: () => void
  playerName?: string
}

type TabType =
  | "dashboard"
  | "match"
  | "training"
  | "transfers"
  | "lifestyle"
  | "league"
  | "profile"

export function ProHub({
  clubs: propClubs,
  leagues: propLeagues,
  initialCareer,
  onExit,
  playerName = ""
}: ProHubProps) {
  const [clubs, setClubs] = useState<ProClub[]>(propClubs || [])
  const [leagues, setLeagues] = useState<ProLeague[]>(propLeagues || [])
  const [career, setCareer] = useState<ProCareer | null>(
    initialCareer || proGetStoredCareer()
  )
  const [activeTab, setActiveTab] = useState<TabType>("dashboard")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAudioMuted, setIsAudioMuted] = useState(proAudio.isMuted)
  const [activeStoryEvent, setActiveStoryEvent] = useState<ProStoryEvent | null>(null)
  const [showSeasonEndModal, setShowSeasonEndModal] = useState(false)

  // Load clubs & leagues if not passed
  useEffect(() => {
    if (!propClubs || propClubs.length === 0) {
      proGetClubs().then(setClubs).catch(console.error)
    }
    if (!propLeagues || propLeagues.length === 0) {
      proGetLeagues().then(setLeagues).catch(console.error)
    }
  }, [propClubs, propLeagues])

  // Sync with global player name if present
  useEffect(() => {
    if (playerName && career) {
      const parts = playerName.trim().split(" ")
      const fName = parts[0]
      const lName = parts.slice(1).join(" ")
      if (fName && lName && (career.first_name !== fName || career.last_name !== lName)) {
        const updated = { ...career, first_name: fName, last_name: lName }
        setCareer(updated)
        proSaveStoredCareer(updated)
      }
    }
  }, [playerName, career])

  // Fullscreen Handler
  const toggleFullscreen = () => {
    proAudio.playClick()
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Audio Mute Handler
  const toggleAudio = () => {
    const muted = proAudio.toggleMute()
    setIsAudioMuted(muted)
  }

  // Handle Character Creation Complete
  const handleCreationComplete = async (newCareerData: Partial<ProCareer>) => {
    const user = proGetStoredUser()
    const userId = user?.id || 1

    try {
      const created = await proCreateCareer(userId, newCareerData)
      setCareer(created)
      setActiveTab("dashboard")
    } catch (err) {
      console.error("Error creating career:", err)
      const fallbackCareer = {
        ...newCareerData,
        id: Date.now(),
        user_id: userId
      } as ProCareer
      setCareer(fallbackCareer)
      proSaveStoredCareer(fallbackCareer)
      setActiveTab("dashboard")
    }
  }

  // Handle In-Game Updates
  const handleUpdateCareer = async (updated: ProCareer) => {
    setCareer(updated)
    proSaveStoredCareer(updated)
    await proUpdateCareer(updated).catch(() => {})
  }

  // Handle Story Modal Resolution
  const handleStoryChoice = (choice: ProStoryChoice) => {
    if (!career) return
    const updatedCareer: ProCareer = {
      ...career,
      morale: Math.max(0, Math.min(100, career.morale + (choice.morale_delta || 0))),
      form: Math.max(0, Math.min(100, career.form + (choice.form_delta || 0))),
      reputation: Math.max(0, career.reputation + (choice.rep_delta || 0)),
      bank_balance: (career.bank_balance || 0) + (choice.money_delta || 0)
    }
    setActiveStoryEvent(null)
    handleUpdateCareer(updatedCareer)
  }

  // Post Match Resolution (with Season End, News & Aging +1 Year)
  const handleFinishMatch = async (result: ProMatchResult) => {
    if (!career) return

    const earningsTotal = result.earnings?.total || 0
    const newBankBalance = (career.bank_balance || 0) + earningsTotal
    const newTotalMatches = career.career_stats.total_matches + 1
    const newTotalGoals = career.career_stats.total_goals + result.player_goals
    const newTotalAssists = career.career_stats.total_assists + result.player_assists
    const newSeasonMatches = career.career_stats.season_matches + 1
    const newSeasonGoals = career.career_stats.season_goals + result.player_goals
    const newSeasonAssists = career.career_stats.season_assists + result.player_assists

    const oldTotalRatings = career.career_stats.avg_rating * career.career_stats.total_matches
    const newAvgRating =
      newTotalMatches > 0
        ? (oldTotalRatings + result.player_rating) / newTotalMatches
        : 7.0

    const newForm = Math.max(
      40,
      Math.min(100, career.form + (result.player_rating >= 7.5 ? 4 : -3))
    )
    const newEnergy = Math.max(15, career.energy - 22)
    const newReputation = career.reputation + (result.player_rating >= 8.0 ? 8 : 2)

    // Append News Article to press archive
    const existingArticles = career.news_articles || []
    const updatedArticles = result.news_article
      ? [result.news_article, ...existingArticles.slice(0, 15)]
      : existingArticles

    // Next round fixture
    const nextRound = career.current_fixture_round + 1

    let updatedCareer: ProCareer = {
      ...career,
      bank_balance: newBankBalance,
      form: newForm,
      energy: newEnergy,
      reputation: newReputation,
      current_fixture_round: nextRound,
      news_articles: updatedArticles,
      career_stats: {
        total_matches: newTotalMatches,
        total_goals: newTotalGoals,
        total_assists: newTotalAssists,
        total_trophies: career.career_stats.total_trophies,
        avg_rating: Math.round(newAvgRating * 10) / 10,
        season_matches: newSeasonMatches,
        season_goals: newSeasonGoals,
        season_assists: newSeasonAssists
      }
    }

    // ─── CHECK SEASON PROGRESSION & AGING (18 Rounds per Season) ───
    if (nextRound > 18) {
      proAudio.playTrophyChime()
      const newSeasonNumber = career.current_season_number + 1
      const newAge = career.age + 1

      // Log season archive
      const seasonLog = {
        season: career.current_season_number,
        year: 2026 + career.current_season_number - 1,
        age: career.age,
        club_name: currentClub?.name || "Клуб",
        club_tier: currentClub?.tier || 1,
        league_name: currentLeague?.name || "Ліга",
        matches: newSeasonMatches,
        goals: newSeasonGoals,
        assists: newSeasonAssists,
        avg_rating: Math.round(newAvgRating * 10) / 10,
        ovr_start: career.overall_rating,
        ovr_end: career.overall_rating,
        trophies_won: []
      }

      updatedCareer = {
        ...updatedCareer,
        age: newAge,
        current_season_number: newSeasonNumber,
        current_fixture_round: 1,
        contract_signed_this_season: false,
        career_stats: {
          ...updatedCareer.career_stats,
          season_matches: 0,
          season_goals: 0,
          season_assists: 0
        },
        season_logs: [...(career.season_logs || []), seasonLog]
      }

      setShowSeasonEndModal(true)
    }

    await handleUpdateCareer(updatedCareer)
    await proSaveMatch(updatedCareer, result).catch(() => {})

    setActiveTab("dashboard")
  }

  // Handle Transfer Accepted
  const handleAcceptTransfer = async (
    newClub: ProClub,
    weeklyWage: number,
    signingBonus: number
  ) => {
    if (!career) return

    const newClubHistory = {
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

    const updatedCareer: ProCareer = {
      ...career,
      current_club_id: newClub.id,
      wage_per_week: weeklyWage,
      bank_balance: (career.bank_balance || 0) + signingBonus,
      contract_years_left: 3,
      contract_signed_this_season: true,
      morale: 100,
      clubs_history: [...career.clubs_history, newClubHistory]
    }

    await handleUpdateCareer(updatedCareer)
    setActiveTab("dashboard")
  }

  // If no career, show creation screen
  if (!career) {
    return (
      <div className="min-h-screen bg-[#060a0f] text-slate-100 flex flex-col justify-center p-4 sm:p-6 select-none font-sans">
        <ProCreation
          clubs={clubs.length > 0 ? clubs : [{
            id: 1,
            name: "ФК Тучапи",
            short_name: "Тучапи",
            city: "Тучапи",
            region: "Івано-Франківська обл.",
            league_id: 1,
            tier: 1,
            reputation: 80,
            primary_color: "#15803D",
            secondary_color: "#FACC15",
            badge_symbol: "shield",
            stadium_name: "Сільський стадіон «Колос»",
            stadium_capacity: 500,
            budget: 25000,
            squad_strength: 42
          }]}
          defaultName={playerName}
          onComplete={handleCreationComplete}
        />
      </div>
    )
  }

  const currentClub =
    clubs.find((c) => c.id === career.current_club_id) || clubs[0] || {
      id: 1,
      name: "ФК Тучапи",
      short_name: "Тучапи",
      city: "Тучапи",
      region: "Івано-Франківська обл.",
      league_id: 1,
      tier: 1,
      reputation: 80,
      primary_color: "#15803D",
      secondary_color: "#FACC15",
      badge_symbol: "shield",
      stadium_name: "Сільський стадіон «Колос»",
      stadium_capacity: 500,
      budget: 25000,
      squad_strength: 42
    }

  const currentLeague =
    leagues.find((l) => l.tier === currentClub.tier) || leagues[0] || {
      id: 1,
      name: "Снятинський & Коломийський Район (Село)",
      tier: 1,
      reputation: 80
    }

  // Opponent Club for matchday
  const tierClubs = clubs.filter(
    (c) => c.tier === currentClub.tier && c.id !== currentClub.id
  )
  const opponentClub =
    tierClubs[career.current_fixture_round % (tierClubs.length || 1)] || clubs[1] || currentClub

  return (
    <div
      className={`min-h-screen bg-[#060a0f] text-slate-100 flex flex-col select-none font-sans ${
        isFullscreen ? "p-0" : "p-3 sm:p-6"
      }`}
    >
      {/* ─── TOP MASTER HUD BAR ─── */}
      <header className="max-w-7xl mx-auto w-full mb-6 p-4 rounded-3xl bg-slate-950/80 border border-slate-800 shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        {/* Left: Player Profile Brief & Avatar */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <ProAvatarRenderer
              avatar={career.avatar}
              club={currentClub}
              size={52}
            />
            <div className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black font-mono">
              {career.overall_rating}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white leading-tight">
                {career.first_name} {career.last_name}
              </h1>
              <span className="text-xs">🇺🇦</span>
            </div>
            <p className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
              <span>{currentClub.name}</span>
              <span className="text-slate-500">•</span>
              <span>{career.age} років</span>
            </p>
          </div>
        </div>

        {/* Center: Bank Balance & Contract Widget */}
        <div className="flex items-center gap-2.5">
          <div
            onClick={() => setActiveTab("lifestyle")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 cursor-pointer hover:bg-emerald-900/60 transition-all shadow-inner"
            title="Особисті гроші (Натисніть для переходу в Магазин)"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[9px] font-bold uppercase text-emerald-400">
                Баланс
              </div>
              <div className="text-xs sm:text-sm font-black text-emerald-300 font-mono">
                {(career.bank_balance || 0).toLocaleString()} ₴
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-800">
            <div>
              <div className="text-[9px] font-bold uppercase text-slate-400">
                Зарплата
              </div>
              <div className="text-xs font-black text-amber-300 font-mono">
                {career.wage_per_week.toLocaleString()} ₴/т
              </div>
            </div>
          </div>
        </div>

        {/* Right Controls: Audio, Fullscreen, Logout */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAudio}
            className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all cursor-pointer"
            title={isAudioMuted ? "Увімкнути звук" : "Вимкнути звук"}
          >
            {isAudioMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all cursor-pointer"
            title={isFullscreen ? "Вийти з повного екрану" : "Повний екран"}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="p-2.5 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 transition-all cursor-pointer"
              title="Головне Меню KS Games"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ─── NAVIGATION TABS BAR ─── */}
      <nav className="max-w-7xl mx-auto w-full mb-6 flex items-center gap-1.5 p-1.5 rounded-3xl bg-slate-950/80 border border-slate-800 shadow-xl overflow-x-auto">
        {[
          { id: "dashboard", label: "Головна", icon: Activity },
          { id: "match", label: "Матч Туру", icon: Play },
          { id: "training", label: "Тренування & СПА", icon: Zap },
          { id: "transfers", label: "Скаутинг & Трансфери", icon: Sparkles },
          { id: "lifestyle", label: "Магазин Життя", icon: ShoppingBag },
          { id: "league", label: "Таблиця & Кубок", icon: Trophy },
          { id: "profile", label: "Профіль & Хроніка", icon: User }
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                proAudio.playClick()
                setActiveTab(tab.id as TabType)
              }}
              className={`flex-1 min-w-[125px] py-3 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 text-slate-950 shadow-lg shadow-emerald-950 scale-102"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* ─── MAIN ACTIVE VIEW ─── */}
      <main className="max-w-7xl mx-auto w-full flex-1 pb-8">
        {activeTab === "dashboard" && (
          <ProDashboard
            career={career}
            currentClub={currentClub}
            currentLeague={currentLeague}
            opponentClub={opponentClub}
            onStartMatch={() => {
              proAudio.playClick()
              setActiveTab("match")
            }}
            onNavigate={(tab) => {
              proAudio.playClick()
              setActiveTab(tab as TabType)
            }}
          />
        )}

        {activeTab === "match" && (
          <ProMatch
            career={career}
            playerClub={currentClub}
            opponentClub={opponentClub}
            isHome={career.current_fixture_round % 2 === 1}
            onFinishMatch={handleFinishMatch}
          />
        )}

        {activeTab === "training" && (
          <ProTraining
            career={career}
            onUpdateCareer={handleUpdateCareer}
          />
        )}

        {activeTab === "transfers" && (
          <ProTransfers
            career={career}
            currentClub={currentClub}
            allClubs={clubs}
            onAcceptTransfer={handleAcceptTransfer}
          />
        )}

        {activeTab === "lifestyle" && (
          <ProLifestyle
            career={career}
            onUpdateCareer={handleUpdateCareer}
          />
        )}

        {activeTab === "league" && (
          <ProLeagueStandings
            career={career}
            currentClub={currentClub}
            allClubs={clubs}
            leagues={leagues}
          />
        )}

        {activeTab === "profile" && (
          <ProProfile career={career} currentClub={currentClub} />
        )}
      </main>

      {/* ─── SEASON END CELEBRATION MODAL ─── */}
      {showSeasonEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full p-8 rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950 border-2 border-amber-400 shadow-2xl text-center space-y-6 animate-scale-up">
            <div className="text-5xl">🏆✨</div>
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase">
                Підсумки Сезону
              </span>
              <h3 className="text-2xl font-black text-white">
                Сезон Завершено!
              </h3>
              <p className="text-xs text-slate-300">
                Твій футболіст подорослішав на +1 рік! Тепер тобі <strong className="text-amber-300 text-sm">{career.age} років</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <div className="flex justify-between">
                <span>Рейтинг OVR:</span>
                <strong className="text-emerald-400">{career.overall_rating}</strong>
              </div>
              <div className="flex justify-between">
                <span>Всього голів за кар'єру:</span>
                <strong className="text-amber-300">{career.career_stats.total_goals}</strong>
              </div>
              <div className="flex justify-between">
                <span>Трансферне вікно:</span>
                <strong className="text-teal-300">ВІДКРИТО 🔓</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                proAudio.playClick()
                setShowSeasonEndModal(false)
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 text-slate-950 font-black text-sm transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              Розпочати Новий Сезон 🚀
            </button>
          </div>
        </div>
      )}

      {/* Story Narrative Dialogue Event Modal */}
      {activeStoryEvent && (
        <ProStoryModal
          event={activeStoryEvent}
          onResolve={handleStoryChoice}
        />
      )}
    </div>
  )
}
