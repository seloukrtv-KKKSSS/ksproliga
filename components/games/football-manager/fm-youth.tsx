"use client"

import { useState, useEffect } from "react"
import { FMClub, FMStadium, FMYouthProspect } from "@/lib/fm-types"
import { SPECIAL_ABILITIES_MAP } from "@/lib/fm-engine"
import {
  fmGetYouthProspects,
  fmScoutNewYouth,
  fmSignYouthToFirstTeam
} from "@/lib/fm-database"
import { fmAudio } from "@/lib/fm-audio"
import {
  GraduationCap,
  Sparkles,
  Star,
  UserPlus,
  Compass,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

interface FMYouthProps {
  club: FMClub
  stadium: FMStadium | null
  onSigned: () => void
}

export function FMYouthAcademy({ club, stadium, onSigned }: FMYouthProps) {
  const [prospects, setProspects] = useState<FMYouthProspect[]>([])
  const [loading, setLoading] = useState(true)
  const [scouting, setScouting] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const academyLevel = stadium?.youth_academy_level || 1

  useEffect(() => {
    loadProspects()
  }, [])

  const loadProspects = async () => {
    setLoading(true)
    const list = await fmGetYouthProspects(club.id)
    setProspects(list)
    setLoading(false)
  }

  const handleScoutNew = async () => {
    fmAudio.playClick()
    const cost = 18000
    if (club.balance < cost) {
      alert("Недостатньо коштів для відправки скаутів Академії!")
      return
    }

    setScouting(true)
    const newItems = await fmScoutNewYouth(club.id, academyLevel)
    setScouting(false)

    if (newItems.length > 0) {
      fmAudio.playCoins()
      setNotification(`🎉 Скаути знайшли ${newItems.length} нових юних талантів для Академії!`)
      loadProspects()
      onSigned()
    }
  }

  const handleSignContract = async (p: FMYouthProspect) => {
    fmAudio.playClick()
    if (club.balance < p.signing_cost) {
      alert("Недостатньо коштів для оформлення контракту!")
      return
    }

    const res = await fmSignYouthToFirstTeam(p.id, club.id)
    if (res.success) {
      fmAudio.playLevelUp()
      setNotification(`✨ Вітаємо! Юніор ${p.name} підписав контракт та приєднався до основного складу!`)
      loadProspects()
      onSigned()
    } else {
      alert(res.error || "Помилка підписання")
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-purple-950/80 border border-purple-500/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-purple-400" />
            <h2 className="text-2xl font-black text-white">Школа Юніорів 11x11</h2>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
              Рівень {academyLevel}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Виховуйте та скаутуйте юних вундеркіндів (15–17 років) із талантом до 6 зірок!
          </p>
        </div>

        {/* Scout Button */}
        <button
          onClick={handleScoutNew}
          disabled={scouting}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-purple-950 transition-all flex items-center gap-2 shrink-0 scale-100 hover:scale-105"
        >
          <Compass className="w-5 h-5" />
          <span>Відправити Скаутів (18,000 ₴)</span>
        </button>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold text-center">
          {notification}
        </div>
      )}

      {/* PROSPECTS GRID */}
      {loading ? (
        <div className="flex justify-center py-16 text-purple-400">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : prospects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prospects.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 shadow-xl transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-purple-400">{p.position}</span>
                      <span className="text-xs font-black text-white">{p.skill}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{p.name}</h4>
                      <p className="text-xs text-slate-400">Вік: {p.age} років</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Талант:</span>
                    <div className="flex text-amber-400 text-xs">
                      {Array.from({ length: p.talent || 3 }).map((_, i) => (
                        <span key={i}>⭐</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Special Abilities */}
                {p.special_abilities?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.special_abilities.map((abId) => {
                      const def = SPECIAL_ABILITIES_MAP[abId]
                      return (
                        <span
                          key={abId}
                          className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30"
                        >
                          {def?.icon || "✨"} {def?.name || abId}
                        </span>
                      )
                    })}
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between text-xs">
                  <span className="text-slate-400">Вартість контракту:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {p.signing_cost.toLocaleString()} ₴
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleSignContract(p)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-purple-950 transition-all flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Підписати до Основного Складу</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
          <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Список юніорів порожній</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Відправте скаутів Школи Юніорів, щоб знайти нові футбольні таланти для вашого клубу.
          </p>
          <button
            onClick={handleScoutNew}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950"
          >
            Відправити Скаутів (18,000 ₴)
          </button>
        </div>
      )}
    </div>
  )
}
