"use client"

import { useState } from "react"
import { ProCareer, ProClub } from "@/lib/pro-types"
import { getScoutRequirements } from "@/lib/pro-engine"
import { proAudio } from "@/lib/pro-audio"
import {
  Shield,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Check,
  Lock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Target,
  Trophy
} from "lucide-react"

interface ProTransfersProps {
  career: ProCareer
  currentClub: ProClub
  allClubs: ProClub[]
  onAcceptTransfer: (newClub: ProClub, wage: number, signingBonus: number) => void
}

export function ProTransfers({
  career,
  currentClub,
  allClubs,
  onAcceptTransfer
}: ProTransfersProps) {
  const [successMsg, setSuccessMsg] = useState("")

  // Calculate scout radar and requirements for tiers 2, 3, 4, 5
  const tiersToCheck = [
    { tier: 2, name: "Чемпіонат Області", repTarget: "Покуття / Пробій / Прикарпаття-2" },
    { tier: 3, name: "Друга Ліга ПФЛ", repTarget: "Скала 1911 / Нива Вінниця / Рух-2" },
    { tier: 4, name: "Перша Ліга ПФЛ", repTarget: "Прикарпаття / Буковина / Епіцентр" },
    { tier: 5, name: "Українська Премʼєр Ліга", repTarget: "Динамо Київ / Шахтар / Карпати" }
  ]

  const scoutChecklist = tiersToCheck.map((t) => ({
    ...t,
    req: getScoutRequirements(career, t.tier)
  }))

  // Unlocked Offers
  const availableOffers: {
    club: ProClub
    wage: number
    role: string
    pitch: string
    signingBonus: number
    tier: number
  }[] = []

  // Check tier 2
  if (scoutChecklist[0].req.is_unlocked) {
    const oblastClubs = allClubs.filter((c) => c.tier === 2 && c.id !== currentClub.id)
    if (oblastClubs.length > 0) {
      const c = oblastClubs[0]
      availableOffers.push({
        club: c,
        tier: 2,
        wage: 8500,
        role: "Гравець основи",
        pitch: `«Ми бачимо твій блискучий прогрес на рівні району. Час спробувати себе в Чемпіонаті Області за ${c.name}!»`,
        signingBonus: 15000
      })
    }
  }

  // Check tier 3
  if (scoutChecklist[1].req.is_unlocked) {
    const pflClubs = allClubs.filter((c) => c.tier === 3 && c.id !== currentClub.id)
    if (pflClubs.length > 0) {
      const c = pflClubs[0]
      availableOffers.push({
        club: c,
        tier: 3,
        wage: 28000,
        role: "Ключовий гравець",
        pitch: `«Скаутський відділ ${c.name} вражений твоїми статистичними показниками. Пропонуємо професійний контракт!»`,
        signingBonus: 50000
      })
    }
  }

  // Check tier 4
  if (scoutChecklist[2].req.is_unlocked) {
    const p1Clubs = allClubs.filter((c) => c.tier === 4 && c.id !== currentClub.id)
    if (p1Clubs.length > 0) {
      const c = p1Clubs[0]
      availableOffers.push({
        club: c,
        tier: 4,
        wage: 85000,
        role: "Лідер команди",
        pitch: `«Головний тренер ${c.name} бачить у тобі ключову фігуру для боротьби за вихід до УПЛ!»`,
        signingBonus: 120000
      })
    }
  }

  // Check tier 5 (UPL)
  if (scoutChecklist[3].req.is_unlocked) {
    const uplClubs = allClubs.filter((c) => c.tier === 5 && c.id !== currentClub.id)
    if (uplClubs.length > 0) {
      const c = uplClubs[0]
      availableOffers.push({
        club: c,
        tier: 5,
        wage: 420000,
        role: "Зірка клубу",
        pitch: `«Ти готовий грати в еліті українського футболу! Президент ${c.name} особисто чекає на твій підпис!»`,
        signingBonus: 500000
      })
    }
  }

  const handleSign = (club: ProClub, wage: number, bonus: number) => {
    if (career.contract_signed_this_season) {
      alert("Ви вже підписали контракт у цьому сезоні! Нові трансфери відкриються в наступному сезоні.")
      return
    }

    proAudio.playTrophyChime()
    onAcceptTransfer(club, wage, bonus)
    setSuccessMsg(`🎉 Вітаємо з трансфером у ${club.name}! Отримано підйомні +${bonus.toLocaleString()} ₴!`)
    setTimeout(() => setSuccessMsg(""), 4000)
  }

  return (
    <div className="max-w-[1500px] mx-auto w-full space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <ShoppingBag className="w-3.5 h-3.5" />
            Скаутинг & Змістовні Трансфери
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Шлях до Вищих Ліг
          </h2>
          <p className="text-xs text-slate-300">
            Клуби роблять пропозиції лише після того, як ти доведеш свій клас на полі!
          </p>
        </div>

        {/* Current Contract Info */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-right space-y-0.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase">
            Твій клуб (Рівень {currentClub.tier})
          </div>
          <div className="text-sm font-black text-emerald-400">
            {currentClub.name}
          </div>
          <div className="text-xs text-slate-300 font-mono">
            Зарплата: <strong>{career.wage_per_week.toLocaleString()} ₴/тижд</strong>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-black text-center animate-fade-in shadow-xl">
          {successMsg}
        </div>
      )}

      {career.contract_signed_this_season && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            Ви вже підписали контракт на цей сезон. Нове трансферне вікно відкриється по завершенню поточного сезону.
          </span>
        </div>
      )}

      {/* ─── SCOUT RADAR & TIER REQUIREMENTS CHECKLIST ─── */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          Радар Скаутів та Вимоги Ліг:
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scoutChecklist.map((item) => {
            const req = item.req

            return (
              <div
                key={item.tier}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-3 shadow-xl ${
                  req.is_unlocked
                    ? "bg-gradient-to-b from-slate-900 to-emerald-950/80 border-emerald-500/50 shadow-emerald-950/30"
                    : "bg-slate-900/90 border-slate-800"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-black text-white">
                        Рівень {item.tier}: {item.name}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {item.repTarget}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        req.is_unlocked
                          ? "bg-emerald-500 text-slate-950 animate-pulse"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {req.is_unlocked ? "Скаути Зацікавлені!" : "Не розблоковано"}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-400">Інтерес скаутів:</span>
                      <span
                        className={
                          req.is_unlocked ? "text-emerald-400 font-mono" : "text-amber-400 font-mono"
                        }
                      >
                        {req.progress_percent}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          req.is_unlocked
                            ? "bg-emerald-500 shadow-md shadow-emerald-500"
                            : "bg-amber-400"
                        }`}
                        style={{ width: `${req.progress_percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Requirements List */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Рейтинг OVR:</span>
                      <strong className={career.overall_rating >= req.min_ovr ? "text-emerald-400" : "text-slate-300"}>
                        {career.overall_rating} / {req.min_ovr}+
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Зіграно матчів:</span>
                      <strong className={career.career_stats.total_matches >= req.min_matches ? "text-emerald-400" : "text-slate-300"}>
                        {career.career_stats.total_matches} / {req.min_matches}+
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Голи + Асисти:</span>
                      <strong className={(career.career_stats.total_goals + career.career_stats.total_assists) >= req.min_goal_contributions ? "text-emerald-400" : "text-slate-300"}>
                        {career.career_stats.total_goals + career.career_stats.total_assists} / {req.min_goal_contributions}+
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Середня оцінка:</span>
                      <strong className={career.career_stats.avg_rating >= req.min_avg_rating ? "text-emerald-400" : "text-slate-300"}>
                        ⭐ {career.career_stats.avg_rating.toFixed(1)} / {req.min_avg_rating}+
                      </strong>
                    </div>
                  </div>
                </div>

                {req.is_unlocked ? (
                  <div className="text-[11px] text-emerald-300 font-bold flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Всі вимоги виконано! Очікуйте або перегляньте пропозицію нижче.</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-300/90 font-medium flex items-center gap-1.5 pt-1">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{req.missing_reasons[0] || "Продовжуй показувати сильну гру в матчах!"}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── ACTIVE UNLOCKED PROPOSALS ─── */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Офіційні пропозиції контрактів:
        </h3>

        {availableOffers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableOffers.map((offer, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-slate-900/90 border-2 border-emerald-500/50 hover:border-emerald-400 shadow-2xl transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {offer.club.logo_url ? (
                      <img
                        src={offer.club.logo_url}
                        alt={offer.club.name}
                        className="w-12 h-12 object-contain drop-shadow shrink-0"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${offer.club.primary_color}, ${offer.club.secondary_color})`
                        }}
                      >
                        <Shield className="w-6 h-6 text-white drop-shadow" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-base font-black text-white">
                        {offer.club.name}
                      </h4>
                      <span className="text-xs text-emerald-400 font-bold">
                        {offer.club.city} • Рівень {offer.club.tier} ({offer.role})
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 italic bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                    {offer.pitch}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">
                        Зарплата:
                      </span>
                      <strong className="text-emerald-400 font-mono">
                        {offer.wage.toLocaleString()} ₴/тижд
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">
                        Підйомні:
                      </span>
                      <strong className="text-amber-300 font-mono">
                        +{offer.signingBonus.toLocaleString()} ₴
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={Boolean(career.contract_signed_this_season)}
                  onClick={() => handleSign(offer.club, offer.wage, offer.signingBonus)}
                  className={`w-full py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 ${
                    career.contract_signed_this_season
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-slate-950 cursor-pointer shadow-emerald-950"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {career.contract_signed_this_season
                      ? "Контракт вже підписано"
                      : `Підписати Контракт (+${offer.signingBonus.toLocaleString()} ₴)`}
                  </span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-2">
            <div className="text-3xl">🕵️</div>
            <h4 className="text-sm font-bold text-white">
              Скаути уважно стежать за твоїм прогресом
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Забивай голи, роби асисти та прокачуй рейтинг OVR, щоб заповнити шкалу інтересу скаутів до 100% та отримати контракт від клубів вищих дивізіонів!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
