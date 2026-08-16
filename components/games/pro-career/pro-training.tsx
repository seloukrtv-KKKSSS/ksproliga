"use client"

import { useState, useEffect } from "react"
import { ProCareer, ProAttributes } from "@/lib/pro-types"
import { calculateOverallRating } from "@/lib/pro-engine"
import { proAudio } from "@/lib/pro-audio"
import {
  Dumbbell,
  Zap,
  Flame,
  Sparkles,
  Heart,
  Timer,
  CheckCircle2,
  Lock,
  Wallet
} from "lucide-react"

interface ProTrainingProps {
  career: ProCareer
  onUpdateCareer: (updated: ProCareer) => void
}

const REST_COOLDOWN_MS = 2 * 60 * 60 * 1000 // 2 hours
const SPA_COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes
const SPA_COST = 1500 // 1,500 ₴

export function ProTraining({ career, onUpdateCareer }: ProTrainingProps) {
  const [successMsg, setSuccessMsg] = useState("")
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Cooldown timers ticking every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const lastRest = career.last_rest_timestamp || 0
  const lastSpa = career.last_spa_timestamp || 0

  const restRemainingMs = Math.max(0, lastRest + REST_COOLDOWN_MS - currentTime)
  const spaRemainingMs = Math.max(0, lastSpa + SPA_COOLDOWN_MS - currentTime)

  const canRest = restRemainingMs === 0
  const canSpa = spaRemainingMs === 0 && (career.bank_balance || 0) >= SPA_COST

  const formatCountdown = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000)
    const hours = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60

    if (hours > 0) {
      return `${hours} год ${mins} хв`
    }
    return `${mins} хв ${secs} с`
  }

  // Training Drill Options
  const drills: {
    id: keyof ProAttributes
    name: string
    category: string
    energyCost: number
    gain: number
    icon: string
    description: string
  }[] = [
    {
      id: "pace",
      name: "Спринти з обтяжувачами",
      category: "Швидкість",
      energyCost: 15,
      gain: 1,
      icon: "⚡",
      description: "Розвиває вибуховий стартовий ривок на перших 10 метрах."
    },
    {
      id: "shooting",
      name: "Удари по дев'ятках",
      category: "Удар",
      energyCost: 15,
      gain: 1,
      icon: "🎯",
      description: "Відпрацювання гарматних ударів з льоту та з лінії штрафного."
    },
    {
      id: "passing",
      name: "Розрізні передачі в дотик",
      category: "Пас",
      energyCost: 12,
      gain: 1,
      icon: "📐",
      description: "Культура точного пасу крізь щільний захист суперника."
    },
    {
      id: "dribbling",
      name: "Слалом між стійками",
      category: "Дриблінг",
      energyCost: 14,
      gain: 1,
      icon: "✨",
      description: "Контроль м'яча на швидкості та різка зміна напрямку руху."
    },
    {
      id: "defending",
      name: "Відбір та перехоплення",
      category: "Захист",
      energyCost: 15,
      gain: 1,
      icon: "🛡️",
      description: "Правильний вибір позиції при читанні передач суперника."
    },
    {
      id: "physical",
      name: "Крос-фіт та тренажерний зал",
      category: "Фізика",
      energyCost: 18,
      gain: 1,
      icon: "🏋️",
      description: "Потужна м'язова маса для боротьби корпус у корпус."
    }
  ]

  const handleTrainDrill = (drill: typeof drills[0]) => {
    if (career.energy < drill.energyCost) {
      alert("Недостатньо енергії для тренування! Відпочиньте або скористайтеся СПА.")
      return
    }

    proAudio.playClick()

    const currentVal = (career.attributes as any)[drill.id] || 40
    if (currentVal >= 99) {
      alert("Цю навичку вже прокачано до максимуму!")
      return
    }

    const newAttributes = {
      ...career.attributes,
      [drill.id]: Math.min(99, currentVal + drill.gain)
    }

    const newOvr = calculateOverallRating(career.position, newAttributes)
    const newEnergy = Math.max(0, career.energy - drill.energyCost)
    const newForm = Math.min(100, career.form + 2)

    const updatedCareer: ProCareer = {
      ...career,
      attributes: newAttributes,
      overall_rating: newOvr,
      energy: newEnergy,
      form: newForm
    }

    onUpdateCareer(updatedCareer)
    setSuccessMsg(`💪 Тренування завершено! ${drill.name} (+${drill.gain} до ${drill.category})`)
    setTimeout(() => setSuccessMsg(""), 3000)
  }

  const handleFreeRest = () => {
    if (!canRest) return
    proAudio.playTrophyChime()

    const updatedCareer: ProCareer = {
      ...career,
      energy: 100,
      form: Math.min(100, career.form + 5),
      last_rest_timestamp: Date.now()
    }

    onUpdateCareer(updatedCareer)
    setSuccessMsg("🌿 Повноцінний сон та відпочинок! Енергію відновлено до 100%!")
    setTimeout(() => setSuccessMsg(""), 3500)
  }

  const handleSpaRecovery = () => {
    if (!canSpa) return
    proAudio.playTrophyChime()

    const updatedCareer: ProCareer = {
      ...career,
      energy: 100,
      form: 100,
      morale: 100,
      bank_balance: (career.bank_balance || 0) - SPA_COST,
      last_spa_timestamp: Date.now()
    }

    onUpdateCareer(updatedCareer)
    setSuccessMsg("🛁 Преміум СПА & Кріосауна! Енергія, форма та мораль на піку 100%!")
    setTimeout(() => setSuccessMsg(""), 3500)
  }

  return (
    <div className="max-w-[1500px] mx-auto w-full space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Dumbbell className="w-3.5 h-3.5" />
            Тренувальна База & СПА
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Розвиток Футболіста
          </h2>
          <p className="text-xs text-slate-300">
            Виконуй індивідуальні вправи для підвищення OVR або відновлюй енергію
          </p>
        </div>

        {/* Energy & Form Badges */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-center min-w-[90px]">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Енергія</div>
            <div className="text-xl font-black text-amber-300 font-mono">
              {career.energy}%
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-center min-w-[90px]">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Форма</div>
            <div className="text-xl font-black text-emerald-300 font-mono">
              {career.form}%
            </div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-black text-center animate-fade-in shadow-xl">
          {successMsg}
        </div>
      )}

      {/* ─── RECOVERY & SPA SECTION (WITH TIMERS & LIMITS) ─── */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-400" />
          Відновлення сил та СПА (Таймери навантажень):
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. Free Rest (Every 2 Hours) */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-black text-white text-sm flex items-center gap-2">
                  <span>🌿</span> Звичайний відпочинок
                </h4>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Безкоштовно
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Відновлює енергію до 100%. Доступно 1 раз на 2 години.
              </p>
            </div>

            {canRest ? (
              <button
                type="button"
                onClick={handleFreeRest}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all active:scale-95 cursor-pointer shadow-md shadow-emerald-950"
              >
                Відпочити зараз (100% Енергії)
              </button>
            ) : (
              <div className="py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                <Timer className="w-4 h-4 text-amber-400 animate-spin" />
                <span>Доступно через: <strong className="text-amber-300 font-mono">{formatCountdown(restRemainingMs)}</strong></span>
              </div>
            )}
          </div>

          {/* 2. Premium SPA (Every 30 Mins, Paid) */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-black text-white text-sm flex items-center gap-2">
                  <span>🛁</span> Експрес СПА & Кріосауна
                </h4>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono">
                  {SPA_COST.toLocaleString()} ₴
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Миттєве відновлення сил, форми та моралі до 100%. Раз на 30 хв.
              </p>
            </div>

            {canSpa ? (
              <button
                type="button"
                onClick={handleSpaRecovery}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs transition-all active:scale-95 cursor-pointer shadow-md"
              >
                Пройти СПА за {SPA_COST.toLocaleString()} ₴
              </button>
            ) : spaRemainingMs > 0 ? (
              <div className="py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                <Timer className="w-4 h-4 text-amber-400 animate-spin" />
                <span>Доступно через: <strong className="text-amber-300 font-mono">{formatCountdown(spaRemainingMs)}</strong></span>
              </div>
            ) : (
              <div className="py-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-bold text-center">
                Недостатньо коштів ({SPA_COST.toLocaleString()} ₴)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── TRAINING DRILLS GRID ─── */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Індивідуальні тренувальні вправи:
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {drills.map((drill) => {
            const currentStat = (career.attributes as any)[drill.id] || 40
            const canAffordEnergy = career.energy >= drill.energyCost

            return (
              <div
                key={drill.id}
                className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3 shadow-xl hover:border-emerald-500/40 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{drill.icon}</span>
                      <div>
                        <h4 className="font-black text-white text-xs sm:text-sm">
                          {drill.category}
                        </h4>
                        <span className="text-[10px] text-emerald-400 font-bold font-mono">
                          Поточний рівень: {currentStat}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                      -{drill.energyCost}% сил
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-snug">
                    {drill.description}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!canAffordEnergy}
                  onClick={() => handleTrainDrill(drill)}
                  className={`w-full py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    canAffordEnergy
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md shadow-emerald-950"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <span>Тренувати (+{drill.gain})</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
