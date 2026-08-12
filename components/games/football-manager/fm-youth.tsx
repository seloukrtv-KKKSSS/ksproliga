"use client"

import { useState, useEffect } from "react"
import { FMClub, FMPlayer, FMStadium, FMYouthProspect } from "@/lib/fm-types"
import { fmGetYouthProspects, fmScoutNewYouth, fmSignYouthToFirstTeam, fmGetClubPlayers } from "@/lib/fm-database"
import { fmAudio } from "@/lib/fm-audio"
import {
  GraduationCap,
  Sparkles,
  Star,
  UserPlus,
  Compass,
  Check,
  AlertCircle,
  Zap,
  Award
} from "lucide-react"

interface FMYouthProps {
  club: FMClub
  stadium: FMStadium
  onSquadUpdated: (players: FMPlayer[]) => void
}

export function FMYouthAcademy({ club, stadium, onSquadUpdated }: FMYouthProps) {
  const [prospects, setProspects] = useState<FMYouthProspect[]>([])
  const [isScouting, setIsScouting] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const academyLevel = stadium.youth_academy_level || 1
  const scoutingCost = 15000

  const loadProspects = () => {
    fmGetYouthProspects(club.id).then(setProspects)
  }

  useEffect(() => {
    loadProspects()
  }, [club.id])

  const handleSendScouts = async () => {
    if (club.balance < scoutingCost) {
      setMessage(`Недостатньо коштів! Пошук талантів коштує ${scoutingCost.toLocaleString()} ₴`)
      return
    }

    setIsScouting(true)
    setMessage(null)
    fmAudio.playWhistle()

    try {
      const created = await fmScoutNewYouth(club.id, academyLevel)
      fmAudio.playLevelUp()
      setProspects((prev) => [...created, ...prev])
      setMessage("⭐ Скаути повернулися зі свіжими звітами про юних вихованців!")
    } catch {
      setMessage("Помилка під час пошуку талантів")
    } finally {
      setIsScouting(false)
    }
  }

  const handleSignProspect = async (prospect: FMYouthProspect) => {
    setIsSigning(true)
    setMessage(null)
    fmAudio.playCoins()

    try {
      const newPlayer = await fmSignYouthToFirstTeam(prospect)
      if (newPlayer) {
        fmAudio.playLevelUp()
        const updatedSquad = await fmGetClubPlayers(club.id)
        onSquadUpdated(updatedSquad)
        setProspects((prev) => prev.filter((p) => p.id !== prospect.id))
        setMessage(`🎉 Гравець ${prospect.name} підписав контракт та переведений до основного складу!`)
      }
    } catch {
      setMessage("Помилка підписання контракту")
    } finally {
      setIsSigning(false)
    }
  }

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-10 text-white">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Дитячо-Юнацька Академія</h2>
            <p className="text-xs text-slate-400">
              Рівень академії: {academyLevel}/5 • Скаутинг майбутніх зірок українського футболу
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSendScouts}
          disabled={isScouting}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition-all shadow-xl shadow-emerald-950 flex items-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <Compass className="h-4 w-4" />
          <span>{isScouting ? "Скаутинг триває..." : `Відправити скаутів (${scoutingCost.toLocaleString()} ₴)`}</span>
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center animate-in fade-in">
          {message}
        </div>
      )}

      {/* Prospects Grid */}
      <div className="space-y-3">
        <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
          Знайдені вихованці академії ({prospects.length}):
        </div>

        {prospects.length === 0 ? (
          <div className="p-10 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
            <GraduationCap className="h-8 w-8 text-slate-500 mx-auto" />
            <div className="text-sm font-bold text-slate-400">В академії зараз немає вільних звітів</div>
            <p className="text-xs text-slate-500">Натисніть «Відправити скаутів», щоб знайти нових обдарованих юніорів</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prospects.map((p) => {
              const stars = p.potential >= 88 ? 5 : p.potential >= 80 ? 4 : 3

              return (
                <div
                  key={p.id}
                  className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex flex-col items-center justify-center font-black">
                          <span className="text-[9px] uppercase">{p.position}</span>
                          <span className="text-sm leading-none text-white">{p.rating}</span>
                        </div>
                        <div>
                          <div className="text-sm font-black text-white">{p.name}</div>
                          <div className="text-[11px] text-slate-400">Вік: {p.age} роки • Позиція: {p.position}</div>
                        </div>
                      </div>
                    </div>

                    {/* Potential Star Rating */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-400">Потенціал:</div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < stars ? "text-amber-400 fill-amber-400" : "text-slate-700"
                            }`}
                          />
                        ))}
                        <span className="text-xs font-black text-amber-400 ml-1">({p.potential})</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleSignProspect(p)}
                      disabled={isSigning}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-emerald-950"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Підписати контракт (У першу команду)</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
