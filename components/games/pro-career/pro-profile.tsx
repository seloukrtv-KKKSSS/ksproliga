"use client"

import { ProCareer, ProClub } from "@/lib/pro-types"
import { ProCard } from "./pro-card"
import { Shield, Trophy, Award, History, Star, MapPin, Sparkles, CheckCircle2 } from "lucide-react"

interface ProProfileProps {
  career: ProCareer
  currentClub: ProClub
}

export function ProProfile({ career, currentClub }: ProProfileProps) {
  const stats = career.career_stats

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
      {/* Header Showcase Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-400 p-0.5 shadow-xl flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl">
              ⚽
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {career.first_name} {career.last_name}
              </h2>
              <span className="text-base">🇺🇦</span>
            </div>
            <p className="text-xs text-slate-300">
              Поточний клуб: <strong className="text-emerald-400">{currentClub.name}</strong> • {career.age} років
            </p>
          </div>
        </div>

        {/* Legend Badge */}
        <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-2 text-xs font-black">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span>
            {stats.total_matches >= 50
              ? "Легенда Клубу"
              : stats.total_matches >= 20
              ? "Улюбленець Села"
              : "Перспективний Талант"}
          </span>
        </div>
      </div>

      {/* Main Grid: Card & Career Totals */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D Card (5 Cols) */}
        <div className="md:col-span-5 flex justify-center">
          <ProCard career={career} club={currentClub} />
        </div>

        {/* Right Column: Statistics & Milestones (7 Cols) */}
        <div className="md:col-span-7 space-y-4">
          {/* Lifetime Statistics Card */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Загальна карʼєрна статистика
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Матчі
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {stats.total_matches}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Голи
                </div>
                <div className="text-xl font-black text-amber-300 font-mono">
                  {stats.total_goals}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Асисти
                </div>
                <div className="text-xl font-black text-emerald-300 font-mono">
                  {stats.total_assists}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Сер. Оцінка
                </div>
                <div className="text-xl font-black text-amber-400 font-mono">
                  ⭐ {stats.avg_rating.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Club History Journey */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              Хроніка клубів у карʼєрі
            </h3>

            <div className="space-y-2">
              {career.clubs_history.map((ch, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-white">
                      ⚽
                    </div>
                    <div>
                      <h4 className="font-black text-white">{ch.club_name}</h4>
                      <span className="text-[10px] text-slate-400">
                        {ch.city} • Рівень {ch.tier}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-emerald-400 font-bold">
                      {ch.matches} матчів
                    </span>{" "}
                    • <span className="text-amber-300 font-bold">{ch.goals} голів</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
