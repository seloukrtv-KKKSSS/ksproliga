"use client"

import { FMClub, FMPlayer, FMStadium, FMTactics } from "@/lib/fm-types"
import { calculateTeamPower } from "@/lib/fm-engine"
import { fmAudio } from "@/lib/fm-audio"
import {
  Trophy,
  Play,
  Shield,
  Dumbbell,
  Building2,
  ShoppingBag,
  GraduationCap,
  SlidersHorizontal,
  Flame,
  Award,
  Users,
  DollarSign,
  Zap,
  TrendingUp,
  HeartPulse
} from "lucide-react"

interface FMDashboardProps {
  club: FMClub
  players: FMPlayer[]
  stadium: FMStadium
  tactics: FMTactics
  onNavigateTab: (tab: string) => void
}

export function FMDashboard({
  club,
  players,
  stadium,
  tactics,
  onNavigateTab
}: FMDashboardProps) {
  const teamPower = calculateTeamPower(players, tactics)
  const starters = players.filter((p) => p.is_starter)
  const avgStamina = Math.round(
    players.reduce((acc, p) => acc + p.stamina, 0) / Math.max(1, players.length)
  )

  // Top scorer in club
  const topScorer = [...players].sort((a, b) => b.goals - a.goals)[0]

  // XP progress to next level
  const currentXp = club.manager_xp % 500
  const xpPercent = Math.min(100, Math.round((currentXp / 500) * 100))

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-10 text-white">
      {/* ─── Hero Club & Manager Banner ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl">
        {/* Ambient neon */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-56 h-56 rounded-full bg-emerald-600/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left: Crest & Info */}
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border-2 shrink-0"
              style={{
                background: `linear-gradient(135deg, ${club.primary_color}, ${club.secondary_color})`,
                borderColor: club.secondary_color
              }}
            >
              <Shield className="h-10 w-10 text-white drop-shadow" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white">{club.name}</h1>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                  Рівень {club.manager_level}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {club.city} • KS Прем'єр Ліга • Репутація {club.reputation} ⭐
              </div>

              {/* XP Bar */}
              <div className="space-y-1 pt-1 max-w-xs">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>Досвід менеджера</span>
                  <span className="text-amber-400">{currentXp} / 500 XP</span>
                </div>
                <div className="w-48 h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quick Action to Play */}
          <button
            type="button"
            onClick={() => {
              fmAudio.playWhistle()
              onNavigateTab("matches")
            }}
            className="w-full md:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-950 flex items-center justify-center gap-2.5 active:scale-95 shrink-0"
          >
            <Play className="h-5 w-5 fill-slate-950" />
            <span>Зіграти наступний матч</span>
          </button>
        </div>
      </div>

      {/* ─── Key Stats Grid ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
            <span>Бюджет клубу</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-400">
            {club.balance.toLocaleString()} ₴
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
            <span>Сила складу</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-400">
            {teamPower.overall} OVR
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
            <span>Вболівальники</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-400">
            {club.fans_count.toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-1">
          <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
            <span>Готовність команди</span>
            <HeartPulse className="h-4 w-4 text-teal-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-teal-400">
            {avgStamina}% сил
          </div>
        </div>
      </div>

      {/* ─── Highlights: Top Scorer & Stadium Snapshot ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Scorer Card */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
            <span>Найкращий бомбардир клубу</span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>

          {topScorer ? (
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex flex-col items-center justify-center font-black">
                <span className="text-[9px] uppercase">{topScorer.position}</span>
                <span className="text-sm text-white leading-none">{topScorer.overall_rating}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-white truncate">{topScorer.name}</div>
                <div className="text-xs text-slate-400">
                  {topScorer.goals} голів у {topScorer.matches_played} матчах ({topScorer.assists} асистів)
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3">Немає статистики</div>
          )}
        </div>

        {/* Stadium Snapshot */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
            <span>Домашній стадіон</span>
            <Building2 className="h-4 w-4 text-emerald-400" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-sm font-black text-white">{stadium.name}</div>
              <div className="text-xs text-slate-400">
                Місткість: {stadium.capacity.toLocaleString()} глядачів • Квиток {stadium.ticket_price} ₴
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("stadium")}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              Розвивати
            </button>
          </div>
        </div>
      </div>

      {/* ─── Navigation Shortcut Action Cards ─── */}
      <div className="space-y-3">
        <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
          Швидкі дії менеджера:
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              id: "squad",
              title: "Склад & Тактика",
              desc: "Схема 4-4-2, склад, стиль",
              icon: SlidersHorizontal,
              color: "text-emerald-400"
            },
            {
              id: "training",
              title: "Тренування",
              desc: "Прокачування та відновлення",
              icon: Dumbbell,
              color: "text-amber-400"
            },
            {
              id: "transfers",
              title: "Трансфери",
              desc: "Купівля та продаж гравців",
              icon: ShoppingBag,
              color: "text-blue-400"
            },
            {
              id: "youth",
              title: "Академія",
              desc: "Скаутинг юних зірок",
              icon: GraduationCap,
              color: "text-teal-400"
            }
          ].map((sc) => {
            const Icon = sc.icon
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  fmAudio.playClick()
                  onNavigateTab(sc.id)
                }}
                className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-left transition-all space-y-2 hover:scale-102 group shadow-lg"
              >
                <div className={`w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center ${sc.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors">
                    {sc.title}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">{sc.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
