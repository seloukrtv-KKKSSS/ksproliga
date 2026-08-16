"use client"

import { useState } from "react"
import { ProCareer, ProClub } from "@/lib/pro-types"
import { Shield, Sparkles, Zap, Heart, Flame } from "lucide-react"

interface ProCardProps {
  career: ProCareer
  club?: ProClub
  isCompact?: boolean
}

export function ProCard({ career, club, isCompact = false }: ProCardProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -10
    const rotateY = ((x - centerX) / centerX) * 10
    const glareX = (x / rect.width) * 100
    const glareY = (y / rect.height) * 100

    setTilt({ x: rotateX, y: rotateY, glareX, glareY })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 })
  }

  const attr = career.attributes
  const ovr = career.overall_rating
  const isElite = ovr >= 80
  const isGood = ovr >= 65

  const borderColor = isElite
    ? "from-amber-400 via-yellow-200 to-amber-600"
    : isGood
    ? "from-emerald-400 via-teal-200 to-emerald-600"
    : "from-amber-700 via-amber-500 to-yellow-600"

  const bgGradient = isElite
    ? "from-slate-950 via-amber-950/40 to-slate-950"
    : isGood
    ? "from-slate-950 via-emerald-950/40 to-slate-950"
    : "from-slate-950 via-slate-900 to-emerald-950/40"

  if (isCompact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-lg">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-400 p-0.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex flex-col items-center justify-center">
            <span className="text-[10px] font-black text-amber-400 leading-none">
              {career.position}
            </span>
            <span className="text-sm font-black text-white">{ovr}</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-black text-white truncate">
              {career.first_name} {career.last_name}
            </h4>
            <span className="text-xs">🇺🇦</span>
          </div>
          <p className="text-xs text-slate-400 truncate">
            {club?.name || "ФК Тучапи"} • {career.age} років
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: "transform 0.15s ease-out"
      }}
      className="relative w-full max-w-[320px] aspect-[1/1.55] rounded-3xl p-1 bg-gradient-to-b shadow-2xl overflow-hidden group select-none cursor-pointer"
    >
      {/* Outer Holographic Border */}
      <div
        className={`absolute inset-0 rounded-3xl bg-gradient-to-tr ${borderColor} opacity-90`}
      />

      {/* Holographic Glare Overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-3xl z-20 mix-blend-color-dodge opacity-40 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 60%)`
        }}
      />

      {/* Inner Card Container */}
      <div
        className={`relative z-10 w-full h-full rounded-[22px] bg-gradient-to-b ${bgGradient} border border-white/10 p-5 flex flex-col justify-between overflow-hidden`}
      >
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header: OVR + Position + Flag + Club */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex flex-col items-center">
            <span className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tighter drop-shadow-md">
              {ovr}
            </span>
            <span className="text-xs sm:text-sm font-black text-white/90 uppercase tracking-wider">
              {career.position}
            </span>
            <div className="w-5 h-0.5 bg-amber-400/60 my-1 rounded-full" />
            <span className="text-base" title="Україна">
              🇺🇦
            </span>
          </div>

          {/* Club Badge */}
          <div className="flex flex-col items-end gap-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border border-white/20"
              style={{
                background: `linear-gradient(135deg, ${
                  club?.primary_color || "#166534"
                }, ${club?.secondary_color || "#FACC15"})`
              }}
            >
              <Shield className="w-5 h-5 text-white drop-shadow" />
            </div>
            <span className="text-[10px] font-bold text-slate-300 max-w-[120px] truncate text-right">
              {club?.name || "ФК Тучапи"}
            </span>
            <span className="text-[9px] font-semibold text-emerald-400">
              {club?.city || "Івано-Франківщина"}
            </span>
          </div>
        </div>

        {/* Center: Player Silhouette & Name */}
        <div className="relative z-10 text-center my-auto py-2">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-slate-800 via-slate-700 to-emerald-800 border-2 border-amber-400/50 flex items-center justify-center shadow-xl mb-3">
            <span className="text-3xl">⚽</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase drop-shadow-md">
            {career.last_name}
          </h3>
          <p className="text-xs font-semibold text-slate-300">
            {career.first_name} {career.nickname ? `«${career.nickname}»` : ""}
          </p>

          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/90 text-amber-300 border border-amber-500/30">
              {career.age} років
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/90 text-emerald-300 border border-emerald-500/30">
              {career.foot === "left"
                ? "Ліва нога"
                : career.foot === "both"
                ? "Обидві ноги"
                : "Права нога"}
            </span>
          </div>
        </div>

        {/* Bottom 6 Attributes (PAC SHO PAS DRI DEF PHY) */}
        <div className="relative z-10 pt-3 border-t border-white/15">
          <div className="grid grid-cols-6 gap-1 text-center">
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">
                PAC
              </div>
              <div className="text-xs sm:text-sm font-black text-white">
                {attr.pace}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">
                SHO
              </div>
              <div className="text-xs sm:text-sm font-black text-white">
                {attr.shooting}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">
                PAS
              </div>
              <div className="text-xs sm:text-sm font-black text-white">
                {attr.passing}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">
                DRI
              </div>
              <div className="text-xs sm:text-sm font-black text-white">
                {attr.dribbling}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">
                DEF
              </div>
              <div className="text-xs sm:text-sm font-black text-white">
                {attr.defending}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase">
                PHY
              </div>
              <div className="text-xs sm:text-sm font-black text-white">
                {attr.physical}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
