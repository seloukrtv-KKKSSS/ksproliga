"use client"

import { useState } from "react"
import { ProStoryEvent, ProStoryChoice } from "@/lib/pro-types"
import { proAudio } from "@/lib/pro-audio"
import { Sparkles, MessageSquare, ArrowRight, CheckCircle2 } from "lucide-react"

interface ProStoryModalProps {
  event: ProStoryEvent
  onResolve: (choice: ProStoryChoice) => void
}

export function ProStoryModal({ event, onResolve }: ProStoryModalProps) {
  const [selectedChoice, setSelectedChoice] = useState<ProStoryChoice | null>(null)

  const getCharacterAvatar = (role: string) => {
    switch (role) {
      case "first_coach":
        return { emoji: "🧢", title: "Перший тренер" }
      case "scout":
        return { emoji: "🕵️", title: "Скаут" }
      case "captain":
        return { emoji: "🦁", title: "Капітан команди" }
      case "doctor":
        return { emoji: "🩺", title: "Лікар клубу" }
      case "agent":
        return { emoji: "💼", title: "Футбольний агент" }
      case "fans":
        return { emoji: "📣", title: "Вболівальники" }
      default:
        return { emoji: "⚽", title: "Партнер по команді" }
    }
  }

  const avatar = getCharacterAvatar(event.character_role)

  const handleSelect = (choice: ProStoryChoice) => {
    proAudio.playTrophyChime()
    setSelectedChoice(choice)
    setTimeout(() => {
      onResolve(choice)
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/90 border-2 border-emerald-500/50 p-6 sm:p-8 shadow-2xl max-w-lg w-full space-y-6 animate-scale-up">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-44 h-44 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Character Header */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-400 p-0.5 shadow-xl flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl">
              {avatar.emoji}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              {avatar.title}
            </span>
            <h3 className="text-lg font-black text-white mt-0.5">
              {event.character_name}
            </h3>
          </div>
        </div>

        {/* Event Title & Story Dialogue */}
        <div className="space-y-3">
          <h4 className="text-base font-black text-amber-300">
            {event.title}
          </h4>
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-sm text-slate-200 leading-relaxed font-medium">
            {event.dialogue_text}
          </div>
        </div>

        {/* Story Choices */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-400">
            Твоя відповідь та вибір:
          </div>
          <div className="space-y-2">
            {event.choices.map((choice, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(choice)}
                className={`w-full p-4 rounded-2xl border text-left transition-all active:scale-95 flex flex-col space-y-1.5 shadow-md cursor-pointer ${
                  selectedChoice === choice
                    ? "bg-emerald-950 border-emerald-400 text-white"
                    : "bg-slate-900/90 hover:bg-slate-800 border-slate-700 hover:border-amber-400 text-slate-200"
                }`}
              >
                <div className="text-xs sm:text-sm font-black text-white">
                  {choice.text}
                </div>
                <div className="text-[11px] font-bold text-emerald-400">
                  {choice.impact_description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
