"use client"

import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

export function PwaManager() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    if (window.location.pathname.startsWith("/obs/")) return

    const syncConnection = () => setIsOffline(!navigator.onLine)
    syncConnection()

    window.addEventListener("online", syncConnection)
    window.addEventListener("offline", syncConnection)

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
    }

    return () => {
      window.removeEventListener("online", syncConnection)
      window.removeEventListener("offline", syncConnection)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <WifiOff aria-hidden="true" />
      <span>Немає мережі. Доступний уже відкритий вміст.</span>
    </div>
  )
}
