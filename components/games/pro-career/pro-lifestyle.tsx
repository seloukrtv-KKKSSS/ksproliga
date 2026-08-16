"use client"

import { useState } from "react"
import { ProCareer, ProStoreItem } from "@/lib/pro-types"
import { STORE_ITEMS, calculateOverallRating } from "@/lib/pro-engine"
import { proAudio } from "@/lib/pro-audio"
import {
  ShoppingBag,
  Sparkles,
  Check,
  Zap,
  TrendingUp,
  Award,
  Wallet,
  Car,
  Home,
  Dumbbell
} from "lucide-react"

interface ProLifestyleProps {
  career: ProCareer
  onUpdateCareer: (updated: ProCareer) => void
}

type StoreCategory = "all" | "trainers" | "boots" | "cars" | "houses"

export function ProLifestyle({ career, onUpdateCareer }: ProLifestyleProps) {
  const [activeCategory, setActiveCategory] = useState<StoreCategory>("all")
  const [successMsg, setSuccessMsg] = useState("")

  const balance = career.bank_balance || 0
  const inventory = career.inventory || {
    boots: "boots_basic",
    car: "car_none",
    house: "house_village",
    trainers: [],
    all_boots: ["boots_basic"],
    all_cars: [],
    all_houses: ["house_village"]
  }

  const filteredItems =
    activeCategory === "all"
      ? STORE_ITEMS
      : STORE_ITEMS.filter((i) => i.category === activeCategory)

  const handleBuyItem = (item: ProStoreItem) => {
    if (balance < item.price) {
      alert("Недостатньо коштів на балансі! Заробляйте гроші в матчах або підписуйте вигідніші контракти.")
      return
    }

    proAudio.playTrophyChime()

    const newBalance = balance - item.price
    let newAttributes = { ...career.attributes }
    let newInventory = {
      ...inventory,
      trainers: [...(inventory.trainers || [])],
      all_boots: [...(inventory.all_boots || ["boots_basic"])],
      all_cars: [...(inventory.all_cars || [])],
      all_houses: [...(inventory.all_houses || ["house_village"])]
    }
    let newMorale = Math.min(100, career.morale + (item.morale_boost || 0))
    let newReputation = career.reputation + (item.rep_boost || 0)

    if (item.attribute_boost) {
      const { key, value } = item.attribute_boost
      const currentVal = (newAttributes as any)[key] || 40
      newAttributes = {
        ...newAttributes,
        [key]: Math.min(99, currentVal + value)
      }
    }

    if (item.category === "trainers") {
      newInventory.trainers.push(item.id)
    } else if (item.category === "boots") {
      newInventory.boots = item.id
      if (!newInventory.all_boots.includes(item.id)) {
        newInventory.all_boots.push(item.id)
      }
    } else if (item.category === "cars") {
      newInventory.car = item.id
      if (!newInventory.all_cars.includes(item.id)) {
        newInventory.all_cars.push(item.id)
      }
    } else if (item.category === "houses") {
      newInventory.house = item.id
      if (!newInventory.all_houses.includes(item.id)) {
        newInventory.all_houses.push(item.id)
      }
    }

    const newOvr = calculateOverallRating(career.position, newAttributes)

    const updatedCareer: ProCareer = {
      ...career,
      bank_balance: newBalance,
      attributes: newAttributes,
      overall_rating: newOvr,
      inventory: newInventory,
      morale: newMorale,
      reputation: newReputation
    }

    onUpdateCareer(updatedCareer)
    setSuccessMsg(`🎉 Придбано: ${item.name}! ${item.stat_boost}`)
    setTimeout(() => setSuccessMsg(""), 3500)
  }

  const isPurchased = (item: ProStoreItem) => {
    if (item.category === "boots") return (inventory.all_boots || []).includes(item.id)
    if (item.category === "cars") return (inventory.all_cars || []).includes(item.id)
    if (item.category === "houses") return (inventory.all_houses || []).includes(item.id)
    return false
  }

  return (
    <div className="max-w-[1500px] mx-auto w-full space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <ShoppingBag className="w-3.5 h-3.5" />
            Магазин Прокачки & Стиль Життя
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Інвестиції у Себе
          </h2>
          <p className="text-xs text-slate-300">
            Витрачай зароблені гроші на персональних тренерів, бутси, авто та житло!
          </p>
        </div>

        {/* Bank Balance Card */}
        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-950/80 border border-emerald-500/40 shadow-inner flex items-center gap-3.5 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              Твій Особистий Баланс
            </span>
            <strong className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
              {balance.toLocaleString()} ₴
            </strong>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-black text-center animate-fade-in shadow-xl">
          {successMsg}
        </div>
      )}

      {/* Category Segmented Control */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md overflow-x-auto">
        {[
          { id: "all", label: "Всі Товари", icon: Sparkles },
          { id: "trainers", label: "Персональні Тренери", icon: Dumbbell },
          { id: "boots", label: "Професійні Бутси", icon: Zap },
          { id: "cars", label: "Автопарк", icon: Car },
          { id: "houses", label: "Нерухомість", icon: Home }
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                proAudio.playClick()
                setActiveCategory(tab.id as any)
              }}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeCategory === tab.id
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Store Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map((item) => {
          const owned = isPurchased(item)
          const canAfford = balance >= item.price

          return (
            <div
              key={item.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 shadow-xl ${
                owned
                  ? "bg-slate-950/60 border-emerald-500/40 opacity-90"
                  : "bg-slate-900/90 border-slate-800 hover:border-emerald-500/40"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white">
                        {item.name}
                      </h4>
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {item.stat_boost}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-amber-300 font-mono">
                      {item.price.toLocaleString()} ₴
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-snug">
                  {item.description}
                </p>
              </div>

              {owned ? (
                <div className="py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>У твоїй колекції (Придбано)</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => handleBuyItem(item)}
                  className={`w-full py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer ${
                    canAfford
                      ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-slate-950 shadow-emerald-950"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <span>Купити за {item.price.toLocaleString()} ₴</span>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
