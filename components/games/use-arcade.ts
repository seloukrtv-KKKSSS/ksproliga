"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  act,
  advance,
  createRunner,
  createSnake,
  dailySeed,
  STEP,
  type ArcadeState,
  type GameAction,
  type GameKind,
  type GameMode,
} from "@/lib/games/arcade-engine"
import { ArcadeRenderer, KITS } from "@/lib/games/arcade-renderer"
import { retroAudio } from "@/lib/retro-audio"

export type Phase = "idle" | "playing" | "paused" | "over"
export type RunConfig = { mode: GameMode; day: string; kit: number }
export type RunResult = {
  score: number
  collected: number
  elapsed: number
  special: number
  won: boolean
  config: RunConfig
}
export type Snapshot = {
  phase: Phase
  score: number
  collected: number
  combo: number
  energy: number
  special: string
  level: number
}
const initial: Snapshot = {
  phase: "idle",
  score: 0,
  collected: 0,
  combo: 0,
  energy: 0,
  special: "",
  level: 1,
}

export function useArcade(
  kind: GameKind,
  config: RunConfig,
  onEnd: (result: RunResult) => void,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [snapshot, setSnapshot] = useState<Snapshot>(initial)
  const latest = useRef({ config, onEnd })
  const controls = useRef<{
    start: () => void
    pause: () => void
    act: (action: GameAction) => void
    repaint: () => void
  } | null>(null)
  useEffect(() => {
    latest.current = { config, onEnd }
    controls.current?.repaint()
  }, [config, onEnd])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { alpha: false })
    if (!canvas || !ctx) return
    let simulation: ArcadeState =
      kind === "dino" ? createRunner(1) : createSnake(1)
    let renderer = new ArcadeRenderer(kind)
    let phase: Phase = "idle"
    let runConfig = latest.current.config
    let frame = 0,
      last = 0,
      accumulator = 0,
      lastHud = 0
    let scale = 1
    let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const logicalWidth = kind === "dino" ? 640 : 480
    const logicalHeight = kind === "dino" ? 360 : 480
    const draw = (dt = 0) => {
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      renderer.draw(
        ctx,
        simulation,
        phase === "idle" ? latest.current.config.kit : runConfig.kit,
        dt,
        reduced,
        phase === "idle",
      )
    }
    const publish = () =>
      setSnapshot({
        phase,
        score: simulation.score,
        collected: simulation.collected,
        combo: simulation.combo,
        energy:
          simulation.kind === "dino"
            ? simulation.rush > 0
              ? simulation.rush / 6
              : simulation.charge / 6
            : simulation.golden
              ? simulation.goldenTime / 8
              : (simulation.collected % 4) / 4,
        special:
          simulation.kind === "dino"
            ? simulation.rush > 0
              ? "TURBO ×2 · ЗАХИСТ"
              : `${simulation.charge}/6 ДО TURBO`
            : simulation.golden
              ? `ЗОЛОТИЙ М’ЯЧ · ${Math.ceil(simulation.goldenTime)}с`
              : `${simulation.collected % 4}/4 ДО ЗОЛОТОГО М’ЯЧА`,
        level:
          1 +
          Math.floor(
            simulation.kind === "dino"
              ? simulation.elapsed / 20
              : simulation.collected / 5,
          ),
      })
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
      last = 0
      accumulator = 0
    }
    const loop = (now: number) => {
      if (phase !== "playing") return
      const elapsed = last ? (now - last) / 1000 : 0
      last = now
      // Pause after a long stall instead of silently advancing into a hazard.
      if (elapsed > 0.25) {
        phase = "paused"
        stop()
        publish()
        return
      }
      accumulator += Math.min(elapsed, 0.1)
      while (accumulator >= STEP && !simulation.over) {
        advance(simulation)
        accumulator -= STEP
      }
      for (const event of simulation.events) {
        renderer.event(event, kind, KITS[runConfig.kit] ?? KITS[0], reduced)
        if (event.type === "jump") retroAudio.playJump()
        else if (event.type === "pickup") retroAudio.playScore()
        else if (event.type === "bonus" || event.type === "portal")
          retroAudio.playBonus()
        else if (event.type === "crash") retroAudio.playGameOver()
      }
      simulation.events = []
      draw(elapsed)
      if (simulation.over) {
        phase = "over"
        stop()
        publish()
        latest.current.onEnd({
          score: simulation.score,
          collected: simulation.collected,
          elapsed: simulation.elapsed,
          special:
            simulation.kind === "dino" ? simulation.dodged : simulation.portals,
          won: simulation.won,
          config: runConfig,
        })
        return
      }
      if (now - lastHud >= 100) {
        publish()
        lastHud = now
      }
      frame = requestAnimationFrame(loop)
    }
    const pause = () => {
      if (phase === "playing") {
        phase = "paused"
        act(simulation, "release")
        stop()
        publish()
        draw()
      } else if (phase === "paused") {
        phase = "playing"
        publish()
        frame = requestAnimationFrame(loop)
      }
    }
    const start = () => {
      stop()
      runConfig = { ...latest.current.config }
      const seed =
        runConfig.mode === "daily"
          ? dailySeed(runConfig.day, kind)
          : crypto.getRandomValues(new Uint32Array(1))[0]
      simulation = kind === "dino" ? createRunner(seed) : createSnake(seed)
      renderer = new ArcadeRenderer(kind)
      phase = "playing"
      lastHud = 0
      retroAudio.unlock()
      publish()
      draw()
      frame = requestAnimationFrame(loop)
    }
    const resize = () => {
      // Cap backing-store resolution and cache the stadium; no per-frame DOM measurement.
      scale =
        Math.min(window.devicePixelRatio || 1, 2) *
        Math.min(1.5, (canvas.clientWidth || logicalWidth) / logicalWidth)
      canvas.width = Math.round(logicalWidth * scale)
      canvas.height = Math.round(logicalHeight * scale)
      draw()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    const autoPause = () => {
      if (phase === "playing") pause()
    }
    const visibility = () => {
      if (document.hidden) autoPause()
    }
    const intersection = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) autoPause()
      },
      { threshold: 0 },
    )
    intersection.observe(canvas)
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const motionChanged = () => {
      reduced = motion.matches
      draw()
    }
    motion.addEventListener("change", motionChanged)
    window.addEventListener("blur", autoPause)
    document.addEventListener("visibilitychange", visibility)
    controls.current = {
      start,
      pause,
      act: (action) => {
        if (phase === "playing") act(simulation, action)
      },
      repaint: () => {
        if (phase === "idle") draw()
      },
    }
    resize()
    return () => {
      stop()
      observer.disconnect()
      intersection.disconnect()
      motion.removeEventListener("change", motionChanged)
      window.removeEventListener("blur", autoPause)
      document.removeEventListener("visibilitychange", visibility)
      controls.current = null
    }
  }, [kind])

  const start = useCallback(() => controls.current?.start(), [])
  const pause = useCallback(() => controls.current?.pause(), [])
  const action = useCallback(
    (value: GameAction) => controls.current?.act(value),
    [],
  )
  return { canvasRef, snapshot, start, pause, action }
}
