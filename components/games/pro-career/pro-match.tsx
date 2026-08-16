"use client"

import { useState, useEffect, useRef } from "react"
import {
  ProCareer,
  ProClub,
  ProMatchMoment,
  ProMomentChoice,
  ProMomentOutcome,
  ProMatchResult
} from "@/lib/pro-types"
import {
  generateKeyMomentsForMatch,
  resolveMomentChoice,
  simulateFullMatch,
  attemptMatchFixing
} from "@/lib/pro-engine"
import { proAudio } from "@/lib/pro-audio"
import { ProAvatarRenderer } from "./pro-avatar"
import {
  Shield,
  Clock,
  Play,
  Zap,
  Activity,
  ArrowRight,
  Sparkles,
  Volume2,
  VolumeX,
  Trophy,
  AlertTriangle,
  Newspaper,
  CheckCircle2
} from "lucide-react"

interface ProMatchProps {
  career: ProCareer
  playerClub: ProClub
  opponentClub: ProClub
  isHome: boolean
  onFinishMatch: (result: ProMatchResult) => void
}

type MatchPhase = "pre_match" | "simulating" | "key_moment" | "moment_resolved" | "post_match"

export function ProMatch({
  career,
  playerClub,
  opponentClub,
  isHome,
  onFinishMatch
}: ProMatchProps) {
  const [phase, setPhase] = useState<MatchPhase>("pre_match")
  const [matchMinute, setMatchMinute] = useState(0)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [isMatchFixed, setIsMatchFixed] = useState(false)
  const [fixResultMsg, setFixResultMsg] = useState("")

  const [moments, setMoments] = useState<ProMatchMoment[]>([])
  const [activeMomentIndex, setActiveMomentIndex] = useState<number>(0)
  const [resolvedMoments, setResolvedMoments] = useState<ProMatchMoment[]>([])

  const [commentaryLog, setCommentaryLog] = useState<string[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [finalResult, setFinalResult] = useState<ProMatchResult | null>(null)
  const [screenShake, setScreenShake] = useState(false)

  // Track resolved moment IDs with a ref to prevent double triggers
  const resolvedIdsRef = useRef<Set<string>>(new Set())

  // Trigger screen shake on decisive moments
  const triggerScreenShake = () => {
    setScreenShake(true)
    setTimeout(() => setScreenShake(false), 600)
  }

  // Pre-match Initialization
  const handleStartMatch = () => {
    proAudio.playWhistle()
    const generatedMoments = generateKeyMomentsForMatch(
      career,
      playerClub,
      opponentClub,
      isHome
    )
    setMoments(generatedMoments)
    setActiveMomentIndex(0)
    resolvedIdsRef.current.clear()
    setResolvedMoments([])
    setMatchMinute(0)
    setHomeScore(0)
    setAwayScore(0)
    setPhase("simulating")
    setCommentaryLog([
      `0' Свисток арбітра! Матч між ${playerClub.name} та ${opponentClub.name} розпочався!`,
      `5' ${playerClub.name} контролює м'яч на своїй половині поля, ${career.first_name} ${career.last_name} займає позицію.`
    ])
  }

  // Match-Fixing Attempt in Pre-match
  const handleFixMatch = () => {
    const res = attemptMatchFixing(career, opponentClub)
    setFixResultMsg(res.message)
    if (res.success) {
      proAudio.playTrophyChime()
      setIsMatchFixed(true)
    } else {
      proAudio.playMiss()
      setIsMatchFixed(false)
    }
  }

  // Complete Match Calculation
  const handleCompleteMatch = () => {
    proAudio.playWhistle()
    const result = simulateFullMatch(
      career,
      playerClub,
      opponentClub,
      isHome,
      resolvedMoments,
      isMatchFixed
    )
    setFinalResult(result)
    setHomeScore(result.home_score)
    setAwayScore(result.away_score)
    setPhase("post_match")

    // Automatically trigger voice coach commentary if available
    proAudio.speakUkrainian(result.coach_commentary)
    setIsSpeaking(true)
  }

  // Live Timer Simulation Loop (Robust, bug-free, zero-freeze)
  useEffect(() => {
    if (phase !== "simulating") return

    const timer = setInterval(() => {
      setMatchMinute((prev) => {
        const nextMin = prev + 1

        // Check if full time (90') reached
        if (nextMin >= 90) {
          clearInterval(timer)
          handleCompleteMatch()
          return 90
        }

        // Check for upcoming unresolved key moment
        const currentMoment = moments[activeMomentIndex]
        if (
          currentMoment &&
          !resolvedIdsRef.current.has(currentMoment.id) &&
          nextMin >= currentMoment.minute
        ) {
          clearInterval(timer)
          proAudio.playHeartbeat()
          setPhase("key_moment")
          return currentMoment.minute
        }

        // Random background pitch events
        if (nextMin === 45) {
          setCommentaryLog((c) => [
            `45' Перерва! Команди вирушають у роздягальню для коригування тактики.`,
            ...c
          ])
        }

        return nextMin
      })
    }, 110)

    return () => clearInterval(timer)
  }, [phase, activeMomentIndex, moments])

  // Select Choice in Key Moment
  const handleSelectChoice = (choice: ProMomentChoice) => {
    proAudio.playClick()
    const currentMoment = moments[activeMomentIndex]
    if (!currentMoment) return

    const outcome = resolveMomentChoice(
      career,
      currentMoment,
      choice,
      opponentClub.squad_strength
    )

    if (outcome.result_type === "goal") {
      proAudio.playGoalExplosion()
      triggerScreenShake()
      if (isHome) setHomeScore((h) => h + 1)
      else setAwayScore((a) => a + 1)
    } else if (outcome.result_type === "assist") {
      proAudio.playTrophyChime()
      if (isHome) setHomeScore((h) => h + 1)
      else setAwayScore((a) => a + 1)
    } else if (outcome.success) {
      proAudio.playClick()
    } else {
      proAudio.playMiss()
    }

    const resolved: ProMatchMoment = {
      ...currentMoment,
      outcome
    }

    resolvedIdsRef.current.add(currentMoment.id)
    setResolvedMoments((r) => [...r, resolved])
    setCommentaryLog((c) => [
      `${currentMoment.minute}' [КЛЮЧОВИЙ МОМЕНТ] ${outcome.commentary}`,
      ...c
    ])

    setPhase("moment_resolved")
  }

  // Resume Simulation after resolving key moment (Advances index & minute seamlessly!)
  const handleResumeMatch = () => {
    proAudio.playClick()
    const currentMoment = moments[activeMomentIndex]
    const nextMinute = currentMoment ? currentMoment.minute + 1 : matchMinute + 1

    setMatchMinute(nextMinute)
    setActiveMomentIndex((prev) => prev + 1)
    setPhase("simulating")
  }

  const toggleVoiceCoach = () => {
    if (isSpeaking) {
      proAudio.stopSpeech()
      setIsSpeaking(false)
    } else if (finalResult?.coach_commentary) {
      proAudio.speakUkrainian(finalResult.coach_commentary)
      setIsSpeaking(true)
    }
  }

  const activeMoment = moments[activeMomentIndex]
  const homeClubObj = isHome ? playerClub : opponentClub
  const awayClubObj = isHome ? opponentClub : playerClub

  return (
    <div
      className={`max-w-[1200px] mx-auto w-full space-y-6 animate-fade-in ${
        screenShake ? "animate-bounce" : ""
      }`}
    >
      {/* ─── LIVE MATCH SCOREBOARD ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 border-2 border-emerald-500/50 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {homeClubObj.logo_url ? (
              <img
                src={homeClubObj.logo_url}
                alt={homeClubObj.name}
                className="w-12 h-12 object-contain drop-shadow shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${homeClubObj.primary_color}, ${homeClubObj.secondary_color})`
                }}
              >
                <Shield className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-black text-sm sm:text-base text-white truncate">
                {homeClubObj.name}
              </h3>
              <span className="text-[10px] text-slate-400">Господарі ({homeClubObj.city})</span>
            </div>
          </div>

          {/* Dynamic Score & Clock Display */}
          <div className="flex flex-col items-center px-4 sm:px-6 py-2 rounded-2xl bg-slate-900 border border-slate-800 shrink-0">
            <div className="flex items-center gap-2 text-2xl sm:text-4xl font-black text-amber-300 font-mono tracking-wider">
              <span>{homeScore}</span>
              <span className="text-slate-600">:</span>
              <span>{awayScore}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{matchMinute}&apos;</span>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-end gap-3 flex-1 min-w-0 text-right">
            <div className="min-w-0">
              <h3 className="font-black text-sm sm:text-base text-white truncate">
                {awayClubObj.name}
              </h3>
              <span className="text-[10px] text-slate-400">Гості ({awayClubObj.city})</span>
            </div>
            {awayClubObj.logo_url ? (
              <img
                src={awayClubObj.logo_url}
                alt={awayClubObj.name}
                className="w-12 h-12 object-contain drop-shadow shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${awayClubObj.primary_color}, ${awayClubObj.secondary_color})`
                }}
              >
                <Shield className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── PHASE 1: PRE-MATCH TACTICS & START ─── */}
      {phase === "pre_match" && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6 text-center animate-fade-in">
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-black text-white">
              Матч {career.current_fixture_round}-го туру
            </h3>
            <p className="text-xs text-slate-400">
              {playerClub.name} зустрічається з {opponentClub.name} на стадіоні «{playerClub.stadium_name}».
            </p>
          </div>

          {/* Match-Fixing (Договірний матч) Option */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-md mx-auto text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Договірний матч (Тіньовий контакт):
              </span>
              {isMatchFixed ? (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
                  Домовлено ✓
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleFixMatch}
                  className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[10px] font-black border border-amber-400/40 cursor-pointer"
                >
                  Запропонувати ₴
                </button>
              )}
            </div>
            {fixResultMsg && (
              <p className="text-[11px] text-amber-300/90 font-medium">
                {fixResultMsg}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleStartMatch}
            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-slate-950 font-black text-sm inline-flex items-center gap-2 shadow-2xl shadow-emerald-950 transition-all active:scale-95 cursor-pointer animate-pulse"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Вийти на поле & Розпочати Матч</span>
          </button>
        </div>
      )}

      {/* ─── PHASE 2 & 3: LIVE MATCH & KEY MOMENTS ─── */}
      {(phase === "simulating" ||
        phase === "key_moment" ||
        phase === "moment_resolved") && (
        <div className="space-y-4">
          {/* BULLET TIME KEY MOMENT CARD */}
          {phase === "key_moment" && activeMoment && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/80 border-2 border-amber-400 p-6 sm:p-8 shadow-2xl space-y-6 animate-scale-up">
              {/* Bullet Time Header */}
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider animate-pulse">
                  ⚡ BULLET-TIME: Твій вирішальний момент!
                </span>
                <span className="text-xs font-bold text-amber-300 font-mono">
                  {activeMoment.minute}&apos; хвилина
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {activeMoment.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  {activeMoment.situation_text}
                </p>
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

          {/* Match Financial Earnings Breakdown */}
          {finalResult.earnings && (
            <div className="max-w-md mx-auto p-4 rounded-3xl bg-slate-950/90 border border-emerald-500/40 text-left space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  💰 Заробіток за тур:
                </span>
                <strong className="text-sm font-black text-emerald-300 font-mono">
                  +{finalResult.earnings.total.toLocaleString()} ₴
                </strong>
              </div>

              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Зарплата за контрактом:</span>
                  <span className="font-mono">+{finalResult.earnings.wage.toLocaleString()} ₴</span>
                </div>
                {finalResult.earnings.goal_bonus > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Премія за {finalResult.player_goals} гол(ів):</span>
                    <span className="text-amber-300 font-mono">+{finalResult.earnings.goal_bonus.toLocaleString()} ₴</span>
                  </div>
                )}
                {finalResult.earnings.assist_bonus > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Премія за {finalResult.player_assists} асист(ів):</span>
                    <span className="text-emerald-300 font-mono">+{finalResult.earnings.assist_bonus.toLocaleString()} ₴</span>
                  </div>
                )}
                {finalResult.earnings.win_bonus > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Бонус за перемогу команди:</span>
                    <span className="text-teal-300 font-mono">+{finalResult.earnings.win_bonus.toLocaleString()} ₴</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Smart Coach Feedback Dialogue (with Voice TTS) */}
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left text-xs text-slate-300 space-y-2 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="font-black text-amber-400">
                Головний тренер ({playerClub.name}):
              </div>

              <button
                type="button"
                onClick={toggleVoiceCoach}
                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-400 flex items-center gap-1 text-[10px] font-bold border border-slate-800 cursor-pointer"
                title="Озвучити коментар тренера"
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{isSpeaking ? "Вимкнути голос" : "Озвучити"}</span>
              </button>
            </div>
            <p className="italic text-slate-200 leading-relaxed">
              {finalResult.coach_commentary}
            </p>
          </div>

          {/* Newspaper Press Review Card */}
          {finalResult.news_article && (
            <div className="max-w-md mx-auto p-5 rounded-3xl bg-amber-950/20 border border-amber-500/40 text-left space-y-2 shadow-xl">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1.5">
                  <Newspaper className="w-4 h-4" />
                  {finalResult.news_article.newspaper_name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {finalResult.news_article.date_str}
                </span>
              </div>
              <h4 className="font-black text-white text-xs sm:text-sm">
                {finalResult.news_article.headline}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {finalResult.news_article.text}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => onFinishMatch(finalResult)}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 mx-auto shadow-xl shadow-emerald-950 transition-all active:scale-95 cursor-pointer"
          >
            <span>Завершити тур & Продовжити</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
