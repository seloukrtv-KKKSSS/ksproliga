import { LiquidGlassLoader } from "@/components/liquid-glass-loader"

export default function LoadingMatch() {
  return (
    <main className="detail-page">
      <div className="detail-page__container">
        <LiquidGlassLoader message="Відкриваємо сторінку…" />
      </div>
    </main>
  )
}
