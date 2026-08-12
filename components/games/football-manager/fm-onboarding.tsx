"use client"

import { useState } from "react"
import { Shield, Trophy, Star, Crown, Anchor, Flame, Award, Zap, Check, Sparkles, ArrowRight, UserPlus, LogIn } from "lucide-react"
import { fmRegisterUser, fmLoginUser, fmCreateClub } from "@/lib/fm-database"
import { FMClub, FMPlayer, FMUser } from "@/lib/fm-types"
import { fmAudio } from "@/lib/fm-audio"

interface FMOnboardingProps {
  onSuccess: (user: FMUser, club: FMClub, players?: FMPlayer[]) => void
}

const BADGES = [
  { id: "shield", label: "Щит", icon: Shield },
  { id: "trophy", label: "Кубок", icon: Trophy },
  { id: "star", label: "Зірка", icon: Star },
  { id: "crown", label: "Корона", icon: Crown },
  { id: "anchor", label: "Якір", icon: Anchor },
  { id: "flame", label: "Вогонь", icon: Flame },
  { id: "award", label: "Орден", icon: Award },
  { id: "zap", label: "Блискавка", icon: Zap }
]

const PRESET_COLORS = [
  { name: "Смарагдовий", primary: "#0F5E10", secondary: "#F59E0B" },
  { name: "Королівський Синій", primary: "#1E40AF", secondary: "#FBBF24" },
  { name: "Червоний Дракон", primary: "#B91C1C", secondary: "#FFFFFF" },
  { name: "Фіолетовий Неон", primary: "#6D28D9", secondary: "#10B981" },
  { name: "Глибокий Океан", primary: "#0369A1", secondary: "#E0F2FE" },
  { name: "Вугільно-Золотий", primary: "#18181B", secondary: "#EAB308" },
  { name: "Бурштиновий", primary: "#D97706", secondary: "#111827" },
  { name: "Карпатський Ліс", primary: "#065F46", secondary: "#A7F3D0" }
]

export function FMOnboarding({ onSuccess }: FMOnboardingProps) {
  const [mode, setMode] = useState<"login" | "register" | "create_club">("login")
  const [currentUser, setCurrentUser] = useState<FMUser | null>(null)

  // Auth fields
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [authError, setAuthError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Club creation fields
  const [clubName, setClubName] = useState("")
  const [city, setCity] = useState("Київ")
  const [selectedBadge, setSelectedBadge] = useState("shield")
  const [primaryColor, setPrimaryColor] = useState("#0F5E10")
  const [secondaryColor, setSecondaryColor] = useState("#F59E0B")
  const [packRevealed, setPackRevealed] = useState(false)
  const [createdSquad, setCreatedSquad] = useState<FMPlayer[]>([])
  const [createdClub, setCreatedClub] = useState<FMClub | null>(null)

  // 1. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError("")
    if (!email || !password) {
      setAuthError("Будь ласка, заповніть усі поля")
      return
    }

    setIsLoading(true)
    fmAudio.playClick()

    try {
      const res = await fmLoginUser(email, password)
      if (res.error || !res.user) {
        setAuthError(res.error || "Невірний email або пароль")
      } else {
        if (res.club) {
          fmAudio.playLevelUp()
          onSuccess(res.user, res.club)
        } else {
          setCurrentUser(res.user)
          setMode("create_club")
        }
      }
    } catch {
      setAuthError("Помилка зв'язку з сервером")
    } finally {
      setIsLoading(false)
    }
  }

  // 2. Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError("")
    if (!email || !password || !username) {
      setAuthError("Будь ласка, заповніть усі поля")
      return
    }

    if (password.length < 4) {
      setAuthError("Пароль має містити щонайменше 4 символи")
      return
    }

    setIsLoading(true)
    fmAudio.playClick()

    try {
      const res = await fmRegisterUser(email, username, password)
      if (res.error || !res.user) {
        setAuthError(res.error || "Помилка при реєстрації")
      } else {
        setCurrentUser(res.user)
        setMode("create_club")
        fmAudio.playWhistle()
      }
    } catch {
      setAuthError("Помилка створення акаунту")
    } finally {
      setIsLoading(false)
    }
  }

  // 3. Handle Club Creation
  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    if (!clubName.trim()) {
      setAuthError("Введіть назву клубу")
      return
    }

    setIsLoading(true)
    fmAudio.playClick()

    try {
      const res = await fmCreateClub(currentUser.id, {
        name: clubName.trim(),
        city: city.trim() || "Київ",
        badgeSymbol: selectedBadge,
        primaryColor,
        secondaryColor
      })

      setCreatedClub(res.club)
      setCreatedSquad(res.players)
      setPackRevealed(true)
      fmAudio.playGoal()
    } catch (err: any) {
      setAuthError(err.message || "Помилка створення клубу")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinishOnboarding = () => {
    if (currentUser && createdClub) {
      fmAudio.playLevelUp()
      onSuccess(currentUser, createdClub, createdSquad)
    }
  }

  const SelectedBadgeIcon = BADGES.find((b) => b.id === selectedBadge)?.icon || Shield

  return (
    <div className="w-full max-w-xl mx-auto my-4 p-4 sm:p-6 rounded-3xl bg-slate-950/90 backdrop-blur-2xl border border-emerald-950/60 shadow-2xl text-white relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 rounded-full bg-emerald-600/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center space-y-2 mb-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          KSLIGA FOOTBALL MANAGER
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          {mode === "login" && "Вхід у кар'єру тренера"}
          {mode === "register" && "Створення профілю менеджера"}
          {mode === "create_club" && !packRevealed && "Заснування футбольного клубу"}
          {packRevealed && "Вітаємо у KSLIGA!"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          {mode === "login" && "Увійдіть до свого клубу, керуйте складом та перемагайте у лізі"}
          {mode === "register" && "Реєструйтеся безкоштовно та почніть свій шлях від аматорів до чемпіонства"}
          {mode === "create_club" && !packRevealed && "Виберіть кольори, емблему та отримайте стартовий склад гравців"}
          {packRevealed && "Ваш клуб готовий до першого матчу. Ось ваші стартові гравці!"}
        </p>
      </div>

      {authError && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-bold text-center">
          {authError}
        </div>
      )}

      {/* ─── 1. LOGIN FORM ─── */}
      {mode === "login" && (
        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Email адреса</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@ksliga.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-emerald-500 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Пароль доступу</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-emerald-500 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            <span>{isLoading ? "Перевірка..." : "Увійти в клуб"}</span>
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setAuthError("")
                setMode("register")
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
            >
              Немає акаунту? Створити новий клуб ➔
            </button>
          </div>
        </form>
      )}

      {/* ─── 2. REGISTER FORM ─── */}
      {mode === "register" && (
        <form onSubmit={handleRegister} className="space-y-4 relative z-10">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Ім'я менеджера / Тренера</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Олександр Тренер"
              required
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-emerald-500 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Email адреса</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@ksliga.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-emerald-500 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Пароль (від 4 символів)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={4}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-emerald-500 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            <span>{isLoading ? "Реєстрація..." : "Зареєструватися та створити клуб"}</span>
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setAuthError("")
                setMode("login")
              }}
              className="text-xs text-slate-400 hover:text-white font-bold transition-colors"
            >
              Вже маєте клуб? Увійти ➔
            </button>
          </div>
        </form>
      )}

      {/* ─── 3. CLUB CREATION WIZARD ─── */}
      {mode === "create_club" && !packRevealed && (
        <form onSubmit={handleCreateClub} className="space-y-5 relative z-10">
          {/* Badge & Color Preview */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl border-2 transition-all"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                borderColor: secondaryColor
              }}
            >
              <SelectedBadgeIcon className="h-12 w-12 text-white drop-shadow-md" />
            </div>
            <div className="text-center sm:text-left space-y-1">
              <div className="text-base font-black text-white">{clubName || "Назва вашого клубу"}</div>
              <div className="text-xs text-slate-400">{city || "Місто"} • KS Прем'єр Ліга</div>
              <div className="text-[11px] text-emerald-400 font-bold">Стартовий бюджет: 300,000 ₴</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Назва клубу</label>
              <input
                type="text"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="ФК Сокіл"
                required
                maxLength={28}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white text-sm focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Рідне місто</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Київ / Львів / Одеса"
                required
                maxLength={25}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500 text-white text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Badge Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Оберіть емблему</label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {BADGES.map((b) => {
                const Icon = b.icon
                const isSelected = selectedBadge === b.id
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setSelectedBadge(b.id)
                      fmAudio.playClick()
                    }}
                    className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                      isSelected
                        ? "bg-emerald-600 text-white ring-2 ring-emerald-400 scale-105 shadow-md"
                        : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Колірна палітра форми</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_COLORS.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPrimaryColor(c.primary)
                    setSecondaryColor(c.secondary)
                    fmAudio.playClick()
                  }}
                  className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                    primaryColor === c.primary && secondaryColor === c.secondary
                      ? "border-emerald-400 bg-slate-900 ring-1 ring-emerald-400"
                      : "border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400"
                  }`}
                >
                  <div className="flex -space-x-1 shrink-0">
                    <span className="w-4 h-4 rounded-full border border-black/40" style={{ backgroundColor: c.primary }} />
                    <span className="w-4 h-4 rounded-full border border-black/40" style={{ backgroundColor: c.secondary }} />
                  </div>
                  <span className="text-[11px] font-bold truncate text-slate-200">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !clubName.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm transition-all shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isLoading ? "Генерація клубу..." : "Заснувати клуб та отримати гравців"}</span>
          </button>
        </form>
      )}

      {/* ─── 4. SQUAD PACK REVEAL MODAL ─── */}
      {packRevealed && (
        <div className="space-y-5 text-center relative z-10 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <Trophy className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-white">Стартовий склад сформовано!</h3>
            <p className="text-xs text-slate-400">
              Ви отримали 16 футболістів для старту в KS Прем'єр Лізі
            </p>
          </div>

          {/* Quick squad carousel preview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1 text-left">
            {createdSquad.slice(0, 8).map((p) => (
              <div
                key={p.name}
                className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="text-[10px] font-black text-emerald-400 uppercase">{p.position}</div>
                  <div className="text-xs font-bold text-white truncate max-w-[90px]">{p.name.split(" ")[1] || p.name}</div>
                </div>
                <div className="text-xs font-black px-1.5 py-0.5 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                  {p.overall_rating}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleFinishOnboarding}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 active:scale-98"
          >
            <span>Перейти до управління клубом</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
