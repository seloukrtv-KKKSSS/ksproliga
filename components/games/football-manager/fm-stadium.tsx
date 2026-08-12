"use client"

import { useState } from "react"
import { FMClub, FMStadium } from "@/lib/fm-types"
import { getFacilityDetails, FacilityInfo } from "@/lib/fm-engine"
import { fmUpgradeFacility, fmSetTicketPrice } from "@/lib/fm-database"
import { fmAudio } from "@/lib/fm-audio"
import {
  Building2,
  Sparkles,
  Dumbbell,
  HeartPulse,
  GraduationCap,
  Store,
  ArrowUpCircle,
  DollarSign,
  Users,
  Check,
  AlertCircle
} from "lucide-react"

interface FMStadiumProps {
  club: FMClub
  stadium: FMStadium
  onClubUpdated: (club: FMClub) => void
  onStadiumUpdated: (stadium: FMStadium) => void
}

export function FMStadiumInfrastructure({
  club,
  stadium,
  onClubUpdated,
  onStadiumUpdated
}: FMStadiumProps) {
  const [ticketPrice, setTicketPrice] = useState(stadium.ticket_price || 15)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null)

  const facilities = getFacilityDetails(stadium)

  const handleUpgrade = async (f: FacilityInfo) => {
    setUpgradeError(null)
    setUpgradeSuccess(null)

    if (club.balance < f.upgradeCost) {
      setUpgradeError(`Недостатньо коштів! Потрібно ${f.upgradeCost.toLocaleString()} ₴`)
      return
    }

    setIsUpgrading(true)
    fmAudio.playCoins()

    try {
      const res = await fmUpgradeFacility(club, stadium, f.key, f.upgradeCost)
      if ("error" in res) {
        setUpgradeError(res.error)
      } else {
        fmAudio.playLevelUp()
        onClubUpdated(res.club)
        onStadiumUpdated(res.stadium)
        setUpgradeSuccess(`🎉 ${f.name} успішно покращено!`)
      }
    } catch {
      setUpgradeError("Помилка під час покращення споруди")
    } finally {
      setIsUpgrading(false)
    }
  }

  const handleTicketPriceChange = async (newPrice: number) => {
    setTicketPrice(newPrice)
    await fmSetTicketPrice(club.id, newPrice)
    onStadiumUpdated({ ...stadium, ticket_price: newPrice })
  }

  // Estimated attendance & revenue
  const estAttendance = Math.min(
    stadium.capacity,
    Math.round(stadium.capacity * Math.max(0.3, (club.fans_count * 1.5) / stadium.capacity - (ticketPrice - 15) * 0.015))
  )
  const estRevenue = estAttendance * ticketPrice

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "building":
        return Building2
      case "sparkles":
        return Sparkles
      case "dumbbell":
        return Dumbbell
      case "heart-pulse":
        return HeartPulse
      case "graduation-cap":
        return GraduationCap
      case "store":
        return Store
      default:
        return Building2
    }
  }

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-10 text-white">
      {/* ─── Stadium Hero Card ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase">
              <Building2 className="h-3.5 w-3.5" />
              Домашня Арена
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">{stadium.name}</h2>
            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-4">
              <span>Місткість: <strong className="text-white">{stadium.capacity.toLocaleString()} місць</strong></span>
              <span>Фан-база: <strong className="text-emerald-400">{club.fans_count.toLocaleString()} вболівальників</strong></span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 w-full md:w-auto min-w-[240px]">
            <div className="text-xs font-bold text-slate-400">Ціна квитка на домашній матч:</div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={ticketPrice}
                onChange={(e) => handleTicketPriceChange(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-sm font-black text-emerald-400 min-w-[45px] text-right">{ticketPrice} ₴</span>
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>Очікувана виручка:</span>
              <strong className="text-amber-400">{estRevenue.toLocaleString()} ₴ / матч</strong>
            </div>
          </div>
        </div>
      </div>

      {upgradeSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center animate-in fade-in">
          {upgradeSuccess}
        </div>
      )}

      {upgradeError && (
        <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-bold text-center animate-in fade-in">
          {upgradeError}
        </div>
      )}

      {/* ─── Facilities Upgrade Grid ─── */}
      <div className="space-y-3">
        <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
          Інфраструктурні об'єкти клубу:
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((f) => {
            const Icon = getIcon(f.icon)
            const canAfford = club.balance >= f.upgradeCost
            const isMax = f.currentLevel >= f.maxLevel

            return (
              <div
                key={f.key}
                className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300">
                      Рівень {f.currentLevel}/{f.maxLevel}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white">{f.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.description}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-bold text-emerald-400">
                    {f.benefitText}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold">Вартість покращення:</div>
                    <div className="text-sm font-black text-white">
                      {isMax ? "Максимальний рівень" : `${f.upgradeCost.toLocaleString()} ₴`}
                    </div>
                  </div>

                  {!isMax && (
                    <button
                      type="button"
                      onClick={() => handleUpgrade(f)}
                      disabled={isUpgrading || !canAfford}
                      className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                        canAfford
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      <span>Покращити</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
