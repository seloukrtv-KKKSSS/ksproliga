"use client"

import type { FMClub, FMPlayer, FMSection, FMStadium } from "@/lib/fm-types"
import { calculateTeamPower } from "@/lib/fm-engine"
import {
  Trophy,
  Shield,
  Zap,
  Dumbbell,
  Building2,
  ShoppingBag,
  GraduationCap,
  Sparkles,
  Users
} from "lucide-react"

interface FMDashboardProps {
  club: FMClub
  players: FMPlayer[]
  stadium: FMStadium | null
  onNavigate: (tab: FMSection) => void
}

export function FMDashboard({
  club,
  players,
  stadium,
  onNavigate
}: FMDashboardProps) {
  const teamPower = calculateTeamPower(players)

  const starters = players.filter((p) => p.is_starter)
  const avgEnergy = starters.length > 0
    ? Math.round(starters.reduce((acc, p) => acc + (p.energy ?? p.stamina ?? 100), 0) / starters.length)
    : 100

  const topPlayer = [...players].sort((a, b) => (b.skill || 0) - (a.skill || 0))[0]

  const currentXpInLevel = (club.manager_xp || 0) % 500
  const xpPercent = Math.min(100, Math.round((currentXpInLevel / 500) * 100))

  return (
    <div className="space-y-6">
      {/* HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/80 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center shadow-2xl border-4 border-emerald-400/40 shrink-0"
              style={{
                background: `linear-gradient(135deg, ${club.primary_color}, ${club.secondary_color})`
              }}
            >
              <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {club.name}
                </h1>
                <span className="px-3 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Рівень {club.manager_level}
                </span>
                {(club.cups_won || 0) > 0 && (
                  <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    🏆 {club.cups_won} Трофеїв
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-400">
                {club.city} • Фан-база: <span className="text-slate-200 font-semibold">{club.fans_count.toLocaleString()}</span> уболівальників
              </p>

              {/* XP Progress Bar */}
              <div className="pt-2 max-w-xs space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>Досвід Менеджера (XP)</span>
                  <span className="text-emerald-400 font-mono">{currentXpInLevel} / 500 XP</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PLAY CUP TOURNAMENT CTA */}
          <button
            onClick={() => onNavigate("tournaments")}
            className="w-full lg:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-base shadow-2xl shadow-emerald-950 transition-all scale-100 hover:scale-105 flex items-center justify-center gap-3 shrink-0"
          >
            <Trophy className="w-6 h-6" />
            <span>Грати Швидкий Кубок 11x11</span>
          </button>
        </div>
      </div>

      {/* KEY METRICS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Club Balance */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Бюджет Клубу</span>
            <span className="text-emerald-400">₴</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-300">
            {club.balance.toLocaleString()} ₴
          </p>
          <span className="text-[11px] text-slate-400">Доступно для трансферів та будівель</span>
        </div>

        {/* 2. Team Skill Power */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Сила Команди (OVR)</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">
            {teamPower.overall}
          </p>
          <span className="text-[11px] text-slate-400">
            АТК: {teamPower.attack} • ПЗ: {teamPower.midfield} • ЗАХ: {teamPower.defense}
          </span>
        </div>

        {/* 3. Average Squad Energy */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Форма / Енергія</span>
            <span className={avgEnergy > 70 ? "text-emerald-400" : "text-rose-400"}>⚡</span>
          </div>
          <p className={`text-xl sm:text-2xl font-black ${avgEnergy > 70 ? "text-emerald-300" : "text-amber-400"}`}>
            {avgEnergy}%
          </p>
          <span className="text-[11px] text-slate-400">
            {avgEnergy < 60 ? "Потрібне відновлення у СПА!" : "Команда готова до турнірів"}
          </span>
        </div>

        {/* 4. Cups & Trophies */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Кубки & Трофеї</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-300">
            {club.cups_won || 0}
          </p>
          <span className="text-[11px] text-slate-400">Виграно турнірів 11x11</span>
        </div>
      </div>

      {/* HIGHLIGHTS: TOP PLAYER & FOOTBALL CITY SNAPSHOT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Player Card */}
        {topPlayer && (
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Лідер Команди
                </h3>
              </div>
              <button
                onClick={() => onNavigate("squad")}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
              >
                Весь склад →
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex flex-col items-center justify-center shrink-0">
                <span className="text-[11px] font-black text-emerald-400">{topPlayer.position}</span>
                <span className="text-base font-black text-white">{topPlayer.skill}</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white">{topPlayer.name}</h4>
                  <div className="flex text-amber-400 text-xs">
                    {Array.from({ length: topPlayer.talent || 3 }).map((_, i) => (
                      <span key={i}>⭐</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Вік: {topPlayer.age} р. • Матчів: {topPlayer.matches_played} • Голів: {topPlayer.goals}
                </p>
                {topPlayer.special_abilities?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {topPlayer.special_abilities.map((ab, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40"
                      >
                        {ab}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Football City Snapshot */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Футбольне Місто (Інфраструктура)
              </h3>
            </div>
            <button
              onClick={() => onNavigate("city")}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
            >
              Перейти до міста →
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-xs text-slate-400 block">Стадіон</span>
              <span className="text-sm font-black text-emerald-300">
                {(stadium?.capacity || 5000).toLocaleString()} місць
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-xs text-slate-400 block">База Клубу</span>
              <span className="text-sm font-black text-blue-300">
                Рівень {stadium?.base_level || 1}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-xs text-slate-400 block">Фітнес / СПА</span>
              <span className="text-sm font-black text-amber-300">
                Рівень {stadium?.fitness_level || 1}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK SHORTCUTS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate("squad")}
          className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
        >
          <Users className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="text-sm font-bold text-white">Склад & Тактика</h4>
          <p className="text-[11px] text-slate-400">Розстановка 11x11 та ролі</p>
        </button>

        <button
          onClick={() => onNavigate("training")}
          className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
        >
          <Dumbbell className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="text-sm font-bold text-white">Тренування & СПА</h4>
          <p className="text-[11px] text-slate-400">Прокачка навичок за XP</p>
        </button>

        <button
          onClick={() => onNavigate("transfers")}
          className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
        >
          <ShoppingBag className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="text-sm font-bold text-white">Аукціон Гравців</h4>
          <p className="text-[11px] text-slate-400">Трансферний ринок 11x11</p>
        </button>

        <button
          onClick={() => onNavigate("youth")}
          className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
        >
          <GraduationCap className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="text-sm font-bold text-white">Школа Юніорів</h4>
          <p className="text-[11px] text-slate-400">Скаутинг молодих талантів</p>
        </button>
      </div>
    </div>
  )
}
