/**
 * Web Audio API Sound Synthesizer & Speech Synthesis for KSLIGA: Від Села до УПЛ
 * Zero-latency browser audio synthesis and Ukrainian voice coach
 */

class ProAudio {
  private ctx: AudioContext | null = null
  public isMuted: boolean = false

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ks_pro_audio_muted")
      this.isMuted = saved === "true"
    }
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null
    if (typeof window === "undefined") return null

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume()
    }

    return this.ctx
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    if (typeof window !== "undefined") {
      localStorage.setItem("ks_pro_audio_muted", String(this.isMuted))
      if (this.isMuted && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
    }
    return this.isMuted
  }

  public playClick() {
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(600, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.04)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.04)
  }

  /**
   * Referee Whistle (Dual high pitch frequencies)
   */
  public playWhistle() {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = "triangle"
    osc2.type = "sine"

    osc1.frequency.setValueAtTime(2800, now)
    osc2.frequency.setValueAtTime(2950, now)

    // Trill modulation
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.setValueAtTime(25, now)
    lfoGain.gain.setValueAtTime(80, now)
    lfo.connect(osc1.frequency)
    lfo.connect(osc2.frequency)
    lfo.start(now)
    lfo.stop(now + 0.6)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.linearRampToValueAtTime(0.2, now + 0.2)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.6)
    osc2.stop(now + 0.6)
  }

  /**
   * Bullet-Time Heartbeat Pulse for Decisive 90th Min Moments
   */
  public playHeartbeat() {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(85, now)
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.18)

    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.22)
  }

  /**
   * GOAL Explosion Fanfare & Triumphant Stadium Celebration
   */
  public playGoalExplosion() {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [440, 554.37, 659.25, 880] // A Major chord

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "triangle"
      osc.frequency.setValueAtTime(freq, now + idx * 0.08)

      gain.gain.setValueAtTime(0, now)
      gain.gain.setValueAtTime(0.18, now + idx * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + idx * 0.08)
      osc.stop(now + 1.2)
    })
  }

  /**
   * Golden Level-Up & Trophy Chime
   */
  public playTrophyChime() {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5] // C E G C

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, now + idx * 0.1)

      gain.gain.setValueAtTime(0.15, now + idx * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + idx * 0.1)
      osc.stop(now + idx * 0.1 + 0.6)
    })
  }

  /**
   * Miss / Turnover Sound
   */
  public playMiss() {
    const ctx = this.getContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(260, now)
    osc.frequency.linearRampToValueAtTime(140, now + 0.25)

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.25)
  }

  /**
   * Ukrainian Text-To-Speech for Coach Voice Commentary
   */
  public speakUkrainian(text: string): boolean {
    if (this.isMuted) return false
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false

    try {
      window.speechSynthesis.cancel()
      const cleanText = text.replace(/«|»|🔥|✨|⭐|🛡️|⚠️|❌/g, "").trim()
      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.lang = "uk-UA"
      utterance.rate = 1.02
      utterance.pitch = 1.0

      // Find Ukrainian voice if available
      const voices = window.speechSynthesis.getVoices()
      const ukVoice = voices.find(
        (v) => v.lang === "uk-UA" || v.lang.startsWith("uk")
      )
      if (ukVoice) {
        utterance.voice = ukVoice
      }

      window.speechSynthesis.speak(utterance)
      return true
    } catch (e) {
      console.warn("TTS error:", e)
      return false
    }
  }

  public stopSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
  }
}

export const proAudio = new ProAudio()
