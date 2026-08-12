"use client"

import { useState, useEffect, useRef } from "react"
import { Lock, Shield, KeyRound, ArrowRight, Sparkles, CheckCircle2, AlertCircle, Delete } from "lucide-react"
import { fmAudio } from "@/lib/fm-audio"

interface FMLockScreenProps {
  onUnlock: () => void
}

const CORRECT_PIN = "1100"

export function FMLockScreen({ onUnlock }: FMLockScreenProps) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmitPin = (inputPin: string) => {
    if (inputPin === CORRECT_PIN) {
      setError(false)
      setSuccess(true)
      fmAudio.playLevelUp()
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ks_fm_unlocked", "true")
        localStorage.setItem("ks_fm_unlocked", "true")
      }
      setTimeout(() => {
        onUnlock()
      }, 500)
    } else {
      setError(true)
      setErrorMessage("Невірний пароль доступу. Спробуйте ще раз.")
      fmAudio.playCardAlert(true)
      setPin("")
      setTimeout(() => setError(false), 800)
    }
  }

  const handleKeyPress = (digit: string) => {
    fmAudio.playClick()
    if (pin.length < 4) {
      const newPin = pin + digit
      setPin(newPin)
      if (newPin.length === 4) {
        handleSubmitPin(newPin)
      }
    }
  }

  const handleBackspace = () => {
    fmAudio.playClick()
    setPin((prev) => prev.slice(0, -1))
    setError(false)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmitPin(pin)
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/90 border border-emerald-500/30 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl max-w-md mx-auto w-full text-center space-y-6">
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Lock Icon Header */}
      <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-xl flex items-center justify-center">
        <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
          {success ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
          ) : (
            <Lock className={`w-9 h-9 text-emerald-400 ${error ? "animate-shake text-rose-400" : ""}`} />
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <KeyRound className="w-3.5 h-3.5" />
          Закритий доступ
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">
          KSLIGA Football Manager
        </h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Введіть 4-значний пароль для доступу до керування клубом та турнірів 11x11.
        </p>
      </div>

      {/* Hidden Native Input for physical keyboard / mobile virtual keyboard */}
      <form onSubmit={handleFormSubmit}>
        <input
          ref={inputRef}
          type="password"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 4)
            setPin(val)
            if (val.length === 4) {
              handleSubmitPin(val)
            }
          }}
          className="opacity-0 absolute -z-10"
        />
      </form>

      {/* 4-Digit Visual PIN Circles */}
      <div className={`flex items-center justify-center gap-3.5 py-2 ${error ? "animate-shake" : ""}`}>
        {[0, 1, 2, 3].map((index) => {
          const filled = pin.length > index
          return (
            <div
              key={index}
              className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${
                error
                  ? "border-rose-500 bg-rose-950/40 text-rose-300"
                  : filled
                  ? "border-emerald-400 bg-emerald-950/70 text-emerald-300 shadow-lg shadow-emerald-950/50 scale-105"
                  : "border-slate-800 bg-slate-950/70 text-slate-600"
              }`}
            >
              {filled ? (
                <span className="text-xl font-black font-mono">
                  {pin[index]}
                </span>
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-bold animate-fade-in flex items-center justify-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Interactive Keypad */}
      <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto pt-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleKeyPress(digit)}
            className="h-12 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-white font-black text-lg shadow-md transition-all active:scale-95 flex items-center justify-center"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            fmAudio.playClick()
            setPin("")
            setError(false)
          }}
          className="h-12 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs transition-all active:scale-95 flex items-center justify-center uppercase"
        >
          C
        </button>

        <button
          type="button"
          onClick={() => handleKeyPress("0")}
          className="h-12 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-white font-black text-lg shadow-md transition-all active:scale-95 flex items-center justify-center"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleBackspace}
          className="h-12 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 font-bold transition-all active:scale-95 flex items-center justify-center"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
