"use client"

import { useState, useEffect, useRef } from "react"
import {
  FMClub,
  FMPlayer,
  FMTactics,
  FMStadium,
  FMMatch,
  FMMatchEvent
} from "@/lib/fm-types"
import { simulateFullMatch, calculateTeamPower, SimulationResult } from "@/lib/fm-engine"
import {
  fmGetOpponentClubs,
  fmSaveCompletedMatch,
  fmGetClubPlayers,
  fmGetTactics
} from "@/lib/fm-database"
import { fmAudio } from "@/lib/fm-audio"
import {
  Play,
  FastForward,
  Zap,
  SkipForward,
  Pause,
  Trophy,
  Shield,
  Clock,
  TrendingUp,
  Award,
  DollarSign,
  Activity,
  ArrowRight,
  Flame
} from "lucide-react"

interface FMMatchCenterProps {
  userClub: FMClub
  userPlayers: FMPlayer[]
  userTactics: FMTactics
  userStadium: FMStadium
  onMatchFinished: (updatedClub: FMClub, updatedPlayers: FMPlayer[]) => void
}

export function FMMatchCenter({
  userClub,
  userPlayers,
  userTactics,
  userStadium,
  onMatchFinished
}: FMMatchCenterProps) {
  const [opponents, setOpponents] = useState<FMClub[]>([])
  const [selectedOpponent, setSelectedOpponent] = useState<FMClub | null>(null)
  const [matchType, setMatchType] = useState<"friendly" | "league">("league")

  // Live Simulation state
  const [isSimulating, setIsSimulating] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [simSpeed, setSimSpeed] = useState<number>(1) // 1 = 1x (600ms), 2 = 2x (300ms), 5 = 5x (100ms)
  const [isPaused, setIsPaused] = useState(false)

  const [currentMinute, setCurrentMinute] = useState(0)
  const [liveEvents, setLiveEvents] = useState<FMMatchEvent[]>([])
  const [currentHomeScore, setCurrentHomeScore] = useState(0)
  const [currentAwayScore, setCurrentAwayScore] = useState(0)
  const [fullSimResult, setFullSimResult] = useState<SimulationResult | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const commentaryEndRef = useRef<HTMLDivElement | null>(null)

  // Load rival clubs
  useEffect(() => {
    fmGetOpponentClubs(userClub.id).then((list) => {
      setOpponents(list)
      if (list.length > 0) {
        setSelectedOpponent(list[0])
      }
    })
  }, [userClub.id])

  // Scroll to bottom of commentary
  useEffect(() => {
    if (commentaryEndRef.current) {
      commentaryEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [liveEvents])

  // Start Match Simulation
  const handleStartMatch = async () => {
    if (!selectedOpponent) return
    fmAudio.playWhistle()

    // Fetch opponent players & tactics
    const oppPlayers = await fmGetClubPlayers(selectedOpponent.id)
    const oppTactics = await fmGetTactics(selectedOpponent.id)

    // Run underlying simulation engine
    const result = simulateFullMatch(
      userClub,
      selectedOpponent,
      userPlayers,
      oppPlayers,
      userTactics,
      oppTactics,
      userStadium,
      matchType
    )

    setFullSimResult(result)
    setCurrentMinute(1)
    setCurrentHomeScore(0)
    setCurrentAwayScore(0)
    setLiveEvents([result.match.events_log[0]])
    setIsSimulating(true)
    setIsFinished(false)
    setIsPaused(false)
  }

  // Simulation Tick Loop
  useEffect(() => {
    if (!isSimulating || isFinished || isPaused || !fullSimResult) return

    const intervalTime = simSpeed === 5 ? 80 : simSpeed === 2 ? 250 : 600

    timerRef.current = setTimeout(() => {
      setCurrentMinute((prevMin) => {
        const nextMin = prevMin + 1

        // Check if there are events at this minute
        const eventsAtThisMin = fullSimResult.match.events_log.filter(
          (e) => e.minute === nextMin && nextMin > 1
        )

        if (eventsAtThisMin.length > 0) {
          eventsAtThisMin.forEach((evt) => {
            if (evt.type === "goal") {
              fmAudio.playGoal()
              if (evt.is_home) setCurrentHomeScore((s) => s + 1)
              else setCurrentAwayScore((s) => s + 1)
            } else if (evt.type === "yellow_card" || evt.type === "red_card") {
              fmAudio.playCardAlert(evt.type === "red_card")
            } else if (evt.type === "whistle") {
              fmAudio.playWhistle()
            }
          })
          setLiveEvents((prev) => [...prev, ...eventsAtThisMin])
        }

        if (nextMin >= 90) {
          // Finish Match
          setIsFinished(true)
          setIsSimulating(false)
          setCurrentHomeScore(fullSimResult.match.home_score)
          setCurrentAwayScore(fullSimResult.match.away_score)
          if (fullSimResult.match.home_score > fullSimResult.match.away_score) {
            fmAudio.playLevelUp()
          } else {
            fmAudio.playWhistle()
          }
          return 90
        }

        return nextMin
      })
    }, intervalTime)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isSimulating, isFinished, isPaused, currentMinute, simSpeed, fullSimResult])

  // Instant Skip
  const handleInstantSkip = () => {
    if (!fullSimResult) return
    fmAudio.playWhistle()
    if (timerRef.current) clearTimeout(timerRef.current)
    setCurrentMinute(90)
    setCurrentHomeScore(fullSimResult.match.home_score)
    setCurrentAwayScore(fullSimResult.match.away_score)
    setLiveEvents(fullSimResult.match.events_log)
    setIsFinished(true)
    setIsSimulating(false)
    if (fullSimResult.match.home_score > fullSimResult.match.away_score) {
      fmAudio.playLevelUp()
    }
  }

  // Claim Rewards & Save to DB
  const handleClaimRewards = async () => {
    if (!fullSimResult) return
    fmAudio.playCoins()
    const { updatedClub } = await fmSaveCompletedMatch(fullSimResult, userClub)
    onMatchFinished(updatedClub, fullSimResult.updatedHomePlayers)
    setIsSimulating(false)
    setIsFinished(false)
    setFullSimResult(null)
  }

  const userPower = calculateTeamPower(userPlayers, userTactics)

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-10 text-white">
      {/* ─── SCENARIO 1: MATCH SELECTION & PRE-MATCH ─── */}
      {!isSimulating && !isFinished && (
        <div className="space-y-6">
          {/* Match Mode Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => {
                setMatchType("league")
                fmAudio.playClick()
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                matchType === "league"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>KS Прем'єр Ліга</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMatchType("friendly")
                fmAudio.playClick()
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                matchType === "friendly"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Flame className="h-4 w-4" />
              <span>Товариський матч</span>
            </button>
          </div>

          {/* Head to Head Duel Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              {/* Home Team (User) */}
              <div className="flex flex-col items-center text-center space-y-2.5 w-full md:w-1/3">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border-2"
                  style={{
                    background: `linear-gradient(135deg, ${userClub.primary_color}, ${userClub.secondary_color})`,
                    borderColor: userClub.secondary_color
                  }}
                >
                  <Shield className="h-10 w-10 text-white drop-shadow" />
                </div>
                <div>
                  <div className="text-lg font-black text-white">{userClub.name}</div>
                  <div className="text-xs text-emerald-400 font-bold">Господарі • {userClub.city}</div>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-xs font-black text-emerald-400">
                  Сила: {userPower.overall}
                </div>
              </div>

              {/* VS Banner */}
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-sm text-amber-400 shadow-inner">
                  VS
                </div>
                <div className="text-[11px] font-bold text-slate-400">
                  {userStadium.name} ({userStadium.capacity.toLocaleString()} місць)
                </div>
                <button
                  type="button"
                  onClick={handleStartMatch}
                  disabled={!selectedOpponent}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-950 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Play className="h-5 w-5 fill-slate-950" />
                  <span>Розпочати матч!</span>
                </button>
              </div>

              {/* Away Team (Opponent) */}
              {selectedOpponent && (
                <div className="flex flex-col items-center text-center space-y-2.5 w-full md:w-1/3">
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border-2"
                    style={{
                      background: `linear-gradient(135deg, ${selectedOpponent.primary_color}, ${selectedOpponent.secondary_color})`,
                      borderColor: selectedOpponent.secondary_color
                    }}
                  >
                    <Shield className="h-10 w-10 text-white drop-shadow" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-white">{selectedOpponent.name}</div>
                    <div className="text-xs text-slate-400 font-bold">Гості • {selectedOpponent.city}</div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-black text-amber-400">
                    Репутація: {selectedOpponent.reputation}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Opponent Selector Grid */}
          <div className="space-y-3">
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Оберіть суперника для зустрічі:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {opponents.map((opp) => {
                const isSelected = selectedOpponent?.id === opp.id
                return (
                  <button
                    key={opp.id}
                    type="button"
                    onClick={() => {
                      setSelectedOpponent(opp)
                      fmAudio.playClick()
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      isSelected
                        ? "bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{
                        background: `linear-gradient(135deg, ${opp.primary_color}, ${opp.secondary_color})`,
                        borderColor: opp.secondary_color
                      }}
                    >
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{opp.name}</div>
                      <div className="text-[10px] text-slate-400">{opp.city}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── SCENARIO 2: LIVE MATCH SIMULATION DISPLAY ─── */}
      {(isSimulating || isFinished) && fullSimResult && selectedOpponent && (
        <div className="space-y-6 animate-in fade-in">
          {/* LED Stadium Scoreboard */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/40 p-5 sm:p-7 shadow-2xl">
            {/* Header stadium & minute ticker */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                  {isFinished ? "ФІНАЛЬНИЙ РАХУНОК" : "ПРЯМИЙ ЕФІР МАТЧУ"}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-black text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                <span>{currentMinute}' хв</span>
              </div>
            </div>

            {/* Teams and Score Digits */}
            <div className="grid grid-cols-3 items-center text-center">
              {/* Home Team */}
              <div className="flex flex-col items-center space-y-2">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg border"
                  style={{
                    background: `linear-gradient(135deg, ${userClub.primary_color}, ${userClub.secondary_color})`,
                    borderColor: userClub.secondary_color
                  }}
                >
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <div className="text-xs sm:text-base font-black text-white truncate max-w-[120px]">
                  {userClub.name}
                </div>
              </div>

              {/* Digital Scoreboard Numbers */}
              <div className="flex flex-col items-center justify-center">
                <div className="text-4xl sm:text-6xl font-black tracking-widest text-emerald-400 font-mono drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                  {currentHomeScore} : {currentAwayScore}
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                  {matchType === "league" ? "KS Прем'єр Ліга" : "Товариський"}
                </div>
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center space-y-2">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg border"
                  style={{
                    background: `linear-gradient(135deg, ${selectedOpponent.primary_color}, ${selectedOpponent.secondary_color})`,
                    borderColor: selectedOpponent.secondary_color
                  }}
                >
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <div className="text-xs sm:text-base font-black text-white truncate max-w-[120px]">
                  {selectedOpponent.name}
                </div>
              </div>
            </div>

            {/* Simulation Speed & Controls Bar */}
            {!isFinished && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
                  title={isPaused ? "Продовжити" : "Пауза"}
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSimSpeed(1)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    simSpeed === 1 ? "bg-emerald-600 text-white shadow-md" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  1x
                </button>

                <button
                  type="button"
                  onClick={() => setSimSpeed(2)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    simSpeed === 2 ? "bg-emerald-600 text-white shadow-md" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  2x
                </button>

                <button
                  type="button"
                  onClick={() => setSimSpeed(5)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    simSpeed === 5 ? "bg-emerald-600 text-white shadow-md" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  5x ⚡
                </button>

                <button
                  type="button"
                  onClick={handleInstantSkip}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1 ml-2"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  <span>Миттєво</span>
                </button>
              </div>
            )}
          </div>

          {/* 2-Column: Live Commentary Stream & Match Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live Text Commentary (7 cols) */}
            <div className="lg:col-span-7 p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3 flex flex-col h-[380px]">
              <div className="text-xs font-black uppercase text-slate-400 tracking-wider border-b border-slate-800 pb-2 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <span>Текстова трансляція</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {liveEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl text-xs font-medium border leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                      evt.type === "goal"
                        ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300 font-bold shadow-md"
                        : evt.type === "yellow_card"
                        ? "bg-amber-950/60 border-amber-500/40 text-amber-200"
                        : evt.type === "save"
                        ? "bg-blue-950/60 border-blue-500/40 text-blue-200"
                        : "bg-slate-950/60 border-slate-800/80 text-slate-300"
                    }`}
                  >
                    {evt.text}
                  </div>
                ))}
                <div ref={commentaryEndRef} />
              </div>
            </div>

            {/* Live Match Statistics (5 cols) */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <div className="text-xs font-black uppercase text-slate-400 tracking-wider border-b border-slate-800 pb-2">
                Статистика зустрічі
              </div>

              {/* Possession bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-black">
                  <span className="text-emerald-400">{fullSimResult.match.stats.home_possession}%</span>
                  <span className="text-slate-400">Володіння м'ячем</span>
                  <span className="text-amber-400">{fullSimResult.match.stats.away_possession}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${fullSimResult.match.stats.home_possession}%` }}
                  />
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${fullSimResult.match.stats.away_possession}%` }}
                  />
                </div>
              </div>

              {/* Stat Rows */}
              {[
                {
                  label: "Удари по воротах",
                  h: fullSimResult.match.stats.home_shots,
                  a: fullSimResult.match.stats.away_shots
                },
                {
                  label: "У площину воріт",
                  h: fullSimResult.match.stats.home_shots_on_target,
                  a: fullSimResult.match.stats.away_shots_on_target
                },
                {
                  label: "Очікувані голи (xG)",
                  h: fullSimResult.match.stats.home_xg,
                  a: fullSimResult.match.stats.away_xg
                },
                {
                  label: "Кутові удари",
                  h: fullSimResult.match.stats.home_corners,
                  a: fullSimResult.match.stats.away_corners
                },
                {
                  label: "Фоли",
                  h: fullSimResult.match.stats.home_fouls,
                  a: fullSimResult.match.stats.away_fouls
                },
                {
                  label: "Жовті картки",
                  h: fullSimResult.match.stats.home_yellows,
                  a: fullSimResult.match.stats.away_yellows
                }
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center text-xs py-1 border-b border-slate-800/40">
                  <span className="font-black text-white w-8 text-left">{row.h}</span>
                  <span className="text-slate-400 font-bold text-[11px] text-center flex-1">{row.label}</span>
                  <span className="font-black text-white w-8 text-right">{row.a}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Post-Match Celebration & Claim Modal ─── */}
          {isFinished && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/80 to-slate-900 border-2 border-emerald-500 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-300">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-400 font-black text-xs uppercase tracking-wider">
                <Trophy className="h-4 w-4" />
                Матч завершено!
              </div>

              <div className="text-xl sm:text-2xl font-black text-white">
                {currentHomeScore > currentAwayScore
                  ? "🎉 Перемога вашої команди!"
                  : currentHomeScore === currentAwayScore
                  ? "🤝 Бойова нічия!"
                  : "Поразка. Проаналізуйте тактику та повертайтеся сильнішими!"}
              </div>

              {/* Financial & XP Reward Badges */}
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                <div className="p-3 rounded-2xl bg-slate-950/90 border border-emerald-500/40 flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400 font-bold">Призові & Квитки</div>
                    <div className="text-base font-black text-emerald-400">
                      +{fullSimResult.homeRevenue.toLocaleString()} ₴
                    </div>
                  </div>
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/90 border border-amber-500/40 flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400 font-bold">Досвід менеджера</div>
                    <div className="text-base font-black text-amber-400">
                      +{fullSimResult.managerXpEarned} XP
                    </div>
                  </div>
                  <Award className="h-6 w-6 text-amber-400" />
                </div>
              </div>

              <button
                type="button"
                onClick={handleClaimRewards}
                className="w-full max-w-sm mx-auto py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Забрати нагороди та повернутися</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
