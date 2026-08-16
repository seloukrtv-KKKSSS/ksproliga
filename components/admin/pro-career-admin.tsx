"use client"

import { useState, useEffect } from "react"
import {
  proAdminGetCareers,
  proAdminDeleteCareer,
  proAdminResetAllCareers,
  proAdminUpdateCareerBalance,
  proGetClubs
} from "@/lib/pro-database"
import { ProCareer, ProClub } from "@/lib/pro-types"
import { ProAvatarRenderer } from "@/components/games/pro-career/pro-avatar"
import {
  Gamepad2,
  Trash2,
  RotateCcw,
  ShieldAlert,
  Search,
  Users,
  Trophy,
  Wallet,
  Sparkles,
  Edit,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Eye,
  TrendingUp,
  Activity,
  Shield
} from "lucide-react"

export function ProCareerAdmin() {
  const [careers, setCareers] = useState<ProCareer[]>([])
  const [clubs, setClubs] = useState<ProClub[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Modals state
  const [showFullResetModal, setShowFullResetModal] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState("")
  const [editingCareer, setEditingCareer] = useState<ProCareer | null>(null)
  const [editBalance, setEditBalance] = useState<number>(0)
  const [editWage, setEditWage] = useState<number>(0)
  const [editOvr, setEditOvr] = useState<number>(0)

  // Load data
  const loadData = async () => {
    setLoading(true)
    try {
      const [careersData, clubsData] = await Promise.all([
        proAdminGetCareers(),
        proGetClubs()
      ])
      setCareers(careersData)
      setClubs(clubsData)
    } catch (err) {
      console.error("Error loading admin pro careers:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Delete single player
  const handleDeletePlayer = async (career: ProCareer) => {
    if (!confirm(`Ви впевнені, що хочете видалити футболіста ${career.first_name} ${career.last_name}? Його прогрес буде скинуто.`)) {
      return
    }

    const res = await proAdminDeleteCareer(career.id)
    if (res.success) {
      setMessage({ type: "success", text: `Гравця ${career.first_name} ${career.last_name} успішно видалено з бази!` })
      loadData()
    } else {
      setMessage({ type: "error", text: res.error || "Помилка при видаленні гравця" })
    }
  }

  // Full Database Reset
  const handleFullReset = async () => {
    if (resetConfirmText.trim().toUpperCase() !== "RESET") {
      alert("Для підтвердження введіть слово RESET")
      return
    }

    const res = await proAdminResetAllCareers()
    if (res.success) {
      setMessage({
        type: "success",
        text: "Повне скидання бази даних успішно завершено! Всі гравці та матчі видалені, всі користувачі почнуть з 0."
      })
      setShowFullResetModal(false)
      setResetConfirmText("")
      loadData()
    } else {
      setMessage({ type: "error", text: res.error || "Помилка скидання бази даних" })
    }
  }

  // Edit player params
  const handleSaveEdit = async () => {
    if (!editingCareer) return
    const res = await proAdminUpdateCareerBalance(editingCareer.id, {
      bank_balance: editBalance,
      wage_per_week: editWage,
      overall_rating: editOvr
    })

    if (res.success) {
      setMessage({ type: "success", text: `Параметри гравця ${editingCareer.first_name} ${editingCareer.last_name} оновлено!` })
      setEditingCareer(null)
      loadData()
    } else {
      setMessage({ type: "error", text: res.error || "Помилка збереження" })
    }
  }

  // Filtered Careers
  const filteredCareers = careers.filter((c) => {
    const q = searchQuery.toLowerCase()
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase()
    const club = clubs.find((cl) => cl.id === c.current_club_id)?.name.toLowerCase() || ""
    return fullName.includes(q) || (c.nickname && c.nickname.toLowerCase().includes(q)) || club.includes(q)
  })

  // Summary Metrics
  const totalBalance = careers.reduce((sum, c) => sum + (c.bank_balance || 0), 0)
  const totalMatches = careers.reduce((sum, c) => sum + (c.career_stats?.total_matches || 0), 0)
  const totalGoals = careers.reduce((sum, c) => sum + (c.career_stats?.total_goals || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      {/* ─── BANNER HEADER ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-6 sm:p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-emerald-500/30">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider border border-emerald-500/40">
            <Gamepad2 className="w-4 h-4" />
            Адміністрування KS Games
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Керування Грою «Від Села до УПЛ»
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Повний контроль над гравцями, балансами, клубами та можливість повного очищення бази даних гри.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer shadow-md"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            <span>Оновити дані</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFullResetModal(true)}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-950 transition-all cursor-pointer active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Скинути всіх гравців & БД</span>
          </button>
        </div>
      </div>

      {/* ─── ALERT MESSAGE ─── */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-black flex items-center justify-between shadow-lg ${
            message.type === "success"
              ? "bg-emerald-950/80 border border-emerald-500 text-emerald-300"
              : "bg-rose-950/80 border border-rose-500 text-rose-300"
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="p-1 rounded-lg hover:bg-black/20 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── METRICS CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Всього Футболістів</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {careers.length}
          </div>
          <span className="text-[11px] text-slate-400">Створені персонажі в БД</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Сумарний Баланс</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
            {totalBalance.toLocaleString()} ₴
          </div>
          <span className="text-[11px] text-slate-400">Гроші на руках у гравців</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Зіграно Матчів</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">
            {totalMatches}
          </div>
          <span className="text-[11px] text-slate-400">Симуляцій проведено</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Забито Голів</span>
            <Trophy className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 font-mono">
            {totalGoals}
          </div>
          <span className="text-[11px] text-slate-400">Результативні удари</span>
        </div>
      </div>

      {/* ─── SEARCH & CONTROLS ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Пошук за прізвищем, клубом..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:border-emerald-500"
          />
        </div>

        <span className="text-xs font-bold text-slate-500">
          Знайдено: {filteredCareers.length} із {careers.length}
        </span>
      </div>

      {/* ─── CAREERS TABLE ─── */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 text-center">Аватар</th>
                <th className="py-3 px-4">Футболіст</th>
                <th className="py-3 px-3">Стать / Позиція</th>
                <th className="py-3 px-4">Клуб / Ліга</th>
                <th className="py-3 px-3 text-center">OVR</th>
                <th className="py-3 px-3 text-right">Баланс ₴</th>
                <th className="py-3 px-3 text-center">Матчі / Голи</th>
                <th className="py-3 px-4 text-center">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCareers.length > 0 ? (
                filteredCareers.map((c) => {
                  const club = clubs.find((cl) => cl.id === c.current_club_id)

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Avatar */}
                      <td className="py-3 px-3 text-center">
                        <div className="w-10 h-10 mx-auto rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-xs">
                          <ProAvatarRenderer avatar={c.avatar} club={club} size={40} />
                        </div>
                      </td>

                      {/* Name & Nickname */}
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900 text-sm">
                          {c.first_name} {c.last_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {c.nickname ? `«${c.nickname}» • ` : ""}{c.age} років
                        </div>
                      </td>

                      {/* Gender & Pos */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>{c.gender === "female" ? "👩 Жінка" : "👨 Чоловік"}</span>
                        </div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-slate-100 font-mono font-black text-[10px] text-slate-700">
                          {c.position}
                        </span>
                      </td>

                      {/* Club */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {club?.logo_url ? (
                            <img
                              src={club.logo_url}
                              alt={club.name}
                              className="w-5 h-5 object-contain shrink-0"
                            />
                          ) : (
                            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <div>
                            <div className="font-bold text-slate-900">
                              {club ? club.name : "Вільний агент"}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Рівень {club?.tier || 1} • {c.wage_per_week.toLocaleString()} ₴/тижд
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* OVR & Potential */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 font-black text-amber-700 font-mono">
                          {c.overall_rating}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Пот: {c.potential}
                        </div>
                      </td>

                      {/* Bank Balance */}
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-700">
                        {(c.bank_balance || 0).toLocaleString()} ₴
                      </td>

                      {/* Matches / Goals */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span className="font-bold text-slate-800">
                          {c.career_stats?.total_matches || 0}
                        </span>{" "}
                        /{" "}
                        <span className="font-black text-emerald-600">
                          {c.career_stats?.total_goals || 0} г
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCareer(c)
                              setEditBalance(c.bank_balance || 0)
                              setEditWage(c.wage_per_week || 1000)
                              setEditOvr(c.overall_rating || 42)
                            }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                            title="Редагувати параметри"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePlayer(c)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                            title="Видалити гравця (Скинути прогрес)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {loading ? "Завантаження списку..." : "Гравців не знайдено."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── FULL RESET MODAL ─── */}
      {showFullResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border-2 border-rose-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Повне очищення бази гри!
                </h3>
                <span className="text-xs text-rose-600 font-bold uppercase tracking-wider">
                  Незворотна дія
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ця дія видалить <strong>абсолютно всіх футболістів</strong>, зіграні матчі та записи в Залі Слави. Всі користувачі починатимуть з чистого листа.
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <label className="font-bold text-slate-700 block">
                Введіть <span className="font-mono text-rose-600 font-black">RESET</span> для підтвердження:
              </label>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowFullResetModal(false)
                  setResetConfirmText("")
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Скасувати
              </button>

              <button
                type="button"
                onClick={handleFullReset}
                disabled={resetConfirmText.trim().toUpperCase() !== "RESET"}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black cursor-pointer shadow-lg shadow-rose-950"
              >
                Підтвердити повне очищення
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT CAREER MODAL ─── */}
      {editingCareer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Редагувати параметри гравця
                </h3>
                <span className="text-xs text-slate-400">
                  {editingCareer.first_name} {editingCareer.last_name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingCareer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Особисті гроші (₴):</label>
                <input
                  type="number"
                  value={editBalance}
                  onChange={(e) => setEditBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Зарплата за контрактом (₴/тижд):</label>
                <input
                  type="number"
                  value={editWage}
                  onChange={(e) => setEditWage(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Загальний рейтинг OVR:</label>
                <input
                  type="number"
                  value={editOvr}
                  min={35}
                  max={99}
                  onChange={(e) => setEditOvr(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingCareer(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Скасувати
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer shadow-lg shadow-emerald-950"
              >
                Зберегти зміни
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
