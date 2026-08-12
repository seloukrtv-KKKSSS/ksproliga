"use client"

import { useState } from "react"
import { FMClub, FMPlayer, FMStadium } from "@/lib/fm-types"
import { fmTrainSquad, fmRestSquad } from "@/lib/fm-database"
import { fmAudio } from "@/lib/fm-audio"
import {
  Dumbbell,
  Zap,
  Target,
  Shield,
  HeartPulse,
  Sparkles,
  Check,
  Flame,
  Activity,
  Award
} from "lucide-react"

interface FMTrainingProps {
  club: FMClub
  players: FMPlayer[]
  stadium: FMStadium
  onSquadUpdated: (players: FMPlayer[]) => void
}

const DRILLS = [
  {
    id: "attack",
    title: "Атакувальна майстерність",
    desc: "Відпрацювання ударів по воротах, дриблінгу 1-в-1 та завершення атак.",
    focus: "Удар, Дриблінг, Швидкість",
    icon: Target,
    color: "from-amber-500 to-orange-600"
  },
  {
    id: "defense",
    title: "Залізобетонна оборона",
    desc: "Позиційний захист, підкати, перехоплення та верхові єдиноборства.",
    focus: "Захист, Фізика, Відбір",
    icon: Shield,
    color: "from-emerald-500 to-teal-600"
  },
  {
    id: "tactics",
    title: "Тактичний аналіз і комбінації",
    desc: "Розіграш швидких пасів у дотик, контроль м'яча та командна зіграність.",
    focus: "Пас, Бачення поля, Мораль",
    icon: Zap,
    color: "from-blue-500 to-indigo-600"
  },
  {
    id: "fitness",
    title: "Атлетизм та швидкість",
    desc: "Фізична підготовка, інтервальний біг та витривалість.",
    focus: "Швидкість, Фізика, Витривалість",
    icon: Flame,
    color: "from-rose-500 to-red-600"
  }
]

export function FMTraining({ club, players, stadium, onSquadUpdated }: FMTrainingProps) {
  const [selectedDrill, setSelectedDrill] = useState("attack")
  const [intensity, setIntensity] = useState<"light" | "normal" | "heavy">("normal")
  const [isTraining, setIsTraining] = useState(false)
  const [isResting, setIsResting] = useState(false)
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null)

  const trainingBaseLevel = stadium.training_level || 1
  const medicalLevel = stadium.medical_level || 1

  const staminaCost = intensity === "light" ? 6 : intensity === "normal" ? 14 : 24
  const xpMultiplier = intensity === "light" ? 1 : intensity === "normal" ? 2 : 3.5

  const handleRunTraining = async () => {
    setIsTraining(true)
    setTrainingMessage(null)
    fmAudio.playWhistle()

    try {
      const boostXp = Math.round(50 * xpMultiplier * (1 + trainingBaseLevel * 0.2))
      const updated = await fmTrainSquad(club.id, boostXp, staminaCost)

      onSquadUpdated(updated)
      fmAudio.playLevelUp()
      setTrainingMessage("✅ Тренування успішно завершено! Характеристики гравців покращено.")
    } catch {
      setTrainingMessage("Помилка під час проведення тренування")
    } finally {
      setIsTraining(false)
    }
  }

  const handleRestSquad = async () => {
    setIsResting(true)
    setTrainingMessage(null)
    fmAudio.playCoins()

    try {
      const updated = await fmRestSquad(club.id)
      onSquadUpdated(updated)
      fmAudio.playLevelUp()
      setTrainingMessage("🌿 Відновлювальні процедури завершено! Витривалість усіх гравців повернута на 100%.")
    } catch {
      setTrainingMessage("Помилка відновлення гравців")
    } finally {
      setIsResting(false)
    }
  }

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-10 text-white">
      {/* Header Info Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Тренувальний Центр Клубу</h2>
            <p className="text-xs text-slate-400">
              База {trainingBaseLevel}/5 рівня (+{trainingBaseLevel * 20}% досвіду) • Медцентр {medicalLevel}/5 рівня
            </p>
          </div>
        </div>

        {/* Quick Recovery Button */}
        <button
          type="button"
          onClick={handleRestSquad}
          disabled={isResting}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <HeartPulse className="h-4 w-4" />
          <span>{isResting ? "Відновлення..." : "СПА & Відновити сили (100%)"}</span>
        </button>
      </div>

      {trainingMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center animate-in fade-in">
          {trainingMessage}
        </div>
      )}

      {/* Drill Selection Cards */}
      <div className="space-y-3">
        <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
          Оберіть тип тренувальної сесії:
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DRILLS.map((d) => {
            const Icon = d.icon
            const isSelected = selectedDrill === d.id

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setSelectedDrill(d.id)
                  fmAudio.playClick()
                }}
                className={`p-4 rounded-3xl border text-left transition-all space-y-3 relative overflow-hidden ${
                  isSelected
                    ? "bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${d.color} flex items-center justify-center text-white shadow-md`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">{d.title}</div>
                      <div className="text-[10px] text-emerald-400 font-bold">Фокус: {d.focus}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-5 w-5 text-emerald-400" />}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{d.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Intensity Selector & Execution */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-black text-slate-300">Інтенсивність навантаження:</div>
            <div className="flex gap-2">
              {[
                { id: "light", label: "Легка (-6% сил)", color: "text-emerald-400" },
                { id: "normal", label: "Стандартна (-14% сил)", color: "text-amber-400" },
                { id: "heavy", label: "Висока (-24% сил)", color: "text-red-400" }
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    setIntensity(lvl.id as any)
                    fmAudio.playClick()
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    intensity === lvl.id
                      ? "bg-slate-800 text-white border border-emerald-500"
                      : "bg-slate-950/60 text-slate-400 hover:text-white"
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunTraining}
            disabled={isTraining}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isTraining ? "Виконання вправ..." : "Провести тренування команди"}</span>
          </button>
        </div>
      </div>

      {/* Squad Energy Status List */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
          Фізичний стан футболістів ({players.length} гравців):
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
          {players.map((p) => (
            <div
              key={p.id}
              className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black text-emerald-400 uppercase">{p.position}</span>
                  <span className="text-xs font-bold text-white truncate">{p.name}</span>
                </div>
                <div className="text-[10px] text-slate-400">Рейтинг: {p.overall_rating}</div>
              </div>

              {/* Stamina Pill */}
              <div className="text-right shrink-0">
                <div
                  className={`text-xs font-black ${
                    p.stamina > 70 ? "text-emerald-400" : p.stamina > 40 ? "text-amber-400" : "text-red-400"
                  }`}
                >
                  {p.stamina}%
                </div>
                <div className="w-12 h-1.5 rounded-full bg-slate-900 overflow-hidden mt-0.5 border border-slate-800">
                  <div
                    className={`h-full ${
                      p.stamina > 70 ? "bg-emerald-400" : p.stamina > 40 ? "bg-amber-400" : "bg-red-500"
                    }`}
                    style={{ width: `${p.stamina}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
