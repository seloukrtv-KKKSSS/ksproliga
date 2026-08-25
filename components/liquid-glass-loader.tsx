import Image from "next/image"

interface LiquidGlassLoaderProps {
  message?: string
  fullscreen?: boolean
}

export function LiquidGlassLoader({
  message = "Готуємо сторінку…",
  fullscreen = false,
}: LiquidGlassLoaderProps) {
  return (
    <div
      className={`liquid-route-loader${fullscreen ? " liquid-route-loader--fullscreen" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <div className="liquid-route-loader__glow liquid-route-loader__glow--one" aria-hidden="true" />
      <div className="liquid-route-loader__glow liquid-route-loader__glow--two" aria-hidden="true" />

      <div className="liquid-route-loader__panel">
        <div className="liquid-route-loader__emblem" aria-hidden="true">
          <span className="liquid-route-loader__orbit" />
          <span className="liquid-route-loader__logo">
            <Image src="/images/ks-logo.png" alt="" width={64} height={64} priority />
          </span>
        </div>

        <strong>KS LIGA</strong>
        <span className="liquid-route-loader__message">{message}</span>

        <div className="liquid-route-loader__progress" aria-hidden="true">
          <span />
        </div>

        <div className="liquid-route-loader__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  )
}
