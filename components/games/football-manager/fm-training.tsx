"use client"

import { useState } from "react"
import { FMClub, FMPlayer, FMStadium, SpecialAbilityId } from "@/lib/fm-types"
import { SPECIAL_ABILITIES, SPECIAL_ABILITIES_MAP } from "@/lib/fm-engine"
import {
  fmUpgradePlayerSkill,
  fmLearnPlayerSpecialAbility,
  fmRestoreSquadEnergy
} from "@/lib/fm-database"
import { fmAudio } from "@/lib/fm-audio"
import {
  Dumbbell,
  Zap,
  Sparkles,
  Heart,
  Plus,
  Star,
  CheckCircle2,
  ChevronRight,
  Flame,
  Award
} from "lucide-react"

interface FMTrainingProps {
  club: FMClub
  players: FMPlayer[]
  stadium: FMStadium | null
  onSquadUpdated: () => void
}

export function FMTraining({
  club,
  players,
  stadium,
  onSquadUpdated
}: FMTrainingProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<FMPlayer | null>(players[0] || null)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const handleUpgradeSkill = async (p: FMPlayer) => {
    fmAudio.playClick()
    const costXp = 30
    if ((p.xp || 0) < costXp) {
      alert(`Недостатньо XP! Потрібно ${costXp} XP для підвищення Майстерності. Гравці заробляють XP у турнірах!`)
      return
    }

    setLoading(true)
    const ok = await fmUpgradePlayerSkill(p.id, costXp, 2)
    setLoading(false)

    if (ok) {
      fmAudio.playLevelUp()
      setNotification(`🎉 Майстерність ${p.name} зросла на +2!`)
      onSquadUpdated()
    }
  }

  const handleLearnAbility = async (p: FMPlayer, abilityId: SpecialAbilityId) => {
    fmAudio.playClick()
    const def = SPECIAL_ABILITIES_MAP[abilityId]
    if (!def) return

    if ((p.xp || 0) < def.costXp) {
      alert(`У гравця недостатньо вільного XP (${p.xp || 0} / ${def.costXp} XP)!`)
      return
    }
    if (club.balance < def.costMoney) {
      alert(`У скарбниці клубу недостатньо коштів (${club.balance.toLocaleString()} / ${def.costMoney.toLocaleString()} ₴)!`)
      return
    }

    setLoading(true)
    const res = await fmLearnPlayerSpecialAbility(p.id, abilityId, def.costXp, def.costMoney, club.id)
    setLoading(false)

    if (res.success) {
      fmAudio.playLevelUp()
      setNotification(`✨ ${p.name} успішно вивчив нове спецуміння: "${def.name}"!`)
      onSquadUpdated()
    } else {
      alert(res.error || "Помилка при вивченні спецуміння")
    }
  }

  const handleRestoreSquadEnergy = async () => {
    fmAudio.playClick()
    const cost = 12000
    if (club.balance < cost) {
      alert("Недостатньо коштів для СПА-процедур!")
      return
    }

    setLoading(true)
    const res = await fmRestoreSquadEnergy(club.id, cost)
    setLoading(false)

    if (res.success) {
      fmAudio.playCoins()
      setNotification("⚡ Уся команда пройшла повний курс відновлення у СПА! Енергія 100%!")
      onSquadUpdated()
    } else {
      alert(res.error || "Помилка відновлення")
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER & SPA RESTORE BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/80 border border-amber-500/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-7 h-7 text-amber-400" />
            <h2 className="text-2xl font-black text-white">Тренувальна База & СПА 11x11</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Витрачайте зароблений у кубках XP на підвищення Майстерності та вивчення унікальних Спецумінь!
          </p>
        </div>

        {/* Restore Energy CTA */}
        <button
          onClick={handleRestoreSquadEnergy}
          disabled={loading}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-950 transition-all flex items-center gap-2 shrink-0 scale-100 hover:scale-105"
        >
          <Zap className="w-5 h-5 fill-slate-950" />
          <span>Відновити СПА (100% сил за 12,000 ₴)</span>
        </button>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold text-center">
          {notification}
        </div>
      )}

      {/* 2-COLUMN TRAINING INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SQUAD ROSTER (5 COLS) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Оберіть футболіста для тренування:
            </h3>
            <span className="text-xs text-emerald-400 font-bold">{players.length} гравців</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
            {players.map((p) => {
              const isSelected = selectedPlayer?.id === p.id

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlayer(p)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-amber-950/40 border-amber-500 shadow-md ring-2 ring-amber-500/30"
                      : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center">
                      <span className="text-[9px] font-bold text-slate-400">{p.position}</span>
                      <span className="text-xs font-black text-white">{p.skill}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{p.name}</span>
                        <span className="text-amber-400 text-[10px]">
                          {Array.from({ length: p.talent || 3 }).map((_, i) => (
                            <span key={i}>⭐</span>
                          ))}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Вільний XP: <span className="text-amber-300 font-bold">{p.xp || 0} XP</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-300 block">⚡ {p.energy ?? 100}%</span>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {(p.special_abilities || []).length} умінь
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* UPGRADE & SPECIAL ABILITIES PANEL (7 COLS) */}
        {selectedPlayer ? (
          <div className="lg:col-span-7 space-y-5">
            {/* Player Hero Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-emerald-400">{selectedPlayer.position}</span>
                    <span className="text-lg font-black text-white">{selectedPlayer.skill}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedPlayer.name}</h3>
                    <p className="text-xs text-slate-400">
                      Вік: {selectedPlayer.age} р. • Талант:{" "}
                      <span className="text-amber-400">
                        {Array.from({ length: selectedPlayer.talent || 3 }).map((_, i) => (
                          <span key={i}>⭐</span>
                        ))}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/40 text-center min-w-[120px]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Вільний XP</span>
                  <span className="text-xl font-black text-amber-300">{selectedPlayer.xp || 0} XP</span>
                </div>
              </div>

              {/* Upgrade Skill Button */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Підвищити Майстерність (+2)</h4>
                  <p className="text-xs text-slate-400">Витрачає 30 вільного XP гравця</p>
                </div>
                <button
                  onClick={() => handleUpgradeSkill(selectedPlayer)}
                  disabled={(selectedPlayer.xp || 0) < 30 || loading}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
                    (selectedPlayer.xp || 0) >= 30
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  +2 Майстерність (30 XP)
                </button>
              </div>
            </div>

            {/* Special Abilities Academy */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Академія Спецумінь (11x11.ru)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SPECIAL_ABILITIES.map((ab) => {
                  const alreadyLearned = (selectedPlayer.special_abilities || []).includes(ab.id)
                  const canAfford = (selectedPlayer.xp || 0) >= ab.costXp && club.balance >= ab.costMoney

                  return (
                    <div
                      key={ab.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
                        alreadyLearned
                          ? "bg-emerald-950/30 border-emerald-500/40"
                          : "bg-slate-950/70 border-slate-800"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>{ab.icon}</span>
                            <span>{ab.name}</span>
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">
                            {ab.shortCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">{ab.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                        <span className="text-[10px] text-amber-300 font-bold">
                          {ab.costXp} XP • {ab.costMoney.toLocaleString()} ₴
                        </span>

                        {alreadyLearned ? (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Вивчено
                          </span>
                        ) : (
                          <button
                            onClick={() => handleLearnAbility(selectedPlayer, ab.id)}
                            disabled={!canAfford || loading}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              canAfford
                                ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                                : "bg-slate-800 text-slate-500 cursor-not-allowed"
                            }`}
                          >
                            Вивчити
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center">
            <p className="text-slate-400 text-sm">Оберіть гравця зі списку для тренування</p>
          </div>
        )}
      </div>
    </div>
  )
}
