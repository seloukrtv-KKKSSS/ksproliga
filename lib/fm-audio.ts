// Self-contained Web Audio API Sound Synthesizer for KSLIGA Football Manager

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

class FMAudioEngine {
  private ctx: AudioContext | null = null
  private _isMuted = false

  constructor() {
    if (typeof window !== "undefined") {
      const savedMute = localStorage.getItem("fm_audio_muted")
      this._isMuted = savedMute === "true"
    }
  }

  private initCtx() {
    if (typeof window === "undefined") return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as AudioWindow).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public get isMuted(): boolean {
    return this._isMuted
  }

  public toggleMute(): boolean {
    this._isMuted = !this._isMuted
    if (typeof window !== "undefined") {
      localStorage.setItem("fm_audio_muted", String(this._isMuted))
    }
    return this._isMuted
  }

  // 1. UI Click
  public playClick() {
    if (this._isMuted) return
    const ctx = this.initCtx()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(480, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.04)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.04)
  }

  // 2. Tactical Swap / Tile Move
  public playTacticalSwap() {
    if (this._isMuted) return
    const ctx = this.initCtx()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "triangle"
    osc.frequency.setValueAtTime(320, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.08)

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.08)
  }

  // 3. Referee Whistle (Double trill)
  public playWhistle() {
    if (this._isMuted) return
    const ctx = this.initCtx()
    if (!ctx) return

    const t = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = "sine"
    osc2.type = "triangle"

    osc1.frequency.setValueAtTime(2400, t)
    osc1.frequency.setValueAtTime(2800, t + 0.08)
    osc1.frequency.setValueAtTime(2400, t + 0.16)
    osc1.frequency.setValueAtTime(2900, t + 0.24)

    osc2.frequency.setValueAtTime(2450, t)
    osc2.frequency.setValueAtTime(2850, t + 0.08)
    osc2.frequency.setValueAtTime(2450, t + 0.16)
    osc2.frequency.setValueAtTime(2950, t + 0.24)

    gain.gain.setValueAtTime(0.18, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(t)
    osc2.start(t)
    osc1.stop(t + 0.38)
    osc2.stop(t + 0.38)
  }

  // 4. Goal Roar & Explosion
  public playGoal() {
    if (this._isMuted) return
    const ctx = this.initCtx()
    if (!ctx) return

    const t = ctx.currentTime

    // Horn/Fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sawtooth"
      osc.frequency.setValueAtTime(freq, t + i * 0.09)

      gain.gain.setValueAtTime(0.12, t + i * 0.09)
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.4)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(t + i * 0.09)
      osc.stop(t + i * 0.09 + 0.4)
    })

    // Sub-bass thump
    const subOsc = ctx.createOscillator()
    const subGain = ctx.createGain()
    subOsc.type = "sine"
    subOsc.frequency.setValueAtTime(140, t)
    subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.45)
    subGain.gain.setValueAtTime(0.3, t)
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)

    subOsc.connect(subGain)
    subGain.connect(ctx.destination)
    subOsc.start(t)
    subOsc.stop(t + 0.5)
  }

  // 5. Card Alert (Yellow / Red)
  public playCardAlert(isRed = false) {
    if (this._isMuted) return
    const ctx = this.initCtx()
    if (!ctx) return

    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = isRed ? "sawtooth" : "triangle"
    osc.frequency.setValueAtTime(isRed ? 180 : 350, t)
    osc.frequency.exponentialRampToValueAtTime(isRed ? 90 : 200, t + 0.25)

    gain.gain.setValueAtTime(0.2, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(t)
    osc.stop(t + 0.28)
  }

  // 6. Cash / Coins Purchase Sound
  public playCoins() {
    if (this._isMuted) return
    const ctx = this.initCtx()
    if (!ctx) return

    const t = ctx.currentTime
    const freqs = [987.77, 1318.51, 1567.98] // B5, E6, G6
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, t + idx * 0.06)

      gain.gain.setValueAtTime(0.14, t + idx * 0.06)
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.2)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(t + idx * 0.06)
      osc.stop(t + idx * 0.06 + 0.2)
    })
  }

  // 7. Level Up / Success Fanfare
  public playLevelUp() {
    if (this._isMuted) return
    const ctx = this.initCtx()
    if (!ctx) return

    const t = ctx.currentTime
    const chord = [440, 554.37, 659.25, 880] // A4, C#5, E5, A5
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "triangle"
      osc.frequency.setValueAtTime(freq, t + idx * 0.08)

      gain.gain.setValueAtTime(0.16, t + idx * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.5)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(t + idx * 0.08)
      osc.stop(t + idx * 0.08 + 0.5)
    })
  }
}

export const fmAudio = new FMAudioEngine()
