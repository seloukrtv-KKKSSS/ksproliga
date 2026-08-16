"use client"

import { useState } from "react"
import { ProCareer, ProClub } from "@/lib/pro-types"
import { ProCard } from "./pro-card"
import { STORE_ITEMS } from "@/lib/pro-engine"
import {
  Shield,
  Trophy,
  Award,
  History,
  Star,
  MapPin,
  Sparkles,
  Calendar,
  Newspaper,
  Car,
  Home,
  Zap,
  ShoppingBag
} from "lucide-react"

interface ProProfileProps {
  career: ProCareer
  currentClub: ProClub
}

export function ProProfile({ career, currentClub }: ProProfileProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "press" | "garage">("timeline")
  const stats = career.career_stats

  // All owned items from inventory
  const allBoots = STORE_ITEMS.filter((i) =>
    (career.inventory?.all_boots || [career.inventory?.boots || "boots_basic"]).includes(i.id)
  )
  const allCars = STORE_ITEMS.filter((i) =>
    (career.inventory?.all_cars || (career.inventory?.car ? [career.inventory?.car] : [])).includes(i.id)
  )
  const allHouses = STORE_ITEMS.filter((i) =>
    (career.inventory?.all_houses || [career.inventory?.house || "house_village"]).includes(i.id)
  )

  return (
    <div className="max-w-[1500px] mx-auto w-full space-y-6 animate-fade-in">
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

        {/* Legend Status Badge */}
        <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-2 text-xs font-black">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span>
            {stats.total_matches >= 60
              ? "Легенда Українського Футболу"
              : stats.total_matches >= 30
              ? "Лідер Клубу"
              : stats.total_matches >= 10
              ? "Улюбленець Уболівальників"
              : "Перспективний Талант (17 р.)"}
          </span>
        </div>
      </div>

      {/* Main Grid: Card & Career Totals */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D Holographic Card (5 Cols) */}
        <div className="md:col-span-5 flex justify-center">
          <ProCard career={career} club={currentClub} />
        </div>

        {/* Right Column: Statistics & Navigation (7 Cols) */}
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

          {/* Sub-Tabs: Timeline vs Press vs Garage */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "timeline"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Хроніка & Лінія Часу</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("press")}
              className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "press"
                  ? "bg-amber-400 text-slate-950 font-black shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>Архів Газет</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("garage")}
              className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "garage"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Майно & Гараж</span>
            </button>
          </div>

          {/* ─── 1. TIMELINE OF SEASONS ─── */}
          {activeTab === "timeline" && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                Хроніка карʼєри за роками (Лінія часу):
              </h3>

              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
                {career.clubs_history.map((ch, idx) => (
                  <div
                    key={idx}
                    className="relative pl-8 space-y-1 text-xs"
                  >
                    <div className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-slate-950" />
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-black text-white text-sm">
                          {ch.club_name}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {ch.city} • Рівень {ch.tier} ({ch.from_year} р. • {17 + idx} років)
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-emerald-400 font-bold">
                          {ch.matches} матчів
                        </span>{" "}
                        •{" "}
                        <span className="text-amber-300 font-bold">
                          {ch.goals} голів
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── 2. PRESS ARCHIVE ─── */}
          {activeTab === "press" && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3 max-h-[360px] overflow-y-auto">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-amber-400" />
                Статті в газетах та огляди преси:
              </h3>

              {career.news_articles && career.news_articles.length > 0 ? (
                career.news_articles.map((art, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold">
                      <span>{art.newspaper_name}</span>
                      <span>{art.date_str}</span>
                    </div>
                    <h4 className="font-black text-white text-sm">
                      {art.headline}
                    </h4>
                    <p className="text-slate-300 leading-snug">
                      {art.text}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  Газетні вирізки з'являтимуться після яскравих матчів та результативних дій!
                </div>
              )}
            </div>
          )}

          {/* ─── 3. GARAGE & ASSET COLLECTION ─── */}
          {activeTab === "garage" && (
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-purple-400" />
                Колекція купленого майна (Автопарк & Бутси):
              </h3>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400">Автомобілі:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allCars.length > 0 ? (
                    allCars.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs"
                      >
                        <span className="text-2xl">{c.icon}</span>
                        <div>
                          <div className="font-black text-white">{c.name}</div>
                          <span className="text-[10px] text-emerald-400">{c.stat_boost}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic col-span-2">
                      Автопарк порожній. Завітайте до Магазину Життя!
                    </div>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-400 pt-2">Бутси:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allBoots.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs"
                    >
                      <span className="text-2xl">{b.icon}</span>
                      <div>
                        <div className="font-black text-white">{b.name}</div>
                        <span className="text-[10px] text-amber-300">{b.stat_boost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
