"use client"

import { useState } from "react"
import {
  FMClub,
  FMPlayer,
  FMTactics,
  FormationType,
  TeamMentality,
  PassingStyle,
  PressingIntensity,
  TacklingAggression,
  PlayerPosition
} from "@/lib/fm-types"
import {
  FORMATIONS_MAP,
  PitchSlot,
  calculateTeamPower,
  getPositionSuitability,
  SPECIAL_ABILITIES_MAP
} from "@/lib/fm-engine"
import {
  fmSaveSquadSlots,
  fmSaveTactics,
  fmListPlayerOnMarket
} from "@/lib/fm-database"
import { fmAudio } from "@/lib/fm-audio"
import {
  Shield,
  Zap,
  Sliders,
  Users,
  Check,
  Star,
  AlertTriangle,
  Sparkles,
  ArrowUpDown,
  Tag,
  Info
} from "lucide-react"

interface FMSquadTacticsProps {
  club: FMClub
  players: FMPlayer[]
  tactics: FMTactics | null
  onSquadUpdated: () => void
}

export function FMSquadTactics({
  club,
  players,
  tactics,
  onSquadUpdated
}: FMSquadTacticsProps) {
  const [selectedFormation, setSelectedFormation] = useState<FormationType>(
    tactics?.formation || "4-4-2"
  )
  const [mentality, setMentality] = useState<TeamMentality>(
    tactics?.mentality || "balanced"
  )
  const [passingStyle, setPassingStyle] = useState<PassingStyle>(
    tactics?.passing_style || "mixed"
  )
  const [pressing, setPressing] = useState<PressingIntensity>(
    tactics?.pressing || "normal"
  )
  const [tackling, setTackling] = useState<TacklingAggression>(
    tactics?.tackling || "normal"
  )

  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [inspectingPlayer, setInspectingPlayer] = useState<FMPlayer | null>(null)
  const [transferPrice, setTransferPrice] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const formationSlots = FORMATIONS_MAP[selectedFormation] || FORMATIONS_MAP["4-4-2"]

  const currentTacticsState: FMTactics = {
    club_id: club.id,
    formation: selectedFormation,
    mentality,
    passing_style: passingStyle,
    pressing,
    tackling
  }

  const teamPower = calculateTeamPower(players, currentTacticsState)

  const handleFormationChange = async (fmt: FormationType) => {
    fmAudio.playClick()
    setSelectedFormation(fmt)
    await fmSaveTactics(club.id, { ...currentTacticsState, formation: fmt })
    onSquadUpdated()
  }

  const handleTacticsSave = async (updates: Partial<FMTactics>) => {
    fmAudio.playClick()
    await fmSaveTactics(club.id, { ...currentTacticsState, ...updates })
    onSquadUpdated()
  }

  const handleAssignPlayerToSlot = async (player: FMPlayer, targetSlot: number) => {
    fmAudio.playTacticalSwap()
    setSaving(true)

    const updatedAssignments = [...players].map((p) => {
      if (p.id === player.id) {
        return { playerId: p.id, isStarter: true, pitchSlot: targetSlot }
      }
      // If someone else occupied targetSlot, move them to bench
      if (p.pitch_slot === targetSlot) {
        return { playerId: p.id, isStarter: false, pitchSlot: 0 }
      }
      return { playerId: p.id, isStarter: p.is_starter, pitchSlot: p.pitch_slot }
    })

    await fmSaveSquadSlots(club.id, updatedAssignments)
    setActiveSlot(null)
    setSaving(false)
    onSquadUpdated()
  }

  const handleListOnTransfer = async (player: FMPlayer) => {
    fmAudio.playClick()
    const buyout = parseInt(transferPrice) || Math.round(player.skill * (player.talent || 3) * 500)
    const initialBid = Math.round(buyout * 0.7)

    const ok = await fmListPlayerOnMarket(player.id, initialBid, buyout, club.id, club.name)
    if (ok) {
      fmAudio.playCoins()
      setNotification(`Футболіста ${player.name} виставлено на аукціон!`)
      setInspectingPlayer(null)
      onSquadUpdated()
    }
  }

  const benchPlayers = players.filter((p) => !p.is_starter || p.pitch_slot === 0)

  return (
    <div className="space-y-6">
      {/* TEAM POWER HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-lg">
        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-950 border border-emerald-500/40 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Сила Команди</span>
          <span className="text-2xl font-black text-emerald-300">{teamPower.overall}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Атака (АТК)</span>
          <span className="text-xl font-black text-white">{teamPower.attack}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Півзахист (ПЗ)</span>
          <span className="text-xl font-black text-white">{teamPower.midfield}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Захист (ЗАХ)</span>
          <span className="text-xl font-black text-white">{teamPower.defense}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Воротар (ВР)</span>
          <span className="text-xl font-black text-white">{teamPower.goalkeeper}</span>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold text-center">
          {notification}
        </div>
      )}

      {/* MAIN PITCH & TACTICAL CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 2D TACTICAL PITCH (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Formation Picker */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-xs font-bold text-slate-400 px-2">Схема:</span>
            {(["4-4-2", "4-3-3", "3-5-2", "4-2-3-1", "5-3-2", "4-1-4-1", "3-4-3"] as FormationType[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => handleFormationChange(fmt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedFormation === fmt
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950 scale-105"
                    : "bg-slate-950 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* 2D Pitch Canvas */}
          <div className="relative aspect-[3/4] w-full rounded-2xl bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-950 border-4 border-emerald-950 shadow-2xl overflow-hidden p-4">
            {/* Pitch Markings */}
            <div className="absolute inset-4 border-2 border-white/25 rounded-lg pointer-events-none" />
            <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 border-t-2 border-white/25 pointer-events-none" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/25 rounded-full pointer-events-none" />
            {/* Penalty areas */}
            <div className="absolute left-1/2 -translate-x-1/2 top-4 w-44 h-20 border-2 border-white/25 pointer-events-none" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-4 w-44 h-20 border-2 border-white/25 pointer-events-none" />

            {/* 11 Player Tokens */}
            {formationSlots.map((slot) => {
              const player = players.find((p) => p.is_starter && p.pitch_slot === slot.slot)
              const suitability = player ? getPositionSuitability(player, slot.role) : null
              const isSelected = activeSlot === slot.slot

              return (
                <div
                  key={slot.slot}
                  style={{
                    left: `${slot.x}%`,
                    bottom: `${slot.y}%`,
                    transform: "translate(-50%, 50%)"
                  }}
                  className="absolute z-10 flex flex-col items-center cursor-pointer group"
                  onClick={() => setActiveSlot(isSelected ? null : slot.slot)}
                >
                  {/* Token Circle */}
                  <div
                    className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-full flex flex-col items-center justify-center border-2 transition-all shadow-xl ${
                      isSelected
                        ? "border-amber-400 bg-amber-500 text-slate-950 scale-110 ring-4 ring-amber-400/40"
                        : player
                        ? suitability?.isMatch
                          ? "border-emerald-300 bg-slate-950 text-white hover:scale-105"
                          : "border-rose-400 bg-slate-950 text-rose-300 hover:scale-105"
                        : "border-dashed border-slate-400/60 bg-slate-950/70 text-slate-400 hover:bg-slate-900"
                    }`}
                  >
                    {player ? (
                      <>
                        <span className="text-[9px] font-bold text-emerald-400">{slot.label}</span>
                        <span className="text-xs sm:text-sm font-black tracking-tight">{player.skill}</span>
                        {/* Energy dot */}
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-slate-950"
                          style={{
                            backgroundColor:
                              (player.energy ?? 100) > 70
                                ? "#10B981"
                                : (player.energy ?? 100) > 40
                                ? "#F59E0B"
                                : "#EF4444"
                          }}
                        />
                      </>
                    ) : (
                      <span className="text-xs font-bold">{slot.label}</span>
                    )}
                  </div>

                  {/* Name Tag Pill */}
                  {player && (
                    <div className="mt-1 px-2 py-0.5 rounded-md bg-slate-950/90 border border-slate-800 text-[10px] font-bold text-white max-w-[90px] truncate shadow-md text-center">
                      {player.name.split(" ")[1] || player.name}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT PANEL: SLOT DRAWER / TACTICAL SLIDERS (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          {activeSlot ? (
            /* SLOT SWAP DRAWER */
            <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-black text-amber-300">
                  Вибір гравця на позицію: #{activeSlot} ({formationSlots.find((s) => s.slot === activeSlot)?.label})
                </h3>
                <button
                  onClick={() => setActiveSlot(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Закрити ✕
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {players.map((p) => {
                  const targetRole = formationSlots.find((s) => s.slot === activeSlot)?.role || "CF"
                  const suitability = getPositionSuitability(p, targetRole)
                  const isCurrent = p.pitch_slot === activeSlot

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleAssignPlayerToSlot(p, activeSlot)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? "bg-amber-950/40 border-amber-500"
                          : "bg-slate-950/80 border-slate-800 hover:border-emerald-500/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center justify-center">
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
                          <span className={`text-[10px] font-medium ${suitability.isMatch ? "text-emerald-400" : "text-rose-400"}`}>
                            {suitability.note}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-300 block">⚡ {p.energy ?? 100}%</span>
                        <span className="text-[10px] text-amber-300">{p.xp || 0} XP</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* TACTICAL INSTRUCTIONS & BENCH SUMMARY */
            <div className="space-y-4">
              {/* Tactical Instructions Card */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Тактичні Налаштування
                  </h3>
                </div>

                {/* Mentality */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Настрій команди:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                    {(["defensive", "balanced", "attacking"] as TeamMentality[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setMentality(m)
                          handleTacticsSave({ mentality: m })
                        }}
                        className={`py-1.5 rounded-lg border transition-all ${
                          mentality === m
                            ? "bg-emerald-500 text-slate-950 border-emerald-400"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {m === "defensive" ? "Захисний" : m === "balanced" ? "Баланс" : "Атакуючий"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pressing */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Пресинг:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                    {(["low", "normal", "high"] as PressingIntensity[]).map((pr) => (
                      <button
                        key={pr}
                        onClick={() => {
                          setPressing(pr)
                          handleTacticsSave({ pressing: pr })
                        }}
                        className={`py-1.5 rounded-lg border transition-all ${
                          pressing === pr
                            ? "bg-emerald-500 text-slate-950 border-emerald-400"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {pr === "low" ? "Слабкий" : pr === "normal" ? "Норма" : "Високий"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bench Players List */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Запасні Гравці ({benchPlayers.length})
                    </h3>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin">
                  {benchPlayers.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setInspectingPlayer(p)}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-400 w-6">{p.position}</span>
                        <span className="text-xs font-bold text-white">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-emerald-400">{p.skill}</span>
                        <span className="text-xs text-slate-400">⚡ {p.energy ?? 100}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PLAYER INSPECTOR MODAL */}
      {inspectingPlayer && (
        <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-emerald-400">{inspectingPlayer.position}</span>
                  <span className="text-sm font-black text-white">{inspectingPlayer.skill}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{inspectingPlayer.name}</h3>
                  <div className="flex text-amber-400 text-xs">
                    {Array.from({ length: inspectingPlayer.talent || 3 }).map((_, i) => (
                      <span key={i}>⭐</span>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => setInspectingPlayer(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Енергія</span>
                <span className="font-bold text-emerald-300">⚡ {inspectingPlayer.energy ?? 100}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Вільний XP</span>
                <span className="font-bold text-amber-300">{inspectingPlayer.xp || 0} XP</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Матчів</span>
                <span className="font-bold text-white">{inspectingPlayer.matches_played}</span>
              </div>
            </div>

            {/* Special Abilities */}
            {inspectingPlayer.special_abilities?.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Спецуміння гравця:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {inspectingPlayer.special_abilities.map((abId) => {
                    const def = SPECIAL_ABILITIES_MAP[abId]
                    return (
                      <span
                        key={abId}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1"
                      >
                        <span>{def?.icon || "✨"}</span>
                        <span>{def?.name || abId}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Put on Transfer Auction */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 block">Виставити на трансферний аукціон:</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Ціна викупу (₴)"
                  value={transferPrice}
                  onChange={(e) => setTransferPrice(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <button
                  onClick={() => handleListOnTransfer(inspectingPlayer)}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  На ринок
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
