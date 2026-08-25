"use client"

import { useEffect } from "react"

const SESSION_KEY = "ks_pwa_session_id"
const LAST_ACTIVE_KEY = "ks_pwa_last_active"
const SESSION_TIMEOUT_MS = 30 * 60 * 1000
const HEARTBEAT_MS = 15_000
const PRODUCTION_HOSTS = new Set(["ksliga.com", "www.ksliga.com"])

interface SiteAnalyticsTrackerProps {
  activeSection: string
  enabled?: boolean
}

interface TrackedView {
  sessionId: string
  rowId: number | null
  activeMilliseconds: number
  activeStartedAt: number | null
  pendingSeconds: number
  lastScheduledSeconds: number
  updateQueue: Promise<void>
}

const createSessionId = (): string => {
  const randomPart = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
  return `sess_${randomPart}`
}

const readLastActive = (): number => {
  const value = Number.parseInt(localStorage.getItem(LAST_ACTIVE_KEY) ?? "", 10)
  return Number.isFinite(value) ? value : 0
}

const resolveSessionId = (now: number, forceNew = false): string => {
  const existingSessionId = localStorage.getItem(SESSION_KEY)
  const isExpired = now - readLastActive() > SESSION_TIMEOUT_MS

  if (!forceNew && existingSessionId && !isExpired) return existingSessionId

  const sessionId = createSessionId()
  localStorage.setItem(SESSION_KEY, sessionId)
  return sessionId
}

export function SiteAnalyticsTracker({ activeSection, enabled = true }: SiteAnalyticsTrackerProps) {
  useEffect(() => {
    if (
      !enabled ||
      activeSection === "admin" ||
      !PRODUCTION_HOSTS.has(window.location.hostname.toLowerCase())
    ) return

    const databasePromise = import("@/lib/database")
    let currentView: TrackedView | null = null

    const getDurationSeconds = (view: TrackedView): number => {
      const runningMilliseconds = view.activeStartedAt === null
        ? 0
        : Math.max(0, performance.now() - view.activeStartedAt)
      return Math.max(1, Math.round((view.activeMilliseconds + runningMilliseconds) / 1000))
    }

    const pauseView = (view: TrackedView) => {
      if (view.activeStartedAt === null) return
      view.activeMilliseconds += Math.max(0, performance.now() - view.activeStartedAt)
      view.activeStartedAt = null
    }

    const resumeView = (view: TrackedView) => {
      if (view.activeStartedAt === null && document.visibilityState === "visible") {
        view.activeStartedAt = performance.now()
      }
    }

    const persistView = (view: TrackedView) => {
      view.pendingSeconds = Math.max(view.pendingSeconds, getDurationSeconds(view))
      if (!view.rowId || view.pendingSeconds <= view.lastScheduledSeconds) return

      const duration = view.pendingSeconds
      view.lastScheduledSeconds = duration
      view.updateQueue = view.updateQueue.then(async () => {
        const { updateAnalyticsDuration } = await databasePromise
        await updateAnalyticsDuration(view.rowId as number, duration, view.sessionId)
      })
    }

    const startView = (sessionId: string): TrackedView => {
      const view: TrackedView = {
        sessionId,
        rowId: null,
        activeMilliseconds: 0,
        activeStartedAt: document.visibilityState === "visible" ? performance.now() : null,
        pendingSeconds: 1,
        lastScheduledSeconds: 0,
        updateQueue: Promise.resolve(),
      }

      void databasePromise.then(async ({ recordUserAnalytics }) => {
        view.rowId = await recordUserAnalytics(sessionId, activeSection, 1)
        persistView(view)
      })

      return view
    }

    const markActive = (now = Date.now()) => {
      localStorage.setItem(LAST_ACTIVE_KEY, now.toString())
    }

    const finishCurrentView = () => {
      if (!currentView) return
      pauseView(currentView)
      persistView(currentView)
    }

    const startFreshSession = (now: number) => {
      finishCurrentView()
      const sessionId = resolveSessionId(now, true)
      markActive(now)
      currentView = startView(sessionId)
    }

    const now = Date.now()
    const sessionId = resolveSessionId(now)
    markActive(now)
    currentView = startView(sessionId)

    const heartbeatId = window.setInterval(() => {
      if (!currentView || document.visibilityState !== "visible") return
      markActive()
      persistView(currentView)
    }, HEARTBEAT_MS)

    const handleVisibilityChange = () => {
      if (!currentView) return

      if (document.visibilityState === "hidden") {
        pauseView(currentView)
        persistView(currentView)
        return
      }

      const visibleAt = Date.now()
      if (visibleAt - readLastActive() > SESSION_TIMEOUT_MS) {
        startFreshSession(visibleAt)
        return
      }

      markActive(visibleAt)
      resumeView(currentView)
    }

    const handlePageHide = () => {
      if (!currentView) return
      pauseView(currentView)
      persistView(currentView)
    }

    const handlePageShow = () => {
      if (!currentView || document.visibilityState !== "visible") return
      const visibleAt = Date.now()
      if (visibleAt - readLastActive() > SESSION_TIMEOUT_MS) {
        startFreshSession(visibleAt)
      } else {
        markActive(visibleAt)
        resumeView(currentView)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handlePageHide)
    window.addEventListener("pageshow", handlePageShow)

    return () => {
      finishCurrentView()
      window.clearInterval(heartbeatId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", handlePageHide)
      window.removeEventListener("pageshow", handlePageShow)
    }
  }, [activeSection, enabled])

  return null
}
