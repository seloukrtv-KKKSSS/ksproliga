"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import type { FMClub, FMStadium, FMStaff } from "@/lib/fm-types"
import { getCityBuildings, type CityBuildingInfo } from "@/lib/fm-engine"
import {
  fmUpgradeCityBuilding,
  fmSetTicketPrice,
  fmGetStaff,
  fmHireStaff,
  fmFireStaff
} from "@/lib/fm-database"
import { fmAudio } from "@/lib/fm-audio"
import {
  Building2,
  Users,
  ArrowUpRight,
  UserX
} from "lucide-react"

interface FMStadiumProps {
  club: FMClub
  stadium: FMStadium | null
  onUpdated: () => void
}

export function FMStadiumInfrastructure({
  club,
  stadium,
  onUpdated
}: FMStadiumProps) {
  const buildings = useMemo(() => getCityBuildings(stadium), [stadium])
  const [ticketPrice, setTicketPrice] = useState<number>(stadium?.ticket_price || 20)
  const [staffList, setStaffList] = useState<FMStaff[]>([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const loadStaff = useCallback(async () => {
    const staff = await fmGetStaff(club.id)
    setStaffList(staff)
  }, [club.id])

  useEffect(() => {
    const loadId = window.setTimeout(() => {
      if (stadium) setTicketPrice(stadium.ticket_price || 20)
      void loadStaff()
    }, 0)
    return () => window.clearTimeout(loadId)
  }, [loadStaff, stadium])

  const handleUpgradeBuilding = async (b: CityBuildingInfo) => {
    fmAudio.playClick()
    if (club.balance < b.nextUpgradeCost) {
      alert("Недостатньо коштів у скарбниці клубу для цього покращення!")
      return
    }

    setLoading(true)
    const res = await fmUpgradeCityBuilding(club.id, b.id, b.nextUpgradeCost)
    setLoading(false)

    if (res.success) {
      fmAudio.playCoins()
      setNotification(`🎉 Споруду "${b.name}" успішно покращено до рівня ${b.level + 1}!`)
      onUpdated()
    } else {
      alert(res.error || "Помилка покращення споруди")
    }
  }

  const handlePriceChange = async (price: number) => {
    setTicketPrice(price)
    await fmSetTicketPrice(club.id, price)
  }

  const handleHireStaff = async (role: "coach" | "doctor" | "masseur" | "scout", name: string, salary: number, desc: string) => {
    fmAudio.playClick()
    const officeLvl = stadium?.office_level || 1
    if (staffList.length >= officeLvl) {
      alert(`Ліміт персоналу досягнуто (${officeLvl} із ${officeLvl}). Покращіть Офіс Клубу для додаткових слотів!`)
      return
    }

    const ok = await fmHireStaff(club.id, role, name, 1, salary, desc)
    if (ok) {
      fmAudio.playCoins()
      loadStaff()
      onUpdated()
    }
  }

  const handleFireStaff = async (id: number) => {
    fmAudio.playClick()
    const ok = await fmFireStaff(id)
    if (ok) {
      loadStaff()
      onUpdated()
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/80 border border-emerald-500/30 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-7 h-7 text-emerald-400" />
            <h2 className="text-2xl font-black text-white">Футбольне Місто 11x11</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Розвивайте інфраструктуру клубу, наймайте персонал та збільшуйте прибуток з матчів!
          </p>
        </div>

        {/* Ticket Price Slider */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 min-w-[240px] space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-300">
            <span>Ціна квитка на матч:</span>
            <span className="text-emerald-400 font-mono text-sm">{ticketPrice} ₴</span>
          </div>
          <input
            type="range"
            min={10}
            max={60}
            step={5}
            value={ticketPrice}
            onChange={(e) => handlePriceChange(parseInt(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="text-[10px] text-slate-400 text-center">
            Орієнтовна виручка: ~{Math.round((stadium?.capacity || 5000) * 0.75 * ticketPrice).toLocaleString()} ₴
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold text-center">
          {notification}
        </div>
      )}

      {/* 7 CITY BUILDINGS CARDS */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <span>Споруди та Інфраструктура</span>
          <span className="text-xs text-emerald-400 font-normal">({buildings.length} будівель)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings.map((b) => (
            <div
              key={b.id}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 shadow-xl transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{b.icon}</span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{b.name}</h4>
                      <span className="text-[11px] font-bold text-emerald-400">
                        Рівень {b.level} / {b.maxLevel}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {b.description}
                </p>

                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-emerald-300 font-medium">
                  {b.benefitText}
                </div>
              </div>

              <button
                disabled={b.level >= b.maxLevel || loading}
                onClick={() => handleUpgradeBuilding(b)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  b.level >= b.maxLevel
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950"
                }`}
              >
                {b.level >= b.maxLevel ? (
                  "Максимальний рівень"
                ) : (
                  <>
                    <span>Покращити за {b.nextUpgradeCost.toLocaleString()} ₴</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* STAFF MANAGEMENT (ОФІС ТА ПЕРСОНАЛ) */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span>Персонал Клубу</span>
            </h3>
            <p className="text-xs text-slate-400">
              Слоти персоналу: <span className="text-emerald-400 font-bold">{staffList.length}</span> із{" "}
              <span className="text-slate-200 font-bold">{stadium?.office_level || 1}</span> (залежить від рівня Офісу)
            </p>
          </div>
        </div>

        {/* Active Staff */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {staffList.map((st) => (
            <div
              key={st.id}
              className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">{st.role}</span>
                <h4 className="text-xs font-bold text-white">{st.name}</h4>
                <span className="text-[10px] text-slate-400">{st.bonus_desc}</span>
              </div>
              <button
                onClick={() => handleFireStaff(st.id)}
                title="Звільнити працівника"
                className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300"
              >
                <UserX className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Hire New Staff Slots */}
          {staffList.length < (stadium?.office_level || 1) && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-700 flex flex-col justify-center gap-2">
              <span className="text-xs font-bold text-slate-300">Вільний слот персоналу</span>
              <button
                onClick={() => handleHireStaff("coach", "Олег Блохін", 1500, "+20% до XP за матчі")}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-emerald-400 text-left"
              >
                + Найняти Тренера (+20% XP)
              </button>
              <button
                onClick={() => handleHireStaff("masseur", "Василь Масаж", 1200, "+25% швидше відновлення сил")}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-amber-400 text-left"
              >
                + Найняти Масажиста (СПА)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
