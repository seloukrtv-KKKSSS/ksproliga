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
  Zap,
  SkipForward,
  Pause,
  Trophy,
  Shield,
  Clock,
  Award,
  DollarSign,
  Activity,
  ArrowRight,
  Flame
} from "lucide-react"

interface FMMatchCenterProps {
  userClub: FMClub
  userPlayers: FMPlayer[]
  userTactics: FMTactics | null
  userStadium: FMStadium | null
  onMatchFinished: () => void
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
  const [matchType, setMatchType] = useState<"friendly" | "league" | "cup">("cup")

  // Live Simulation state
  const [isSimulating, setIsSimulating] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [simSpeed, setSimSpeed] = useState<number>(1)
  const [isPaused, setIsPaused] = useState(false)
  const [currentMinute, setCurrentMinute] = useState(0)
  const [currentHomeScore, setCurrentHomeScore] = useState(0)
  const [currentAwayScore, setCurrentAwayScore] = useState(0)
  const [liveEvents, setLiveEvents] = useState<FMMatchEvent[]>([])
  const [fullSimResult, setFullSimResult] = useState<SimulationResult | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fmGetOpponentClubs(userClub.id).then((list) => {
      setOpponents(list)
      if (list.length > 0) setSelectedOpponent(list[0])
    })
  }, [userClub])

  const handleStartMatch = async () => {
    if (!selectedOpponent) return
    fmAudio.playWhistle()

    const oppPlayers = await fmGetClubPlayers(selectedOpponent.id)
    const oppTactics = await fmGetTactics(selectedOpponent.id)

    const result = simulateFullMatch(
      userClub,
      userPlayers,
      userTactics,
      userStadium,
      selectedOpponent,
      oppPlayers,
      oppTactics,
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

  useEffect(() => {
    if (!isSimulating || isFinished || isPaused || !fullSimResult) return

    const intervalTime = simSpeed === 5 ? 80 : simSpeed === 2 ? 250 : 600

    timerRef.current = setTimeout(() => {
      setCurrentMinute((prevMin) => {
        const nextMin = prevMin + 1

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
            }
          })
          setLiveEvents((prev) => [...prev, ...eventsAtThisMin])
        }

        if (nextMin >= 90) {
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

  const handleClaimRewards = async () => {
    if (!fullSimResult) return
    fmAudio.playCoins()
    await fmSaveCompletedMatch(fullSimResult.match, fullSimResult.playerFatigueDrained, userClub.id)
    onMatchFinished()
    setIsSimulating(false)
    setIsFinished(false)
    setFullSimResult(null)
  }

  const userPower = calculateTeamPower(userPlayers, userTactics)

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-10 text-white">
      {!isSimulating && !isFinished && (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">Матч-Центр 11x11</h2>
              <p className="text-xs text-slate-400">Проведіть швидкий матч або товариську дуель</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMatchType("cup")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  matchType === "cup"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-950"
                    : "bg-slate-950 text-slate-400"
                }`}
              >
                Кубковий Матч 🏆
              </button>
              <button
                onClick={() => setMatchType("friendly")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  matchType === "friendly"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950"
                    : "bg-slate-950 text-slate-400"
                }`}
              >
                Товариський 🤝
              </button>
            </div>
          </div>

          {/* Duel Card */}
          {selectedOpponent && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <h3 className="text-lg font-black text-emerald-300">{userClub.name}</h3>
                  <span className="text-xs text-slate-400 block">Сила команди: {userPower.overall}</span>
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono">VS</div>
                <div className="flex-1 text-center sm:text-right space-y-2">
                  <h3 className="text-lg font-black text-slate-200">{selectedOpponent.name}</h3>
                  <span className="text-xs text-slate-400 block">{selectedOpponent.city}</span>
                </div>
              </div>

              <button
                onClick={handleStartMatch}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-950 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>Розпочати Матч!</span>
              </button>
            </div>
          )}

          {/* Opponents List */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {opponents.map((opp) => (
              <div
                key={opp.id}
                onClick={() => setSelectedOpponent(opp)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedOpponent?.id === opp.id
                    ? "bg-emerald-950/40 border-emerald-400"
                    : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                }`}
              >
                <h4 className="text-xs font-bold text-white truncate">{opp.name}</h4>
                <span className="text-[10px] text-slate-400">{opp.city}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIVE SIMULATION */}
      {(isSimulating || isFinished) && fullSimResult && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-950 border border-emerald-500/40 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-right font-black text-lg sm:text-xl text-white">
                {fullSimResult.match.home_club_name}
              </div>
              <div className="px-6 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-3xl sm:text-4xl font-black text-amber-400">
                {currentHomeScore} : {currentAwayScore}
              </div>
              <div className="flex-1 text-left font-black text-lg sm:text-xl text-white">
                {fullSimResult.match.away_club_name}
              </div>
            </div>

            <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 animate-spin" />
              <span>{currentMinute}' / 90'</span>
            </div>

            {!isFinished && (
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={() => setSimSpeed(1)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${simSpeed === 1 ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-400"}`}
                >
                  1x
                </button>
                <button
                  onClick={() => setSimSpeed(2)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${simSpeed === 2 ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-400"}`}
                >
                  2x
                </button>
                <button
                  onClick={() => setSimSpeed(5)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${simSpeed === 5 ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-400"}`}
                >
                  5x ⚡
                </button>
                <button
                  onClick={handleInstantSkip}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950"
                >
                  Миттєво ⏭️
                </button>
              </div>
            )}
          </div>

          {/* Events Log */}
          <div className="h-64 overflow-y-auto space-y-2 p-4 rounded-2xl bg-slate-900 border border-slate-800 scrollbar-thin">
            {liveEvents.map((evt, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-xs sm:text-sm ${
                  evt.type === "goal"
                    ? "bg-emerald-950/70 border-emerald-400 text-emerald-200 font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-300"
                }`}
              >
                <span className="font-mono text-slate-400 mr-2">[{evt.minute}']</span>
                <span>{evt.text}</span>
              </div>
            ))}
          </div>

          {/* Reward CTA */}
          {isFinished && (
            <div className="p-6 rounded-3xl bg-emerald-950/80 border-2 border-emerald-400 text-center space-y-3">
              <h3 className="text-xl font-black text-white">Матч Завершено!</h3>
              <p className="text-sm text-emerald-300 font-bold">
                Виручка: +{fullSimResult.match.revenue.toLocaleString()} ₴ • Досвід: +{fullSimResult.match.xp_reward} XP
              </p>
              <button
                onClick={handleClaimRewards}
                className="px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-950"
              >
                Забрати нагороду
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
