"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Play, RotateCcw, Volume2, VolumeX, Trophy, ChevronUp, ChevronDown, Sparkles, Send } from "lucide-react"
import { retroAudio } from "@/lib/retro-audio"
import { saveGameScore } from "@/lib/database"
import type { Team } from "@/lib/supabase"

interface KsDinoRunnerProps {
  teams: Team[]
  playerName: string
  onScoreSubmitted?: (scoreId: number) => void
  onRequestName?: () => void
}

interface Obstacle {
  x: number
  y: number
  width: number
  height: number
  teamLogo?: string
  teamName: string
  isAir?: boolean
  imageLoaded?: boolean
  imgElement?: HTMLImageElement
}

export function KsDinoRunner({
  teams,
  playerName,
  onScoreSubmitted,
  onRequestName,
}: KsDinoRunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle")
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scoreSubmitted, setScoreSubmitted] = useState(false)
  const [localPlayerName, setLocalPlayerName] = useState(playerName || "")

  // Game Engine Refs
  const reqIdRef = useRef<number | null>(null)
  const gameStateRef = useRef<"idle" | "playing" | "gameover">("idle")
  const scoreRef = useRef(0)
  const highScoreRef = useRef(0)
  const localPlayerNameRef = useRef(playerName || "")
  const speedRef = useRef(5)
  const isJumpingRef = useRef(false)
  const isDuckingRef = useRef(false)
  const playerYRef = useRef(0)
  const playerVYRef = useRef(0)
  const obstaclesRef = useRef<Obstacle[]>([])
  const nextSpawnDistanceRef = useRef(120)
  const groundOffsetRef = useRef(0)
  const frameCountRef = useRef(0)
  const cachedTeamImagesRef = useRef<Map<string, HTMLImageElement>>(new Map())

  // Keep state refs in sync
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  useEffect(() => {
    setLocalPlayerName(playerName)
    localPlayerNameRef.current = playerName || ""
  }, [playerName])

  useEffect(() => {
    setIsMuted(retroAudio.isMuted)
    const savedHi = localStorage.getItem("ks_dino_highscore")
    if (savedHi) {
      const parsed = parseInt(savedHi, 10) || 0
      setHighScore(parsed)
      highScoreRef.current = parsed
    }
  }, [])

  // Preload team logos for canvas rendering
  useEffect(() => {
    teams.forEach((t) => {
      if (t.logo && !cachedTeamImagesRef.current.has(t.logo)) {
        const img = new Image()
        img.onerror = () => console.warn("Failed to load team logo:", t.logo)
        img.src = t.logo
        cachedTeamImagesRef.current.set(t.logo, img)
      }
    })
  }, [teams])

  // Toggle Mute
  const handleToggleMute = () => {
    const next = retroAudio.toggleMute()
    setIsMuted(next)
  }

  // Jump Action
  const doJump = useCallback(() => {
    if (gameStateRef.current === "idle") {
      startGame()
      return
    }
    if (gameStateRef.current === "gameover") {
      startGame()
      return
    }
    if (gameStateRef.current === "playing") {
      if (playerYRef.current === 0 && !isDuckingRef.current) {
        playerVYRef.current = 13.8 // Jump force
        isJumpingRef.current = true
        retroAudio.playJump()
      }
    }
  }, [])

  // Duck Action
  const setDuck = useCallback((ducking: boolean) => {
    if (gameStateRef.current !== "playing") return
    if (ducking && !isDuckingRef.current && playerYRef.current === 0) {
      retroAudio.playSlide()
    }
    isDuckingRef.current = ducking
    if (ducking && playerYRef.current > 0) {
      playerVYRef.current = -15 // Fast fall / dive
    }
  }, [])

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault()
        doJump()
      } else if (["ArrowDown", "KeyS"].includes(e.code)) {
        e.preventDefault()
        setDuck(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (["ArrowDown", "KeyS"].includes(e.code)) {
        e.preventDefault()
        setDuck(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [doJump, setDuck])

  // Start / Restart Game
  const startGame = () => {
    scoreRef.current = 0
    speedRef.current = 6
    playerYRef.current = 0
    playerVYRef.current = 0
    isJumpingRef.current = false
    isDuckingRef.current = false
    obstaclesRef.current = []
    nextSpawnDistanceRef.current = 100
    groundOffsetRef.current = 0
    frameCountRef.current = 0

    setScore(0)
    setScoreSubmitted(false)
    setGameState("playing")
    gameStateRef.current = "playing"
  }

  // Auto-save High Score
  const autoSaveScore = async (name: string, finalScore: number) => {
    setSubmitting(true)
    try {
      const saved = await saveGameScore(name, "dino", finalScore)
      if (saved) {
        setScoreSubmitted(true)
        onScoreSubmitted?.(saved.id)
        localStorage.setItem("ks_player_name", name)
      }
    } catch (err) {
      console.error("Error submitting score:", err)
    } finally {
      setSubmitting(false)
    }
  }

  // Draw Pixel Footballer
  const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isDucking: boolean,
    frame: number
  ) => {
    ctx.save()
    ctx.translate(x, y)

    const runCycle = Math.floor(frame / 6) % 4
    const legOffset = isDucking ? 0 : Math.sin(frame * 0.3) * 6

    if (isDucking) {
      // Sliding / Ducking Player (Lower profile: 24px height, 44px width)
      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
      ctx.beginPath()
      ctx.ellipse(22, 22, 20, 5, 0, 0, Math.PI * 2)
      ctx.fill()

      // Slide spark particles
      ctx.fillStyle = "#F59E0B"
      for (let i = 0; i < 3; i++) {
        const sx = -5 - Math.random() * 12
        const sy = 18 + Math.random() * 4
        ctx.fillRect(sx, sy, 2, 2)
      }

      // Torso (Sliding KS LIGA Blue Kit)
      ctx.fillStyle = "#007AFF"
      ctx.beginPath()
      ctx.roundRect(8, 6, 26, 12, 4)
      ctx.fill()

      // Gold Stripe
      ctx.fillStyle = "#FBBF24"
      ctx.fillRect(8, 11, 26, 3)

      // Head / Helmet with Gold Headband
      ctx.fillStyle = "#FCD34D" // Skin
      ctx.beginPath()
      ctx.arc(38, 10, 6, 0, Math.PI * 2)
      ctx.fill()

      // Hair
      ctx.fillStyle = "#1E293B"
      ctx.beginPath()
      ctx.arc(37, 7, 5, Math.PI, 0)
      ctx.fill()

      // Gold Headband
      ctx.fillStyle = "#F59E0B"
      ctx.fillRect(34, 8, 7, 2)

      // Legs / Cleats stretched out
      ctx.fillStyle = "#1E293B" // Shorts
      ctx.fillRect(0, 10, 10, 8)
      ctx.fillStyle = "#F59E0B" // Boots
      ctx.fillRect(-4, 14, 8, 5)
    } else {
      // Running / Jumping Player (Standard profile: 46px height, 28px width)
      // Dynamic Shadow on Pitch
      const shadowScale = Math.max(0.4, 1 - Math.abs(playerYRef.current) / 120)
      ctx.fillStyle = `rgba(0, 0, 0, ${0.25 * shadowScale})`
      ctx.beginPath()
      ctx.ellipse(14, 46 + playerYRef.current, 14 * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2)
      ctx.fill()

      // Head & Hair
      ctx.fillStyle = "#FCD34D" // Skin tone
      ctx.beginPath()
      ctx.arc(14, 8, 7, 0, Math.PI * 2)
      ctx.fill()

      // Styled Dark Hair
      ctx.fillStyle = "#0F172A"
      ctx.beginPath()
      ctx.arc(13, 5, 6.5, Math.PI * 0.9, Math.PI * 2.1)
      ctx.fill()

      // KS Gold Headband
      ctx.fillStyle = "#F59E0B"
      ctx.fillRect(8, 6, 12, 2.5)

      // Eyes
      ctx.fillStyle = "#0F172A"
      ctx.fillRect(16, 7, 2, 2)

      // KS LIGA Blue Jersey
      ctx.fillStyle = "#007AFF"
      ctx.beginPath()
      ctx.roundRect(6, 15, 16, 16, 4)
      ctx.fill()

      // Gold Chest Badge
      ctx.fillStyle = "#FBBF24"
      ctx.beginPath()
      ctx.arc(14, 21, 2.5, 0, Math.PI * 2)
      ctx.fill()

      // White Number "10" on jersey
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(13, 25, 2, 4)

      // White Shorts
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(7, 30, 14, 7)

      // Left & Right Legs with Animated Stride
      if (playerYRef.current > 0) {
        // Jumping Pose (Legs tucked)
        ctx.fillStyle = "#007AFF" // Socks
        ctx.fillRect(7, 36, 4, 6)
        ctx.fillRect(15, 36, 4, 4)
        ctx.fillStyle = "#F59E0B" // Gold Boots
        ctx.fillRect(6, 41, 6, 4)
        ctx.fillRect(15, 39, 6, 4)
      } else {
        // Running Legs
        ctx.fillStyle = "#007AFF" // Socks
        ctx.fillRect(8 + legOffset * 0.5, 36, 4, 6)
        ctx.fillRect(14 - legOffset * 0.5, 36, 4, 6)

        // Gold Football Boots
        ctx.fillStyle = "#F59E0B"
        ctx.fillRect(7 + legOffset * 0.5, 41, 6, 4)
        ctx.fillRect(13 - legOffset * 0.5, 41, 6, 4)
      }
    }

    ctx.restore()
  }

  // Draw Obstacle (Team Logo Badge / Stadium Hurdle)
  const drawObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle, groundY: number) => {
    ctx.save()

    const posX = obs.x
    const posY = obs.isAir ? groundY - obs.y - obs.height : groundY - obs.height

    // Obstacle Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
    ctx.beginPath()
    ctx.ellipse(posX + obs.width / 2, groundY + 2, obs.width * 0.45, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    if (obs.isAir) {
      // Aerial Flying Referee Whistle / Golden Ball
      ctx.fillStyle = "#FBBF24"
      ctx.beginPath()
      ctx.arc(posX + obs.width / 2, posY + obs.height / 2, obs.width / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#D97706"
      ctx.lineWidth = 2
      ctx.stroke()

      // Football pentagons
      ctx.fillStyle = "#1E293B"
      ctx.beginPath()
      ctx.arc(posX + obs.width / 2, posY + obs.height / 2, obs.width / 4, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Team Badge Obstacle
      const centerX = posX + obs.width / 2
      const centerY = posY + obs.height / 2
      const radius = obs.width / 2

      // Outer Glow & Badge Stand
      ctx.fillStyle = "#FFFFFF"
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = "#007AFF"
      ctx.lineWidth = 3
      ctx.stroke()

      // Try rendering loaded team logo
      if (obs.teamLogo) {
        if (!cachedTeamImagesRef.current.has(obs.teamLogo)) {
          const newImg = new Image()
          newImg.src = obs.teamLogo
          cachedTeamImagesRef.current.set(obs.teamLogo, newImg)
        }

        const img = cachedTeamImagesRef.current.get(obs.teamLogo)
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save()
          ctx.beginPath()
          ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(img, posX + 2, posY + 2, obs.width - 4, obs.height - 4)
          ctx.restore()
        } else {
          // Fallback Team Initials Shield
          ctx.fillStyle = "#2563EB"
          ctx.beginPath()
          ctx.arc(centerX, centerY, radius - 3, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = "#FFFFFF"
          ctx.font = `bold ${Math.max(10, Math.floor(obs.width * 0.35))}px sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          const initials = (obs.teamName || "KS").slice(0, 2).toUpperCase()
          ctx.fillText(initials, centerX, centerY)
        }
      } else {
        // Default Mini Ball
        ctx.fillStyle = "#0F172A"
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius - 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.restore()
  }

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.changedTouches[0]
    const dy = touch.clientY - touchStartRef.current.y
    const dx = touch.clientX - touchStartRef.current.x

    if (Math.abs(dy) > 25 && Math.abs(dy) > Math.abs(dx)) {
      if (dy > 0) {
        // Swipe Down -> Quick Slide!
        setDuck(true)
        setTimeout(() => setDuck(false), 550)
      } else {
        // Swipe Up -> Jump!
        doJump()
      }
    } else {
      // Tap -> Jump!
      doJump()
    }
    touchStartRef.current = null
  }

  // Main 60 FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 640
    let height = 280

    const resizeCanvas = () => {
      if (!canvas || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const isMobile = window.innerWidth < 640
      width = rect.width || (isMobile ? 360 : 640)
      height = isMobile
        ? Math.min(320, Math.max(260, rect.width * 0.75))
        : Math.min(300, Math.max(220, rect.width * 0.42))

      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const gameLoop = () => {
      const isMobile = window.innerWidth < 640
      const groundY = height - (isMobile ? 48 : 42)
      const playerX = isMobile ? 38 : 50

      frameCountRef.current++
      ctx.clearRect(0, 0, width, height)

      // 1. Dynamic Pitch Background (Sky & Stadium Glow)
      const currentScore = scoreRef.current
      const isNight = Math.floor(currentScore / 500) % 2 === 1

      const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY)
      if (isNight) {
        skyGrad.addColorStop(0, "#0F172A")
        skyGrad.addColorStop(1, "#1E293B")
      } else {
        skyGrad.addColorStop(0, "#E0F2FE")
        skyGrad.addColorStop(1, "#BAE6FD")
      }
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, width, groundY)

      // Stadium Floodlights in Background
      ctx.fillStyle = isNight ? "rgba(251, 191, 36, 0.15)" : "rgba(255, 255, 255, 0.4)"
      ctx.beginPath()
      ctx.arc(100, 30, 70, 0, Math.PI * 2)
      ctx.arc(width - 100, 30, 70, 0, Math.PI * 2)
      ctx.fill()

      // 2. Parallax Pitch Grass & Markings
      if (gameStateRef.current === "playing") {
        groundOffsetRef.current = (groundOffsetRef.current + speedRef.current) % 60
      }

      // Grass Area
      const grassGrad = ctx.createLinearGradient(0, groundY, 0, height)
      grassGrad.addColorStop(0, "#15803D")
      grassGrad.addColorStop(1, "#166534")
      ctx.fillStyle = grassGrad
      ctx.fillRect(0, groundY, width, height - groundY)

      // Pitch Main White Line
      ctx.strokeStyle = "#FFFFFF"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, groundY)
      ctx.lineTo(width, groundY)
      ctx.stroke()

      // Moving White Grass Markings
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
      for (let x = -groundOffsetRef.current; x < width + 60; x += 60) {
        ctx.fillRect(x, groundY + 8, 25, 3)
      }

      // 3. Physics & Player Update
      if (gameStateRef.current === "playing") {
        // Gravity & Vertical Movement
        playerYRef.current += playerVYRef.current
        playerVYRef.current -= 0.72 // Gravity force

        if (playerYRef.current <= 0) {
          playerYRef.current = 0
          playerVYRef.current = 0
          isJumpingRef.current = false
        }

        // Score & Speed Curve
        scoreRef.current += 0.15
        const intScore = Math.floor(scoreRef.current)
        setScore(intScore)

        if (intScore > highScoreRef.current) {
          highScoreRef.current = intScore
          setHighScore(intScore)
          localStorage.setItem("ks_dino_highscore", String(intScore))
        }

        // Milestone score chime
        if (intScore > 0 && intScore % 100 === 0 && Math.floor(scoreRef.current - 0.15) % 100 !== 0) {
          retroAudio.playScore()
        }

        // Accelerate gradually
        speedRef.current = 6 + Math.min(intScore * 0.006, 7)

        // 4. Obstacles Spawner
        nextSpawnDistanceRef.current -= speedRef.current
        if (nextSpawnDistanceRef.current <= 0) {
          // Select random team logo
          const eligibleTeams = teams.filter((t) => t.logo)
          const randomTeam = eligibleTeams.length > 0
            ? eligibleTeams[Math.floor(Math.random() * eligibleTeams.length)]
            : { name: "KS Team", logo: undefined }

          const isAir = Math.random() > 0.7 && intScore > 150
          const obsSize = isAir ? 26 : Math.random() > 0.5 ? 36 : 42

          obstaclesRef.current.push({
            x: width + 20,
            y: isAir ? 30 + Math.random() * 15 : 0,
            width: obsSize,
            height: obsSize,
            teamLogo: randomTeam.logo,
            teamName: randomTeam.name,
            isAir,
          })

          // Next spawn gap
          nextSpawnDistanceRef.current = 180 + Math.random() * 220 + (10 - Math.min(speedRef.current, 10)) * 10
        }

        // 5. Update & Collision Detection
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const obs = obstaclesRef.current[i]
          obs.x -= speedRef.current

          // Hitbox calculation
          const playerH = isDuckingRef.current ? 22 : 44
          const playerW = isDuckingRef.current ? 38 : 24
          const playerActualY = groundY - playerYRef.current - playerH

          const obsY = obs.isAir ? groundY - obs.y - obs.height : groundY - obs.height

          // Circular/Box AABB intersection with fair padding
          const padding = 6
          const pLeft = playerX + padding
          const pRight = playerX + playerW - padding
          const pTop = playerActualY + padding
          const pBottom = playerActualY + playerH

          const oLeft = obs.x + padding
          const oRight = obs.x + obs.width - padding
          const oTop = obsY + padding
          const oBottom = obsY + obs.height

          if (pRight > oLeft && pLeft < oRight && pBottom > oTop && pTop < oBottom) {
            // Collision! GAME OVER!
            retroAudio.playGameOver()
            setGameState("gameover")
            gameStateRef.current = "gameover"
            
            // Auto-save score
            const finalScore = Math.floor(scoreRef.current)
            const pName = localPlayerNameRef.current.trim()
            if (pName && finalScore > 0) {
              autoSaveScore(pName, finalScore)
            }
            break
          }

          // Remove off-screen obstacles
          if (obs.x + obs.width < -20) {
            obstaclesRef.current.splice(i, 1)
          }
        }
      }

      // Draw all obstacles
      obstaclesRef.current.forEach((obs) => drawObstacle(ctx, obs, groundY))

      // Draw Player
      const pDrawY = groundY - playerYRef.current - (isDuckingRef.current ? 24 : 46)
      drawPlayer(ctx, playerX, pDrawY, isDuckingRef.current, frameCountRef.current)

      reqIdRef.current = requestAnimationFrame(gameLoop)
    }

    reqIdRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [teams])

  return (
    <div className="space-y-4">
      {/* Game Stage Container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-3xl bg-slate-900 border-2 border-blue-500/30 shadow-2xl select-none touch-none aspect-[4/3] sm:aspect-[16/8] min-h-[260px] sm:min-h-[240px] max-h-[360px]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={doJump}
      >
        <canvas ref={canvasRef} className="w-full h-full block cursor-pointer" />

        {/* Top HUD Display */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          {/* Player & Sound */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleToggleMute()
              }}
              className="p-2 rounded-xl bg-slate-950/60 backdrop-blur-md text-white border border-white/10 hover:bg-slate-900 shadow-md transition-all active:scale-95"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </button>
            <div className="px-3 py-1 rounded-xl bg-slate-950/60 backdrop-blur-md text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="truncate max-w-[120px]">{localPlayerName || "Гравець"}</span>
            </div>
          </div>

          {/* Live Score Counter */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-slate-950/70 backdrop-blur-md border border-white/10 text-right shadow-md">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Рекорд: {highScore}</div>
              <div className="text-base sm:text-lg font-black text-amber-400 font-mono tracking-widest leading-none">
                {String(score).padStart(5, "0")}
              </div>
            </div>
          </div>
        </div>

        {/* Idle Overlay */}
        {gameState === "idle" && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-amber-400 p-0.5 shadow-lg shadow-blue-500/30 mb-3 flex items-center justify-center animate-bounce">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Play className="h-6 w-6 text-amber-400 fill-amber-400 ml-0.5" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">KS Dino Runner</h3>
            <p className="text-xs text-slate-300 max-w-xs mt-1 mb-4">
              Перестрибуйте емблеми команд-суперників! Натисніть пробіл або тапніть по екрану.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                startGame()
              }}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-amber-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Грати зараз
            </button>
          </div>
        )}

        {/* Game Over Modal Overlay */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center z-20">
            <div className="bg-white/10 border border-white/20 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="h-6 w-6 text-amber-400" />
                <h4 className="text-base sm:text-lg font-black text-white">Фінальний свисток!</h4>
              </div>

              <div className="bg-slate-950/80 rounded-2xl p-3 border border-white/10 flex items-center justify-around">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Очки</div>
                  <div className="text-xl font-black text-white font-mono">{score}</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Ваш Рекорд</div>
                  <div className="text-xl font-black text-amber-400 font-mono">{highScore}</div>
                </div>
              </div>

              {/* Submit to Leaderboard */}
              {score > 0 && (
                <div className="space-y-2">
                  {!localPlayerName ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRequestName?.()
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-98"
                    >
                      Введіть ім'я, щоб зберегти рекорд
                    </button>
                  ) : scoreSubmitted ? (
                    <div className="py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                      Рекорд внесено в Зал Слави!
                    </div>
                  ) : submitting ? (
                    <div className="py-2 px-3 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5">
                      <Send className="h-4 w-4 text-blue-400 animate-pulse" />
                      Збереження...
                    </div>
                  ) : (
                    <div className="py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                      Рекорд внесено в Зал Слави!
                    </div>
                  )}
                </div>
              )}

              {/* Play Again */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  startGame()
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg hover:scale-102 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Спробувати ще раз
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile On-Screen Action Controls Bar */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <button
          type="button"
          onTouchStart={(e) => { e.preventDefault(); doJump(); }}
          onMouseDown={() => doJump()}
          className="py-3.5 px-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white font-extrabold text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
        >
          <ChevronUp className="h-5 w-5" />
          <span>СТРИБОК (Jump)</span>
        </button>

        <button
          type="button"
          onTouchStart={(e) => { e.preventDefault(); setDuck(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setDuck(false); }}
          onMouseDown={() => setDuck(true)}
          onMouseUp={() => setDuck(false)}
          className="py-3.5 px-4 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-extrabold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
        >
          <ChevronDown className="h-5 w-5" />
          <span>ПІДКАТ (Slide)</span>
        </button>
      </div>
    </div>
  )
}
