"use client"

import { useState, useEffect, useRef } from "react"
import {
  ProCareer,
  ProClub,
  ProMatchMoment,
  ProMomentChoice,
  ProMatchResult
} from "@/lib/pro-types"
import {
  generateKeyMomentsForMatch,
  resolveMomentChoice,
  simulateFullMatch
} from "@/lib/pro-engine"
import { proAudio } from "@/lib/pro-audio"
import {
  Shield,
  Play,
  Sparkles,
  Zap,
  Flame,
  Award,
  ArrowRight,
  TrendingUp,
  Clock,
  Activity,
  Heart
} from "lucide-react"

interface ProMatchProps {
  career: ProCareer
  playerClub: ProClub
  opponentClub: ProClub
  isHome: boolean
  onFinishMatch: (result: ProMatchResult) => void
}

type MatchPhase = "pre_match" | "live_sim" | "moment_decision" | "moment_resolved" | "post_match"

export function ProMatch({
  career,
  playerClub,
  opponentClub,
  isHome,
  onFinishMatch
}: ProMatchProps) {
  const [phase, setPhase] = useState<MatchPhase>("pre_match")
  const [minute, setMinute] = useState(0)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [commentaryLog, setCommentaryLog] = useState<string[]>([])

  const [moments, setMoments] = useState<ProMatchMoment[]>([])
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0)
  const [activeMoment, setActiveMoment] = useState<ProMatchMoment | null>(null)
  const [selectedChoice, setSelectedChoice] = useState<ProMomentChoice | null>(null)
  const [finalResult, setFinalResult] = useState<ProMatchResult | null>(null)
  const [screenShake, setScreenShake] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize Key Moments on mount
  useEffect(() => {
    const genMoments = generateKeyMomentsForMatch(
      career,
      playerClub,
      opponentClub,
      isHome
    )
    setMoments(genMoments)
  }, [career, playerClub, opponentClub, isHome])

  const handleStartMatch = () => {
    proAudio.playWhistle()
    setPhase("live_sim")
    setCommentaryLog([
      `📢 Стартовий свисток на стадіоні «${
        isHome ? playerClub.stadium_name : opponentClub.stadium_name
      }»!`,
      `👥 Трибуни зустрічають команди гучними оплесками!`
    ])
    startClock(0, 0, 0, 0)
  }

  const startClock = (
    startMin: number,
    momentIdx: number,
    currHome: number,
    currAway: number
  ) => {
    let currentMin = startMin
    let mIdx = momentIdx

    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      currentMin += 2
      setMinute(currentMin)

      // Check if we hit a key moment
      if (mIdx < moments.length && currentMin >= moments[mIdx].minute) {
        if (timerRef.current) clearInterval(timerRef.current)
        const targetMoment = moments[mIdx]
        setActiveMoment(targetMoment)
        setCurrentMomentIndex(mIdx)
        setPhase("moment_decision")
        proAudio.playHeartbeat()
        setCommentaryLog((prev) => [
          `⚡ ${targetMoment.minute}' КЛЮЧОВИЙ МОМЕНТ: ${targetMoment.title}!`,
          ...prev
        ])
        return
      }

      // Random background events
      if (currentMin === 35 && Math.random() < 0.3) {
        setCommentaryLog((prev) => [
          `35' Напружена боротьба у центрі поля. Обидві команди обережно контролюють м'яч.`,
          ...prev
        ])
      }

      // Check End of Match at 90'
      if (currentMin >= 90) {
        if (timerRef.current) clearInterval(timerRef.current)
        finishMatchSimulation(moments)
      }
    }, 120)
  }

  const handleSelectChoice = (choice: ProMomentChoice) => {
    if (!activeMoment) return
    proAudio.playClick()
    setSelectedChoice(choice)

    const outcome = resolveMomentChoice(
      career,
      activeMoment,
      choice,
      opponentClub.squad_strength
    )

    const updatedMoment: ProMatchMoment = {
      ...activeMoment,
      chosen_option_index: activeMoment.choices.findIndex((c) => c.id === choice.id),
      outcome
    }

    const updatedMomentsList = [...moments]
    updatedMomentsList[currentMomentIndex] = updatedMoment
    setMoments(updatedMomentsList)
    setActiveMoment(updatedMoment)
    setPhase("moment_resolved")

    // Sound & Visual Celebrations
    if (outcome.result_type === "goal") {
      proAudio.playGoalExplosion()
      setScreenShake(true)
      setTimeout(() => setScreenShake(false), 600)
      if (isHome) {
        setHomeScore((s) => s + 1)
      } else {
        setAwayScore((s) => s + 1)
      }
    } else if (outcome.result_type === "assist") {
      proAudio.playGoalExplosion()
      if (isHome) {
        setHomeScore((s) => s + 1)
      } else {
        setAwayScore((s) => s + 1)
      }
    } else if (outcome.success) {
      proAudio.playTrophyChime()
    } else {
      proAudio.playMiss()
    }

    setCommentaryLog((prev) => [
      `${activeMoment.minute}' ${outcome.commentary}`,
      ...prev
    ])
  }

  const handleResumeMatch = () => {
    proAudio.playClick()
    setPhase("live_sim")
    const nextIdx = currentMomentIndex + 1
    if (minute >= 90 || nextIdx >= moments.length) {
      finishMatchSimulation(moments)
    } else {
      startClock(minute, nextIdx, homeScore, awayScore)
    }
  }

  const finishMatchSimulation = (resolvedMoments: ProMatchMoment[]) => {
    proAudio.playWhistle()
    const result = simulateFullMatch(
      career,
      playerClub,
      opponentClub,
      isHome,
      resolvedMoments
    )

    setHomeScore(result.home_score)
    setAwayScore(result.away_score)
    setFinalResult(result)
    setPhase("post_match")
  }

  return (
    <div
      className={`max-w-4xl mx-auto w-full space-y-6 transition-transform ${
        screenShake ? "animate-shake" : ""
      }`}
    >
      {/* ─── PHASE 1: PRE-MATCH ATMOSPHERE ─── */}
      {phase === "pre_match" && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/40 p-6 sm:p-10 shadow-2xl text-center space-y-8 animate-fade-in">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              Тур {career.current_fixture_round} • {playerClub.region}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Передматчева Атмосфера
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Стадіон: <strong className="text-slate-200">{isHome ? playerClub.stadium_name : opponentClub.stadium_name}</strong> • Очікувана відвідуваність: {isHome ? playerClub.stadium_capacity : opponentClub.stadium_capacity} вболівальників
            </p>
          </div>

          {/* Versus Matchup Card */}
          <div className="grid grid-cols-3 items-center gap-4 max-w-lg mx-auto bg-slate-950/80 border border-slate-800 rounded-3xl p-6 shadow-inner">
            {/* Home Club */}
            <div className="flex flex-col items-center space-y-2">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/20"
                style={{
                  background: `linear-gradient(135deg, ${
                    isHome ? playerClub.primary_color : opponentClub.primary_color
                  }, ${isHome ? playerClub.secondary_color : opponentClub.secondary_color})`
                }}
              >
                <Shield className="w-8 h-8 text-white drop-shadow" />
              </div>
              <span className="text-sm font-black text-white text-center leading-tight">
                {isHome ? playerClub.name : opponentClub.name}
              </span>
              <span className="text-[10px] font-bold text-emerald-400">
                {isHome ? "ГОСПОДАРІ" : "ГОСТІ"}
              </span>
            </div>

            {/* VS Badge */}
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-amber-400 italic">VS</span>
              <span className="text-[11px] font-bold text-slate-500">11x11</span>
            </div>

            {/* Away Club */}
            <div className="flex flex-col items-center space-y-2">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/20"
                style={{
                  background: `linear-gradient(135deg, ${
                    !isHome ? playerClub.primary_color : opponentClub.primary_color
                  }, ${!isHome ? playerClub.secondary_color : opponentClub.secondary_color})`
                }}
              >
                <Shield className="w-8 h-8 text-white drop-shadow" />
              </div>
              <span className="text-sm font-black text-white text-center leading-tight">
                {!isHome ? playerClub.name : opponentClub.name}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {!isHome ? "ГОСПОДАРІ" : "ГОСТІ"}
              </span>
            </div>
          </div>

          {/* Player Pre-match Status */}
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Форма: <strong className="text-white">{career.form}%</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Енергія: <strong className="text-white">{career.energy}%</strong></span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartMatch}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-slate-950 font-black text-base flex items-center justify-center gap-2.5 mx-auto shadow-2xl shadow-emerald-950 transition-all active:scale-95 cursor-pointer animate-pulse"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Вийти на Поле!</span>
          </button>
        </div>
      )}

      {/* ─── PHASE 2 & 3: LIVE SIMULATION & DECISION TIME ─── */}
      {(phase === "live_sim" || phase === "moment_decision" || phase === "moment_resolved") && (
        <div className="space-y-6 animate-fade-in">
          {/* Master Live Scoreboard */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 p-5 sm:p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{isHome ? playerClub.short_name : opponentClub.short_name}</span>
                <span className="text-3xl font-black text-white font-mono">{homeScore}</span>
              </div>
              <span className="text-xl font-bold text-slate-600">:</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-white font-mono">{awayScore}</span>
                <span className="text-sm font-black text-white">{!isHome ? playerClub.short_name : opponentClub.short_name}</span>
              </div>
            </div>

            {/* Match Clock */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-700 shadow-inner">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-lg font-black text-amber-400 font-mono">
                {minute}&apos;
              </span>
            </div>

            {/* Player In-Game Tag */}
            <div className="text-right">
              <div className="text-xs font-black text-emerald-400">
                {career.last_name} ({career.position})
              </div>
              <div className="text-[11px] text-slate-400">
                {playerClub.name}
              </div>
            </div>
          </div>

          {/* DECISION / MOMENT BULLET-TIME MODAL */}
          {phase === "moment_decision" && activeMoment && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/90 border-2 border-amber-400/80 p-6 sm:p-8 shadow-2xl space-y-6 animate-scale-up">
              {/* Pulsing Bullet-Time Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    {activeMoment.minute}&apos; • КЛЮЧОВИЙ МОМЕНТ У ГРІ
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold animate-pulse">
                  <Heart className="w-4 h-4 fill-rose-500" />
                  <span>Час для рішення!</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {activeMoment.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                  {activeMoment.situation_text}
                </p>
              </div>

              {/* 2D Mini Pitch Visualizer */}
              <div className="relative w-full h-32 rounded-2xl bg-gradient-to-b from-emerald-900 to-emerald-950 border-2 border-emerald-500/40 overflow-hidden flex items-center justify-center shadow-inner">
                {/* Center Circle & Lines */}
                <div className="absolute inset-x-0 h-0.5 bg-white/20 top-1/2 -translate-y-1/2" />
                <div className="absolute w-20 h-20 rounded-full border border-white/20" />
                <div className="absolute inset-y-0 w-24 border border-white/20 right-0" />

                {/* Player Ball Indicator */}
                <div className="relative flex flex-col items-center animate-bounce">
                  <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-lg border border-white">
                    ⚽
                  </div>
                  <span className="text-[10px] font-bold text-white bg-slate-950/90 px-1.5 py-0.5 rounded mt-1">
                    {career.last_name}
                  </span>
                </div>
              </div>

              {/* Choices Options */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-400">
                  Обери свою дію в епізоді:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeMoment.choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => handleSelectChoice(choice)}
                      className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-left transition-all active:scale-95 shadow-md flex flex-col justify-between space-y-2 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-white group-hover:text-amber-300">
                          {choice.label}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            choice.risk_level === "low"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : choice.risk_level === "medium"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {choice.risk_level === "low"
                            ? "Низький ризик"
                            : choice.risk_level === "medium"
                            ? "Помірний"
                            : "Високий ризик"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-snug">
                        {choice.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MOMENT RESOLVED OUTCOME */}
          {phase === "moment_resolved" && activeMoment && activeMoment.outcome && (
            <div className="relative overflow-hidden rounded-3xl bg-slate-950 border-2 border-emerald-500/60 p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-fade-in">
              <div className="text-4xl">
                {activeMoment.outcome.result_type === "goal"
                  ? "🔥⚽ ГОООЛ!"
                  : activeMoment.outcome.result_type === "assist"
                  ? "✨🤝 АСИСТ!"
                  : activeMoment.outcome.success
                  ? "🛡️ ВДАЛА ДІЯ!"
                  : "⚠️ ПРОМАХ"}
              </div>

              <p className="text-base sm:text-lg font-black text-white max-w-lg mx-auto">
                {activeMoment.outcome.commentary}
              </p>

              <button
                type="button"
                onClick={handleResumeMatch}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-all active:scale-95 cursor-pointer"
              >
                <span>Продовжити матч</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Live Commentary Feed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              Текстовий коментар матчу:
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-xs">
              {commentaryLog.map((log, index) => (
                <div
                  key={index}
                  className={`p-2 rounded-xl ${
                    index === 0
                      ? "bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/30"
                      : "bg-slate-950 text-slate-400"
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── PHASE 4: POST-MATCH RESULTS & RATINGS ─── */}
      {phase === "post_match" && finalResult && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/40 p-6 sm:p-10 shadow-2xl text-center space-y-8 animate-scale-up">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              Фінальний свисток
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight">
              Підсумки Матчу
            </h2>
            <div className="text-4xl sm:text-5xl font-black text-amber-300 font-mono py-2">
              {finalResult.home_score} : {finalResult.away_score}
            </div>
            <p className="text-xs text-slate-400">
              {finalResult.home_club.name} проти {finalResult.away_club.name}
            </p>
          </div>

          {/* Player Match Rating Showcase Card */}
          <div className="max-w-md mx-auto bg-slate-950/90 border-2 border-amber-400/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">
                Оцінка за матч:
              </span>
              <span className="text-3xl font-black text-amber-300 font-mono">
                ⭐ {finalResult.player_rating.toFixed(1)}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center">
              <div>
                <div className="text-[10px] text-slate-400 font-bold">Голи</div>
                <div className="text-base font-black text-white">
                  {finalResult.player_goals}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold">Асисти</div>
                <div className="text-base font-black text-white">
                  {finalResult.player_assists}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold">Удари</div>
                <div className="text-base font-black text-white">
                  {finalResult.player_shots}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold">Відбори</div>
                <div className="text-base font-black text-white">
                  {finalResult.player_tackles}
                </div>
              </div>
            </div>
          </div>

          {/* Coach Feedback Dialogue */}
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left text-xs text-slate-300 space-y-1">
            <div className="font-black text-amber-400">
              Михайлович (Головний тренер):
            </div>
            <p>
              {finalResult.player_rating >= 8.0
                ? "«Неймовірний виступ! Сьогодні ти був справжнім лідером на полі. Всі Тучапи говорять про твою гру!»"
                : finalResult.player_rating >= 6.8
                ? "«Солідний матч, відпрацював на совість. Продовжуй у тому ж дусі на тренуваннях!»"
                : "«Сьогодні було важко, але не опускай руки. Попереду ще багато матчів!»"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onFinishMatch(finalResult)}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 mx-auto shadow-xl shadow-emerald-950 transition-all active:scale-95 cursor-pointer"
          >
            <span>Завершити матч & Зберегти</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
