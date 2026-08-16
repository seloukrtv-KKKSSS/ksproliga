"use client"

import { ProCareer, ProClub, ProLeague } from "@/lib/pro-types"
import { ProCard } from "./pro-card"
import {
  Shield,
  Trophy,
  Play,
  Zap,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  Award,
  Wallet,
  Target
} from "lucide-react"

interface ProDashboardProps {
  career: ProCareer
  currentClub: ProClub
  currentLeague: ProLeague
  opponentClub: ProClub
  onStartMatch: () => void
  onNavigate: (tab: string) => void
}

export function ProDashboard({
  career,
  currentClub,
  currentLeague,
  opponentClub,
  onStartMatch,
  onNavigate
}: ProDashboardProps) {
  const stats = career.career_stats
  const isHome = career.current_fixture_round % 2 === 1

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6 animate-fade-in">
      {/* ─── TOP HERO BANNER: NEXT FIXTURE PREVIEW ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            {currentLeague.name} • Тур {career.current_fixture_round} з 18
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {isHome ? `${currentClub.name} vs ${opponentClub.name}` : `${opponentClub.name} vs ${currentClub.name}`}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            {isHome
              ? `Домашній поєдинок на стадіоні «${currentClub.stadium_name}» (${currentClub.city})`
              : `Виїзний матч у гостях на стадіоні «${opponentClub.stadium_name}» (${opponentClub.city})`}
          </p>
        </div>

        {/* Big Matchday Button */}
        <button
          type="button"
          onClick={onStartMatch}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-slate-950 font-black text-sm sm:text-base flex items-center gap-2.5 shadow-2xl shadow-emerald-950 transition-all active:scale-95 cursor-pointer shrink-0 animate-pulse"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>Грати Матч Туру</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* ─── MAIN GRID: 3D CARD & METRICS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D Holographic Card (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center space-y-3">
          <ProCard career={career} club={currentClub} size="md" />
        </div>

        {/* Right Column: Status Widgets & Quick Nav (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Загальний OVR
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                {career.overall_rating}
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">
                Потенціал: {career.potential}
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Енергія / Сили
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {career.energy}%
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden mt-1">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${career.energy}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Голи + Асисти
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                {stats.total_goals + stats.total_assists}
              </div>
              <span className="text-[10px] text-slate-400">
                {stats.total_goals} Г • {stats.total_assists} А ({stats.total_matches} м.)
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Особистий Баланс
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono truncate">
                {(career.bank_balance || 0).toLocaleString()} ₴
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {career.wage_per_week.toLocaleString()} ₴/т
              </span>
            </div>
          </div>

          {/* Quick Hub Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onNavigate("training")}
              className="p-5 rounded-3xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition-all active:scale-95 shadow-xl flex flex-col justify-between space-y-2 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
                ⚡
              </div>
              <div>
                <h4 className="font-black text-white text-sm group-hover:text-emerald-300">
                  Тренування & СПА
                </h4>
                <p className="text-xs text-slate-400">
                  Прокачуй OVR та відновлюй енергію
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("lifestyle")}
              className="p-5 rounded-3xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/40 text-left transition-all active:scale-95 shadow-xl flex flex-col justify-between space-y-2 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
                🛍️
              </div>
              <div>
                <h4 className="font-black text-white text-sm group-hover:text-amber-300">
                  Магазин Життя
                </h4>
                <p className="text-xs text-slate-400">
                  Купуй тренери, бутси, авто та житло
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("transfers")}
              className="p-5 rounded-3xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 text-left transition-all active:scale-95 shadow-xl flex flex-col justify-between space-y-2 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-xl">
                🕵️
              </div>
              <div>
                <h4 className="font-black text-white text-sm group-hover:text-teal-300">
                  Скаутинг & Трансфери
                </h4>
                <p className="text-xs text-slate-400">
                  Пропозиції від клубів вищих ліг
                </p>
              </div>
            </button>
          </div>

          {/* Scout Radar Progress Bar Card */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                Радар Скаутів: Інтерес до твого трансферу
              </span>
              <span className="text-xs font-black text-amber-300 font-mono">
                {currentClub.tier < 5 ? `Рівень ${currentClub.tier + 1}` : "УПЛ (Топ)"}
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-500 shadow-md"
                style={{
                  width: `${Math.min(100, Math.max(15, (stats.total_goals + stats.total_assists) * 12))}%`
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Забивай голи та роби результативні передачі в матчах туру, щоб привернути увагу скаутів!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
