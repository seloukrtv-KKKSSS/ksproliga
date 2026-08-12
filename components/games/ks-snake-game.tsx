"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Play, RotateCcw, Volume2, VolumeX, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Sparkles, Send, Flame, Maximize2, Minimize2 } from "lucide-react"
import { retroAudio } from "@/lib/retro-audio"
import { saveGameScore } from "@/lib/database"
import type { Team } from "@/lib/supabase"

interface KsSnakeGameProps {
  teams: Team[]
  playerName: string
  onScoreSubmitted?: (scoreId: number) => void
  onRequestName?: () => void
  onViewLeaderboard?: () => void
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT"
interface Point {
  x: number
  y: number
}

interface FoodItem {
  x: number
  y: number
  teamLogo?: string
  teamName: string
  isGolden?: boolean
  expiresAt?: number
}

const GRID_SIZE = 20
const INITIAL_SPEED = 185 // ms per tick (starts calm and accessible)

export function KsSnakeGame({
  teams,
  playerName,
  onScoreSubmitted,
  onRequestName,
  onViewLeaderboard,
}: KsSnakeGameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle")
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scoreSubmitted, setScoreSubmitted] = useState(false)
  const [localPlayerName, setLocalPlayerName] = useState(playerName || "")
  const [particles, setParticles] = useState<{ id: number; text: string; x: number; y: number }[]>([])
  const [scrollLocked, setScrollLocked] = useState(false)

  // Engine state in Refs for zero-delay game loop
  const localPlayerNameRef = useRef(playerName || "")
  const submittingRef = useRef(false)
  const highScoreRef = useRef(0)
  const startBaselineScoreRef = useRef(0)
  const lastSavedScoreRef = useRef(0)
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ])
  const dirRef = useRef<Direction>("UP")
  const directionQueueRef = useRef<Direction[]>([])
  const foodRef = useRef<FoodItem | null>(null)
  const goldenFoodRef = useRef<FoodItem | null>(null)
  const scoreRef = useRef(0)
  const speedRef = useRef(INITIAL_SPEED)
  const gameLoopTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(console.error)
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(console.error)
      }
    }
  }

  // Force canvas rerender trigger
  const [renderTick, setRenderTick] = useState(0)

  useEffect(() => {
    setLocalPlayerName(playerName)
    localPlayerNameRef.current = playerName
  }, [playerName])

  useEffect(() => {
    setIsMuted(retroAudio.isMuted)
    const savedHi = localStorage.getItem("ks_snake_highscore")
    if (savedHi) {
      const parsed = parseInt(savedHi, 10) || 0
      setHighScore(parsed)
      highScoreRef.current = parsed
      lastSavedScoreRef.current = parsed
    }
  }, [])

  useEffect(() => {
    if (scrollLocked) {
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
    }
  }, [scrollLocked])

  useEffect(() => {
    if (gameState === "playing") {
      setScrollLocked(true)
    } else {
      setScrollLocked(false)
    }
  }, [gameState])

  // Toggle Mute
  const handleToggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    retroAudio.setMuted(next)
    localStorage.setItem("ks_game_muted", String(next))
  }

  const triggerHaptic = (type: "move" | "eat" | "bonus" | "gameover") => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        if (type === "eat") navigator.vibrate(25)
        else if (type === "bonus") navigator.vibrate([30, 40, 30])
        else if (type === "gameover") navigator.vibrate([60, 40, 80])
      } catch (e) {
        // ignore
      }
    }
  }

  // Spawn random Food with team logo
  const spawnFood = useCallback((): FoodItem => {
    const eligibleTeams = teams.filter((t) => t.logo)
    const randomTeam =
      eligibleTeams.length > 0
        ? eligibleTeams[Math.floor(Math.random() * eligibleTeams.length)]
        : { name: "KS Team", logo: undefined }

    let newX = 0
    let newY = 0
    let collision = true

    while (collision) {
      newX = Math.floor(Math.random() * GRID_SIZE)
      newY = Math.floor(Math.random() * GRID_SIZE)
      collision = snakeRef.current.some((s) => s.x === newX && s.y === newY)
    }

    return {
      x: newX,
      y: newY,
      teamLogo: randomTeam.logo,
      teamName: randomTeam.name,
      isGolden: false,
    }
  }, [teams])

  // Spawn rare Golden Trophy
  const spawnGoldenFood = useCallback((): FoodItem => {
    let newX = 0
    let newY = 0
    let collision = true

    while (collision) {
      newX = Math.floor(Math.random() * GRID_SIZE)
      newY = Math.floor(Math.random() * GRID_SIZE)
      collision =
        snakeRef.current.some((s) => s.x === newX && s.y === newY) ||
        (foodRef.current?.x === newX && foodRef.current?.y === newY)
    }

    return {
      x: newX,
      y: newY,
      teamName: "Золотий Кубок KS LIGA",
      isGolden: true,
      expiresAt: Date.now() + 9000, // 9 seconds to catch
    }
  }, [])

  // Direction changer with input queue buffer to prevent sticky/missed rapid turns
  const changeDirection = useCallback((newDir: Direction) => {
    const queue = directionQueueRef.current
    const lastPlannedDir = queue.length > 0 ? queue[queue.length - 1] : dirRef.current

    // Prevent 180° instant self-reversal against the latest planned move
    const isOpposite =
      (newDir === "UP" && lastPlannedDir === "DOWN") ||
      (newDir === "DOWN" && lastPlannedDir === "UP") ||
      (newDir === "LEFT" && lastPlannedDir === "RIGHT") ||
      (newDir === "RIGHT" && lastPlannedDir === "LEFT")

    if (!isOpposite && newDir !== lastPlannedDir && queue.length < 2) {
      queue.push(newDir)
      retroAudio.playMove()
    }
  }, [])

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (["ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault()
        changeDirection("UP")
      } else if (["ArrowDown", "KeyS"].includes(e.code)) {
        e.preventDefault()
        changeDirection("DOWN")
      } else if (["ArrowLeft", "KeyA"].includes(e.code)) {
        e.preventDefault()
        changeDirection("LEFT")
      } else if (["ArrowRight", "KeyD"].includes(e.code)) {
        e.preventDefault()
        changeDirection("RIGHT")
      } else if (e.code === "Space" && (gameState === "idle" || gameState === "gameover")) {
        e.preventDefault()
        startGame()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [changeDirection, gameState])

  // Touch Swipe Handlers for mobile playing
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)

    if (Math.max(absX, absY) > 20) {
      if (absX > absY) {
        if (dx > 0) changeDirection("RIGHT")
        else changeDirection("LEFT")
      } else {
        if (dy > 0) changeDirection("DOWN")
        else changeDirection("UP")
      }
    }
    touchStartRef.current = null
  }

  // Start / Restart Game
  const startGame = () => {
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ]
    dirRef.current = "UP"
    directionQueueRef.current = []
    scoreRef.current = 0
    startBaselineScoreRef.current = highScoreRef.current // Baseline score for true new record detection
    speedRef.current = INITIAL_SPEED
    foodRef.current = spawnFood()
    goldenFoodRef.current = null

    setScore(0)
    setIsNewRecord(false)
    setScoreSubmitted(false)
    setGameState("playing")
  }

  // Main Tick Cycle
  const gameTick = useCallback(() => {
    if (gameState !== "playing") return

    // Extract next direction from queue buffer (prevents missed inputs)
    if (directionQueueRef.current.length > 0) {
      dirRef.current = directionQueueRef.current.shift()!
    }

    const head = { ...snakeRef.current[0] }

    switch (dirRef.current) {
      case "UP":
        head.y -= 1
        break
      case "DOWN":
        head.y += 1
        break
      case "LEFT":
        head.x -= 1
        break
      case "RIGHT":
        head.x += 1
        break
    }

    const triggerGameOver = async () => {
      retroAudio.playGameOver()
      triggerHaptic("gameover")
      setGameState("gameover")

      const finalScore = scoreRef.current
      const nameToUse = localPlayerNameRef.current.trim()

      // Mathematical true record beat check against baseline before game started
      const didBeatRecord = startBaselineScoreRef.current > 0
        ? finalScore > startBaselineScoreRef.current
        : finalScore > 0

      setIsNewRecord(didBeatRecord)

      if (didBeatRecord) {
        highScoreRef.current = Math.max(highScoreRef.current, finalScore)
        setHighScore(highScoreRef.current)
        localStorage.setItem("ks_snake_highscore", String(highScoreRef.current))
      }

      // Auto-save to Supabase if player name is present and beats DB record
      if (nameToUse && finalScore > 0 && finalScore > lastSavedScoreRef.current && !submittingRef.current) {
        submittingRef.current = true
        setSubmitting(true)
        try {
          const saved = await saveGameScore(nameToUse, "snake", finalScore)
          if (saved) {
            lastSavedScoreRef.current = Math.max(lastSavedScoreRef.current, saved.score)
            setScoreSubmitted(true)
            onScoreSubmitted?.(saved.id)
            localStorage.setItem("ks_player_name", nameToUse)
          }
        } catch (err) {
          console.error("Error auto-saving score:", err)
        } finally {
          submittingRef.current = false
          setSubmitting(false)
        }
      }
    }

    // 1. Wall Collision (Game Over)
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      triggerGameOver()
      return
    }

    // 2. Self Collision (Game Over)
    if (snakeRef.current.some((s) => s.x === head.x && s.y === head.y)) {
      triggerGameOver()
      return
    }

    const newSnake = [head, ...snakeRef.current]
    let ateFood = false

    // 3. Regular Food Collision
    if (foodRef.current && head.x === foodRef.current.x && head.y === foodRef.current.y) {
      scoreRef.current += 10
      ateFood = true
      retroAudio.playScore()
      triggerHaptic("eat")

      // Spawn floating score particle
      const pId = Date.now() + Math.random()
      setParticles((prev) => [...prev, { id: pId, text: "+10", x: head.x, y: head.y }])
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== pId))
      }, 700)

      foodRef.current = spawnFood()

      // Smooth progressive acceleration - generous long easy start
      const curScore = scoreRef.current
      const accel = curScore < 100 ? 0.7 : curScore < 300 ? 1.4 : 2.2
      speedRef.current = Math.max(68, speedRef.current - accel)

      // Random Golden Trophy Spawn (Higher 30% chance in early game for extra reward)
      const goldenChance = curScore < 100 ? 0.30 : 0.18
      if (Math.random() < goldenChance && !goldenFoodRef.current) {
        goldenFoodRef.current = spawnGoldenFood()
      }
    }

    // 4. Golden Trophy Collision
    if (goldenFoodRef.current && head.x === goldenFoodRef.current.x && head.y === goldenFoodRef.current.y) {
      scoreRef.current += 50
      ateFood = true
      retroAudio.playBonus()
      triggerHaptic("bonus")

      const pId = Date.now() + Math.random()
      setParticles((prev) => [...prev, { id: pId, text: "+50 🏆", x: head.x, y: head.y }])
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== pId))
      }, 900)

      goldenFoodRef.current = null
    }

    // Clean up expired golden food
    if (goldenFoodRef.current && goldenFoodRef.current.expiresAt && Date.now() > goldenFoodRef.current.expiresAt) {
      goldenFoodRef.current = null
    }

    if (!ateFood) {
      newSnake.pop()
    }

    snakeRef.current = newSnake
    setScore(scoreRef.current)

    if (scoreRef.current > highScoreRef.current) {
      highScoreRef.current = scoreRef.current
      setHighScore(scoreRef.current)
      localStorage.setItem("ks_snake_highscore", String(scoreRef.current))
    }

    setRenderTick((t) => t + 1)
  }, [gameState, spawnFood, spawnGoldenFood])

  // Timer loop
  useEffect(() => {
    if (gameState === "playing") {
      gameLoopTimerRef.current = setTimeout(gameTick, speedRef.current)
    }
    return () => {
      if (gameLoopTimerRef.current) clearTimeout(gameLoopTimerRef.current)
    }
  }, [gameState, gameTick, renderTick])

  return (
    <div className="space-y-3 max-w-[420px] mx-auto">
      {/* Top Dedicated HUD (Never overlaps the grid!) */}
      <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md p-2 px-3 rounded-2xl border border-white/10 shadow-lg select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleMute}
            title={isMuted ? "Увімкнути звук" : "Вимкнути звук"}
            className="p-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>

          {/* Fullscreen only for Desktop (hidden on mobile) */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? "Вийти з повного екрану" : "На повний екран"}
            className="hidden sm:flex p-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 text-emerald-400" /> : <Maximize2 className="h-4 w-4 text-slate-300" />}
          </button>

          <div className="px-2.5 py-1 rounded-xl bg-white/10 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="truncate max-w-[110px]">{localPlayerName || "Гравець"}</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Рекорд: {highScore}</div>
          <div className="text-base font-black text-emerald-400 font-mono tracking-widest leading-none">
            {score} <span className="text-[10px] text-slate-400">оч.</span>
          </div>
        </div>
      </div>

      {/* Game Screen Container (100% Unobstructed 20x20 Grid) */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-3xl bg-slate-950 border-2 border-emerald-500/30 shadow-2xl select-none aspect-square w-full mx-auto p-1.5 sm:p-2.5 ${
          isFullscreen ? "fixed inset-0 z-50 rounded-none w-screen h-screen max-w-none border-none flex flex-col justify-center items-center p-6 bg-slate-950" : ""
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none" }}
      >
        {/* 20x20 Arcade LCD Grid */}
        <div
          className={`rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800/80 grid relative overflow-hidden ${
            isFullscreen ? "my-auto shadow-2xl ring-2 ring-emerald-500/20" : "w-full h-full"
          }`}
          style={{
            width: isFullscreen ? "min(68vh, 88vw)" : undefined,
            height: isFullscreen ? "min(68vh, 88vw)" : undefined,
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          }}
        >
          {/* Subtle Grid Dot Matrix */}
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

          {/* Snake Segments */}
          {snakeRef.current.map((seg, idx) => {
            const isHead = idx === 0
            return (
              <div
                key={idx}
                className="relative flex items-center justify-center p-[1px]"
                style={{
                  gridColumnStart: seg.x + 1,
                  gridRowStart: seg.y + 1,
                }}
              >
                <div
                  className={`w-full h-full rounded-[4px] transition-all ${
                    isHead
                      ? "bg-gradient-to-tr from-emerald-400 to-teal-300 shadow-md shadow-emerald-400/50 ring-1 ring-white"
                      : "bg-gradient-to-tr from-emerald-500 to-emerald-600 border border-emerald-400/40"
                  }`}
                >
                  {/* Eyes on Head */}
                  {isHead && (
                    <div className="w-full h-full flex items-center justify-around p-0.5">
                      <div className="w-1 h-1 rounded-full bg-slate-950" />
                      <div className="w-1 h-1 rounded-full bg-slate-950" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Regular Food (Team Logo) */}
          {foodRef.current && (
            <div
              className="relative flex items-center justify-center p-[1px] animate-pulse"
              style={{
                gridColumnStart: foodRef.current.x + 1,
                gridRowStart: foodRef.current.y + 1,
              }}
            >
              <div className="w-full h-full rounded-full bg-white border border-blue-500 shadow-md shadow-blue-500/40 p-0.5 flex items-center justify-center overflow-hidden">
                {foodRef.current.teamLogo ? (
                  <img
                    src={foodRef.current.teamLogo}
                    alt={foodRef.current.teamName || ""}
                    loading="eager"
                    className="w-full h-full object-contain pointer-events-none"
                    onError={(e) => {
                      // On error hide broken image and show badge
                      ;(e.currentTarget as HTMLElement).style.display = "none"
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-[7px] font-black text-white">
                    {(foodRef.current.teamName || "KS").slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Golden Trophy Bonus Food */}
          {goldenFoodRef.current && (
            <div
              className="relative flex items-center justify-center p-[1px] animate-bounce"
              style={{
                gridColumnStart: goldenFoodRef.current.x + 1,
                gridRowStart: goldenFoodRef.current.y + 1,
              }}
            >
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 border-2 border-white shadow-lg shadow-amber-400/80 flex items-center justify-center text-[10px]">
                🏆
              </div>
            </div>
          )}

          {/* Floating Score Particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute pointer-events-none text-xs font-black text-amber-300 font-mono animate-bounce -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${((p.x + 0.5) / GRID_SIZE) * 100}%`,
                top: `${((p.y + 0.5) / GRID_SIZE) * 100}%`,
              }}
            >
              {p.text}
            </div>
          ))}
        </div>

        {/* Start Overlay */}
        {gameState === "idle" && (
          <div 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20"
          >
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/40 mb-3.5 flex items-center justify-center animate-bounce">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                <Play className="h-7 w-7 text-emerald-400 fill-emerald-400 ml-0.5" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">KS Retro Snake</h3>
            <p className="text-xs text-slate-300 max-w-sm mt-1.5 mb-5 font-medium leading-relaxed">
              Збирайте емблеми команд KS LIGA (+10 очок) та Золоті Кубки (+50 очок)!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={startGame}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                <span>Почати гру</span>
              </button>

              {/* Fullscreen button only on Desktop */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="hidden sm:inline-flex px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer items-center gap-2"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4 text-emerald-400" /> : <Maximize2 className="h-4 w-4 text-slate-300" />}
                <span>{isFullscreen ? "Звичайний екран" : "На весь екран"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {gameState === "gameover" && (
          <div 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center z-20"
          >
            <div className="bg-white/10 border border-white/20 rounded-3xl p-5 max-w-xs w-full shadow-2xl backdrop-blur-xl space-y-3.5">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h4 className="text-base font-black text-white">Гра завершена!</h4>
              </div>

              {/* New Personal Record Banner */}
              {isNewRecord && score > 0 && (
                <div className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/30 via-yellow-400/30 to-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-black flex items-center justify-center gap-1.5 animate-pulse shadow-md">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>НОВИЙ ОСОБИСТИЙ РЕКОРД!</span>
                </div>
              )}

              <div className="bg-slate-950/80 rounded-2xl p-3 border border-white/10 flex items-center justify-around">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Очки</div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">{score}</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Рекорд</div>
                  <div className="text-2xl font-black text-amber-400 font-mono">{highScore}</div>
                </div>
              </div>

              {/* Hall of Fame Status */}
              <div className="text-center">
                {!localPlayerName ? (
                  <button
                    type="button"
                    onClick={() => onRequestName?.()}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-98"
                  >
                    Введіть ім'я, щоб зберегти рекорд
                  </button>
                ) : submitting ? (
                  <div className="py-1.5 px-3 rounded-xl bg-emerald-600/50 text-white font-black text-xs flex items-center justify-center gap-2">
                    <Send className="h-3.5 w-3.5 animate-pulse" />
                    <span>Збереження рекорду в Зал Слави...</span>
                  </div>
                ) : isNewRecord && score > 0 ? (
                  <div className="py-1.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span>Новий рекорд внесено в Зал Слави!</span>
                  </div>
                ) : highScore > 0 ? (
                  <div className="py-1 px-3 rounded-xl bg-white/5 text-slate-400 text-xs font-medium flex items-center justify-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-amber-400/70" />
                    <span>Кращий рекорд у Залі Слави: <strong className="text-white font-mono">{highScore}</strong></span>
                  </div>
                ) : null}
              </div>

              {/* Instant Play Again Button */}
              <button
                type="button"
                onClick={startGame}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black text-sm transition-all shadow-lg hover:scale-102 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="h-5 w-5" />
                <span>Грати знову (Пробіл / Тап)</span>
              </button>

              {/* View Leaderboard Button */}
              {onViewLeaderboard && (
                <button
                  type="button"
                  onClick={onViewLeaderboard}
                  className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  <span>Переглянути Зал Слави</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Large Ergonomic Arcade Joystick / D-Pad for Mobile */}
      <div 
        className="flex flex-col items-center justify-center gap-2 sm:hidden pt-3 select-none arcade-no-select"
        onContextMenu={(e) => e.preventDefault()}
      >
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault()
            try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch (_) {}
            changeDirection("UP")
          }}
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none" }}
          className="w-28 h-16 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 text-white flex items-center justify-center shadow-xl active:scale-90 active:bg-emerald-600 active:border-emerald-400 transition-all cursor-pointer select-none arcade-no-select"
        >
          <ArrowUp className="h-9 w-9 text-emerald-400 pointer-events-none" />
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault()
              try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch (_) {}
              changeDirection("LEFT")
            }}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none" }}
            className="w-28 h-16 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 border-2 border-slate-700 text-white flex items-center justify-center shadow-xl active:scale-90 active:bg-emerald-600 active:border-emerald-400 transition-all cursor-pointer select-none arcade-no-select"
          >
            <ArrowLeft className="h-9 w-9 text-emerald-400 pointer-events-none" />
          </button>
          <div className="w-14 h-14 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center shadow-inner pointer-events-none select-none">
            <span className="w-5 h-5 rounded-full bg-emerald-500/80 animate-pulse shadow-md shadow-emerald-500/40" />
          </div>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault()
              try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch (_) {}
              changeDirection("RIGHT")
            }}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none" }}
            className="w-28 h-16 rounded-2xl bg-gradient-to-l from-slate-800 to-slate-900 border-2 border-slate-700 text-white flex items-center justify-center shadow-xl active:scale-90 active:bg-emerald-600 active:border-emerald-400 transition-all cursor-pointer select-none arcade-no-select"
          >
            <ArrowRight className="h-9 w-9 text-emerald-400 pointer-events-none" />
          </button>
        </div>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault()
            try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch (_) {}
            changeDirection("DOWN")
          }}
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none" }}
          className="w-28 h-16 rounded-2xl bg-gradient-to-t from-slate-800 to-slate-900 border-2 border-slate-700 text-white flex items-center justify-center shadow-xl active:scale-90 active:bg-emerald-600 active:border-emerald-400 transition-all cursor-pointer select-none arcade-no-select"
        >
          <ArrowDown className="h-9 w-9 text-emerald-400 pointer-events-none" />
        </button>
      </div>

      {/* Scroll Lock Toggle */}
      <div className="flex justify-center pt-2 sm:hidden select-none arcade-no-select">
        <button
          type="button"
          onClick={() => setScrollLocked(!scrollLocked)}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md select-none arcade-no-select ${
            scrollLocked 
              ? "bg-amber-500/20 text-amber-500 border border-amber-500/40" 
              : "bg-slate-800 text-slate-300 border border-slate-700"
          }`}
        >
          {scrollLocked ? "🔓 Розблокувати скрол" : "🔒 Заблокувати скрол"}
        </button>
      </div>
    </div>
  )
}
