export type AnalyticsPeriod = "24h" | "7d" | "30d"

export interface AnalyticsEventRow {
  id: number
  session_id: string
  active_tab: string
  duration_seconds: number | null
}

export interface AnalyticsTabSummary {
  tab: string
  views: number
  uniqueSessions: number
  totalTime: number
  avgDurationSeconds: number
}

export interface AnalyticsSummary {
  totalPageViews: number
  totalPageViewsDisplay: string
  uniqueSessions: number
  avgDurationSeconds: number
  totalActiveSeconds: number
  viewsPerSession: number
  tabBreakdown: AnalyticsTabSummary[]
}

export interface AnalyticsRpcRow {
  total_page_views: number | string | null
  unique_sessions: number | string | null
  avg_duration_seconds: number | string | null
  total_active_seconds: number | string | null
  tab_breakdown: unknown
}

const numberFormatter = new Intl.NumberFormat("uk-UA")

const toNonNegativeInteger = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.round(parsed))
}

const formatPageViews = (value: number): string => numberFormatter.format(value)

export function createEmptyAnalyticsSummary(): AnalyticsSummary {
  return {
    totalPageViews: 0,
    totalPageViewsDisplay: "0",
    uniqueSessions: 0,
    avgDurationSeconds: 0,
    totalActiveSeconds: 0,
    viewsPerSession: 0,
    tabBreakdown: [],
  }
}

export function getAnalyticsCutoff(period: AnalyticsPeriod, now = new Date()): Date {
  const hours = period === "24h" ? 24 : period === "7d" ? 7 * 24 : 30 * 24
  return new Date(now.getTime() - hours * 60 * 60 * 1000)
}

export function summarizeAnalyticsRows(rows: AnalyticsEventRow[]): AnalyticsSummary {
  const publicRows = rows.filter((row) => row.active_tab && row.active_tab !== "admin")
  if (publicRows.length === 0) return createEmptyAnalyticsSummary()

  const sessions = new Set<string>()
  const tabMap = new Map<string, {
    views: number
    sessions: Set<string>
    totalTime: number
  }>()
  let totalActiveSeconds = 0

  publicRows.forEach((row) => {
    const duration = toNonNegativeInteger(row.duration_seconds)
    sessions.add(row.session_id)
    totalActiveSeconds += duration

    const existing = tabMap.get(row.active_tab) ?? {
      views: 0,
      sessions: new Set<string>(),
      totalTime: 0,
    }
    existing.views += 1
    existing.sessions.add(row.session_id)
    existing.totalTime += duration
    tabMap.set(row.active_tab, existing)
  })

  const totalPageViews = publicRows.length
  const uniqueSessions = sessions.size
  const tabBreakdown = [...tabMap.entries()]
    .map(([tab, stats]) => ({
      tab,
      views: stats.views,
      uniqueSessions: stats.sessions.size,
      totalTime: stats.totalTime,
      avgDurationSeconds: stats.views > 0 ? Math.round(stats.totalTime / stats.views) : 0,
    }))
    .sort((a, b) => b.views - a.views || a.tab.localeCompare(b.tab))

  return {
    totalPageViews,
    totalPageViewsDisplay: formatPageViews(totalPageViews),
    uniqueSessions,
    avgDurationSeconds: Math.round(totalActiveSeconds / totalPageViews),
    totalActiveSeconds,
    viewsPerSession: uniqueSessions > 0
      ? Math.round((totalPageViews / uniqueSessions) * 10) / 10
      : 0,
    tabBreakdown,
  }
}

export function normalizeAnalyticsRpcRow(row: AnalyticsRpcRow): AnalyticsSummary {
  const totalPageViews = toNonNegativeInteger(row.total_page_views)
  const uniqueSessions = toNonNegativeInteger(row.unique_sessions)
  const rawBreakdown = Array.isArray(row.tab_breakdown) ? row.tab_breakdown : []
  const tabBreakdown = rawBreakdown
    .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
    .map((entry) => ({
      tab: typeof entry.tab === "string" ? entry.tab : "unknown",
      views: toNonNegativeInteger(entry.views),
      uniqueSessions: toNonNegativeInteger(entry.uniqueSessions),
      totalTime: toNonNegativeInteger(entry.totalTime),
      avgDurationSeconds: toNonNegativeInteger(entry.avgDurationSeconds),
    }))
    .filter((entry) => entry.tab !== "admin" && entry.views > 0)
    .sort((a, b) => b.views - a.views || a.tab.localeCompare(b.tab))

  return {
    totalPageViews,
    totalPageViewsDisplay: formatPageViews(totalPageViews),
    uniqueSessions,
    avgDurationSeconds: toNonNegativeInteger(row.avg_duration_seconds),
    totalActiveSeconds: toNonNegativeInteger(row.total_active_seconds),
    viewsPerSession: uniqueSessions > 0
      ? Math.round((totalPageViews / uniqueSessions) * 10) / 10
      : 0,
    tabBreakdown,
  }
}
