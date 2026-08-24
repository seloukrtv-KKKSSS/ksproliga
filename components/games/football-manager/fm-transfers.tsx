"use client"

import { useState, useEffect, useCallback } from "react"
import type { FMClub, FMTransfer } from "@/lib/fm-types"
import { getPositionCategory, SPECIAL_ABILITIES_MAP } from "@/lib/fm-engine"
import {
  fmGetTransferMarket,
  fmPlaceTransferBid,
  fmBuyoutTransfer
} from "@/lib/fm-database"
import { fmAudio } from "@/lib/fm-audio"
import {
  ShoppingBag,
  Gavel,
  Filter,
  Clock,
} from "lucide-react"

interface FMTransfersProps {
  club: FMClub
  onPurchased: () => void
}

export function FMTransferMarket({
  club,
  onPurchased
}: FMTransfersProps) {
  const [transfers, setTransfers] = useState<FMTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [positionFilter, setPositionFilter] = useState<string>("ALL")
  const [notification, setNotification] = useState<string | null>(null)

  const loadMarket = useCallback(async () => {
    setLoading(true)
    const list = await fmGetTransferMarket()
    setTransfers(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    const loadId = window.setTimeout(() => void loadMarket(), 0)
    return () => window.clearTimeout(loadId)
  }, [loadMarket])

  const handlePlaceBid = async (t: FMTransfer) => {
    fmAudio.playClick()
    const bidValue = (t.current_bid || t.price || 50000) + 5000

    if (club.balance < bidValue) {
      alert("Недостатньо коштів у бюджеті для такої ставки!")
      return
    }

    const res = await fmPlaceTransferBid(t.id, club.id, club.name, bidValue)
    if (res.success) {
      fmAudio.playCoins()
      setNotification(`🎉 Вашу ставку ${bidValue.toLocaleString()} ₴ на ${t.player_name} прийнято!`)
      loadMarket()
      onPurchased()
    } else {
      alert(res.error || "Помилка при розміщенні ставки")
    }
  }

  const handleBuyout = async (t: FMTransfer) => {
    fmAudio.playClick()
    const price = t.buyout_price || Math.round((t.price || 50000) * 1.5)
    if (club.balance < price) {
      alert("Недостатньо коштів для миттєвого викупу гравця!")
      return
    }

    const res = await fmBuyoutTransfer(t.id, club.id)
    if (res.success) {
      fmAudio.playLevelUp()
      setNotification(`🔥 Вітаємо! Футболіста ${t.player_name} викуплено до вашого клубу!`)
      loadMarket()
      onPurchased()
    } else {
      alert(res.error || "Помилка при викупі гравця")
    }
  }

  const filteredTransfers = transfers.filter((t) => {
    if (positionFilter === "ALL") return true
    return getPositionCategory(t.position) === positionFilter
  })

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/80 border border-blue-500/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Gavel className="w-7 h-7 text-blue-400" />
            <h2 className="text-2xl font-black text-white">Трансферний Аукціон 11x11</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Робіть ставки, перебивайте конкурентів або викуповуйте зірок миттєво!
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-sm font-black">
          Бюджет: {club.balance.toLocaleString()} ₴
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold text-center">
          {notification}
        </div>
      )}

      {/* FILTER BAR */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
        <span className="text-xs font-bold text-slate-400 px-2 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Позиція:
        </span>
        {[
          { id: "ALL", label: "Усі" },
          { id: "GK", label: "Воротарі (ВР)" },
          { id: "DEF", label: "Захисники (ЗАХ)" },
          { id: "MID", label: "Півзахисники (ПЗ)" },
          { id: "FWD", label: "Нападники (АТК)" }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setPositionFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              positionFilter === f.id
                ? "bg-blue-600 text-white shadow-md shadow-blue-950"
                : "bg-slate-950 text-slate-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* AUCTION LISTINGS GRID */}
      {loading ? (
        <div className="flex justify-center py-16 text-blue-400">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredTransfers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTransfers.map((t) => {
            const isOwnPlayer = t.seller_club_id === club.id
            const isLeadingBidder = t.highest_bidder_club_id === club.id
            const minNextBid = (t.current_bid || t.price || 50000) + 5000

            return (
              <div
                key={t.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 shadow-xl transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Bar: Position + Name + Talent */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-500/40 flex flex-col items-center justify-center">
                        <span className="text-[9px] font-bold text-blue-400">{t.position}</span>
                        <span className="text-xs font-black text-white">{t.skill}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{t.player_name}</h4>
                        <div className="flex text-amber-400 text-xs">
                          {Array.from({ length: t.talent || 3 }).map((_, i) => (
                            <span key={i}>⭐</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Аукціон</span>
                    </span>
                  </div>

                  {/* Special Abilities */}
                  {t.special_abilities?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {t.special_abilities.map((abId) => {
                        const def = SPECIAL_ABILITIES_MAP[abId]
                        return (
                          <span
                            key={abId}
                            className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30"
                          >
                            {def?.icon || "✨"} {def?.name || abId}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Pricing Box */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Поточна ставка:</span>
                      <span className="font-bold text-amber-300 font-mono">
                        {(t.current_bid || t.price || 50000).toLocaleString()} ₴
                      </span>
                    </div>
                    {t.highest_bidder_club_name && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Лідер торгів:</span>
                        <span className={isLeadingBidder ? "text-emerald-400 font-bold" : "text-slate-300"}>
                          {isLeadingBidder ? "Ваш клуб (Ви лідируєте!)" : t.highest_bidder_club_name}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-800/80 pt-1">
                      <span className="text-slate-400">Ціна викупу:</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {(t.buyout_price || Math.round((t.price || 50000) * 1.5)).toLocaleString()} ₴
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bid & Buyout Actions */}
                {!isOwnPlayer ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePlaceBid(t)}
                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all"
                      >
                        Ставка {minNextBid.toLocaleString()} ₴
                      </button>
                      <button
                        onClick={() => handleBuyout(t)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-950 transition-all"
                      >
                        Викупити
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 text-center rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-400">
                    Ваш гравець на ринку
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Трансферів не знайдено</h3>
          <p className="text-xs text-slate-400 mt-1">
            Спробуйте обрати іншу категорію або зачекайте оновлення ринку.
          </p>
        </div>
      )}
    </div>
  )
}
