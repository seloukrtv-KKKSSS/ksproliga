"use client"

import { useState } from "react"
import { FMUser, FMClub, FMPlayer } from "@/lib/fm-types"
import { fmRegisterUser, fmLoginUser, fmCreateClub, fmGetClubByUserId } from "@/lib/fm-database"
import { fmAudio } from "@/lib/fm-audio"
import {
  Shield,
  Trophy,
  Crown,
  Star,
  Anchor,
  Flame,
  Award,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Zap
} from "lucide-react"

interface FMOnboardingProps {
  onComplete: (user: FMUser, club: FMClub) => void
}

const BADGE_ICONS = [
  { id: "shield", label: "Щит", icon: Shield },
  { id: "trophy", label: "Кубок", icon: Trophy },
  { id: "crown", label: "Корона", icon: Crown },
  { id: "star", label: "Зірка", icon: Star },
  { id: "anchor", label: "Якір", icon: Anchor },
  { id: "flame", label: "Полум'я", icon: Flame },
  { id: "award", label: "Орден", icon: Award }
]

const COLOR_PRESETS = [
  { primary: "#0F5E10", secondary: "#F59E0B", label: "Смарагд & Золото" },
  { primary: "#1E40AF", secondary: "#F59E0B", label: "Динамо & Золото" },
  { primary: "#DC2626", secondary: "#FFFFFF", label: "Червоно-Білий" },
  { primary: "#7C3AED", secondary: "#10B981", label: "Фіолетовий Неон" },
  { primary: "#EA580C", secondary: "#000000", label: "Шахтар Оранж" },
  { primary: "#0284C7", secondary: "#FFFFFF", label: "Морський Блакит" },
  { primary: "#16A34A", secondary: "#FBBF24", label: "Поліський Ліс" }
]

export function FMOnboarding({ onComplete }: FMOnboardingProps) {
  const [mode, setMode] = useState<"login" | "register" | "create_club">("register")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auth fields
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [createdUser, setCreatedUser] = useState<FMUser | null>(null)

  // Club creation fields
  const [clubName, setClubName] = useState("")
  const [city, setCity] = useState("Київ")
  const [selectedBadge, setSelectedBadge] = useState("shield")
  const [selectedColors, setSelectedColors] = useState(COLOR_PRESETS[0])

  // Pack opening animation state
  const [packRevealed, setPackRevealed] = useState(false)
  const [newClubData, setNewClubData] = useState<FMClub | null>(null)

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    fmAudio.playClick()

    try {
      if (mode === "register") {
        if (!username || !email || !password) {
          setError("Заповніть усі поля")
          setLoading(false)
          return
        }

        const res = await fmRegisterUser(username, email, password)
        if (res.error || !res.user) {
          setError(res.error || "Помилка реєстрації")
          setLoading(false)
          return
        }

        fmAudio.playLevelUp()
        setCreatedUser(res.user)
        setMode("create_club")
      } else {
        const res = await fmLoginUser(email, password)
        if (res.error || !res.user) {
          setError(res.error || "Помилка входу")
          setLoading(false)
          return
        }

        fmAudio.playClick()
        const userClub = await fmGetClubByUserId(res.user.id)
        if (userClub) {
          onComplete(res.user, userClub)
        } else {
          setCreatedUser(res.user)
          setMode("create_club")
        }
      }
    } catch (err: any) {
      setError(err.message || "Помилка запиту")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClubSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createdUser) return
    setError(null)
    setLoading(true)
    fmAudio.playClick()

    if (!clubName.trim()) {
      setError("Введіть назву вашого клубу")
      setLoading(false)
      return
    }

    try {
      const res = await fmCreateClub(
        createdUser.id,
        clubName.trim(),
        city.trim(),
        selectedColors.primary,
        selectedColors.secondary,
        selectedBadge
      )

      if (res.error || !res.club) {
        setError(res.error || "Не вдалося заснувати клуб")
        setLoading(false)
        return
      }

      fmAudio.playLevelUp()
      setNewClubData(res.club)
      setPackRevealed(true)
    } catch (err: any) {
      setError(err.message || "Помилка створення клубу")
    } finally {
      setLoading(false)
    }
  }

  const finishOnboarding = () => {
    if (createdUser && newClubData) {
      fmAudio.playCoins()
      onComplete(createdUser, newClubData)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/30 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl max-w-xl mx-auto">
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          KSLIGA Football Manager 11x11
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {mode === "create_club" ? "Заснування Футбольного Клубу" : "Вхід до Системи Менеджера"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
          {mode === "create_club"
            ? "Оберіть кольори, герб та місто для вашого нового клубу у стилі легендарного 11x11.ru!"
            : "Керуйте складом, беріть участь у швидких кубках та розвивайте власне Футбольне Місто."}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs sm:text-sm font-medium text-center">
          {error}
        </div>
      )}

      {/* MODE 1 & 2: LOGIN / REGISTER */}
      {mode !== "create_club" && (
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Ім'я Тренера / Менеджера
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="наприклад: Андрій Карпюк"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Електронна пошта (Email)
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@ksliga.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === "register" ? "Створити профіль тренера" : "Увійти в кабінет"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setError(null)
                setMode(mode === "register" ? "login" : "register")
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4"
            >
              {mode === "register"
                ? "Вже є клуб? Увійти за поштою"
                : "Новий менеджер? Зареєструватися"}
            </button>
          </div>
        </form>
      )}

      {/* MODE 3: CREATE CLUB */}
      {mode === "create_club" && !packRevealed && (
        <form onSubmit={handleCreateClubSubmit} className="space-y-5">
          {/* Crest Preview */}
          <div className="flex justify-center mb-2">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl border-4 border-slate-800 transition-all scale-105"
              style={{
                background: `linear-gradient(135deg, ${selectedColors.primary}, ${selectedColors.secondary})`
              }}
            >
              <Shield className="w-10 h-10 text-white drop-shadow" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Назва Клубу
            </label>
            <input
              type="text"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="наприклад: ФК Дрогобич"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Місто
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Київ, Львів, Одеса тощо"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Color Palettes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Кольори Клубу
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {COLOR_PRESETS.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedColors(c)}
                  className={`h-10 rounded-xl border-2 transition-all overflow-hidden flex ${
                    selectedColors.primary === c.primary && selectedColors.secondary === c.secondary
                      ? "border-white scale-110 shadow-lg"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="w-1/2 h-full" style={{ backgroundColor: c.primary }} />
                  <div className="w-1/2 h-full" style={{ backgroundColor: c.secondary }} />
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-950 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Заснувати Клуб та Отримати Стартовий Склад</span>
                <Sparkles className="w-4 h-4 fill-slate-950" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STARTER PACK REVEAL MODAL */}
      {packRevealed && newClubData && (
        <div className="text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center mx-auto text-amber-400">
            <Trophy className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white">Вітаємо у 11x11!</h3>
            <p className="text-sm text-slate-300">
              Клуб <span className="text-emerald-400 font-bold">{newClubData.name}</span> успішно засновано!
              Вам зараховано <span className="text-amber-400 font-bold">300,000 ₴</span> стартового бюджету та повний склад із 16 футболістів.
            </p>
          </div>

          <button
            onClick={finishOnboarding}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-950 transition-all"
          >
            Перейти до Керування Клубом 🚀
          </button>
        </div>
      )}
    </div>
  )
}
