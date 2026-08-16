"use client"

import { useState } from "react"
import { ProCareer, ProAttributes } from "@/lib/pro-types"
import { calculateOverallRating } from "@/lib/pro-engine"
import { proAudio } from "@/lib/pro-audio"
import {
  Dumbbell,
  Sparkles,
  Zap,
  Flame,
  Activity,
  Heart,
  TrendingUp,
  RotateCcw,
  CheckCircle2
} from "lucide-react"

interface ProTrainingProps {
  career: ProCareer
  onUpdateCareer: (updated: ProCareer) => void
}

export function ProTraining({ career, onUpdateCareer }: ProTrainingProps) {
  const [successMsg, setSuccessMsg] = useState("")

  const attr = career.attributes

  const handleTrainDrill = (
    attrKey: keyof ProAttributes,
    gain: number,
    energyCost: number,
    drillTitle: string
  ) => {
    if (career.energy < energyCost) {
      alert("Недостатньо енергії для цього тренування! Відпочиньте або скористайтеся СПА.")
      return
    }

    proAudio.playTrophyChime()

    const currentVal = (attr as any)[attrKey] || 40
    const newVal = Math.min(99, currentVal + gain)

    const updatedAttr = {
      ...attr,
      [attrKey]: newVal
    }

    const newOvr = calculateOverallRating(career.position, updatedAttr)
    const newEnergy = Math.max(0, career.energy - energyCost)

    const updatedCareer: ProCareer = {
      ...career,
      attributes: updatedAttr,
      overall_rating: newOvr,
      energy: newEnergy
    }

    onUpdateCareer(updatedCareer)
    setSuccessMsg(`✅ Успішно! ${drillTitle}: +${gain} до показника!`)
    setTimeout(() => setSuccessMsg(""), 3000)
  }

  const handleRest = () => {
    proAudio.playClick()
    const newEnergy = Math.min(100, career.energy + 35)
    const updatedCareer: ProCareer = {
      ...career,
      energy: newEnergy
    }
    onUpdateCareer(updatedCareer)
    setSuccessMsg("💤 Футболіст відпочив та відновив +35% енергії!")
    setTimeout(() => setSuccessMsg(""), 3000)
  }

  const handleSpaRecovery = () => {
    proAudio.playTrophyChime()
    const updatedCareer: ProCareer = {
      ...career,
      energy: 100,
      form: Math.min(100, career.form + 5)
    }
    onUpdateCareer(updatedCareer)
    setSuccessMsg("🛁 СПА процедури: Енергія 100% та Форма +5%!")
    setTimeout(() => setSuccessMsg(""), 3000)
  }

  const drills: {
    id: keyof ProAttributes
    title: string
    desc: string
    gain: number
    cost: number
    icon: string
  }[] = [
    {
      id: "pace",
      title: "Спринти та ривки",
      desc: "Швидкість бігу, стартовий розгін та вибухова міць",
      gain: 1,
      cost: 15,
      icon: "⚡"
    },
    {
      id: "shooting",
      title: "Удари по дев'ятках",
      desc: "Точність удару, підкрутка та реалізація виходів 1-на-1",
      gain: 1,
      cost: 15,
      icon: "🎯"
    },
    {
      id: "passing",
      title: "Культура пасу та навіси",
      desc: "Розрізні передачі, діагоналі та точні стандарти",
      gain: 1,
      cost: 12,
      icon: "📐"
    },
    {
      id: "dribbling",
      title: "Техніка та фінтові дуелі",
      desc: "Контроль м'яча на швидкості та обіграш захисників",
      gain: 1,
      cost: 12,
      icon: "✨"
    },
    {
      id: "defending",
      title: "Відбір та перехоплення",
      desc: "Чисті підкати, блокування ударів та вибір позиції",
      gain: 1,
      cost: 15,
      icon: "🛡️"
    },
    {
      id: "physical",
      title: "Атлетизм та єдиноборства",
      desc: "Боротьба корпусом, стрибучість та захист м'яча",
      gain: 1,
      cost: 18,
      icon: "💪"
    },
    {
      id: "decision_making",
      title: "Тактичний інтелект",
      desc: "Швидкість прийняття рішень під щільним пресингом",
      gain: 1,
      cost: 10,
      icon: "🧠"
    },
    {
      id: "stamina",
      title: "Кроси на витривалість",
      desc: "Запас дихання на всі 90 хвилин матчу",
      gain: 2,
      cost: 20,
      icon: "🔋"
    }
  ]

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Dumbbell className="w-3.5 h-3.5" />
            Тренувальний Центр
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Розвиток Характеристик
          </h2>
          <p className="text-xs text-slate-300">
            Обирай цільові вправи для підвищення рейтингу та слідкуй за запасом енергії!
          </p>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center min-w-[90px]">
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              Рейтинг OVR
            </div>
            <div className="text-2xl font-black text-amber-300 font-mono">
              {career.overall_rating}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center min-w-[90px]">
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              Енергія
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {career.energy}%
            </div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-black text-center animate-fade-in shadow-lg">
          {successMsg}
        </div>
      )}

      {/* Recovery & SPA Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleRest}
          className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition-all active:scale-95 shadow-md flex items-center justify-between cursor-pointer"
        >
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>💤</span> Звичайний відпочинок
            </h4>
            <p className="text-xs text-slate-400">Відновлює +35% енергії безкоштовно</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-950 text-emerald-400 border border-slate-800">
            Безкоштовно
          </span>
        </button>

        <button
          type="button"
          onClick={handleSpaRecovery}
          className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 hover:from-emerald-900 hover:to-teal-900 border border-emerald-500/50 text-left transition-all active:scale-95 shadow-md flex items-center justify-between cursor-pointer"
        >
          <div>
            <h4 className="text-sm font-black text-emerald-300 flex items-center gap-2">
              <span>🛁</span> Повне СПА-відновлення
            </h4>
            <p className="text-xs text-slate-300">100% Енергії + 5% Форми</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 shadow-md">
            Експрес
          </span>
        </button>
      </div>

      {/* Drills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {drills.map((drill) => {
          const currentAttrVal = (attr as any)[drill.id] || 40
          const canAfford = career.energy >= drill.cost

          return (
            <div
              key={drill.id}
              className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/30 transition-all shadow-xl flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner">
                    {drill.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{drill.title}</h4>
                    <p className="text-xs text-slate-400 leading-snug">{drill.desc}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-400 uppercase block">
                    Показник
                  </span>
                  <span className="text-lg font-black text-white font-mono">
                    {currentAttrVal}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Витрати: -{drill.cost}% Енергії
                </span>

                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() =>
                    handleTrainDrill(drill.id, drill.gain, drill.cost, drill.title)
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer ${
                    canAfford
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-950"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  Тренувати (+{drill.gain})
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
