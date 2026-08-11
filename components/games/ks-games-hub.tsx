"use client"

import { useState, useEffect } from "react"
import { Gamepad2, Trophy, User, Sparkles, Volume2, VolumeX, Edit3, Check, Flame } from "lucide-react"
import { KsDinoRunner } from "./ks-dino-runner"
import { KsSnakeGame } from "./ks-snake-game"
import { KsLeaderboard } from "./ks-leaderboard"
import { retroAudio } from "@/lib/retro-audio"
import { getTeams } from "@/lib/database"
import type { Team } from "@/lib/supabase"

interface KsGamesHubProps {
  teams: Team[]
}

export function KsGamesHub({ teams }: KsGamesHubProps) {
  const [activeTab, setActiveTab] = useState<"dino" | "snake" | "leaderboard">("dino")
  const [playerName, setPlayerName] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState("")
  const [isMuted, setIsMuted] = useState(false)
  const [lastSubmittedScoreId, setLastSubmittedScoreId] = useState<number | undefined>(undefined)
  const [nicknameReady, setNicknameReady] = useState(false)
  const [allLeagueTeams, setAllLeagueTeams] = useState<Team[]>(teams || [])

  useEffect(() => {
    const savedName = localStorage.getItem("ks_player_name")
    if (savedName) {
      setPlayerName(savedName)
      setTempName(savedName)
      setNicknameReady(true)
    } else {
      setIsEditingName(true)
    }
    setIsMuted(retroAudio.isMuted)

    // Load ALL teams across all leagues and championships in database
    getTeams().then((data) => {
      if (data && data.length > 0) {
        setAllLeagueTeams(data)
      }
    }).catch(console.error)
  }, [])

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const clean = tempName.trim().slice(0, 25)
    if (clean) {
      setPlayerName(clean)
      localStorage.setItem("ks_player_name", clean)
      setIsEditingName(false)
      setNicknameReady(true)
    }
  }

  const handleToggleMute = () => {
    const next = retroAudio.toggleMute()
    setIsMuted(next)
  }

  const handleScoreSubmitted = (scoreId: number) => {
    setLastSubmittedScoreId(scoreId)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Hero Games Room Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-7 shadow-xl border border-white/10">
        {/* Ambient Neon Blobs */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-44 h-44 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Title & Badge */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-amber-400 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Gamepad2 className="h-5 w-5 text-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">KS Games</h2>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-amber-500 text-white shadow-xs">
                    Ретро Арена
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Грай у ретро-ігри з емблемами клубів KS LIGA та потрапляй у Зал Слави!
                </p>
              </div>
            </div>
          </div>

          {/* Player Gamer Profile Card */}
          <div className="w-full md:w-auto bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-inner">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Введіть ваше ім'я..."
                  maxLength={25}
                  autoFocus
                  className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/20 text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 flex-1 min-w-[130px]"
                />
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition-all active:scale-95 shrink-0"
                >
                  <Check className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 font-medium leading-none">Гравець</div>
                    <div className="text-xs sm:text-sm font-black text-white truncate max-w-[140px]">
                      {playerName || "Гість"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTempName(playerName)
                      setIsEditingName(true)
                    }}
                    title="Змінити ім'я"
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all active:scale-95"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleMute}
                    title={isMuted ? "Увімкнути звук" : "Вимкнути звук"}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all active:scale-95"
                  >
                    {isMuted ? <VolumeX className="h-3.5 w-3.5 text-red-400" /> : <Volume2 className="h-3.5 w-3.5 text-emerald-400" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Segmented Control */}
      <div 
        className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/60 backdrop-blur-xl border border-slate-200/80 shadow-sm select-none arcade-no-select"
        onContextMenu={(e) => e.preventDefault()}
      >
        <button
          type="button"
          onClick={() => setActiveTab("dino")}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-xs sm:text-sm transition-all select-none arcade-no-select cursor-pointer ${
            activeTab === "dino"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <span className="text-base pointer-events-none">🏃</span>
          <span className="pointer-events-none">KS Dino Runner</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("snake")}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-xs sm:text-sm transition-all select-none arcade-no-select cursor-pointer ${
            activeTab === "snake"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <span className="text-base pointer-events-none">🐍</span>
          <span className="pointer-events-none">KS Retro Snake</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("leaderboard")}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-xs sm:text-sm transition-all select-none arcade-no-select cursor-pointer ${
            activeTab === "leaderboard"
              ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md font-black"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Trophy className="h-4 w-4 text-amber-500 pointer-events-none" />
          <span className="pointer-events-none">Зал Слави</span>
        </button>
      </div>

      {/* Active Tab Content Area */}
      {!nicknameReady ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-10 shadow-xl border border-white/10 flex flex-col items-center justify-center text-center space-y-6">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-44 h-44 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-amber-400 p-0.5 shadow-lg flex items-center justify-center mb-2 z-10">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Gamepad2 className="h-8 w-8 text-amber-400" />
            </div>
          </div>
          
          <div className="space-y-2 z-10">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Введіть ваш нікнейм</h3>
            <p className="text-sm text-slate-300 font-medium max-w-sm mx-auto">
              Потрібно ввести імʼя для збереження рекордів у Зал Слави
            </p>
          </div>

          <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md z-10">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Введіть ваше ім'я..."
              maxLength={25}
              autoFocus
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-950/80 border border-white/20 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
            />
            <button
              type="submit"
              disabled={!tempName.trim()}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
            >
              <Check className="h-5 w-5" />
              <span>Зберегти</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="glass-animate-in">
          {activeTab === "dino" && (
            <div className="space-y-6">
              <KsDinoRunner
                teams={allLeagueTeams}
                playerName={playerName}
                onScoreSubmitted={handleScoreSubmitted}
                onRequestName={() => setIsEditingName(true)}
                onViewLeaderboard={() => setActiveTab("leaderboard")}
              />

              {/* Quick Rules Card */}
              <div className="bg-white/60 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Як грати в KS Dino Runner:
                </h4>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li><strong className="text-slate-900">ПК</strong>: Пробіл / Стрілка вгору — стрибок. Стрілка вниз — підкат.</li>
                  <li><strong className="text-slate-900">Смартфон</strong>: Тап по екрану або кнопка Стрибок. Кнопка Підкат для низьких перешкод.</li>
                  <li>Перестрибуйте логотипи клубів! Кожні 100 очок змінюється освітлення стадіону.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "snake" && (
            <div className="space-y-6">
              <KsSnakeGame
                teams={allLeagueTeams}
                playerName={playerName}
                onScoreSubmitted={handleScoreSubmitted}
                onRequestName={() => setIsEditingName(true)}
                onViewLeaderboard={() => setActiveTab("leaderboard")}
              />

              {/* Quick Rules Card */}
              <div className="bg-white/60 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xs">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-emerald-600" />
                  Як грати в KS Retro Snake:
                </h4>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li><strong className="text-slate-900">ПК</strong>: Стрілки або клавіші W, A, S, D для руху.</li>
                  <li><strong className="text-slate-900">Смартфон</strong>: Свайпи пальцем по екрану або наекранний неоновий D-Pad.</li>
                  <li>Збирайте емблеми команд (+10 очок) та рідкісні Золоті Кубки (+50 очок)!</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "leaderboard" && (
            <KsLeaderboard
              initialGameType="dino"
              currentPlayerName={playerName}
              lastSubmittedScoreId={lastSubmittedScoreId}
            />
          )}
        </div>
      )}
    </div>
  )
}
