// Web Audio API 8-Bit Retro Sound Synthesizer (0 bytes external files)

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

class RetroAudioEngine {
  private ctx: AudioContext | null = null
  private _isMuted = false

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ks_games_muted")
      this._isMuted = saved === "true"
    }
  }

  private initCtx() {
    if (typeof window === "undefined") return null
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext
      if (AudioContextClass) {
        this.ctx = new AudioContextClass()
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume()
    }
    return this.ctx
  }

  get isMuted(): boolean {
    return this._isMuted
  }

  setMuted(muted: boolean) {
    this._isMuted = muted
    if (typeof window !== "undefined") {
      localStorage.setItem("ks_games_muted", String(muted))
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this._isMuted)
    return this._isMuted
  }

  // 8-bit Jump Sound (rising frequency sweep)
  playJump() {
    if (this._isMuted) return
    const ctx = this.initCtx()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "square"
      osc.frequency.setValueAtTime(150, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15)

      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    } catch {
      // Audio autoplay restrictions safeguard
    }
  }

  // 8-bit Slide/Duck Sound
  playSlide() {
    if (this._isMuted) return
    const ctx = this.initCtx()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "triangle"
      osc.frequency.setValueAtTime(300, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12)

      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.12)
    } catch {}
  }

  // 8-bit Score Chime (Coin / Food pickup)
  playScore() {
    if (this._isMuted) return
    const ctx = this.initCtx()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.setValueAtTime(659.25, now + 0.06) // E5
      osc.frequency.setValueAtTime(783.99, now + 0.12) // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.18) // C6

      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.28)
    } catch {}
  }

  // Golden Trophy Super Bonus
  playBonus() {
    if (this._isMuted) return
    const ctx = this.initCtx()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const freqs = [587.33, 739.99, 880.0, 1174.66, 1479.98]
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = "triangle"
        osc.frequency.setValueAtTime(f, now + idx * 0.05)

        gain.gain.setValueAtTime(0.12, now + idx * 0.05)
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.2)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + idx * 0.05)
        osc.stop(now + idx * 0.05 + 0.2)
      })
    } catch {}
  }

  // Snake move subtle tick
  playMove() {
    if (this._isMuted) return
    const ctx = this.initCtx()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "triangle"
      osc.frequency.setValueAtTime(80, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.03)

      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.03)
    } catch {}
  }

  // Game Over Sound (descending 8-bit crash)
  playGameOver() {
    if (this._isMuted) return
    const ctx = this.initCtx()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sawtooth"
      osc.frequency.setValueAtTime(400, now)
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.45)

      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.45)
    } catch {}
  }
}

export const retroAudio = new RetroAudioEngine()
