"use client"

import { useState, useEffect } from "react"
import { FMClub, FMPlayer, FMTransfer, PlayerPosition } from "@/lib/fm-types"
import { fmGetTransferMarket, fmBuyPlayer, fmGetClubPlayers } from "@/lib/fm-database"
import { fmAudio } from "@/lib/fm-audio"
import {
  ShoppingBag,
  Tag,
  Search,
  Filter,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRightCircle,
  UserCheck
} from "lucide-react"

interface FMTransfersProps {
  club: FMClub
  onClubUpdated: (club: FMClub) => void
  onSquadUpdated: (players: FMPlayer[]) => void
}

export function FMTransferMarket({ club, onClubUpdated, onSquadUpdated }: FMTransfersProps) {
  const [transfers, setTransfers] = useState<FMTransfer[]>([])
  const [activeTab, setActiveTab] = useState<"market" | "my_sales">("market")
  const [positionFilter, setPositionFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null)

  const loadMarket = () => {
    fmGetTransferMarket().then((list) => {
      setTransfers(list)
    })
  }

  useEffect(() => {
    loadMarket()
  }, [])

  const handleBuyPlayer = async (transfer: FMTransfer) => {
    setStatusMessage(null)
    if (club.balance < transfer.price) {
      setStatusMessage({ text: "Недостатньо коштів у бюджеті клубу!", isError: true })
      return
    }

    setIsProcessing(true)
    fmAudio.playCoins()

    try {
      const res = await fmBuyPlayer(club, transfer)
      if (res.success && res.updatedClub) {
        fmAudio.playLevelUp()
        onClubUpdated(res.updatedClub)
        const updatedSquad = await fmGetClubPlayers(club.id)
        onSquadUpdated(updatedSquad)
        loadMarket()
        setStatusMessage({ text: `🎉 Вітаємо! Гравець ${transfer.player_name} успішно приєднався до вашого клубу.` })
      } else {
        setStatusMessage({ text: res.error || "Помилка при здійсненні трансферу", isError: true })
      }
    } catch {
      setStatusMessage({ text: "Помилка під час викупу гравця", isError: true })
    } finally {
      setIsProcessing(false)
    }
  }

  // Filter transfers
  const filteredTransfers = transfers.filter((t) => {
    if (activeTab === "my_sales") {
      return t.seller_club_id === club.id
    }
    // Market tab shows others' listings
    if (t.seller_club_id === club.id) return false

    if (positionFilter !== "ALL") {
      if (positionFilter === "GK" && t.position !== "GK") return false
      if (positionFilter === "DEF" && !t.position.includes("B")) return false
      if (positionFilter === "MID" && !t.position.includes("M")) return false
      if (positionFilter === "ATT" && t.position !== "ST" && t.position !== "LW" && t.position !== "RW") return false
    }

    if (searchQuery.trim()) {
      return t.player_name.toLowerCase().includes(searchQuery.toLowerCase())
    }

    return true
  })

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-10 text-white">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Трансферний Ринок KSLIGA</h2>
            <p className="text-xs text-slate-400">
              Купуйте підсилення для своєї команди або продавайте зайвих гравців
            </p>
          </div>
        </div>

        {/* Budget Chip */}
        <div className="p-3 rounded-2xl bg-slate-950/90 border border-emerald-500/40 flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-400">Бюджет клубу:</span>
          <span className="text-sm font-black text-emerald-400">{club.balance.toLocaleString()} ₴</span>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold text-center animate-in fade-in ${
            statusMessage.isError
              ? "bg-red-950/80 border-red-500/40 text-red-300"
              : "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Tabs & Search Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Market vs My Sales Segmented Control */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab("market")
              fmAudio.playClick()
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "market"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Всі пропозиції ({transfers.filter((t) => t.seller_club_id !== club.id).length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("my_sales")
              fmAudio.playClick()
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === "my_sales"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Мої продажі ({transfers.filter((t) => t.seller_club_id === club.id).length})
          </button>
        </div>

        {/* Position Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "Всі" },
            { id: "GK", label: "ВР" },
            { id: "DEF", label: "Захисники" },
            { id: "MID", label: "Півзахисники" },
            { id: "ATT", label: "Нападники" }
          ].map((pos) => (
            <button
              key={pos.id}
              type="button"
              onClick={() => {
                setPositionFilter(pos.id)
                fmAudio.playClick()
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                positionFilter === pos.id
                  ? "bg-slate-800 text-white border border-emerald-500"
                  : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transfer Listings Grid */}
      {filteredTransfers.length === 0 ? (
        <div className="p-10 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
          <Tag className="h-8 w-8 text-slate-500 mx-auto" />
          <div className="text-sm font-bold text-slate-400">Трансферних пропозицій не знайдено</div>
          <p className="text-xs text-slate-500">Спробуйте змінити фільтри пошуку або виставити своїх гравців на продаж</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTransfers.map((t) => {
            const canAfford = club.balance >= t.price

            return (
              <div
                key={t.id}
                className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex flex-col items-center justify-center font-black">
                        <span className="text-[9px] uppercase">{t.position}</span>
                        <span className="text-sm leading-none text-white">{t.rating}</span>
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{t.player_name}</div>
                        <div className="text-[11px] text-slate-400">Позиція: {t.position} • Рейтинг: {t.rating}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">Ціна викупу:</div>
                    <div className="text-sm font-black text-emerald-400">{t.price.toLocaleString()} ₴</div>
                  </div>

                  {activeTab === "market" && (
                    <button
                      type="button"
                      onClick={() => handleBuyPlayer(t)}
                      disabled={isProcessing || !canAfford}
                      className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                        canAfford
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <span>Купити</span>
                    </button>
                  )}

                  {activeTab === "my_sales" && (
                    <span className="text-xs font-bold text-amber-400 px-3 py-1 rounded-xl bg-amber-950/60 border border-amber-500/30">
                      На продажу
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
