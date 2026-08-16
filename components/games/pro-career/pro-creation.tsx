"use client"

import { useState } from "react"
import {
  ProCareer,
  ProClub,
  ProFoot,
  ProPosition,
  ProAvatar
} from "@/lib/pro-types"
import {
  generateStarterAttributes,
  calculateOverallRating,
  calculateAnatomyModifiers
} from "@/lib/pro-engine"
import { proAudio } from "@/lib/pro-audio"
import { ProCard } from "./pro-card"
import { ProAvatarBuilder, DEFAULT_AVATAR } from "./pro-avatar"
import {
  User,
  Shield,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  MapPin,
  Scale,
  Ruler,
  Palette,
  Heart,
  Crown
} from "lucide-react"

interface ProCreationProps {
  clubs: ProClub[]
  onComplete: (career: Partial<ProCareer>) => void
  defaultName?: string
}

export function ProCreation({ clubs, onComplete, defaultName = "" }: ProCreationProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Gender, Bio & Physicality
  const [gender, setGender] = useState<"male" | "female">("male")
  const nameParts = defaultName.trim().split(" ")
  const [firstName, setFirstName] = useState(
    nameParts[0] || (gender === "female" ? "Олена" : "Андрій")
  )
  const [lastName, setLastName] = useState(
    nameParts.slice(1).join(" ") || (gender === "female" ? "Карпʼюк" : "Карпʼюк")
  )
  const [nickname, setNickname] = useState(gender === "female" ? "Блискавка" : "Снайпер")
  const [position, setPosition] = useState<ProPosition>("ST")
  const [foot, setFoot] = useState<ProFoot>("right")
  const [height, setHeight] = useState(gender === "female" ? 170 : 180)
  const [weight, setWeight] = useState(gender === "female" ? 62 : 74)

  // Step 2: Visual Avatar
  const [avatar, setAvatar] = useState<ProAvatar>({
    ...DEFAULT_AVATAR,
    gender: "male"
  })

  // Handle Gender Switch
  const handleSelectGender = (newGender: "male" | "female") => {
    setGender(newGender)
    if (newGender === "female") {
      if (firstName === "Андрій") setFirstName("Олена")
      if (nickname === "Снайпер") setNickname("Блискавка")
      setHeight(170)
      setWeight(62)
      setAvatar({
        ...avatar,
        gender: "female",
        hair_style: "female_ponytail",
        facial_hair: "none"
      })
    } else {
      if (firstName === "Олена") setFirstName("Андрій")
      if (nickname === "Блискавка") setNickname("Снайпер")
      setHeight(180)
      setWeight(74)
      setAvatar({
        ...avatar,
        gender: "male",
        hair_style: "short_fade",
        facial_hair: "stubble"
      })
    }
  }

  // Step 3: Starter Club (Tier 1 Village clubs)
  const villageClubs = clubs.filter((c) => c.tier === 1)
  const defaultClub = villageClubs[0] || clubs[0]
  const [selectedClubId, setSelectedClubId] = useState<number>(defaultClub?.id || 1)

  // Live Calculations
  const anatomy = calculateAnatomyModifiers(height, weight, position)
  const basePotential = 82 + Math.floor(Math.random() * 6)
  const potential = Math.max(75, Math.min(95, basePotential + anatomy.potentialOffset))
  const attributes = generateStarterAttributes(position, potential, height, weight)
  const ovr = calculateOverallRating(position, attributes)

  const selectedClub = clubs.find((c) => c.id === selectedClubId) || defaultClub

  // Mock Career for live card preview
  const previewCareer: ProCareer = {
    id: 0,
    user_id: 0,
    gender,
    first_name: firstName || "Імʼя",
    last_name: lastName || "Прізвище",
    nickname: nickname || undefined,
    avatar,
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
      trainers: [],
      all_boots: ["boots_basic"],
      all_cars: [],
      all_houses: ["house_village"]
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
    clubs_history: [
      {
        club_id: selectedClubId,
        club_name: selectedClub?.name || "ФК Тучапи",
        city: selectedClub?.city || "Тучапи",
        tier: 1,
        from_year: 2026,
        seasons_count: 1,
        matches: 0,
        goals: 0,
        assists: 0
      }
    ],
    trophies: [],
    news_articles: []
  }

  const handleNext = () => {
    proAudio.playClick()
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        alert("Будь ласка, введіть ім'я та прізвище футболіста / футболістки")
        return
      }
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else {
      proAudio.playTrophyChime()
      onComplete({
        gender,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        nickname: nickname.trim() || undefined,
        avatar,
        age: 17,
        position,
        foot,
        height,
        weight,
        overall_rating: ovr,
        potential,
        current_club_id: selectedClubId,
        attributes,
        bank_balance: 2500,
        wage_per_week: 1200,
        inventory: {
          boots: "boots_basic",
          car: "car_none",
          house: "house_village",
          trainers: [],
          all_boots: ["boots_basic"],
          all_cars: [],
          all_houses: ["house_village"]
        }
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-fade-in p-2">
      {/* Header Wizard Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Створення Нової Зірки
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            «Від Села до УПЛ» 2.0
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg">
            Створи 17-річного таланта, налаштуй зовнішність та розпочни футбольний шлях у рідному селі!
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800">
          {[
            { num: 1, label: "Анкета & Тіло" },
            { num: 2, label: "Зовнішність" },
            { num: 3, label: "Рідний Клуб" }
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-1.5">
              <span
                className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                  step === s.num
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/50"
                    : step > s.num
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-900 text-slate-500"
                }`}
              >
                {step > s.num ? "✓" : s.num}
              </span>
              <span
                className={`text-xs font-bold hidden sm:inline ${
                  step === s.num ? "text-white" : "text-slate-500"
                }`}
              >
                {s.label}
              </span>
              {s.num < 3 && <span className="text-slate-600 text-xs">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Inputs and 3D Card Preview */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Wizard Forms (7 Cols) */}
        <div className="md:col-span-7 space-y-6">
          {/* ─── STEP 1: GENDER, BIO & PHYSICALITY ─── */}
          {step === 1 && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 animate-fade-in">
              <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <User className="w-4 h-4 text-emerald-400" />
                1. Вибір Статі, Анкета та Фізичні дані
              </h3>

              {/* Gender Switcher */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 text-xs block">
                  Оберіть стать персонажа:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectGender("male")}
                    className={`py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      gender === "male"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950 ring-2 ring-blue-400"
                        : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                  >
                    <span className="text-xl">👨</span>
                    <span>Чоловік</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectGender("female")}
                    className={`py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      gender === "female"
                        ? "bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-lg shadow-pink-950 ring-2 ring-pink-400"
                        : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                  >
                    <span className="text-xl">👩</span>
                    <span>Жінка</span>
                  </button>
                </div>
              </div>

              {/* Names Input */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Імʼя:</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={gender === "female" ? "Олена" : "Андрій"}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Прізвище:</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Карпʼюк"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Nickname & Position */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Прізвисько на полі:</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={gender === "female" ? "Блискавка" : "Снайпер"}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Робоча нога:</label>
                  <div className="flex gap-2">
                    {[
                      { id: "right", label: "Права 🦶" },
                      { id: "left", label: "Ліва 🦶" },
                      { id: "both", label: "Обидві ⭐" }
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFoot(f.id as any)}
                        className={`flex-1 py-2.5 rounded-xl font-bold transition-all cursor-pointer text-center ${
                          foot === f.id
                            ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400"
                            : "bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Position Selector */}
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-300">Позиція на полі:</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: "ST", label: "ST", title: "Форвард" },
                    { id: "RW", label: "RW", title: "Пр. вінгер" },
                    { id: "LW", label: "LW", title: "Лів. вінгер" },
                    { id: "CAM", label: "CAM", title: "ЦАП" },
                    { id: "CM", label: "CM", title: "ЦП" },
                    { id: "CDM", label: "CDM", title: "Опорник" },
                    { id: "LB", label: "LB", title: "Лів. захисник" },
                    { id: "CB", label: "CB", title: "Центрбек" },
                    { id: "RB", label: "RB", title: "Пр. захисник" },
                    { id: "GK", label: "GK", title: "Воротар" }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPosition(p.id as any)}
                      title={p.title}
                      className={`py-2 px-1 rounded-xl font-black transition-all text-center cursor-pointer ${
                        position === p.id
                          ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 scale-105"
                          : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                      }`}
                    >
                      {p.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Physicality: Height & Weight Sliders */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Ruler className="w-4 h-4 text-emerald-400" />
                    Зріст: <strong className="text-white font-mono text-sm">{height} см</strong>
                  </span>
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-400" />
                    Вага: <strong className="text-white font-mono text-sm">{weight} кг</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="range"
                    min={155}
                    max={205}
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <input
                    type="range"
                    min={50}
                    max={105}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Live Anatomical Body Type Feedback */}
                <div className="pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-300">
                      {anatomy.bodyTypeLabel}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold">
                      Потенціал: {potential}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {anatomy.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: MODULAR AVATAR BUILDER ─── */}
          {step === 2 && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 animate-fade-in">
              <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Palette className="w-4 h-4 text-emerald-400" />
                2. Кастомізація Обличчя та Зачіски
              </h3>

              <ProAvatarBuilder
                value={avatar}
                onChange={setAvatar}
                club={selectedClub}
              />
            </div>
          )}

          {/* ─── STEP 3: STARTER VILLAGE CLUB ─── */}
          {step === 3 && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 animate-fade-in">
              <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Shield className="w-4 h-4 text-emerald-400" />
                3. Обери рідний клуб (Снятинщина & Буковина)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {villageClubs.map((club) => (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => {
                      proAudio.playClick()
                      setSelectedClubId(club.id)
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      selectedClubId === club.id
                        ? "bg-emerald-950/80 border-emerald-500 text-white shadow-lg shadow-emerald-950 ring-2 ring-emerald-400"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    {club.logo_url ? (
                      <img
                        src={club.logo_url}
                        alt={club.name}
                        className="w-10 h-10 object-contain drop-shadow shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs shadow-md shrink-0 border border-white/20"
                        style={{
                          background: `linear-gradient(135deg, ${club.primary_color}, ${club.secondary_color})`
                        }}
                      >
                        <Shield className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-black text-xs sm:text-sm truncate">
                        {club.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {club.stadium_name} • {club.city}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Wizard Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => {
                  proAudio.playClick()
                  setStep((step - 1) as any)
                }}
                className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-emerald-950 transition-all active:scale-95 cursor-pointer"
            >
              <span>{step === 3 ? "Розпочати Карʼєру 🚀" : "Продовжити"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: 3D Holographic Card Live Preview (5 Cols) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center space-y-3">
          <ProCard career={previewCareer} club={selectedClub} size="md" />
          <span className="text-[11px] font-bold text-slate-400 text-center">
            ✨ Картка оновлюється наживо за вашими параметрами
          </span>
        </div>
      </div>
    </div>
  )
}
