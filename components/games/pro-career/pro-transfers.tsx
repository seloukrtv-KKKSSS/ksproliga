"use client"

import { useState } from "react"
import { ProCareer, ProClub, ProTransferOffer } from "@/lib/pro-types"
import { proAudio } from "@/lib/pro-audio"
import { Shield, Sparkles, ShoppingBag, ArrowRight, Check, X, Building2, Award } from "lucide-react"

interface ProTransfersProps {
  career: ProCareer
  currentClub: ProClub
  allClubs: ProClub[]
  onAcceptTransfer: (newClub: ProClub, wage: number) => void
}

export function ProTransfers({
  career,
  currentClub,
  allClubs,
  onAcceptTransfer
}: ProTransfersProps) {
  const [successMsg, setSuccessMsg] = useState("")

  // Generate dynamic transfer offers based on player reputation and tier
  const higherTierClubs = allClubs.filter(
    (c) => c.tier > currentClub.tier || (c.tier === currentClub.tier && c.id !== currentClub.id)
  )

  const availableOffers: {
    club: ProClub
    wage: number
    role: string
    pitch: string
    signingBonus: number
  }[] = []

  // If reputation >= 70, tier 2 offers available
  if (career.reputation >= 70) {
    const oblastClubs = allClubs.filter((c) => c.tier === 2)
    if (oblastClubs.length > 0) {
      const c = oblastClubs[0]
      availableOffers.push({
        club: c,
        wage: 4500,
        role: "Гравець основи",
        pitch: `«Ми бачимо твій блискучий прогрес на рівні району. Час спробувати себе в Чемпіонаті Області за ${c.name}!»`,
        signingBonus: 10000
      })
    }
  }

  // If reputation >= 180, tier 3/4 offers available
  if (career.reputation >= 180) {
    const pflClubs = allClubs.filter((c) => c.tier === 3 || c.tier === 4)
    if (pflClubs.length > 0) {
      const c = pflClubs[0]
      availableOffers.push({
        club: c,
        wage: 15000,
        role: "Ключовий гравець",
        pitch: `«Скаутський відділ ${c.name} вражений твоїми статистичними показниками. Пропонуємо професійний контракт!»`,
        signingBonus: 35000
      })
    }
  }

  // If reputation >= 400, UPL offers available (Dynamo, Shakhtar, Karpaty)
  if (career.reputation >= 400) {
    const uplClubs = allClubs.filter((c) => c.tier === 5)
    if (uplClubs.length > 0) {
      const c = uplClubs[0]
      availableOffers.push({
        club: c,
        wage: 75000,
        role: "Зірка команди",
        pitch: `«Ти готовий грати в еліті українського футболу! Президент ${c.name} особисто чекає на твій підпис!»`,
        signingBonus: 150000
      })
    }
  }

  const handleSign = (club: ProClub, wage: number) => {
    proAudio.playTrophyChime()
    onAcceptTransfer(club, wage)
    setSuccessMsg(`🎉 Вітаємо з трансфером у ${club.name}!`)
    setTimeout(() => setSuccessMsg(""), 3000)
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <ShoppingBag className="w-3.5 h-3.5" />
            Трансферний Ринок & Скаутинг
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Карʼєрні Пропозиції
          </h2>
          <p className="text-xs text-slate-300">
            Клуби уважно стежать за твоїми виступами. Обирай свій подальший шлях!
          </p>
        </div>

        {/* Current Contract Mini-card */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-right space-y-0.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase">
            Поточний клуб
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
        <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-black text-center animate-fade-in shadow-lg">
          {successMsg}
        </div>
      )}

      {/* Available Offers Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Активні пропозиції від скаутів:
        </h3>

        {availableOffers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableOffers.map((offer, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 shadow-xl transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border border-white/20"
                        style={{
                          background: `linear-gradient(135deg, ${offer.club.primary_color}, ${offer.club.secondary_color})`
                        }}
                      >
                        <Shield className="w-6 h-6 text-white drop-shadow" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white">
                          {offer.club.name}
                        </h4>
                        <span className="text-xs text-emerald-400 font-bold">
                          {offer.club.city} • Рівень {offer.club.tier}
                        </span>
                      </div>
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
                        Бонус за підпис:
                      </span>
                      <strong className="text-amber-300 font-mono">
                        +{offer.signingBonus.toLocaleString()} ₴
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSign(offer.club, offer.wage)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950 transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Підписати Контракт</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-2">
            <div className="text-3xl">🕵️</div>
            <h4 className="text-sm font-bold text-white">
              Скаути спостерігають за твоїми матчами
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Показуй високу результативність у матчах та підвищуй Репутацію, щоб отримати пропозиції від клубів вищих ліг!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
