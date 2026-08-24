"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Play, RotateCcw, Volume2, VolumeX, Trophy, ChevronUp, ChevronDown, Sparkles, Send, Maximize2, Minimize2 } from "lucide-react"
import { retroAudio } from "@/lib/retro-audio"
import { saveGameScore } from "@/lib/database"
import type { Team } from "@/lib/supabase"

interface KsDinoRunnerProps {
  teams: Team[]
  playerName: string
  onScoreSubmitted?: (scoreId: number) => void
  onRequestName?: () => void
  onViewLeaderboard?: () => void
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
  onViewLeaderboard,
}: KsDinoRunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle")
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localPlayerName, setLocalPlayerName] = useState(playerName || "")

  // Game Engine Refs
  const reqIdRef = useRef<number | null>(null)
  const submittingRef = useRef(false)
  const gameStateRef = useRef<"idle" | "playing" | "gameover">("idle")
  const scoreRef = useRef(0)
  const highScoreRef = useRef(0)
  const startBaselineScoreRef = useRef(0)
  const lastSavedScoreRef = useRef(0)
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

  // Keep state refs in sync
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  useEffect(() => {
    localPlayerNameRef.current = playerName || ""
    const updateId = window.setTimeout(() => setLocalPlayerName(playerName), 0)
    return () => window.clearTimeout(updateId)
  }, [playerName])

  useEffect(() => {
    const savedHi = localStorage.getItem("ks_dino_highscore")
    const parsed = savedHi ? parseInt(savedHi, 10) || 0 : 0
    highScoreRef.current = parsed
    lastSavedScoreRef.current = parsed
    const initializeId = window.setTimeout(() => {
      setIsMuted(retroAudio.isMuted)
      setHighScore(parsed)
    }, 0)
    return () => window.clearTimeout(initializeId)
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

  const triggerHaptic = (type: "jump" | "slide" | "bonus" | "gameover") => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        if (type === "jump") navigator.vibrate(25)
        else if (type === "slide") navigator.vibrate(20)
        else if (type === "bonus") navigator.vibrate([30, 40, 30])
        else if (type === "gameover") navigator.vibrate([60, 40, 80])
      } catch {
        // ignore
      }
    }
  }

  // Jump Action (Only triggers jump while playing)
  const doJump = useCallback(() => {
    if (gameStateRef.current === "playing") {
      if (playerYRef.current === 0 && !isDuckingRef.current) {
        playerVYRef.current = 14.2 // Jump force
        isJumpingRef.current = true
        retroAudio.playJump()
        triggerHaptic("jump")
      }
    }
  }, [])

  // Duck Action
  const setDuck = useCallback((ducking: boolean) => {
    if (gameStateRef.current !== "playing") return
    if (ducking && !isDuckingRef.current && playerYRef.current === 0) {
      retroAudio.playSlide()
      triggerHaptic("slide")
    }
    isDuckingRef.current = ducking
    if (ducking && playerYRef.current > 0) {
      playerVYRef.current = -16 // Fast fall / dive
    }
  }, [])

  // Start / Restart Game
  const startGame = useCallback(() => {
    scoreRef.current = 0
    startBaselineScoreRef.current = highScoreRef.current
    speedRef.current = 4.2
    playerYRef.current = 0
    playerVYRef.current = 0
    isJumpingRef.current = false
    isDuckingRef.current = false
    obstaclesRef.current = []
    nextSpawnDistanceRef.current = 100
    groundOffsetRef.current = 0
    frameCountRef.current = 0

    setScore(0)
    setIsNewRecord(false)
    setGameState("playing")
    gameStateRef.current = "playing"
  }, [])

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault()
        if (gameStateRef.current === "idle" || gameStateRef.current === "gameover") {
          startGame()
        } else {
          doJump()
        }
      } else if (["ArrowDown", "KeyS"].includes(e.code)) {
        e.preventDefault()
        setDuck(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
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
  }, [doJump, setDuck, startGame])

  // Optimized Auto-save High Score
  const autoSaveScore = useCallback(async (name: string, finalScore: number) => {
    if (finalScore <= 0 || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const saved = await saveGameScore(name, "dino", finalScore)
      if (saved) {
        lastSavedScoreRef.current = Math.max(lastSavedScoreRef.current, saved.score)
        onScoreSubmitted?.(saved.id)
        localStorage.setItem("ks_player_name", name)
      }
    } catch (err) {
      console.error("Error submitting score:", err)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }, [onScoreSubmitted])

  // Draw Pixel Footballer in Black Jersey with "KS TV" Flag
  const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isDucking: boolean,
    frame: number
  ) => {
    ctx.save()
    ctx.translate(x, y)

    const legOffset = isDucking ? 0 : Math.sin(frame * 0.3) * 6
    const flagWave = Math.sin(frame * 0.35) * 2.5
    const flagWaveEnd = Math.sin(frame * 0.35 + 1.2) * 3.5

    if (isDucking) {
      // Sliding / Ducking Player with low-profile flag
      // 1. Dynamic Slide Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
      ctx.beginPath()
      ctx.ellipse(22, 22, 24, 5, 0, 0, Math.PI * 2)
      ctx.fill()

      // 2. Slide friction sparks
      ctx.fillStyle = "#F59E0B"
      for (let i = 0; i < 3; i++) {
        const sx = -5 - Math.random() * 12
        const sy = 18 + Math.random() * 4
        ctx.fillRect(sx, sy, 2.5, 2.5)
      }

      // 3. Sliding Flagpole & "KS TV" Flag (tilted back low)
      const poleBaseX = 14
      const poleBaseY = 12
      const poleTipX = -10
      const poleTipY = -4

      // Flagpole
      ctx.strokeStyle = "#CBD5E1"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(poleBaseX, poleBaseY)
      ctx.lineTo(poleTipX, poleTipY)
      ctx.stroke()

      // Pole Golden Finial
      ctx.fillStyle = "#F59E0B"
      ctx.beginPath()
      ctx.arc(poleTipX, poleTipY, 2, 0, Math.PI * 2)
      ctx.fill()

      // Flag Cloth
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(poleTipX, poleTipY)
      ctx.quadraticCurveTo(poleTipX - 14, poleTipY - 2 + flagWave, poleTipX - 30, poleTipY + flagWaveEnd)
      ctx.lineTo(poleTipX - 30, poleTipY + 12 + flagWaveEnd)
      ctx.quadraticCurveTo(poleTipX - 14, poleTipY + 10 + flagWave, poleBaseX - 18, poleBaseY - 2)
      ctx.lineTo(poleTipX, poleTipY + 8)
      ctx.closePath()
      ctx.fillStyle = "#FBBF24" // Bright golden flag
      ctx.fill()
      ctx.strokeStyle = "#0F172A"
      ctx.lineWidth = 1
      ctx.stroke()

      // "KS TV" Text on sliding flag
      ctx.translate(poleTipX - 15, poleTipY + 6 + flagWave * 0.7)
      ctx.fillStyle = "#0F172A"
      ctx.font = "900 7px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("KS TV", 0, 0)
      ctx.restore()

      // 4. Sliding Torso / Black Jersey (Чорна майка)
      ctx.fillStyle = "#0F172A" // Deep Black Kit
      ctx.beginPath()
      ctx.roundRect(10, 8, 26, 12, 4)
      ctx.fill()

      // Gold Trim & Number 7
      ctx.fillStyle = "#F59E0B"
      ctx.fillRect(10, 8, 2, 12)
      ctx.fillStyle = "#FBBF24"
      ctx.font = "bold 9px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("7", 22, 17)

      // Arms / Skin tone
      ctx.fillStyle = "#FCD34D"
      ctx.beginPath()
      ctx.arc(28, 14, 3.5, 0, Math.PI * 2)
      ctx.fill()

      // Head & Hair
      ctx.fillStyle = "#1E293B" // Dark athletic hair
      ctx.beginPath()
      ctx.arc(36, 9, 7, 0, Math.PI * 2)
      ctx.fill()

      // Face
      ctx.fillStyle = "#FCD34D"
      ctx.beginPath()
      ctx.arc(37, 11, 5, 0, Math.PI * 2)
      ctx.fill()

      // Sliding Shorts & Legs
      ctx.fillStyle = "#FFFFFF"
      ctx.beginPath()
      ctx.roundRect(0, 12, 14, 8, 3)
      ctx.fill()

      // Boots
      ctx.fillStyle = "#0F172A"
      ctx.fillRect(-2, 16, 8, 5)
    } else {
      // Standard Running Player (44px height, 26px width)
      // 1. Dynamic Pitch Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)"
      ctx.beginPath()
      ctx.ellipse(13, 44, 13, 4, 0, 0, Math.PI * 2)
      ctx.fill()

      // 2. Flagpole & Fluttering "KS TV" Flag (Carried by footballer)
      const poleHandX = 10
      const poleHandY = 22
      const poleTopX = -4
      const poleTopY = -12

      // Silver Flagpole
      ctx.strokeStyle = "#CBD5E1"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(poleHandX, poleHandY)
      ctx.lineTo(poleTopX, poleTopY)
      ctx.stroke()

      // Golden Tip / Spearhead
      ctx.fillStyle = "#F59E0B"
      ctx.beginPath()
      ctx.arc(poleTopX, poleTopY, 2.5, 0, Math.PI * 2)
      ctx.fill()

      // Fluttering Flag Cloth in Running Wind
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(poleTopX, poleTopY)
      ctx.quadraticCurveTo(poleTopX - 16, poleTopY - 2 + flagWave, poleTopX - 34, poleTopY + flagWaveEnd)
      ctx.lineTo(poleTopX - 34, poleTopY + 14 + flagWaveEnd)
      ctx.quadraticCurveTo(poleTopX - 16, poleTopY + 12 + flagWave, poleTopX, poleTopY + 14)
      ctx.closePath()

      // Golden Yellow Flag Background
      ctx.fillStyle = "#FBBF24"
      ctx.fill()
      ctx.strokeStyle = "#0F172A"
      ctx.lineWidth = 1.2
      ctx.stroke()

      // Red LIVE / TV Indicator Dot
      ctx.fillStyle = "#EF4444"
      ctx.beginPath()
      ctx.arc(poleTopX - 6, poleTopY + 7 + flagWave * 0.6, 1.8, 0, Math.PI * 2)
      ctx.fill()

      // "KS TV" Bold Text
      ctx.translate(poleTopX - 19, poleTopY + 7 + flagWave * 0.7)
      ctx.fillStyle = "#0F172A"
      ctx.font = "900 8px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("KS TV", 0, 0)
      ctx.restore()

      // 3. Head & Dark Athletic Hair
      ctx.fillStyle = "#1E293B"
      ctx.beginPath()
      ctx.arc(13, 8, 7, 0, Math.PI * 2)
      ctx.fill()

      // Face
      ctx.fillStyle = "#FCD34D"
      ctx.beginPath()
      ctx.arc(14, 9, 5, 0, Math.PI * 2)
      ctx.fill()

      // Eye
      ctx.fillStyle = "#0F172A"
      ctx.fillRect(16, 7, 2, 2)

      // 4. Black Jersey (Чорна майка)
      ctx.fillStyle = "#0F172A" // Deep Black Tank Top
      ctx.beginPath()
      ctx.roundRect(5, 14, 16, 15, 4)
      ctx.fill()

      // Gold Trim on Neck & Arms
      ctx.fillStyle = "#F59E0B"
      ctx.fillRect(6, 14, 14, 1.5)

      // Gold Jersey Number "7"
      ctx.fillStyle = "#FBBF24"
      ctx.font = "bold 9px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("7", 13, 25)

      // 5. Athletic Arms (Майка / Sleeveless)
      ctx.fillStyle = "#FCD34D"
      // Left arm (holding flag)
      ctx.fillRect(8, 17, 4, 6)
      // Right arm (running swing)
      ctx.fillRect(18, 16, 4, 8)
      ctx.fillRect(18, 23, 4, 4)

      // Mini Soccer Ball under arm
      ctx.fillStyle = "#FFFFFF"
      ctx.beginPath()
      ctx.arc(21, 25, 3.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#0F172A"
      ctx.beginPath()
      ctx.arc(21, 25, 1.5, 0, Math.PI * 2)
      ctx.fill()

      // 6. Shorts (White with dark stripe)
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(5, 28, 16, 7)
      ctx.fillStyle = "#0F172A"
      ctx.fillRect(12, 28, 2, 7)

      // 7. Left Leg (Animated Running Cycle)
      ctx.fillStyle = "#FCD34D"
      ctx.fillRect(6, 35, 5, 6 + legOffset)
      ctx.fillStyle = "#0F172A" // Boot
      ctx.fillRect(6, 40 + legOffset, 7, 4)
      ctx.fillStyle = "#F59E0B" // Gold studs
      ctx.fillRect(8, 43 + legOffset, 3, 1)

      // 8. Right Leg (Animated Inverse)
      ctx.fillStyle = "#FCD34D"
      ctx.fillRect(15, 35, 5, 6 - legOffset)
      ctx.fillStyle = "#0F172A" // Boot
      ctx.fillRect(15, 40 - legOffset, 7, 4)
      ctx.fillStyle = "#F59E0B" // Gold studs
      ctx.fillRect(17, 43 - legOffset, 3, 1)
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

  // Main 60-120 FPS High Refresh Rate Delta-Time Game Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 640
    let height = 300
    let lastTime = performance.now()

    const resizeCanvas = () => {
      if (!canvas || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width || 640
      height = rect.height || 300

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.resetTransform?.()
      ctx.scale(dpr, dpr)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const gameLoop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      const timeScale = dt * 60 // normalized to 60 FPS

      const isMobile = width < 640
      const groundY = height - (height > 420 ? 80 : isMobile ? 50 : 44)
      const playerX = isFullscreen ? Math.max(65, Math.round(width * 0.14)) : isMobile ? 48 : Math.max(65, Math.round(width * 0.12))

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
      ctx.arc(Math.min(100, width * 0.15), 30, 70, 0, Math.PI * 2)
      ctx.arc(Math.max(width - 100, width * 0.85), 30, 70, 0, Math.PI * 2)
      ctx.fill()

      // 2. Parallax Pitch Grass & Markings
      if (gameStateRef.current === "playing") {
        groundOffsetRef.current = (groundOffsetRef.current + speedRef.current * timeScale) % 60
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
        // Gravity & Vertical Movement with Delta Time
        playerYRef.current += playerVYRef.current * timeScale
        playerVYRef.current -= 0.72 * timeScale // Gravity force

        if (playerYRef.current <= 0) {
          playerYRef.current = 0
          playerVYRef.current = 0
          isJumpingRef.current = false
        }

        // Score & Speed Curve - Extra long calm easy start (up to 300 points)
        scoreRef.current += 0.15 * timeScale
        const intScore = Math.floor(scoreRef.current)
        setScore(intScore)

        if (intScore > highScoreRef.current) {
          highScoreRef.current = intScore
          setHighScore(intScore)
          localStorage.setItem("ks_dino_highscore", String(intScore))
        }

        // Milestone score chime
        if (intScore > 0 && intScore % 100 === 0 && Math.floor(scoreRef.current - 0.15 * timeScale) % 100 !== 0) {
          retroAudio.playScore()
          triggerHaptic("bonus")
        }

        // Progressive acceleration: starts at 4.2, very gentle for first 300 pts, max 11.5
        const speedBoost = intScore < 300 ? intScore * 0.0033 : 1.0 + (intScore - 300) * 0.007
        speedRef.current = 4.2 + Math.min(speedBoost, 7.3)

        // 4. Obstacles Spawner with progressive scaling
        nextSpawnDistanceRef.current -= speedRef.current * timeScale
        if (nextSpawnDistanceRef.current <= 0) {
          // Select random team logo
          const eligibleTeams = teams.filter((t) => t.logo)
          const randomTeam = eligibleTeams.length > 0
            ? eligibleTeams[Math.floor(Math.random() * eligibleTeams.length)]
            : { name: "KS Team", logo: undefined }

          // Flying air obstacles only appear after 400 points!
          const canAir = intScore >= 400
          const isAir = canAir && Math.random() < Math.min(0.15 + (intScore - 400) * 0.0006, 0.40)
          const obsSize = isAir
            ? 26
            : intScore < 300
            ? 28
            : intScore < 600
            ? (Math.random() > 0.5 ? 36 : 30)
            : (Math.random() > 0.4 ? 42 : 36)

          obstaclesRef.current.push({
            x: width + 20,
            y: isAir ? 30 + Math.random() * 10 : 0,
            width: obsSize,
            height: obsSize,
            teamLogo: randomTeam.logo,
            teamName: randomTeam.name,
            isAir,
          })

          // Spacing between obstacles: generous 320-460px in early game, tightens gradually
          const baseGap = intScore < 300 ? 320 : intScore < 600 ? 230 : 170
          const randomExtra = intScore < 300 ? 140 : intScore < 600 ? 160 : 190
          nextSpawnDistanceRef.current = baseGap + Math.random() * randomExtra
        }

        // 5. Update & Collision Detection
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const obs = obstaclesRef.current[i]
          obs.x -= speedRef.current * timeScale

          // Hitbox calculation with forgiving early padding
          const playerH = isDuckingRef.current ? 22 : 44
          const playerW = isDuckingRef.current ? 38 : 24
          const playerActualY = groundY - playerYRef.current - playerH

          const obsY = obs.isAir ? groundY - obs.y - obs.height : groundY - obs.height

          // Circular/Box AABB intersection with progressive padding
          const padding = intScore < 300 ? 9 : intScore < 600 ? 7 : 6
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
            triggerHaptic("gameover")
            setGameState("gameover")
            gameStateRef.current = "gameover"

            const finalScore = Math.floor(scoreRef.current)
            const pName = localPlayerNameRef.current.trim()

            // True record beat check against the score when THIS round started
            const didBeatRecord = startBaselineScoreRef.current > 0
              ? finalScore > startBaselineScoreRef.current
              : finalScore > 0

            setIsNewRecord(didBeatRecord)

            if (didBeatRecord) {
              highScoreRef.current = finalScore
              setHighScore(finalScore)
              localStorage.setItem("ks_dino_highscore", String(finalScore))
            }

            // Auto-save to Supabase if player name is present and beats DB record
            if (pName && finalScore > 0 && finalScore > lastSavedScoreRef.current) {
              autoSaveScore(pName, finalScore)
            }
            break
          }

          // Remove off-screen obstacles
          if (obs.x + obs.width < -40) {
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
  }, [autoSaveScore, teams, isFullscreen])

  return (
    <div className="space-y-4 w-full max-w-3xl mx-auto flex flex-col items-center">
      {/* Game Stage Container */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-3xl bg-slate-900 border-2 border-blue-500/30 shadow-2xl select-none touch-none aspect-[4/3] sm:aspect-[16/8] min-h-[260px] sm:min-h-[260px] max-h-[380px] w-full mx-auto ${
          isFullscreen ? "fixed inset-0 z-50 rounded-none w-screen h-screen max-h-none border-none" : ""
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas 
          ref={canvasRef} 
          className="w-full h-full block cursor-pointer"
          onClick={() => {
            if (gameStateRef.current === "playing") doJump()
          }}
        />

        {/* Top HUD Display */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          {/* Player & Controls */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleToggleMute()
              }}
              title={isMuted ? "Увімкнути звук" : "Вимкнути звук"}
              className="p-2 rounded-xl bg-slate-950/60 backdrop-blur-md text-white border border-white/10 hover:bg-slate-900 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </button>

            {/* Fullscreen only on Desktop */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleToggleFullscreen()
              }}
              title={isFullscreen ? "Вийти з повного екрану" : "На повний екран"}
              className="hidden sm:flex p-2 rounded-xl bg-slate-950/60 backdrop-blur-md text-white border border-white/10 hover:bg-slate-900 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4 text-amber-400" /> : <Maximize2 className="h-4 w-4 text-slate-300" />}
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
          <div 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20"
          >
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-amber-400 p-0.5 shadow-xl shadow-blue-500/40 mb-3.5 flex items-center justify-center animate-bounce">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                <Play className="h-7 w-7 text-amber-400 fill-amber-400 ml-0.5" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">KS Dino Runner</h3>
            <p className="text-xs text-slate-300 max-w-sm mt-1.5 mb-5 font-medium leading-relaxed">
              Перестрибуйте емблеми команд-суперників! Натисніть пробіл або тапніть по екрану.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  startGame()
                }}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-amber-500 hover:from-blue-500 hover:to-amber-400 text-white font-black text-sm shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Грати зараз</span>
              </button>

              {/* Fullscreen only on Desktop */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleFullscreen()
                }}
                className="hidden sm:inline-flex px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer items-center gap-2"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4 text-amber-400" /> : <Maximize2 className="h-4 w-4 text-slate-300" />}
                <span>{isFullscreen ? "Звичайний екран" : "На весь екран"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Game Over Modal Overlay */}
        {gameState === "gameover" && (
          <div 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center z-20"
          >
            <div className="bg-white/10 border border-white/20 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl backdrop-blur-xl space-y-3.5">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="h-6 w-6 text-amber-400" />
                <h4 className="text-base sm:text-lg font-black text-white">Фінальний свисток!</h4>
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
                  <div className="text-2xl font-black text-white font-mono">{score}</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Ваш Рекорд</div>
                  <div className="text-2xl font-black text-amber-400 font-mono">{highScore}</div>
                </div>
              </div>

              {/* Hall of Fame Status */}
              <div className="text-center">
                {!localPlayerName ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRequestName?.()
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-98"
                  >
                    Введіть ім'я, щоб зберегти рекорд
                  </button>
                ) : submitting ? (
                  <div className="py-1.5 px-3 rounded-xl bg-blue-500/20 text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                    Збереження рекорду в Зал Слави...
                  </div>
                ) : isNewRecord && score > 0 ? (
                  <div className="py-1.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    Новий рекорд внесено в Зал Слави!
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
                onClick={(e) => {
                  e.stopPropagation()
                  startGame()
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-sm transition-all shadow-lg hover:scale-102 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="h-5 w-5" />
                <span>Грати знову (Пробіл / Тап)</span>
              </button>

              {/* View Leaderboard Button */}
              {onViewLeaderboard && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewLeaderboard()
                  }}
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

      {/* Mobile On-Screen Action Controls Bar */}
      <div 
        className="grid grid-cols-2 gap-3 sm:hidden select-none arcade-no-select"
        onContextMenu={(e) => e.preventDefault()}
      >
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault()
            try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch {}
            doJump()
          }}
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none" }}
          className="py-3.5 px-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white font-extrabold text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer select-none arcade-no-select"
        >
          <ChevronUp className="h-5 w-5 pointer-events-none" />
          <span className="pointer-events-none">СТРИБОК (Jump)</span>
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault()
            try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch {}
            setDuck(true)
          }}
          onPointerUp={(e) => {
            e.preventDefault()
            setDuck(false)
          }}
          onPointerCancel={(e) => {
            e.preventDefault()
            setDuck(false)
          }}
          onPointerLeave={() => setDuck(false)}
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: "none", WebkitTouchCallout: "none", userSelect: "none" }}
          className="py-3.5 px-4 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-extrabold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer select-none arcade-no-select"
        >
          <ChevronDown className="h-5 w-5 pointer-events-none" />
          <span className="pointer-events-none">ПІДКАТ (Slide)</span>
        </button>
      </div>
    </div>
  )
}
