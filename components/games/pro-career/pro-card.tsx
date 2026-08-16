"use client"

import React, { useState, useRef } from "react"
import { ProCareer, ProClub } from "@/lib/pro-types"
import { ProAvatarRenderer } from "./pro-avatar"
import { STORE_ITEMS } from "@/lib/pro-engine"
import { Shield, Sparkles, Star, Zap, Trophy, Car, Home } from "lucide-react"

interface ProCardProps {
  career: ProCareer
  club?: ProClub
  interactive?: boolean
  size?: "sm" | "md" | "lg"
}

export function ProCard({
  career,
  club,
  interactive = true,
  size = "md"
}: ProCardProps) {
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rX = ((y - centerY) / centerY) * -12
    const rY = ((x - centerX) / centerX) * 12

    setRotateX(rX)
    setRotateY(rY)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
    setIsHovered(false)
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const primaryColor = club?.primary_color || "#166534"
  const secondaryColor = club?.secondary_color || "#FACC15"

  // Scale based on size
  const cardWidth =
    size === "sm" ? "w-[240px]" : size === "lg" ? "w-[360px]" : "w-[300px]"
  const cardMinHeight =
    size === "sm" ? "min-h-[380px]" : size === "lg" ? "min-h-[540px]" : "min-h-[460px]"

  // Find equipped assets
  const bootsItem = STORE_ITEMS.find((i) => i.id === career.inventory?.boots)
  const carItem = STORE_ITEMS.find((i) => i.id === career.inventory?.car)
  const houseItem = STORE_ITEMS.find((i) => i.id === career.inventory?.house)

  return (
    <div
      className="perspective-1000 flex justify-center items-center py-2"
      style={{ perspective: "1000px" }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: interactive
            ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${
                isHovered ? "1.02" : "1"
              }, ${isHovered ? "1.02" : "1"}, 1)`
            : "none",
          transition: isHovered
            ? "transform 0.1s ease-out"
            : "transform 0.5s ease-out"
        }}
        className={`relative ${cardWidth} ${cardMinHeight} rounded-3xl p-5 select-none transition-shadow duration-300 shadow-2xl flex flex-col justify-between overflow-hidden cursor-pointer border border-amber-400/40`}
      >
        {/* ─── HOLOGRAPHIC GOLD BACKGROUND ─── */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#1c1809] via-[#0d161c] to-[#04080c] z-0"
        />

        {/* Dynamic Club Color Accent Glow */}
        <div
          className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ backgroundColor: secondaryColor }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ backgroundColor: primaryColor }}
        />

        {/* Shiny Holographic Overlay on Hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-tr from-transparent via-amber-300/10 to-transparent pointer-events-none transition-opacity duration-300 z-10 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
          style={{
            transform: `translateX(${rotateY * 4}px) translateY(${
              rotateX * 4
            }px)`
          }}
        />

        {/* Card Gold Outer Border Frame */}
        <div className="absolute inset-1 rounded-[22px] border border-amber-400/30 pointer-events-none z-10" />

        {/* ─── TOP SECTION: OVR, POSITION, FLAG, CREST ─── */}
        <div className="relative z-20 flex justify-between items-start">
          <div className="flex flex-col items-center leading-none space-y-1">
            <span className="text-3xl sm:text-4xl font-black text-amber-300 font-mono tracking-tighter drop-shadow-md">
              {career.overall_rating}
            </span>
            <span className="text-sm font-black text-amber-400/90 uppercase tracking-wider">
              {career.position}
            </span>
            <span className="text-base pt-0.5" title="Україна">
              🇺🇦
            </span>
            {club && (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs shadow-md border border-white/20 mt-1"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
                }}
                title={club.name}
              >
                <Shield className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Player Modular Face Avatar */}
          <div className="relative -mt-2 -mr-2">
            <ProAvatarRenderer
              avatar={career.avatar}
              club={club}
              size={size === "sm" ? 95 : size === "lg" ? 140 : 120}
            />

            {/* Form Flame Indicator */}
            <div
              className={`absolute bottom-0 right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-0.5 border shadow-md ${
                career.form >= 85
                  ? "bg-emerald-500 text-slate-950 border-emerald-300"
                  : career.form >= 60
                  ? "bg-amber-400 text-slate-950 border-amber-200"
                  : "bg-rose-600 text-white border-rose-400"
              }`}
            >
              <Zap className="w-2.5 h-2.5 fill-current" />
              <span>{career.form}%</span>
            </div>
          </div>
        </div>

        {/* ─── MIDDLE SECTION: PLAYER NAME & CLUB ─── */}
        <div className="relative z-20 text-center my-2 space-y-0.5 border-t border-b border-amber-400/20 py-2 bg-slate-950/40 rounded-xl backdrop-blur-xs">
          <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase truncate px-1">
            {career.last_name}
          </h3>
          <p className="text-[10px] sm:text-xs font-semibold text-amber-400/90 truncate">
            {club ? club.name : "Вільний агент"} • {career.age} р.
          </p>
        </div>

        {/* ─── BOTTOM SECTION: 6 CORE ATTRIBUTES ─── */}
        <div className="relative z-20 grid grid-cols-2 gap-x-3 gap-y-1 text-xs py-1">
          <div className="flex justify-between items-center px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-800">
            <span className="font-bold text-amber-400">PAC</span>
            <span className="font-mono font-black text-white">
              {career.attributes.pace}
            </span>
          </div>
          <div className="flex justify-between items-center px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-800">
            <span className="font-bold text-amber-400">DRI</span>
            <span className="font-mono font-black text-white">
              {career.attributes.dribbling}
            </span>
          </div>

          <div className="flex justify-between items-center px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-800">
            <span className="font-bold text-amber-400">SHO</span>
            <span className="font-mono font-black text-white">
              {career.attributes.shooting}
            </span>
          </div>
          <div className="flex justify-between items-center px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-800">
            <span className="font-bold text-amber-400">DEF</span>
            <span className="font-mono font-black text-white">
              {career.attributes.defending}
            </span>
          </div>

          <div className="flex justify-between items-center px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-800">
            <span className="font-bold text-amber-400">PAS</span>
            <span className="font-mono font-black text-white">
              {career.attributes.passing}
            </span>
          </div>
          <div className="flex justify-between items-center px-1.5 py-0.5 rounded bg-slate-950/60 border border-slate-800">
            <span className="font-bold text-amber-400">PHY</span>
            <span className="font-mono font-black text-white">
              {career.attributes.physical}
            </span>
          </div>
        </div>

        {/* ─── FOOTER ASSET SHOWCASE BADGES ─── */}
        <div className="relative z-20 flex items-center justify-between pt-2 border-t border-amber-400/20 text-[10px] text-slate-300">
          {/* Boots */}
          <div
            className="flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800"
            title={bootsItem ? bootsItem.name : "Сільські бутси"}
          >
            <span>{bootsItem?.icon || "👟"}</span>
            <span className="font-bold text-amber-300 truncate max-w-[65px]">
              {bootsItem ? bootsItem.name.split(" ")[0] : "Колос"}
            </span>
          </div>

          {/* Car */}
          {carItem && (
            <div
              className="flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800"
              title={carItem.name}
            >
              <span>{carItem.icon}</span>
              <span className="font-bold text-emerald-300 truncate max-w-[60px]">
                {carItem.name.split(" ")[0]}
              </span>
            </div>
          )}

          {/* House */}
          {houseItem && (
            <div
              className="flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800"
              title={houseItem.name}
            >
              <span>{houseItem.icon}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
