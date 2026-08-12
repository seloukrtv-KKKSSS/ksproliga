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
  TacklingAggression
} from "@/lib/fm-types"
import { FORMATIONS_MAP, calculateTeamPower, PitchSlot } from "@/lib/fm-engine"
import { fmSaveSquadSlots, fmSaveTactics, fmListPlayerOnMarket } from "@/lib/fm-database"
import { fmAudio } from "@/lib/fm-audio"
import {
  SlidersHorizontal,
  Shield,
  Zap,
  Activity,
  UserCheck,
  Award,
  ChevronRight,
  TrendingUp,
  Heart,
  DollarSign,
  AlertCircle,
  Tag,
  Check
} from "lucide-react"

interface FMSquadTacticsProps {
  club: FMClub
  players: FMPlayer[]
  tactics: FMTactics
  onUpdateSquad: (players: FMPlayer[]) => void
  onUpdateTactics: (tactics: FMTactics) => void
  onUpdateClub: (club: FMClub) => void
}

const FORMATIONS: FormationType[] = ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1", "5-3-2", "4-1-4-1", "3-4-3"]

export function FMSquadTactics({
  club,
  players,
  tactics,
  onUpdateSquad,
  onUpdateTactics
}: FMSquadTacticsProps) {
  const [currentFormation, setCurrentFormation] = useState<FormationType>(tactics.formation || "4-4-2")
  const [mentality, setMentality] = useState<TeamMentality>(tactics.mentality || "balanced")
  const [passingStyle, setPassingStyle] = useState<PassingStyle>(tactics.passing_style || "mixed")
  const [pressing, setPressing] = useState<PressingIntensity>(tactics.pressing || "normal")
  const [tackling, setTackling] = useState<TacklingAggression>(tactics.tackling || "normal")

  const [selectedSlot, setSelectedSlot] = useState<PitchSlot | null>(null)
  const [inspectedPlayer, setInspectedPlayer] = useState<FMPlayer | null>(null)
  const [transferPriceInput, setTransferPriceInput] = useState<number>(0)
  const [transferSuccess, setTransferSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const teamPower = calculateTeamPower(players, {
    club_id: club.id,
    formation: currentFormation,
    mentality,
    passing_style: passingStyle,
    pressing,
    tackling
  })

  const slots = FORMATIONS_MAP[currentFormation] || FORMATIONS_MAP["4-4-2"]

  // Get player currently occupying a pitch slot
  const getPlayerInSlot = (slotNumber: number): FMPlayer | undefined => {
    return players.find((p) => p.is_starter && p.pitch_slot === slotNumber)
  }

  // Substitutes and bench players
  const benchPlayers = players.filter((p) => !p.is_starter)

  // Handle slot assignment
  const handleAssignPlayerToSlot = async (playerToAssign: FMPlayer, targetSlot: number) => {
    fmAudio.playTacticalSwap()
    const updated = [...players]

    // If player was already in another slot, clear it
    const currentPlayerInTarget = getPlayerInSlot(targetSlot)

    // Remove playerToAssign from their previous spot
    const assignTarget = updated.find((p) => p.id === playerToAssign.id)
    if (assignTarget) {
      assignTarget.is_starter = true
      assignTarget.pitch_slot = targetSlot
    }

    // If there was a player in that slot, bench them
    if (currentPlayerInTarget && currentPlayerInTarget.id !== playerToAssign.id) {
      const benched = updated.find((p) => p.id === currentPlayerInTarget.id)
      if (benched) {
        benched.is_starter = false
        benched.pitch_slot = 0
      }
    }

    onUpdateSquad(updated)
    setSelectedSlot(null)

    // Persist slots to database
    await fmSaveSquadSlots(
      club.id,
      updated.map((p) => ({ id: p.id, is_starter: p.is_starter, pitch_slot: p.pitch_slot }))
    )
  }

  // Handle tactics change
  const handleSaveTacticsChange = async (
    newFormation = currentFormation,
    newMentality = mentality,
    newPassing = passingStyle,
    newPressing = pressing,
    newTackling = tackling
  ) => {
    setIsSaving(true)
    const newTactics: FMTactics = {
      club_id: club.id,
      formation: newFormation,
      mentality: newMentality,
      passing_style: newPassing,
      pressing: newPressing,
      tackling: newTackling,
      captain_player_id: tactics.captain_player_id
    }
    const saved = await fmSaveTactics(club.id, newTactics)
    onUpdateTactics(saved)
    setIsSaving(false)
    fmAudio.playClick()
  }

  // Handle listing player for transfer
  const handleListOnTransfer = async () => {
    if (!inspectedPlayer || transferPriceInput <= 0) return
    const success = await fmListPlayerOnMarket(inspectedPlayer, transferPriceInput)
    if (success) {
      fmAudio.playCoins()
      setTransferSuccess(true)
      const updated = players.map((p) =>
        p.id === inspectedPlayer.id ? { ...p, is_on_transfer: true, transfer_price: transferPriceInput } : p
      )
      onUpdateSquad(updated)
      setTimeout(() => {
        setTransferSuccess(false)
        setInspectedPlayer(null)
      }, 1500)
    }
  }

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-10 text-white">
      {/* ─── Top Team Power HUD ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Сила команди</div>
            <div className="text-xl font-black text-emerald-400">{teamPower.overall}</div>
          </div>
          <Award className="h-6 w-6 text-emerald-400/70" />
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Атака</div>
            <div className="text-xl font-black text-amber-400">{teamPower.attack}</div>
          </div>
          <Zap className="h-6 w-6 text-amber-400/70" />
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Півзахист</div>
            <div className="text-xl font-black text-blue-400">{teamPower.midfield}</div>
          </div>
          <Activity className="h-6 w-6 text-blue-400/70" />
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Захист</div>
            <div className="text-xl font-black text-emerald-400">{teamPower.defense}</div>
          </div>
          <Shield className="h-6 w-6 text-emerald-400/70" />
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Воротар</div>
            <div className="text-xl font-black text-teal-400">{teamPower.goalkeeper}</div>
          </div>
          <UserCheck className="h-6 w-6 text-teal-400/70" />
        </div>
      </div>

      {/* ─── Formation & Tactical Pitch Area ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 2D Tactical Football Pitch (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Formation Selector Bar */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider pl-2">Схема:</span>
              <div className="flex flex-wrap gap-1">
                {FORMATIONS.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setCurrentFormation(f)
                      handleSaveTacticsChange(f)
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      currentFormation === f
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-950 scale-105"
                        : "bg-slate-800/80 text-slate-400 hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Authentic Tactical Pitch Canvas */}
          <div className="relative w-full aspect-[3/4] max-h-[520px] rounded-3xl bg-gradient-to-b from-[#0e4b10] via-[#0b3c0c] to-[#072608] border-2 border-emerald-500/40 p-4 overflow-hidden shadow-2xl flex flex-col justify-between">
            {/* Pitch Markings */}
            <div className="absolute inset-4 border border-white/25 rounded-2xl pointer-events-none" />
            {/* Center Line */}
            <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-white/25 pointer-events-none" />
            {/* Center Circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-white/25 rounded-full pointer-events-none" />
            {/* Center Dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/40 rounded-full pointer-events-none" />
            {/* Top Penalty Area */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-24 border-b border-x border-white/25 rounded-b-xl pointer-events-none" />
            {/* Bottom Penalty Area */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-24 border-t border-x border-white/25 rounded-t-xl pointer-events-none" />

            {/* Pitch Slots Placement */}
            {slots.map((slot) => {
              const player = getPlayerInSlot(slot.slot)
              const isSelected = selectedSlot?.slot === slot.slot

              return (
                <button
                  key={slot.slot}
                  type="button"
                  onClick={() => {
                    fmAudio.playClick()
                    setSelectedSlot(slot)
                  }}
                  style={{
                    position: "absolute",
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    transform: "translate(-50%, -50%)"
                  }}
                  className={`group flex flex-col items-center justify-center transition-all duration-200 z-10 ${
                    isSelected ? "scale-115 z-20" : "hover:scale-105"
                  }`}
                >
                  {/* Position Circle Token */}
                  <div
                    className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-black text-xs shadow-xl border-2 transition-all ${
                      isSelected
                        ? "bg-amber-400 border-white text-slate-950 ring-4 ring-amber-400/50"
                        : player
                        ? "bg-slate-950/90 border-emerald-400 text-white hover:border-amber-400"
                        : "bg-emerald-950/80 border-dashed border-white/40 text-slate-300"
                    }`}
                  >
                    <span className="text-[9px] font-black text-emerald-400 leading-none">{slot.roleLabel}</span>
                    <span className="text-xs font-black leading-none mt-0.5">
                      {player ? player.overall_rating : "+"}
                    </span>
                  </div>

                  {/* Player Name Pill */}
                  <div className="mt-1 px-2 py-0.5 rounded-md bg-slate-950/90 border border-white/20 text-[10px] font-black text-white whitespace-nowrap shadow-md max-w-[85px] truncate flex items-center gap-1">
                    {player ? player.name.split(" ")[1] || player.name : "Вільне місце"}
                  </div>

                  {/* Player Stamina Mini Bar */}
                  {player && (
                    <div className="w-9 h-1 rounded-full bg-slate-900 border border-black/40 overflow-hidden mt-0.5">
                      <div
                        className={`h-full ${
                          player.stamina > 70 ? "bg-emerald-400" : player.stamina > 40 ? "bg-amber-400" : "bg-red-500"
                        }`}
                        style={{ width: `${player.stamina}%` }}
                      />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Tactics Settings & Slot Swap Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* If a slot is clicked: Slot Assign Drawer */}
          {selectedSlot ? (
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-emerald-500/40 shadow-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="text-sm font-black text-white">
                  Оберіть гравця на позицію: <span className="text-emerald-400">{selectedSlot.roleLabel}</span>
                </div>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800"
                >
                  Закрити
                </button>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {players.map((p) => {
                  const isCurrent = p.is_starter && p.pitch_slot === selectedSlot.slot
                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                        isCurrent
                          ? "bg-emerald-950/60 border-emerald-500/60"
                          : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[8px] font-black text-emerald-400 uppercase">{p.position}</span>
                          <span className="text-xs font-black text-white leading-none">{p.overall_rating}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>Вік: {p.age}</span>
                            <span>Сили: {p.stamina}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setInspectedPlayer(p)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          title="Характеристики"
                        >
                          Інфо
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAssignPlayerToSlot(p, selectedSlot.slot)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                            isCurrent
                              ? "bg-emerald-600 text-white"
                              : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                          }`}
                        >
                          {isCurrent ? "В основі" : "Поставити"}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Tactical Controls Panel */
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-emerald-400" />
                  <span className="font-black text-sm text-white">Тактичні настанови</span>
                </div>
                {isSaving && <span className="text-[10px] text-emerald-400 font-bold animate-pulse">Збереження...</span>}
              </div>

              {/* Mentality */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex justify-between">
                  <span>Настрій команди:</span>
                  <span className="text-emerald-400 uppercase text-[11px] font-black">
                    {mentality === "all_out_attack" && "Усі в атаку"}
                    {mentality === "attacking" && "Атакувальний"}
                    {mentality === "balanced" && "Збалансований"}
                    {mentality === "defensive" && "Оборонний"}
                    {mentality === "very_defensive" && "Автобус"}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["defensive", "balanced", "attacking"] as TeamMentality[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMentality(m)
                        handleSaveTacticsChange(currentFormation, m)
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        mentality === m
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-slate-800/80 text-slate-400 hover:text-white"
                      }`}
                    >
                      {m === "defensive" && "Захист"}
                      {m === "balanced" && "Баланс"}
                      {m === "attacking" && "Атака"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pressing */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex justify-between">
                  <span>Інтенсивність пресингу:</span>
                  <span className="text-amber-400 uppercase text-[11px] font-black">{pressing}</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["low", "normal", "high"] as PressingIntensity[]).map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => {
                        setPressing(pr)
                        handleSaveTacticsChange(currentFormation, mentality, passingStyle, pr)
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        pressing === pr
                          ? "bg-amber-500 text-slate-950 font-black shadow-md"
                          : "bg-slate-800/80 text-slate-400 hover:text-white"
                      }`}
                    >
                      {pr === "low" && "Низький"}
                      {pr === "normal" && "Стандартний"}
                      {pr === "high" && "Високий"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passing Style */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex justify-between">
                  <span>Стиль передач:</span>
                  <span className="text-blue-400 uppercase text-[11px] font-black">{passingStyle}</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["short", "mixed", "direct"] as PassingStyle[]).map((ps) => (
                    <button
                      key={ps}
                      type="button"
                      onClick={() => {
                        setPassingStyle(ps)
                        handleSaveTacticsChange(currentFormation, mentality, ps)
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        passingStyle === ps
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-slate-800/80 text-slate-400 hover:text-white"
                      }`}
                    >
                      {ps === "short" && "Короткий"}
                      {ps === "mixed" && "Змішаний"}
                      {ps === "direct" && "Прямий"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tackling Aggression */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex justify-between">
                  <span>Жорсткість відбору:</span>
                  <span className="text-red-400 uppercase text-[11px] font-black">{tackling}</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["cautious", "normal", "aggressive"] as TacklingAggression[]).map((tk) => (
                    <button
                      key={tk}
                      type="button"
                      onClick={() => {
                        setTackling(tk)
                        handleSaveTacticsChange(currentFormation, mentality, passingStyle, pressing, tk)
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        tackling === tk
                          ? "bg-red-600 text-white shadow-md"
                          : "bg-slate-800/80 text-slate-400 hover:text-white"
                      }`}
                    >
                      {tk === "cautious" && "Акуратний"}
                      {tk === "normal" && "Нормальний"}
                      {tk === "aggressive" && "Агресивний"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bench Summary */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Лава запасних ({benchPlayers.length} гравців)
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {benchPlayers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setInspectedPlayer(p)}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-left transition-all"
                >
                  <div className="min-w-0">
                    <span className="text-[9px] font-black text-emerald-400 uppercase mr-1">{p.position}</span>
                    <span className="text-xs font-bold text-white truncate">{p.name.split(" ")[1] || p.name}</span>
                  </div>
                  <span className="text-xs font-black text-amber-400 ml-1 shrink-0">{p.overall_rating}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Player Attributes Inspector Modal ─── */}
      {inspectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 space-y-5 shadow-2xl text-white relative animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500 flex flex-col items-center justify-center font-black">
                  <span className="text-[10px] text-emerald-400 uppercase">{inspectedPlayer.position}</span>
                  <span className="text-base text-white leading-none">{inspectedPlayer.overall_rating}</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{inspectedPlayer.name}</h3>
                  <div className="text-xs text-slate-400">
                    {inspectedPlayer.nationality} • {inspectedPlayer.age} років • Потенціал {inspectedPlayer.potential}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectedPlayer(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Condition Bars */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold">Витривалість</div>
                <div className="text-sm font-black text-emerald-400">{inspectedPlayer.stamina}%</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold">Мораль</div>
                <div className="text-sm font-black text-amber-400">{inspectedPlayer.morale}%</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold">Форма</div>
                <div className="text-sm font-black text-blue-400">{inspectedPlayer.form}%</div>
              </div>
            </div>

            {/* Core Stats Progress Bars */}
            <div className="space-y-2.5">
              {[
                { label: "Швидкість", val: inspectedPlayer.pace },
                { label: "Удар", val: inspectedPlayer.shooting },
                { label: "Пас", val: inspectedPlayer.passing },
                { label: "Дриблінг", val: inspectedPlayer.dribbling },
                { label: "Захист", val: inspectedPlayer.defending },
                { label: "Фізика", val: inspectedPlayer.physical },
                { label: "Воротарська гра", val: inspectedPlayer.goalkeeping }
              ].map((stat) => (
                <div key={stat.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400">{stat.label}</span>
                    <span className="text-white">{stat.val}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                      style={{ width: `${Math.min(100, stat.val)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Financials & Transfer Listing */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Ринкова вартість:</span>
                <span className="font-black text-emerald-400">{inspectedPlayer.market_value.toLocaleString()} ₴</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Тижнева зарплата:</span>
                <span className="font-black text-white">{inspectedPlayer.wage.toLocaleString()} ₴</span>
              </div>

              {!inspectedPlayer.is_on_transfer ? (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-bold text-slate-300">Виставити на трансферний ринок:</div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Ціна (₴)"
                      defaultValue={inspectedPlayer.market_value}
                      onChange={(e) => setTransferPriceInput(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleListOnTransfer}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shrink-0 flex items-center gap-1"
                    >
                      {transferSuccess ? <Check className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
                      <span>{transferSuccess ? "Виставлено!" : "Продати"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-400 font-bold text-center p-2 rounded-xl bg-amber-950/40 border border-amber-500/30">
                  Гравець вже виставлений на ринок за {inspectedPlayer.transfer_price.toLocaleString()} ₴
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
