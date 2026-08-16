"use client"

import { useState } from "react"
import { ProAttributes, ProCareer, ProClub, ProPosition, ProFoot } from "@/lib/pro-types"
import { generateStarterAttributes, calculateOverallRating } from "@/lib/pro-engine"
import { proAudio } from "@/lib/pro-audio"
import { ProCard } from "./pro-card"
import { Shield, Sparkles, ArrowRight, Check, User, MapPin, Footprints, Ruler, Weight } from "lucide-react"

interface ProCreationProps {
  clubs: ProClub[]
  onComplete: (careerData: Partial<ProCareer>) => void
}

export function ProCreation({ clubs, onComplete }: ProCreationProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Form State
  const [firstName, setFirstName] = useState("Андрій")
  const [lastName, setLastName] = useState("Карпʼюк")
  const [nickname, setNickname] = useState("")
  const [position, setPosition] = useState<ProPosition>("RW")
  const [foot, setFoot] = useState<ProFoot>("left")
  const [height, setHeight] = useState(178)
  const [weight, setWeight] = useState(72)

  // Default to FC Tuchapy (Village Club)
  const villageClubs = clubs.filter((c) => c.tier === 1)
  const defaultClub = villageClubs.find((c) => c.name === "ФК Тучапи") || villageClubs[0] || clubs[0]
  const [selectedClubId, setSelectedClubId] = useState<number>(defaultClub?.id || 1)

  // Calculate live starter attributes
  const potential = 82 + Math.floor(Math.random() * 8)
  const attributes = generateStarterAttributes(position, potential)
  const ovr = calculateOverallRating(position, attributes)

  const selectedClub = clubs.find((c) => c.id === selectedClubId) || defaultClub

  // Mock Career for live card preview
  const previewCareer: ProCareer = {
    id: 0,
    user_id: 0,
    first_name: firstName || "Імʼя",
    last_name: lastName || "Прізвище",
    nickname: nickname || undefined,
    age: 17,
    position,
    secondary_positions: [],
    foot,
    height,
    weight,
    overall_rating: ovr,
    potential,
    form: 85,
    energy: 100,
    morale: 100,
    reputation: 60,
    bank_balance: 2500,
    inventory: {
      boots: "boots_basic",
      car: "car_none",
      house: "house_village",
      trainers: []
    },
    scout_interest: {
      tier2: 25,
      tier3: 0,
      tier4: 0,
      tier5: 0
    },
    current_club_id: selectedClubId,
    contract_years_left: 2,
    wage_per_week: 1200,
    squad_role: "starter",
    is_captain: false,
    is_injured: false,
    injury_matches_left: 0,
    is_retired: false,
    current_season_number: 1,
    current_fixture_round: 1,
    attributes,
    career_stats: {
      total_matches: 0,
      total_goals: 0,
      total_assists: 0,
      total_trophies: 0,
      avg_rating: 7.0,
      season_matches: 0,
      season_goals: 0,
      season_assists: 0
    },
    season_logs: [],
    clubs_history: [],
    trophies: []
  }

  const handleNext = () => {
    proAudio.playClick()
    if (step < 3) setStep((s) => (s + 1) as any)
  }

  const handleBack = () => {
    proAudio.playClick()
    if (step > 1) setStep((s) => (s - 1) as any)
  }

  const handleFinalSubmit = () => {
    proAudio.playTrophyChime()
    onComplete({
      first_name: firstName.trim() || "Андрій",
      last_name: lastName.trim() || "Карпʼюк",
      nickname: nickname.trim() || undefined,
      position,
      foot,
      height,
      weight,
      overall_rating: ovr,
      potential,
      attributes,
      current_club_id: selectedClubId
    })
  }

  const positions: { id: ProPosition; label: string; role: string }[] = [
    { id: "ST", label: "Нападник (ST)", role: "Головний бомбардир та вістря атаки" },
    { id: "RW", label: "Правий Вінгер (RW)", role: "Швидкість, дриблінг та простріли" },
    { id: "LW", label: "Лівий Вінгер (LW)", role: "Зміщення в центр та обвідні удари" },
    { id: "CAM", label: "Плеймейкер (CAM)", role: "Мозок команди, тонкі передачі" },
    { id: "CM", label: "Центральний Півзахисник (CM)", role: "Універсал від штрафного до штрафного" },
    { id: "CDM", label: "Опорний Півзахисник (CDM)", role: "Руйнівник атак та щит оборони" },
    { id: "LB", label: "Лівий Захисник (LB)", role: "Фланговий захист та підключення" },
    { id: "CB", label: "Центральний Захисник (CB)", role: "Стовп оборони та повітряні дуелі" },
    { id: "RB", label: "Правий Захисник (RB)", role: "Фланговий відбір та кроси" },
    { id: "GK", label: "Воротар (GK)", role: "Останній рубіж та реакція" }
  ]

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Header Wizard Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Створення Персонажа
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Почни Свій Шлях «Від Села до УПЛ»
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
          Створи 17-річного юніора, обери рідне село на Франківщині чи Буковині та розпочни свою велику футбольну історію!
        </p>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 pt-3">
          {[1, 2, 3].map((st) => (
            <div
              key={st}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                step === st
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 scale-105"
                  : step > st
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-900 text-slate-500 border border-slate-800"
              }`}
            >
              <span>{st === 1 ? "1. Дані" : st === 2 ? "2. Амплуа" : "3. Рідний Клуб"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Settings & Live 3D Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Content (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          {/* STEP 1: Personal Identity */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                Особисті дані футболіста
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">
                    Імʼя
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Андрій"
                    maxLength={20}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">
                    Прізвище
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Карпʼюк"
                    maxLength={20}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">
                  Прізвисько на полі (необовʼязково)
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="напр. «Снайпер», «Ракета»"
                  maxLength={15}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Foot Picker */}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">
                  Робоча нога
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "right", label: "Права нога" },
                    { id: "left", label: "Ліва нога" },
                    { id: "both", label: "Обидві ноги" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        proAudio.playClick()
                        setFoot(f.id as ProFoot)
                      }}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                        foot === f.id
                          ? "bg-emerald-600 text-white border-emerald-400 shadow-md"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Height & Weight Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-400">Зріст:</span>
                    <span className="text-emerald-400">{height} см</span>
                  </div>
                  <input
                    type="range"
                    min={165}
                    max={198}
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-400">Вага:</span>
                    <span className="text-emerald-400">{weight} кг</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={95}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Position */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Footprints className="w-4 h-4 text-emerald-400" />
                Обери своє амплуа на полі
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                {positions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      proAudio.playClick()
                      setPosition(p.id)
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      position === p.id
                        ? "bg-gradient-to-r from-emerald-950 to-slate-900 border-emerald-400 shadow-md shadow-emerald-950"
                        : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-black text-white">
                        {p.label}
                      </span>
                      {position === p.id && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {p.role}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Starting Village Club */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Обери стартовий сільський клуб (Рівень 1)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {villageClubs.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      proAudio.playClick()
                      setSelectedClubId(c.id)
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      selectedClubId === c.id
                        ? "bg-gradient-to-r from-emerald-950 to-slate-900 border-emerald-400 shadow-lg shadow-emerald-950"
                        : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/20 shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${c.primary_color}, ${c.secondary_color})`
                      }}
                    >
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white truncate">
                        {c.name}
                      </div>
                      <div className="text-xs text-emerald-400 truncate">
                        {c.city} • {c.region}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {c.stadium_name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs transition-all"
              >
                Назад
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-all active:scale-95 cursor-pointer"
              >
                <span>Далі</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-slate-950 font-black text-sm flex items-center gap-2 shadow-xl shadow-emerald-950 transition-all active:scale-95 cursor-pointer animate-pulse"
              >
                <Sparkles className="w-4 h-4" />
                <span>Розпочати Карʼєру!</span>
              </button>
            )}
          </div>
        </div>

        {/* Right 3D Holographic Card Live Preview (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-3">
          <div className="text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Твоя Картка Гравця (17 років)
            </span>
          </div>

          <ProCard career={previewCareer} club={selectedClub} />

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center max-w-[320px] w-full text-xs text-slate-400">
            Потенціал: <strong className="text-amber-300 font-mono text-sm">{potential}</strong> OVR. Твій розвиток залежить від гри в матчах та рішень!
          </div>
        </div>
      </div>
    </div>
  )
}
