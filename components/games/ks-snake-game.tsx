"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Play, RotateCcw, Volume2, VolumeX, Trophy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Sparkles, Send, Flame } from "lucide-react"
import { retroAudio } from "@/lib/retro-audio"
import { saveGameScore } from "@/lib/database"
import type { Team } from "@/lib/supabase"

interface KsSnakeGameProps {
  teams: Team[]
  playerName: string
  onScoreSubmitted?: (scoreId: number) => void
  onRequestName?: () => void
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
const INITIAL_SPEED = 140 // ms per tick

export function KsSnakeGame({
  teams,
  playerName,
  onScoreSubmitted,
  onRequestName,
}: KsSnakeGameProps) {
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle")
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scoreSubmitted, setScoreSubmitted] = useState(false)
  const [localPlayerName, setLocalPlayerName] = useState(playerName || "")
  const [particles, setParticles] = useState<{ id: number; text: string; x: number; y: number }[]>([])

  // Engine state in Refs for zero-delay game loop
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ])
  const dirRef = useRef<Direction>("UP")
  const nextDirRef = useRef<Direction>("UP")
  const foodRef = useRef<FoodItem | null>(null)
  const goldenFoodRef = useRef<FoodItem | null>(null)
  const scoreRef = useRef(0)
  const speedRef = useRef(INITIAL_SPEED)
  const gameLoopTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Force canvas rerender trigger
  const [renderTick, setRenderTick] = useState(0)

  useEffect(() => {
    setLocalPlayerName(playerName)
  }, [playerName])

  useEffect(() => {
    setIsMuted(retroAudio.isMuted)
    const savedHi = localStorage.getItem("ks_snake_highscore")
    if (savedHi) setHighScore(parseInt(savedHi, 10) || 0)
  }, [])

  // Toggle Mute
  const handleToggleMute = () => {
    const next = retroAudio.toggleMute()
    setIsMuted(next)
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

  // Direction changer with 180 degree turn prevention
  const changeDirection = useCallback((newDir: Direction) => {
    const current = dirRef.current
    if (newDir === "UP" && current !== "DOWN") nextDirRef.current = "UP"
    else if (newDir === "DOWN" && current !== "UP") nextDirRef.current = "DOWN"
    else if (newDir === "LEFT" && current !== "RIGHT") nextDirRef.current = "LEFT"
    else if (newDir === "RIGHT" && current !== "LEFT") nextDirRef.current = "RIGHT"
    retroAudio.playMove()
  }, [])

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    nextDirRef.current = "UP"
    scoreRef.current = 0
    speedRef.current = INITIAL_SPEED
    foodRef.current = spawnFood()
    goldenFoodRef.current = null

    setScore(0)
    setScoreSubmitted(false)
    setGameState("playing")
  }

  // Main Tick Cycle
  const gameTick = useCallback(() => {
    if (gameState !== "playing") return

    dirRef.current = nextDirRef.current
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

    // 1. Wall Collision (Game Over)
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      retroAudio.playGameOver()
      setGameState("gameover")
      return
    }

    // 2. Self Collision (Game Over)
    if (snakeRef.current.some((s) => s.x === head.x && s.y === head.y)) {
      retroAudio.playGameOver()
      setGameState("gameover")
      return
    }

    const newSnake = [head, ...snakeRef.current]
    let ateFood = false

    // 3. Regular Team Logo Food Check
    if (foodRef.current && head.x === foodRef.current.x && head.y === foodRef.current.y) {
      ateFood = true
      scoreRef.current += 10
      retroAudio.playScore()

      // Add particle
      const pId = Date.now()
      setParticles((prev) => [...prev, { id: pId, text: "+10", x: head.x, y: head.y }])
      setTimeout(() => setParticles((prev) => prev.filter((p) => p.id !== pId)), 800)

      foodRef.current = spawnFood()

      // Rare golden trophy chance (15%)
      if (Math.random() < 0.18 && !goldenFoodRef.current) {
        goldenFoodRef.current = spawnGoldenFood()
      }

      // Speed acceleration
      speedRef.current = Math.max(70, INITIAL_SPEED - Math.floor(scoreRef.current / 40) * 8)
    }

    // 4. Golden Trophy Food Check
    if (
      goldenFoodRef.current &&
      head.x === goldenFoodRef.current.x &&
      head.y === goldenFoodRef.current.y
    ) {
      ateFood = true
      scoreRef.current += 50
      retroAudio.playBonus()

      const pId = Date.now()
      setParticles((prev) => [...prev, { id: pId, text: "⭐ +50", x: head.x, y: head.y }])
      setTimeout(() => setParticles((prev) => prev.filter((p) => p.id !== pId)), 1000)

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

    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current)
      localStorage.setItem("ks_snake_highscore", String(scoreRef.current))
    }

    setRenderTick((t) => t + 1)
  }, [gameState, highScore, spawnFood, spawnGoldenFood])

  // Timer loop
  useEffect(() => {
    if (gameState === "playing") {
      gameLoopTimerRef.current = setTimeout(gameTick, speedRef.current)
    }
    return () => {
      if (gameLoopTimerRef.current) clearTimeout(gameLoopTimerRef.current)
    }
  }, [gameState, gameTick, renderTick])

  // Submit Score
  const handleSubmitScore = async () => {
    const nameToUse = localPlayerName.trim()
    if (!nameToUse) {
      onRequestName?.()
      return
    }
    if (score <= 0 || submitting || scoreSubmitted) return

    setSubmitting(true)
    try {
      const saved = await saveGameScore(nameToUse, "snake", score)
      if (saved) {
        setScoreSubmitted(true)
        onScoreSubmitted?.(saved.id)
        localStorage.setItem("ks_player_name", nameToUse)
      }
    } catch (err) {
      console.error("Error submitting score:", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Game Screen Container */}
      <div
        className="relative overflow-hidden rounded-3xl bg-slate-950 border-2 border-emerald-500/30 shadow-2xl select-none aspect-square max-w-[420px] mx-auto p-2 sm:p-3"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Floating HUD */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md text-white border border-white/10 hover:bg-slate-800 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </button>
            <div className="px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md text-white border border-white/10 text-[11px] font-bold flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="truncate max-w-[100px]">{localPlayerName || "Гравець"}</span>
            </div>
          </div>

          <div className="px-3 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-right shadow-md">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Рекорд: {highScore}</div>
            <div className="text-base font-black text-emerald-400 font-mono tracking-widest leading-none">
              {score} <span className="text-[10px] text-slate-400">оч.</span>
            </div>
          </div>
        </div>

        {/* 20x20 Arcade LCD Grid */}
        <div
          className="w-full h-full rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800/80 grid relative overflow-hidden"
          style={{
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
                    alt=""
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-blue-600" />
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
              className="absolute pointer-events-none text-xs font-black text-amber-300 font-mono animate-bounce"
              style={{
                left: `${(p.x / GRID_SIZE) * 100}%`,
                top: `${(p.y / GRID_SIZE) * 100}%`,
              }}
            >
              {p.text}
            </div>
          ))}
        </div>

        {/* Start Overlay */}
        {gameState === "idle" && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/30 mb-3 flex items-center justify-center animate-bounce">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Play className="h-6 w-6 text-emerald-400 fill-emerald-400 ml-0.5" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">KS Retro Snake</h3>
            <p className="text-xs text-slate-300 max-w-xs mt-1 mb-4">
              Збирайте емблеми команд KS LIGA та Золоті Кубки! Керуйте стрілками або свайпами.
            </p>
            <button
              type="button"
              onClick={startGame}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Почати гру
            </button>
          </div>
        )}

        {/* Game Over Modal */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center z-20">
            <div className="bg-white/10 border border-white/20 rounded-3xl p-5 max-w-xs w-full shadow-2xl backdrop-blur-xl space-y-3.5">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h4 className="text-base font-black text-white">Гра завершена!</h4>
              </div>

              <div className="bg-slate-950/80 rounded-2xl p-3 border border-white/10 flex items-center justify-around">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Очки</div>
                  <div className="text-xl font-black text-emerald-400 font-mono">{score}</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Рекорд</div>
                  <div className="text-xl font-black text-amber-400 font-mono">{highScore}</div>
                </div>
              </div>

              {/* Submit to Leaderboard */}
              {score > 0 && (
                <div className="space-y-2">
                  {!localPlayerName ? (
                    <button
                      type="button"
                      onClick={() => onRequestName?.()}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-98"
                    >
                      Введіть ім'я, щоб зберегти рекорд
                    </button>
                  ) : scoreSubmitted ? (
                    <div className="py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                      Рекорд записано!
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitScore}
                      disabled={submitting}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-md shadow-emerald-600/30 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {submitting ? "Збереження..." : "Записати в Зал Слави"}
                    </button>
                  )}
                </div>
              )}

              {/* Retry */}
              <button
                type="button"
                onClick={startGame}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950 font-black text-xs transition-all shadow-lg hover:scale-102 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Спробувати ще раз
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Arcade D-Pad Virtual Controller for Mobile */}
      <div className="flex flex-col items-center justify-center gap-2 sm:hidden pt-2">
        <button
          type="button"
          onTouchStart={() => changeDirection("UP")}
          onMouseDown={() => changeDirection("UP")}
          className="w-14 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-white flex items-center justify-center shadow-lg active:scale-90 active:bg-blue-600 transition-all cursor-pointer"
        >
          <ArrowUp className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onTouchStart={() => changeDirection("LEFT")}
            onMouseDown={() => changeDirection("LEFT")}
            className="w-14 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-white flex items-center justify-center shadow-lg active:scale-90 active:bg-blue-600 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="w-10 h-10 rounded-full bg-slate-900/60 border border-slate-800 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-emerald-500/50" />
          </div>
          <button
            type="button"
            onTouchStart={() => changeDirection("RIGHT")}
            onMouseDown={() => changeDirection("RIGHT")}
            className="w-14 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-white flex items-center justify-center shadow-lg active:scale-90 active:bg-blue-600 transition-all cursor-pointer"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>
        <button
          type="button"
          onTouchStart={() => changeDirection("DOWN")}
          onMouseDown={() => changeDirection("DOWN")}
          className="w-14 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-white flex items-center justify-center shadow-lg active:scale-90 active:bg-blue-600 transition-all cursor-pointer"
        >
          <ArrowDown className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
